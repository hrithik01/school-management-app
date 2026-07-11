import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
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
		db.prepare('UPDATE vehicles SET name = ?, vehicle_number = ?, vehicle_type = ?, comments = ? WHERE id = ?').run(
			trimmedName,
			trimmedNumber,
			trimmedType || null,
			trimmedComments || null,
			id
		);
		return json({
			id: Number(id),
			name: trimmedName,
			vehicle_number: trimmedNumber,
			vehicle_type: trimmedType,
			comments: trimmedComments
		});
	} catch {
		return json({ error: 'Vehicle number must be unique.' }, { status: 400 });
	}
};

export const DELETE = ({ params }) => {
	const { id } = params;
	const linkedExpenses = db.prepare('SELECT COUNT(*) AS count FROM expenses WHERE vehicle_id = ?').get(id);
	const linkedKilometerEntries = db
		.prepare('SELECT COUNT(*) AS count FROM kilometer_tracker WHERE vehicle_id = ?')
		.get(id);

	if (linkedExpenses.count > 0) {
		return json({ error: 'This vehicle is used in expenses and cannot be deleted.' }, { status: 400 });
	}
	if (linkedKilometerEntries.count > 0) {
		return json({ error: 'This vehicle is used in kilometer tracker and cannot be deleted.' }, { status: 400 });
	}

	db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
	return json({ success: true });
};
