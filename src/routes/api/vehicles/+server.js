import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const vehicles = db
		.prepare(
			'SELECT id, name, vehicle_number, vehicle_type, comments FROM vehicles ORDER BY name COLLATE NOCASE, vehicle_number COLLATE NOCASE'
		)
		.all();
	return json(vehicles);
};

export const POST = async ({ request }) => {
	const { name, vehicle_number, vehicle_type, comments } = await request.json();
	const trimmedName = String(name || '').trim();
	const trimmedNumber = String(vehicle_number || '').trim();
	const trimmedType = String(vehicle_type || '').trim();
	const trimmedComments = String(comments || '').trim();

	if (!trimmedName) {
		return json({ error: 'Vehicle name is required.' }, { status: 400 });
	}
	if (!trimmedNumber) {
		return json({ error: 'Vehicle number is required.' }, { status: 400 });
	}

	try {
		const info = db
			.prepare('INSERT INTO vehicles (name, vehicle_number, vehicle_type, comments) VALUES (?, ?, ?, ?)')
			.run(trimmedName, trimmedNumber, trimmedType || null, trimmedComments || null);
		return json({
			id: info.lastInsertRowid,
			name: trimmedName,
			vehicle_number: trimmedNumber,
			vehicle_type: trimmedType,
			comments: trimmedComments
		});
	} catch {
		return json({ error: 'Vehicle number must be unique.' }, { status: 400 });
	}
};
