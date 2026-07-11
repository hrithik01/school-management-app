// @ts-nocheck
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'school.db');
const db = new Database(dbPath);

const METHOD_CHECK_CONSTRAINT = "('cash', 'online', 'credit')";

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const hasColumn = (tableName, columnName) =>
	db
		.prepare(`PRAGMA table_info(${tableName})`)
		.all()
		.some((column) => column.name === columnName);

const recreateIncomeTableWithoutTypeConstraint = () => {
	const hasReceiptNumber = hasColumn('income', 'receipt_number');
	db.exec(`
		ALTER TABLE income RENAME TO income_legacy;

		CREATE TABLE income (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL,
			method TEXT NOT NULL CHECK (method IN ${METHOD_CHECK_CONSTRAINT}),
			type TEXT NOT NULL,
			receipt_number TEXT,
			student_id INTEGER,
			amount REAL NOT NULL,
			comments TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
		);

		INSERT INTO income (id, date, method, type, receipt_number, student_id, amount, comments, created_at, updated_at)
		SELECT id, date, method, type, ${hasReceiptNumber ? 'receipt_number' : 'NULL'}, student_id, amount, comments, created_at, updated_at
		FROM income_legacy;

		DROP TABLE income_legacy;
	`);
};

const recreateExpensesTable = () => {
	const hasReceiptNumber = hasColumn('expenses', 'receipt_number');
	db.exec(`
		ALTER TABLE expenses RENAME TO expenses_legacy;

		CREATE TABLE expenses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL,
			method TEXT NOT NULL CHECK (method IN ${METHOD_CHECK_CONSTRAINT}),
			type TEXT NOT NULL,
			receipt_number TEXT,
			employee_id INTEGER,
			vehicle_id INTEGER,
			amount REAL NOT NULL,
			comments TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
			FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
		);

		INSERT INTO expenses (id, date, method, type, receipt_number, employee_id, vehicle_id, amount, comments, created_at, updated_at)
		SELECT id, date, method, type, ${hasReceiptNumber ? 'receipt_number' : 'NULL'}, employee_id, vehicle_id, amount, comments, created_at, updated_at
		FROM expenses_legacy;

		DROP TABLE expenses_legacy;
	`);
};

const recreateExpensesTableWithoutTypeConstraint = () => {
	recreateExpensesTable();
};

const migrateReceiptNumberColumns = () => {
	const hasIncomeReceiptNumber = hasColumn('income', 'receipt_number');
	const hasExpenseReceiptNumber = hasColumn('expenses', 'receipt_number');

	if (hasIncomeReceiptNumber && hasExpenseReceiptNumber) {
		return;
	}

	const migrate = db.transaction(() => {
		if (!hasIncomeReceiptNumber) {
			db.exec('ALTER TABLE income ADD COLUMN receipt_number TEXT');
		}
		if (!hasExpenseReceiptNumber) {
			db.exec('ALTER TABLE expenses ADD COLUMN receipt_number TEXT');
		}
	});

	migrate();
};

const recreateVehiclesTableWithExpandedFields = () => {
	db.exec(`
		ALTER TABLE vehicles RENAME TO vehicles_legacy;

		CREATE TABLE vehicles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			vehicle_number TEXT UNIQUE,
			vehicle_type TEXT,
			comments TEXT
		);

		INSERT INTO vehicles (id, name, vehicle_number, vehicle_type, comments)
		SELECT id, name, NULL, vehicle_type, NULL
		FROM vehicles_legacy;

		DROP TABLE vehicles_legacy;
	`);
};

const migrateExpenseVehicleForeignKey = () => {
	const vehicleForeignKey = db
		.prepare("PRAGMA foreign_key_list(expenses)")
		.all()
		.find((foreignKey) => foreignKey.from === 'vehicle_id');

	if (!vehicleForeignKey || vehicleForeignKey.table === 'vehicles') {
		return;
	}

	const previousForeignKeys = db.pragma('foreign_keys', { simple: true });
	db.pragma('foreign_keys = OFF');

	try {
		const migrate = db.transaction(() => {
			recreateExpensesTable();
		});

		migrate();
	} finally {
		db.pragma(`foreign_keys = ${previousForeignKeys ? 'ON' : 'OFF'}`);
	}
};

const migrateMasterTables = () => {
	const employeeColumns = db.prepare("PRAGMA table_info(employees)").all();
	const townColumns = db.prepare("PRAGMA table_info(towns)").all();
	const vehicleColumns = db.prepare("PRAGMA table_info(vehicles)").all();

	const hasEmployeeComments = employeeColumns.some((column) => column.name === 'comments');
	const hasTownComments = townColumns.some((column) => column.name === 'comments');
	const hasVehicleNumber = vehicleColumns.some((column) => column.name === 'vehicle_number');
	const hasVehicleComments = vehicleColumns.some((column) => column.name === 'comments');

	if (hasEmployeeComments && hasTownComments && hasVehicleNumber && hasVehicleComments) {
		return;
	}

	const previousForeignKeys = db.pragma('foreign_keys', { simple: true });
	db.pragma('foreign_keys = OFF');

	try {
		const migrate = db.transaction(() => {
			if (!hasEmployeeComments) {
				db.exec('ALTER TABLE employees ADD COLUMN comments TEXT');
			}
			if (!hasTownComments) {
				db.exec('ALTER TABLE towns ADD COLUMN comments TEXT');
			}
			if (!hasVehicleNumber || !hasVehicleComments) {
				recreateVehiclesTableWithExpandedFields();
				recreateExpensesTable();
			}
		});

		migrate();
	} finally {
		db.pragma(`foreign_keys = ${previousForeignKeys ? 'ON' : 'OFF'}`);
	}
};

const migrateTypeConstraintTables = () => {
	const incomeSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'income'").get();
	const expensesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'expenses'").get();

	const requiresIncomeMigration = incomeSchema?.sql?.includes("type TEXT NOT NULL CHECK (type IN (");
	const requiresExpensesMigration = expensesSchema?.sql?.includes("type TEXT NOT NULL CHECK (type IN (");

	if (!requiresIncomeMigration && !requiresExpensesMigration) {
		return;
	}

	const previousForeignKeys = db.pragma('foreign_keys', { simple: true });
	db.pragma('foreign_keys = OFF');

	try {
		const migrate = db.transaction(() => {
			if (requiresIncomeMigration) {
				recreateIncomeTableWithoutTypeConstraint();
			}
			if (requiresExpensesMigration) {
				recreateExpensesTableWithoutTypeConstraint();
			}
		});

		migrate();
	} finally {
		db.pragma(`foreign_keys = ${previousForeignKeys ? 'ON' : 'OFF'}`);
	}
};

const migrateMethodConstraintTables = () => {
	const incomeSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'income'").get();
	const expensesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'expenses'").get();

	const requiresIncomeMigration = incomeSchema?.sql?.includes("method TEXT NOT NULL CHECK (method IN ('cash', 'online'))");
	const requiresExpensesMigration = expensesSchema?.sql?.includes("method TEXT NOT NULL CHECK (method IN ('cash', 'online'))");

	if (!requiresIncomeMigration && !requiresExpensesMigration) {
		return;
	}

	const previousForeignKeys = db.pragma('foreign_keys', { simple: true });
	db.pragma('foreign_keys = OFF');

	try {
		const migrate = db.transaction(() => {
			if (requiresIncomeMigration) {
				recreateIncomeTableWithoutTypeConstraint();
			}
			if (requiresExpensesMigration) {
				recreateExpensesTableWithoutTypeConstraint();
			}
		});

		migrate();
	} finally {
		db.pragma(`foreign_keys = ${previousForeignKeys ? 'ON' : 'OFF'}`);
	}
};

db.exec(`
	CREATE TABLE IF NOT EXISTS settings (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		master_cash_start REAL NOT NULL DEFAULT 0,
		master_online_start REAL NOT NULL DEFAULT 0,
		todos_json TEXT NOT NULL DEFAULT '[]'
	);

	CREATE TABLE IF NOT EXISTS towns (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		comments TEXT
	);

	CREATE TABLE IF NOT EXISTS students (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		parent_name TEXT NOT NULL,
		class_name TEXT NOT NULL CHECK (class_name IN ('Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th')),
		town_id INTEGER NOT NULL,
		date_of_birth TEXT,
		contact_number TEXT,
		aadhaar_number TEXT,
		comments TEXT,
		school_bus_opted INTEGER NOT NULL DEFAULT 0 CHECK (school_bus_opted IN (0, 1)),
		total_annual_fees REAL NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (town_id) REFERENCES towns(id) ON DELETE RESTRICT
	);

	CREATE TABLE IF NOT EXISTS employees (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		role TEXT,
		contact TEXT,
		salary REAL NOT NULL DEFAULT 0,
		comments TEXT
	);

	CREATE TABLE IF NOT EXISTS vehicles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		vehicle_number TEXT UNIQUE,
		vehicle_type TEXT,
		comments TEXT
	);

	CREATE TABLE IF NOT EXISTS income (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		method TEXT NOT NULL CHECK (method IN ${METHOD_CHECK_CONSTRAINT}),
		type TEXT NOT NULL,
		receipt_number TEXT,
		student_id INTEGER,
		amount REAL NOT NULL,
		comments TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS expenses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		method TEXT NOT NULL CHECK (method IN ${METHOD_CHECK_CONSTRAINT}),
		type TEXT NOT NULL,
		receipt_number TEXT,
		employee_id INTEGER,
		vehicle_id INTEGER,
		amount REAL NOT NULL,
		comments TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
		FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS kilometer_tracker (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		vehicle_id INTEGER NOT NULL,
		kilometer_reading REAL NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
	);

	CREATE TABLE IF NOT EXISTS master_transfers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		date TEXT NOT NULL,
		from_method TEXT NOT NULL CHECK (from_method IN ('cash', 'online')),
		to_method TEXT NOT NULL CHECK (to_method IN ('cash', 'online')),
		amount REAL NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE INDEX IF NOT EXISTS idx_students_town_id ON students(town_id);
	CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
	CREATE INDEX IF NOT EXISTS idx_income_student_id ON income(student_id);
	CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
	CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
	CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);
	CREATE INDEX IF NOT EXISTS idx_kilometer_tracker_date ON kilometer_tracker(date);
	CREATE INDEX IF NOT EXISTS idx_kilometer_tracker_vehicle_id ON kilometer_tracker(vehicle_id);
	CREATE INDEX IF NOT EXISTS idx_master_transfers_date ON master_transfers(date);
`);

migrateTypeConstraintTables();
migrateMethodConstraintTables();
migrateMasterTables();
migrateReceiptNumberColumns();
migrateExpenseVehicleForeignKey();

db.exec(`
	CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
	CREATE INDEX IF NOT EXISTS idx_income_student_id ON income(student_id);
	CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
	CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
	CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);
	CREATE INDEX IF NOT EXISTS idx_kilometer_tracker_date ON kilometer_tracker(date);
	CREATE INDEX IF NOT EXISTS idx_kilometer_tracker_vehicle_id ON kilometer_tracker(vehicle_id);
	CREATE INDEX IF NOT EXISTS idx_master_transfers_date ON master_transfers(date);
`);

db.prepare(
	`INSERT OR IGNORE INTO settings (id, master_cash_start, master_online_start, todos_json)
	 VALUES (1, 0, 0, '[]')`
).run();

const defaultTowns = ['Bhungra'];
const townCount = db.prepare('SELECT COUNT(*) AS count FROM towns').get().count;

if (townCount === 0) {
	const insertTown = db.prepare('INSERT INTO towns (name) VALUES (?)');
	const seedTowns = db.transaction((items) => {
		for (const item of items) {
			insertTown.run(item);
		}
	});
	seedTowns(defaultTowns);
}

export default db;
