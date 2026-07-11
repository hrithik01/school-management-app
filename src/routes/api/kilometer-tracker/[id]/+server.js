// @ts-nocheck
import { validateKilometerTimeline } from '$lib/server/kilometer-tracker.js';
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { date, vehicle_id, kilometer_reading } = await request.json();

	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}

	const existing = db.prepare('SELECT id FROM kilometer_tracker WHERE id = ?').get(id);
	if (!existing) {
		return json({ error: 'Kilometer entry not found.' }, { status: 404 });
	}

	const parsedVehicleId = Number(vehicle_id);
	if (!parsedVehicleId) {
		return json({ error: 'Vehicle is required.' }, { status: 400 });
	}

	const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(parsedVehicleId);
	if (!vehicle) {
		return json({ error: 'Selected vehicle does not exist.' }, { status: 400 });
	}

	const timelineError = validateKilometerTimeline({
		vehicleId: parsedVehicleId,
		date,
		kilometerReading: kilometer_reading,
		entryId: Number(id)
	});
	if (timelineError) {
		return json({ error: timelineError }, { status: 400 });
	}

	db.prepare(
		`UPDATE kilometer_tracker
		 SET date = ?, vehicle_id = ?, kilometer_reading = ?, updated_at = datetime('now')
		 WHERE id = ?`
	).run(date, parsedVehicleId, Number(kilometer_reading), id);

	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM kilometer_tracker WHERE id = ?').run(id);
	return json({ success: true });
};