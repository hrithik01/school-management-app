// @ts-nocheck
import db from '$lib/server/db.js';
import { CLASS_OPTIONS } from '$lib/constants.js';
import { json } from '@sveltejs/kit';

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

export const PUT = async ({ params, request }) => {
	const { id } = params;
	const payload = await request.json();
	const { data, error } = sanitizeStudent(payload);

	if (error) {
		return json({ error }, { status: 400 });
	}

	db.prepare(
		`UPDATE students
		 SET name = ?, parent_name = ?, class_name = ?, town_id = ?, date_of_birth = ?,
			 contact_number = ?, aadhaar_number = ?, comments = ?, school_bus_opted = ?,
			 total_annual_fees = ?, updated_at = datetime('now')
		 WHERE id = ?`
	).run(
		data.name,
		data.parent_name,
		data.class_name,
		data.town_id,
		data.date_of_birth,
		data.contact_number,
		data.aadhaar_number,
		data.comments,
		data.school_bus_opted,
		data.total_annual_fees,
		id
	);

	return json({ success: true });
};

export const DELETE = ({ params }) => {
	const { id } = params;
	db.prepare('DELETE FROM students WHERE id = ?').run(id);
	return json({ success: true });
};
