<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import {
		DATE_RANGE_OPTIONS,
		EXPENSE_TYPES_REQUIRING_EMPLOYEE,
		EXPENSE_TYPES_REQUIRING_VEHICLE,
		EXPENSE_TYPE_OPTIONS,
		METHOD_OPTIONS,
		formatINR,
		getDateRange,
		toDateInput
	} from '$lib/constants.js';

	const formatVehicleLabel = (vehicle) => {
		const name = String(vehicle?.name || '').trim();
		const number = String(vehicle?.vehicle_number || '').trim();
		return number ? `${name} (${number})` : name || '-';
	};

	const getLatestEntryDate = (entries) => entries?.[0]?.date || toDateInput(new Date());
	const getLatestEntryReceiptNumber = (entries) => String(entries?.[0]?.receipt_number || '').trim();

	const emptyForm = (defaultDate = toDateInput(new Date()), defaultReceiptNumber = '') => ({
		date: defaultDate,
		method: 'cash',
		type: 'salary',
		receipt_number: defaultReceiptNumber,
		employee_id: '',
		vehicle_id: '',
		amount: '',
		comments: ''
	});

	let employees = [];
	let vehicles = [];
	let expenseList = [];
	let drawerOpen = false;
	let editingId = null;
	let message = '';
	let form = emptyForm();
	let filters = {
		method: 'all',
		type: 'all',
		employee_id: 'all',
		vehicle_id: 'all',
		range: 'last-3-months',
		custom_start: toDateInput(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)),
		custom_end: toDateInput(new Date())
	};
	let showEmployeeColumn = false;
	let showVehicleColumn = false;
	let showActionColumn = false;

	const loadData = async () => {
		const [employeesRes, vehiclesRes, expensesRes] = await Promise.all([
			fetch('/api/employees'),
			fetch('/api/vehicles'),
			fetch('/api/expenses')
		]);
		if (employeesRes.ok) employees = await employeesRes.json();
		if (vehiclesRes.ok) vehicles = await vehiclesRes.json();
		if (expensesRes.ok) expenseList = await expensesRes.json();
	};

	const openCreate = () => {
		editingId = null;
		message = '';
		form = emptyForm(getLatestEntryDate(expenseList), getLatestEntryReceiptNumber(expenseList));
		drawerOpen = true;
	};

	const openEdit = (entry) => {
		editingId = entry.id;
		message = '';
		form = {
			date: entry.date,
			method: entry.method,
			type: entry.type,
			receipt_number: entry.receipt_number || '',
			employee_id: entry.employee_id ? String(entry.employee_id) : '',
			vehicle_id: entry.vehicle_id ? String(entry.vehicle_id) : '',
			amount: Number(entry.amount || 0),
			comments: entry.comments || ''
		};
		drawerOpen = true;
	};

	const closeDrawer = () => {
		drawerOpen = false;
		editingId = null;
		message = '';
	};

	const submitExpense = async () => {
		message = '';
		if (editingId && !window.confirm('Save changes to this expense entry?')) return;
		const endpoint = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
		const method = editingId ? 'PUT' : 'POST';
		const res = await fetch(endpoint, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...form,
				employee_id: form.employee_id ? Number(form.employee_id) : null,
				vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
				amount: Number(form.amount || 0)
			})
		});

		if (res.ok) {
			await loadData();
			closeDrawer();
			return;
		}

		const error = await res.json();
		message = error.error || 'Unable to save expense entry.';
	};

	const deleteExpense = async (entry) => {
		if (!window.confirm('Delete this expense entry?')) return;
		const res = await fetch(`/api/expenses/${entry.id}`, { method: 'DELETE' });
		if (res.ok) await loadData();
	};

	$: employeeRequired = EXPENSE_TYPES_REQUIRING_EMPLOYEE.includes(form.type);
	$: vehicleRequired = EXPENSE_TYPES_REQUIRING_VEHICLE.includes(form.type);
	$: if (!employeeRequired) form.employee_id = '';
	$: if (!vehicleRequired) form.vehicle_id = '';

	$: currentRange = getDateRange(filters.range, filters.custom_start, filters.custom_end);
	$: filteredExpenses = expenseList.filter((entry) => {
		if (filters.method !== 'all' && entry.method !== filters.method) return false;
		if (filters.type !== 'all' && entry.type !== filters.type) return false;
		if (
			filters.type === 'salary' &&
			filters.employee_id !== 'all' &&
			String(entry.employee_id || '') !== String(filters.employee_id)
		) {
			return false;
		}
		if (
			filters.type === 'fuel' &&
			filters.vehicle_id !== 'all' &&
			String(entry.vehicle_id || '') !== String(filters.vehicle_id)
		) {
			return false;
		}
		if (currentRange.start && entry.date < currentRange.start) return false;
		if (currentRange.end && entry.date > currentRange.end) return false;
		return true;
	});
	$: filteredTotal = filteredExpenses.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

	onMount(loadData);
</script>

<svelte:head>
	<title>Expenses | Brilliant Global School</title>
</svelte:head>

<section class="hero-panel">
	<div>
		<p class="eyebrow">Expenses</p>
		<h2>Outgoing payments and operational spend</h2>
		<p class="muted">Track salaries, vehicle expenses, school items, food, supplies, maintenance, toiletries, marketing, miscellaneous spend, and owner payouts.</p>
	</div>
	<div class="hero-actions">
		<button class="primary-button" on:click={openCreate}>Add Expense</button>
	</div>
</section>

<section class="stats-grid compact-top">
	<article class="stat-card">
		<span>Filtered Total</span>
		<strong>{formatINR(filteredTotal)}</strong>
		<small>Based on the current date range and filters</small>
	</article>
	<article class="stat-card">
		<span>Entries</span>
		<strong>{filteredExpenses.length}</strong>
		<small>Visible rows in the table below</small>
	</article>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Expense Register</h3>
			<p class="muted">Default view shows amount, date, type, method, receipt number, and comments.</p>
		</div>
	</div>

	<div class="filter-bar">
		<label>
			<span>Method</span>
			<select bind:value={filters.method}>
				<option value="all">All</option>
				{#each METHOD_OPTIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
		<label>
			<span>Type</span>
			<select bind:value={filters.type}>
				<option value="all">All</option>
				{#each EXPENSE_TYPE_OPTIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
		{#if filters.type === 'salary'}
			<label>
				<span>Employee</span>
				<select bind:value={filters.employee_id}>
					<option value="all">All Employees</option>
					{#each employees as employee}
						<option value={employee.id}>{employee.name}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if filters.type === 'fuel'}
			<label>
				<span>Vehicle</span>
				<select bind:value={filters.vehicle_id}>
					<option value="all">All Vehicles</option>
					{#each vehicles as vehicle}
						<option value={vehicle.id}>{formatVehicleLabel(vehicle)}</option>
					{/each}
				</select>
			</label>
		{/if}
		<label>
			<span>Date Range</span>
			<select bind:value={filters.range}>
				{#each DATE_RANGE_OPTIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
		{#if filters.range === 'custom'}
			<label>
				<span>From</span>
				<input type="date" bind:value={filters.custom_start} />
			</label>
			<label>
				<span>To</span>
				<input type="date" bind:value={filters.custom_end} />
			</label>
		{/if}
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showEmployeeColumn} />
			<span>Show Employee</span>
		</label>
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showVehicleColumn} />
			<span>Show Vehicle</span>
		</label>
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showActionColumn} />
			<span>Show Action</span>
		</label>
	</div>

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>Amount</th>
					<th>Type</th>
					<th>Method</th>
					<th>Receipt No.</th>
					{#if showEmployeeColumn}
						<th>Employee</th>
					{/if}
					{#if showVehicleColumn}
						<th>Vehicle</th>
					{/if}
					<th class="comments-col">Comments</th>
					{#if showActionColumn}
						<th>Action</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#if filteredExpenses.length === 0}
					<tr>
						<td colspan={7 + (showEmployeeColumn ? 1 : 0) + (showVehicleColumn ? 1 : 0) + (showActionColumn ? 1 : 0)} class="empty-cell">No expenses match the current filters.</td>
					</tr>
				{:else}
					{#each filteredExpenses as entry}
						<tr>
							<td>{entry.date}</td>
							<td><strong>{formatINR(entry.amount)}</strong></td>
							<td>{EXPENSE_TYPE_OPTIONS.find((option) => option.value === entry.type)?.label || entry.type}</td>
							<td>{METHOD_OPTIONS.find((option) => option.value === entry.method)?.label || entry.method}</td>
							<td><strong>{entry.receipt_number || '-'}</strong></td>
							{#if showEmployeeColumn}
								<td>{entry.employee_name || '-'}</td>
							{/if}
							{#if showVehicleColumn}
								<td>{formatVehicleLabel(entry)}</td>
							{/if}
							<td class="comments-col">{entry.comments || '-'}</td>
							{#if showActionColumn}
								<td>
									<div class="action-row">
										<button class="secondary-button" on:click={() => openEdit(entry)}>Edit</button>
										<button class="ghost-button" on:click={() => deleteExpense(entry)}>Delete</button>
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<Drawer
	open={drawerOpen}
	title={editingId ? 'Edit Expense Entry' : 'Add Expense Entry'}
	subtitle="Salary requires an employee and Vehicle Expense requires a vehicle."
	on:close={closeDrawer}
>
	<form class="drawer-form" on:submit|preventDefault={submitExpense}>
		<div class="form-grid">
			<label>
				<span>Date</span>
				<input type="date" bind:value={form.date} />
			</label>
			<label>
				<span>Method</span>
				<select bind:value={form.method}>
					{#each METHOD_OPTIONS as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Type</span>
				<select bind:value={form.type}>
					{#each EXPENSE_TYPE_OPTIONS as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Amount</span>
				<input type="number" min="1" step="1" bind:value={form.amount} />
			</label>
			<label>
				<span>Receipt Number</span>
				<input type="text" bind:value={form.receipt_number} />
			</label>

			{#if employeeRequired}
				<label>
					<span>Employee *</span>
					<select bind:value={form.employee_id}>
						<option value="">Select employee</option>
						{#each employees as employee}
							<option value={employee.id}>{employee.name}</option>
						{/each}
					</select>
				</label>
			{/if}

			{#if vehicleRequired}
				<label>
					<span>Vehicle *</span>
					<select bind:value={form.vehicle_id}>
						<option value="">Select vehicle</option>
						{#each vehicles as vehicle}
							<option value={vehicle.id}>{formatVehicleLabel(vehicle)}</option>
						{/each}
					</select>
				</label>
			{/if}

			<label class="wide">
				<span>Comments</span>
				<textarea rows="4" bind:value={form.comments}></textarea>
			</label>
		</div>
		{#if message}
			<p class="form-error">{message}</p>
		{/if}
		<div class="drawer-actions">
			<button type="button" class="ghost-button" on:click={closeDrawer}>Cancel</button>
			<button type="submit" class="primary-button">{editingId ? 'Save Changes' : 'Create Entry'}</button>
		</div>
	</form>
</Drawer>

<style>
	:global(th.comments-col),
	:global(td.comments-col) {
		width: 40%;
		max-width: 40%;
		white-space: normal;
		overflow-wrap: anywhere;
		word-break: break-word;
	}
</style>
