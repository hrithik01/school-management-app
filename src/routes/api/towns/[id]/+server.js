import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { name, comments } = await request.json();
	const trimmedName = String(name || '').trim();
	const trimmedComments = String(comments || '').trim();

	if (!trimmedName) {
		return json({ error: 'Town name is required.' }, { status: 400 });
	}

	try {
		db.prepare('UPDATE towns SET name = ?, comments = ? WHERE id = ?').run(trimmedName, trimmedComments || null, id);
		return json({ id: Number(id), name: trimmedName, comments: trimmedComments });
	} catch {
		return json({ error: 'Town name must be unique.' }, { status: 400 });
	}
};

export const DELETE = ({ params }) => {
	const { id } = params;
	const linkedStudents = db.prepare('SELECT COUNT(*) AS count FROM students WHERE town_id = ?').get(id);

	if (linkedStudents.count > 0) {
		return json({ error: 'This town is linked to students and cannot be deleted.' }, { status: 400 });
	}

	db.prepare('DELETE FROM towns WHERE id = ?').run(id);
	return json({ success: true });
};
