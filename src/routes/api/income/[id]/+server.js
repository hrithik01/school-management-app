import { INCOME_TYPES_REQUIRING_STUDENT, INCOME_TYPE_VALUES, METHOD_VALUES } from '$lib/constants.js';
import db from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request }) => {
	const { id } = params;
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
	db.prepare(
		`UPDATE income
		 SET date = ?, method = ?, type = ?, receipt_number = ?, student_id = ?, amount = ?, comments = ?, updated_at = datetime('now')
		 WHERE id = ?`
	).run(
		date,
		method,
		type,
		String(receipt_number || '').trim() || null,
		parsedStudentId,
		numericAmount,
		String(comments || '').trim() || null,
		id
	);
	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM income WHERE id = ?').run(id);
	return json({ success: true });
};
