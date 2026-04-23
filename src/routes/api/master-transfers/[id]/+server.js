import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM master_transfers WHERE id = ?').run(id);
	return json({ success: true });
};