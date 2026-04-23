import db from '$lib/server/db.js';
import { EMPLOYEE_ROLE_OPTIONS } from '$lib/constants.js';
import { json } from '@sveltejs/kit';

export const GET = () => {
	const employees = db
		.prepare(
			'SELECT id, name, role, contact, salary, comments FROM employees ORDER BY name COLLATE NOCASE'
		)
		.all();
	return json(employees);
};

export const POST = async ({ request }) => {
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
		const stmt = db.prepare(
			'INSERT INTO employees (name, role, contact, salary, comments) VALUES (?, ?, ?, ?, ?)'
		);
		const info = stmt.run(trimmedName, trimmedRole, trimmedContact || null, numericSalary, trimmedComments || null);
		return json({
			id: info.lastInsertRowid,
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
