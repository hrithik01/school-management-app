import db from '$lib/server/db.js';
import { EMPLOYEE_ROLE_OPTIONS } from '$lib/constants.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const { name, role, contact, salary, comments } = await request.json();
	const trimmedName = String(name || '').trim();
	const trimmedRole = String(role || '').trim();
	const trimmedContact = String(contact || '').trim();
	const trimmedComments = String(comments || '').trim();
	const numericSalary = Number(salary || 0);

	if (!trimmedName) {
		return json({ error: 'Employee name is required.' }, { status: 400 });
	}
	if (!EMPLOYEE_ROLE_OPTIONS.includes(trimmedRole)) {
		return json({ error: 'Please select a valid employee role.' }, { status: 400 });
	}
	if (Number.isNaN(numericSalary) || numericSalary < 0) {
		return json({ error: 'Salary must be zero or greater.' }, { status: 400 });
	}
	try {
		const stmt = db.prepare('UPDATE employees SET name = ?, role = ?, contact = ?, salary = ?, comments = ? WHERE id = ?');
		stmt.run(trimmedName, trimmedRole, trimmedContact || null, numericSalary, trimmedComments || null, id);
		return json({
			id: Number(id),
			name: trimmedName,
			role: trimmedRole,
			contact: trimmedContact,
			salary: numericSalary,
			comments: trimmedComments
		});
	} catch {
		return json({ error: 'Employee name must be unique.' }, { status: 400 });
	}
};

export const DELETE = ({ params }) => {
	const { id } = params;
	const linkedExpenses = db.prepare('SELECT COUNT(*) AS count FROM expenses WHERE employee_id = ?').get(id);
	if (linkedExpenses.count > 0) {
		return json({ error: 'This employee is linked to expenses and cannot be deleted.' }, { status: 400 });
	}
	db.prepare('DELETE FROM employees WHERE id = ?').run(id);
	return json({ success: true });
};
