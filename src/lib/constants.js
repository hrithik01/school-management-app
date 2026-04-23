// @ts-nocheck
export const SCHOOL_NAME = 'Brilliant Global School, Bhungra';

export const CLASS_OPTIONS = [
	'Nursery',
	'LKG',
	'UKG',
	'1st',
	'2nd',
	'3rd',
	'4th',
	'5th'
];

export const METHOD_OPTIONS = [
	{ value: 'cash', label: 'Cash' },
	{ value: 'online', label: 'Online' }
];

export const METHOD_VALUES = METHOD_OPTIONS.map((option) => option.value);

export const INCOME_TYPE_OPTIONS = [
	{ value: 'fees', label: 'Fees' },
	{ value: 'old_dues', label: 'Old Dues' },
	{ value: 'owner_input', label: 'Owner Input' },
	{ value: 'donation', label: 'Donation' },
	{ value: 'school_item', label: 'School Item' },
	{ value: 'miscellaneous', label: 'Miscellaneous' }
];

export const INCOME_TYPE_VALUES = INCOME_TYPE_OPTIONS.map((option) => option.value);

export const EXPENSE_TYPE_OPTIONS = [
	{ value: 'salary', label: 'Salary' },
	{ value: 'fuel', label: 'Vehicle Expense' },
	{ value: 'school_items', label: 'School items' },
	{ value: 'food', label: 'Food' },
	{ value: 'stationary', label: 'Stationary' },
	{ value: 'maintenance', label: 'Maintenance' },
	{ value: 'toiletries', label: 'Toiletries' },
	{ value: 'marketing', label: 'Marketing' },
	{ value: 'miscellaneous', label: 'Miscellaneous' },
	{ value: 'owner_payout', label: 'Owner Payout' }
];

export const EXPENSE_TYPE_VALUES = EXPENSE_TYPE_OPTIONS.map((option) => option.value);

export const DATE_RANGE_OPTIONS = [
	{ value: 'last-week', label: 'Last Week', days: 7 },
	{ value: 'last-2-weeks', label: 'Last 2 Weeks', days: 14 },
	{ value: 'last-month', label: 'Last Month', days: 30 },
	{ value: 'last-3-months', label: 'Last 3 Months', days: 90 },
	{ value: 'custom', label: 'Custom', days: null }
];

export const EMPLOYEE_ROLE_OPTIONS = [
	'Teacher',
	'Management',
	'Driver',
	'Guard',
	'Cleaner',
	'Support',
	'Miscelleanous'
];

export const INCOME_TYPES_SUPPORTING_STUDENT = ['fees', 'school_item'];
export const INCOME_TYPES_REQUIRING_STUDENT = [];
export const EXPENSE_TYPES_REQUIRING_EMPLOYEE = ['salary'];
export const EXPENSE_TYPES_REQUIRING_VEHICLE = ['fuel'];

export const formatINR = (value) =>
	new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0
	}).format(Number(value) || 0);

export const formatStudentName = (student) => {
	const name = String(student?.name || '').trim();
	const parentName = String(student?.parent_name || '').trim();
	return parentName ? `${name} c/o ${parentName}` : name;
};

export const formatFullDate = (value = new Date()) =>
	new Intl.DateTimeFormat('en-IN', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(value);

export const formatDayName = (value = new Date()) =>
	new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(value);

export const toDateInput = (value = new Date()) => {
	const date = new Date(value);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const getDateRange = (rangeKey, customStart, customEnd) => {
	if (rangeKey === 'custom') {
		return {
			start: customStart || '',
			end: customEnd || ''
		};
	}

	const selected = DATE_RANGE_OPTIONS.find((option) => option.value === rangeKey) || DATE_RANGE_OPTIONS[1];
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(endDate.getDate() - ((selected.days || 14) - 1));

	return {
		start: toDateInput(startDate),
		end: toDateInput(endDate)
	};
};

export const classSortValue = (className) => CLASS_OPTIONS.indexOf(className);
