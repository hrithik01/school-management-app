import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const rows = db
		.prepare(
			`SELECT *
			 FROM master_transfers
			 ORDER BY date DESC, created_at DESC`
		)
		.all();

	return json(rows);
};

export const POST = async ({ request }) => {
	const { date, from_method, to_method, amount } = await request.json();
	const numericAmount = Number(amount);

	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	if (!['cash', 'online'].includes(from_method) || !['cash', 'online'].includes(to_method)) {
		return json({ error: 'Transfer must be between cash and online.' }, { status: 400 });
	}
	if (from_method === to_method) {
		return json({ error: 'From and To must be different.' }, { status: 400 });
	}
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}

	const info = db
		.prepare(
			`INSERT INTO master_transfers (date, from_method, to_method, amount)
			 VALUES (?, ?, ?, ?)`
		)
		.run(date, from_method, to_method, numericAmount);

	return json({ id: info.lastInsertRowid });
};