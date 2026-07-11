// @ts-nocheck
import { listKilometerEntries, validateKilometerTimeline } from '$lib/server/kilometer-tracker.js';
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => json(listKilometerEntries());

export const POST = async ({ request }) => {
	const payload = await request.json();
	const { date, vehicle_id, kilometer_reading, entries } = payload;

	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}

	const normalizedEntries = Array.isArray(entries)
		? entries
		: [{ vehicle_id, kilometer_reading }];
	if (normalizedEntries.length === 0) {
		return json({ error: 'At least one vehicle reading is required.' }, { status: 400 });
	}

	const findVehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?');
	const findExistingEntry = db.prepare(
		'SELECT id FROM kilometer_tracker WHERE date = ? AND vehicle_id = ? ORDER BY id DESC LIMIT 1'
	);
	const insertEntry = db.prepare(
		`INSERT INTO kilometer_tracker (date, vehicle_id, kilometer_reading, updated_at)
		 VALUES (?, ?, ?, datetime('now'))`
	);
	const updateEntry = db.prepare(
		`UPDATE kilometer_tracker
		 SET kilometer_reading = ?, updated_at = datetime('now')
		 WHERE id = ?`
	);

	const seenVehicleIds = new Set();
	const parsedEntries = [];
	for (const entry of normalizedEntries) {
		const parsedVehicleId = Number(entry?.vehicle_id);
		if (!parsedVehicleId) {
			return json({ error: 'Vehicle is required for each reading.' }, { status: 400 });
		}
		if (seenVehicleIds.has(parsedVehicleId)) {
			return json({ error: 'Only one reading per vehicle can be saved for the selected date.' }, { status: 400 });
		}
		seenVehicleIds.add(parsedVehicleId);

		const vehicle = findVehicle.get(parsedVehicleId);
		if (!vehicle) {
			return json({ error: 'Selected vehicle does not exist.' }, { status: 400 });
		}

		parsedEntries.push({
			vehicleId: parsedVehicleId,
			kilometerReading: Number(entry?.kilometer_reading)
		});
	}

	try {
		const saveEntries = db.transaction((items) => {
			const savedIds = [];
			for (const entry of items) {
				const existingEntry = findExistingEntry.get(date, entry.vehicleId);
				const timelineError = validateKilometerTimeline({
					vehicleId: entry.vehicleId,
					date,
					kilometerReading: entry.kilometerReading,
					entryId: existingEntry ? Number(existingEntry.id) : null
				});
				if (timelineError) {
					throw new Error(timelineError);
				}

				if (existingEntry) {
					updateEntry.run(entry.kilometerReading, existingEntry.id);
					savedIds.push(Number(existingEntry.id));
					continue;
				}

				const info = insertEntry.run(date, entry.vehicleId, entry.kilometerReading);
				savedIds.push(Number(info.lastInsertRowid));
			}
			return savedIds;
		});

		const savedIds = saveEntries(parsedEntries);
		return json({ ids: savedIds, count: savedIds.length });
	} catch (error) {
		return json({ error: error.message || 'Unable to save kilometer entries.' }, { status: 400 });
	}
};