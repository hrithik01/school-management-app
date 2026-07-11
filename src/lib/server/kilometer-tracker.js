// @ts-nocheck
import db from '$lib/server/db.js';

const kilometerTrackerSelect = `
	WITH ordered_entries AS (
		SELECT
			kt.id,
			kt.date,
			kt.vehicle_id,
			kt.kilometer_reading,
			kt.created_at,
			kt.updated_at,
			v.name AS vehicle_name,
			v.vehicle_number,
			v.vehicle_type,
			LAG(kt.kilometer_reading) OVER (
				PARTITION BY kt.vehicle_id
				ORDER BY kt.date ASC, kt.id ASC
			) AS last_kilometer_reading
		FROM kilometer_tracker kt
		INNER JOIN vehicles v ON v.id = kt.vehicle_id
	)
	SELECT
		id,
		date,
		vehicle_id,
		kilometer_reading,
		created_at,
		updated_at,
		vehicle_name,
		vehicle_number,
		vehicle_type,
		last_kilometer_reading,
		CASE
			WHEN last_kilometer_reading IS NULL THEN NULL
			ELSE kilometer_reading - last_kilometer_reading
		END AS kilometer_difference
	FROM ordered_entries
	ORDER BY date DESC, id DESC
`;

export const listKilometerEntries = () => db.prepare(kilometerTrackerSelect).all();

const getPreviousEntryForCreate = db.prepare(`
	SELECT kilometer_reading
	FROM kilometer_tracker
	WHERE vehicle_id = ?
	  AND (date < ? OR date = ?)
	ORDER BY date DESC, id DESC
	LIMIT 1
`);

const getNextEntryForCreate = db.prepare(`
	SELECT kilometer_reading
	FROM kilometer_tracker
	WHERE vehicle_id = ?
	  AND date > ?
	ORDER BY date ASC, id ASC
	LIMIT 1
`);

const getPreviousEntryForUpdate = db.prepare(`
	SELECT kilometer_reading
	FROM kilometer_tracker
	WHERE vehicle_id = ?
	  AND id != ?
	  AND (date < ? OR (date = ? AND id < ?))
	ORDER BY date DESC, id DESC
	LIMIT 1
`);

const getNextEntryForUpdate = db.prepare(`
	SELECT kilometer_reading
	FROM kilometer_tracker
	WHERE vehicle_id = ?
	  AND id != ?
	  AND (date > ? OR (date = ? AND id > ?))
	ORDER BY date ASC, id ASC
	LIMIT 1
`);

export const validateKilometerTimeline = ({ vehicleId, date, kilometerReading, entryId = null }) => {
	const numericReading = Number(kilometerReading);
	if (!Number.isFinite(numericReading) || numericReading < 0) {
		return 'Kilometer reading must be 0 or greater.';
	}

	const previousEntry = entryId
		? getPreviousEntryForUpdate.get(vehicleId, entryId, date, date, entryId)
		: getPreviousEntryForCreate.get(vehicleId, date, date);
	if (previousEntry && numericReading < Number(previousEntry.kilometer_reading)) {
		return `Kilometer reading cannot be lower than the previous reading of ${Number(previousEntry.kilometer_reading)}.`;
	}

	const nextEntry = entryId
		? getNextEntryForUpdate.get(vehicleId, entryId, date, date, entryId)
		: getNextEntryForCreate.get(vehicleId, date);
	if (nextEntry && numericReading > Number(nextEntry.kilometer_reading)) {
		return `Kilometer reading cannot be greater than the next reading of ${Number(nextEntry.kilometer_reading)}.`;
	}

	return null;
};