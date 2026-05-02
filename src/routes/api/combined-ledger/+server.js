import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

const SOURCE_ORDER = {
	income: 1,
	expense: 2,
	transfer: 3
};

const compareEventsAsc = (a, b) => {
	if (a.date !== b.date) {
		return a.date.localeCompare(b.date);
	}

	const createdA = String(a.created_at || '');
	const createdB = String(b.created_at || '');
	if (createdA !== createdB) {
		return createdA.localeCompare(createdB);
	}

	if (a.source_order !== b.source_order) {
		return a.source_order - b.source_order;
	}

	return Number(a.id) - Number(b.id);
};

export const GET = () => {
	const settings = db.prepare('SELECT master_cash_start, master_online_start FROM settings WHERE id = 1').get();

	const incomeRows = db
		.prepare(
			`SELECT
				i.id,
				i.date,
				i.created_at,
				i.method,
				i.type,
				i.receipt_number,
				i.amount,
				i.comments,
				s.name AS student_name,
				s.parent_name,
				s.class_name
			 FROM income i
			 LEFT JOIN students s ON i.student_id = s.id`
		)
		.all();

	const expenseRows = db
		.prepare(
			`SELECT
				e.id,
				e.date,
				e.created_at,
				e.method,
				e.type,
				e.receipt_number,
				e.amount,
				e.comments,
				emp.name AS employee_name,
				v.name AS vehicle_name,
				v.vehicle_number
			 FROM expenses e
			 LEFT JOIN employees emp ON e.employee_id = emp.id
			 LEFT JOIN vehicles v ON e.vehicle_id = v.id`
		)
		.all();

	const transferRows = db
		.prepare(
			`SELECT
				id,
				date,
				created_at,
				from_method,
				to_method,
				amount
			 FROM master_transfers`
		)
		.all();

	const events = [
		...incomeRows.map((row) => ({
			...row,
			entry_kind: 'income',
			source_order: SOURCE_ORDER.income
		})),
		...expenseRows.map((row) => ({
			...row,
			entry_kind: 'expense',
			source_order: SOURCE_ORDER.expense
		})),
		...transferRows.map((row) => ({
			...row,
			entry_kind: 'transfer',
			source_order: SOURCE_ORDER.transfer
		}))
	];

	events.sort(compareEventsAsc);

	let masterCash = Number(settings?.master_cash_start || 0);
	let masterOnline = Number(settings?.master_online_start || 0);
	const balanceByEntryKey = new Map();

	for (const event of events) {
		const amount = Number(event.amount || 0);

		if (event.entry_kind === 'income') {
			if (event.method === 'cash') {
				masterCash += amount;
			} else {
				masterOnline += amount;
			}
		} else if (event.entry_kind === 'expense') {
			if (event.method === 'cash') {
				masterCash -= amount;
			} else {
				masterOnline -= amount;
			}
		} else {
			if (event.from_method === 'cash' && event.to_method === 'online') {
				masterCash -= amount;
				masterOnline += amount;
			} else if (event.from_method === 'online' && event.to_method === 'cash') {
				masterOnline -= amount;
				masterCash += amount;
			}
		}

		if (event.entry_kind !== 'transfer') {
			balanceByEntryKey.set(`${event.entry_kind}:${event.id}`, {
				master_cash_balance: masterCash,
				master_account_balance: masterOnline
			});
		}
	}

	const combinedRows = events
		.filter((event) => event.entry_kind !== 'transfer')
		.sort((a, b) => compareEventsAsc(b, a))
		.slice(0, 200)
		.map((event) => {
			const balances =
				balanceByEntryKey.get(`${event.entry_kind}:${event.id}`) ||
				{
					master_cash_balance: 0,
					master_account_balance: 0
				};

			return {
				...event,
				amount_signed: event.entry_kind === 'income' ? Number(event.amount || 0) : -Number(event.amount || 0),
				...balances
			};
		});

	return json({
		rows: combinedRows,
		master_cash_balance: masterCash,
		master_account_balance: masterOnline
	});
};
