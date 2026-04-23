// @ts-nocheck
import db from '$lib/server/db.js';
import { CLASS_OPTIONS } from '$lib/constants.js';
import { json } from '@sveltejs/kit';

const CLASS_SORT_SQL = `
	CASE s.class_name
		WHEN 'Nursery' THEN 1
		WHEN 'LKG' THEN 2
		WHEN 'UKG' THEN 3
		WHEN '1st' THEN 4
		WHEN '2nd' THEN 5
		WHEN '3rd' THEN 6
		WHEN '4th' THEN 7
		WHEN '5th' THEN 8
		ELSE 99
	END
`;

const sanitizeStudent = (payload) => {
	const name = String(payload?.name || '').trim();
	const parentName = String(payload?.parent_name || '').trim();
	const className = String(payload?.class_name || '').trim();
	const townId = Number(payload?.town_id);
	const totalAnnualFees = Number(payload?.total_annual_fees || 0);

	if (!name) return { error: 'Student name is required.' };
	if (!parentName) return { error: "Parent's name is required." };
	if (!CLASS_OPTIONS.includes(className)) return { error: 'A valid class is required.' };
	if (!Number.isInteger(townId) || townId <= 0) return { error: 'Town is required.' };
	if (Number.isNaN(totalAnnualFees) || totalAnnualFees < 0) {
		return { error: 'Total annual fees must be zero or greater.' };
	}

	const town = db.prepare('SELECT id FROM towns WHERE id = ?').get(townId);
	if (!town) return { error: 'Selected town does not exist.' };

	return {
		data: {
			name,
			parent_name: parentName,
			class_name: className,
			town_id: townId,
			date_of_birth: String(payload?.date_of_birth || '').trim() || null,
			contact_number: String(payload?.contact_number || '').trim() || null,
			aadhaar_number: String(payload?.aadhaar_number || '').trim() || null,
			comments: String(payload?.comments || '').trim() || null,
			school_bus_opted: payload?.school_bus_opted ? 1 : 0,
			total_annual_fees: totalAnnualFees
		}
	};
};

export const GET = () => {
	const students = db
		.prepare(
			`SELECT
				s.id,
				s.name,
				s.parent_name,
				s.class_name,
				s.town_id,
				t.name AS town_name,
				s.date_of_birth,
				s.contact_number,
				s.aadhaar_number,
				s.comments,
				s.school_bus_opted,
				s.total_annual_fees,
				COALESCE(student_income.total_amount, 0) AS income_from_student
			FROM students s
			JOIN towns t ON t.id = s.town_id
			LEFT JOIN (
				SELECT student_id, SUM(amount) AS total_amount
				FROM income
				WHERE student_id IS NOT NULL
				GROUP BY student_id
			) AS student_income ON student_income.student_id = s.id
			ORDER BY ${CLASS_SORT_SQL}, s.name COLLATE NOCASE`
		)
		.all();
	return json(students);
};

export const POST = async ({ request }) => {
	const payload = await request.json();
	const { data, error } = sanitizeStudent(payload);

	if (error) {
		return json({ error }, { status: 400 });
	}

	const info = db
		.prepare(
			`INSERT INTO students (
				name,
				parent_name,
				class_name,
				town_id,
				date_of_birth,
				contact_number,
				aadhaar_number,
				comments,
				school_bus_opted,
				total_annual_fees,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
		)
		.run(
			data.name,
			data.parent_name,
			data.class_name,
			data.town_id,
			data.date_of_birth,
			data.contact_number,
			data.aadhaar_number,
			data.comments,
			data.school_bus_opted,
			data.total_annual_fees
		);

	return json({ id: info.lastInsertRowid });
};
