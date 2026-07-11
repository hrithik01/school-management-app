// @ts-nocheck
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

const getIncomeTotals = (selectedDate) => {
	if (selectedDate) {
		return db
			.prepare(
				`SELECT
				 COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_income,
				 COALESCE(SUM(CASE WHEN method = 'online' THEN amount ELSE 0 END), 0) as online_income
				 FROM income
				 WHERE date <= ?`
			)
			.get(selectedDate);
	}

	return db
		.prepare(
			`SELECT
			 COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_income,
			 COALESCE(SUM(CASE WHEN method = 'online' THEN amount ELSE 0 END), 0) as online_income
			 FROM income`
		)
		.get();
};

const getExpenseTotals = (selectedDate) => {
	if (selectedDate) {
		return db
			.prepare(
				`SELECT
				 COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
				 COALESCE(SUM(CASE WHEN method = 'online' THEN amount ELSE 0 END), 0) as online_expense
				 FROM expenses
				 WHERE date <= ?`
			)
			.get(selectedDate);
	}

	return db
		.prepare(
			`SELECT
			 COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_expense,
			 COALESCE(SUM(CASE WHEN method = 'online' THEN amount ELSE 0 END), 0) as online_expense
			 FROM expenses`
		)
		.get();
};

const getTransferTotals = (selectedDate) => {
	if (selectedDate) {
		return db
			.prepare(
				`SELECT
				 COALESCE(SUM(CASE WHEN from_method = 'cash' THEN amount ELSE 0 END), 0) as cash_transfer_out,
				 COALESCE(SUM(CASE WHEN to_method = 'cash' THEN amount ELSE 0 END), 0) as cash_transfer_in,
				 COALESCE(SUM(CASE WHEN from_method = 'online' THEN amount ELSE 0 END), 0) as online_transfer_out,
				 COALESCE(SUM(CASE WHEN to_method = 'online' THEN amount ELSE 0 END), 0) as online_transfer_in
				 FROM master_transfers
				 WHERE date <= ?`
			)
			.get(selectedDate);
	}

	return db
		.prepare(
			`SELECT
			 COALESCE(SUM(CASE WHEN from_method = 'cash' THEN amount ELSE 0 END), 0) as cash_transfer_out,
			 COALESCE(SUM(CASE WHEN to_method = 'cash' THEN amount ELSE 0 END), 0) as cash_transfer_in,
			 COALESCE(SUM(CASE WHEN from_method = 'online' THEN amount ELSE 0 END), 0) as online_transfer_out,
			 COALESCE(SUM(CASE WHEN to_method = 'online' THEN amount ELSE 0 END), 0) as online_transfer_in
			 FROM master_transfers`
		)
		.get();
};

export const GET = ({ url }) => {
	const selectedDate = url.searchParams.get('date') || '';
	const settings = db.prepare('SELECT master_cash_start, master_online_start FROM settings WHERE id = 1').get();
	const incomeTotals = getIncomeTotals(selectedDate);
	const expenseTotals = getExpenseTotals(selectedDate);
	const transferTotals = getTransferTotals(selectedDate);

	const master_cash_balance =
		(settings?.master_cash_start ?? 0) +
		incomeTotals.cash_income -
		expenseTotals.cash_expense -
		transferTotals.cash_transfer_out +
		transferTotals.cash_transfer_in;
	const master_account_balance =
		(settings?.master_online_start ?? 0) +
		incomeTotals.online_income -
		expenseTotals.online_expense -
		transferTotals.online_transfer_out +
		transferTotals.online_transfer_in;

	return json({
		selected_date: selectedDate || null,
		master_cash_start: settings?.master_cash_start ?? 0,
		master_online_start: settings?.master_online_start ?? 0,
		master_cash_balance,
		master_account_balance,
		cash_income: incomeTotals.cash_income,
		cash_expense: expenseTotals.cash_expense,
		online_income: incomeTotals.online_income,
		online_expense: expenseTotals.online_expense,
		cash_transfer_out: transferTotals.cash_transfer_out,
		cash_transfer_in: transferTotals.cash_transfer_in,
		online_transfer_out: transferTotals.online_transfer_out,
		online_transfer_in: transferTotals.online_transfer_in
	});
};

export const POST = async ({ request }) => {
	const { master_cash_balance, master_account_balance, master_cash_start, master_online_start } =
		await request.json();
	const incomeTotals = getIncomeTotals();
	const expenseTotals = getExpenseTotals();
		const transferTotals = getTransferTotals();

	const requestedCashBalance =
		master_cash_balance !== undefined ? Number(master_cash_balance) : Number(master_cash_start);
	const requestedAccountBalance =
		master_account_balance !== undefined ? Number(master_account_balance) : Number(master_online_start);

	if (
		Number.isNaN(requestedCashBalance) ||
		requestedCashBalance < 0 ||
		Number.isNaN(requestedAccountBalance) ||
		requestedAccountBalance < 0
	) {
		return json({ error: 'Master balances must be zero or greater.' }, { status: 400 });
	}

	const cashStart =
		requestedCashBalance -
		incomeTotals.cash_income +
		expenseTotals.cash_expense +
		transferTotals.cash_transfer_out -
		transferTotals.cash_transfer_in;
	const onlineStart =
		requestedAccountBalance -
		incomeTotals.online_income +
		expenseTotals.online_expense +
		transferTotals.online_transfer_out -
		transferTotals.online_transfer_in;

	db.prepare('UPDATE settings SET master_cash_start = ?, master_online_start = ? WHERE id = 1').run(
		cashStart,
		onlineStart
	);

	return json({
		master_cash_start: cashStart,
		master_online_start: onlineStart,
		master_cash_balance: requestedCashBalance,
		master_account_balance: requestedAccountBalance
	});
};
