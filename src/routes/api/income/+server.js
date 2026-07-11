import { INCOME_TYPES_REQUIRING_STUDENT, INCOME_TYPE_VALUES, METHOD_VALUES } from '$lib/constants.js';
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const GET = ({ url }) => {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	let rows = [];
	if (start && end) {
		const stmt = db.prepare(
			`SELECT i.*, s.name AS student_name, s.parent_name, s.class_name, t.name AS town_name
			 FROM income i
			 LEFT JOIN students s ON i.student_id = s.id
			 LEFT JOIN towns t ON s.town_id = t.id
			 WHERE i.date BETWEEN ? AND ?
			 ORDER BY i.date DESC, i.created_at DESC`
		);
		rows = stmt.all(start, end);
	} else {
		rows = db
			.prepare(
				`SELECT i.*, s.name AS student_name, s.parent_name, s.class_name, t.name AS town_name
				 FROM income i
				 LEFT JOIN students s ON i.student_id = s.id
				 LEFT JOIN towns t ON s.town_id = t.id
				 ORDER BY i.date DESC, i.created_at DESC`
			)
			.all();
	}
	return json(rows);
};

export const POST = async ({ request }) => {
	const { date, method, type, receipt_number, student_id, amount, comments } = await request.json();
	if (!date) {
		return json({ error: 'Date is required.' }, { status: 400 });
	}
	if (!METHOD_VALUES.includes(method)) {
		return json({ error: 'Method must be Cash, Online, or Credit.' }, { status: 400 });
	}
	if (!INCOME_TYPE_VALUES.includes(type)) {
		return json({ error: 'A valid income type is required.' }, { status: 400 });
	}
	const numericAmount = Number(amount);
	if (!numericAmount || numericAmount <= 0) {
		return json({ error: 'Amount must be greater than zero.' }, { status: 400 });
	}
	const parsedStudentId = student_id ? Number(student_id) : null;
	if (INCOME_TYPES_REQUIRING_STUDENT.includes(type) && !parsedStudentId) {
		return json({ error: 'Student is required for this income type.' }, { status: 400 });
	}
	if (parsedStudentId) {
		const student = db.prepare('SELECT id FROM students WHERE id = ?').get(parsedStudentId);
		if (!student) {
			return json({ error: 'Selected student does not exist.' }, { status: 400 });
		}
	}
	const stmt = db.prepare(
		`INSERT INTO income (date, method, type, receipt_number, student_id, amount, comments, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
	);
	const info = stmt.run(
		date,
		method,
		type,
		String(receipt_number || '').trim() || null,
		parsedStudentId,
		numericAmount,
		String(comments || '').trim() || null
	);
	return json({ id: info.lastInsertRowid });
};
