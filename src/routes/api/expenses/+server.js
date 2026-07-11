import {
	EXPENSE_TYPE_VALUES,
	EXPENSE_TYPES_REQUIRING_EMPLOYEE,
	EXPENSE_TYPES_REQUIRING_VEHICLE,
	METHOD_VALUES
} from '$lib/constants.js';
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	let rows = [];
	if (start && end) {
		const stmt = db.prepare(
			`SELECT e.*, emp.name as employee_name, v.name as vehicle_name, v.vehicle_number, v.vehicle_type
			 FROM expenses e
			 LEFT JOIN employees emp ON e.employee_id = emp.id
			 LEFT JOIN vehicles v ON e.vehicle_id = v.id
			 WHERE e.date BETWEEN ? AND ?
			 ORDER BY e.date DESC, e.created_at DESC`
		);
		rows = stmt.all(start, end);
	} else {
		rows = db
			.prepare(
				`SELECT e.*, emp.name as employee_name, v.name as vehicle_name, v.vehicle_number, v.vehicle_type
				 FROM expenses e
				 LEFT JOIN employees emp ON e.employee_id = emp.id
				 LEFT JOIN vehicles v ON e.vehicle_id = v.id
				 ORDER BY e.date DESC, e.created_at DESC`
			)
			.all();
	}
	return json(rows);
};

export const POST = async ({ request }) => {
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

	const stmt = db.prepare(
		`INSERT INTO expenses (date, method, type, receipt_number, employee_id, vehicle_id, amount, comments, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
	);
	const info = stmt.run(
		date,
		method,
		type,
		String(receipt_number || '').trim() || null,
		parsedEmployeeId,
		parsedVehicleId,
		numericAmount,
		String(comments || '').trim() || null
	);
	return json({ id: info.lastInsertRowid });
};
