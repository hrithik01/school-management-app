import {
	EXPENSE_TYPE_VALUES,
	EXPENSE_TYPES_REQUIRING_EMPLOYEE,
	EXPENSE_TYPES_REQUIRING_VEHICLE,
	METHOD_VALUES
} from '$lib/constants.js';
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { date, method, type, receipt_number, employee_id, vehicle_id, amount, comments } = await request.json();

	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	if (!METHOD_VALUES.includes(method)) {
		return json({ error: 'Method must be Cash, Online, or Credit.' }, { status: 400 });
	}
	if (!EXPENSE_TYPE_VALUES.includes(type)) {
		return json({ error: 'A valid expense type is required.' }, { status: 400 });
	}
	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}
	const parsedEmployeeId = employee_id ? Number(employee_id) : null;
	const parsedVehicleId = vehicle_id ? Number(vehicle_id) : null;
	if (EXPENSE_TYPES_REQUIRING_EMPLOYEE.includes(type) && !parsedEmployeeId) {
		return json({ error: 'Employee is required for Salary expenses.' }, { status: 400 });
	}
	if (EXPENSE_TYPES_REQUIRING_VEHICLE.includes(type) && !parsedVehicleId) {
		return json({ error: 'Vehicle is required for Vehicle Expense entries.' }, { status: 400 });
	}
	if (parsedEmployeeId) {
		const employee = db.prepare('SELECT id FROM employees WHERE id = ?').get(parsedEmployeeId);
		if (!employee) {
			return json({ error: 'Selected employee does not exist.' }, { status: 400 });
		}
	}
	if (parsedVehicleId) {
		const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(parsedVehicleId);
		if (!vehicle) {
			return json({ error: 'Selected vehicle does not exist.' }, { status: 400 });
		}
	}
	const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
	if (!existing) {
		return json({ error: 'Expense not found.' }, { status: 404 });
	}
	db.prepare(
		`UPDATE expenses
		 SET date = ?, method = ?, type = ?, receipt_number = ?, employee_id = ?, vehicle_id = ?, amount = ?, comments = ?, updated_at = datetime('now')
		 WHERE id = ?`
	).run(
		date,
		method,
		type,
		String(receipt_number || '').trim() || null,
		parsedEmployeeId,
		parsedVehicleId,
		numericAmount,
		String(comments || '').trim() || null,
		id
	);
	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
	return json({ success: true });
};
