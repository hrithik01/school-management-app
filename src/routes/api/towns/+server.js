import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const towns = db.prepare('SELECT id, name, comments FROM towns ORDER BY name COLLATE NOCASE').all();
	return json(towns);
};

export const POST = async ({ request }) => {
	const { name, comments } = await request.json();
	const trimmedName = String(name || '').trim();
	const trimmedComments = String(comments || '').trim();

	if (!trimmedName) {
		return json({ error: 'Town name is required.' }, { status: 400 });
	}

	try {
		const info = db.prepare('INSERT INTO towns (name, comments) VALUES (?, ?)').run(trimmedName, trimmedComments || null);
		return json({ id: info.lastInsertRowid, name: trimmedName, comments: trimmedComments });
	} catch {
		return json({ error: 'Town name must be unique.' }, { status: 400 });
	}
};
