<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { EMPLOYEE_ROLE_OPTIONS, formatINR } from '$lib/constants.js';

	const emptyBalances = () => ({ master_cash_balance: 0, master_account_balance: 0 });
	const emptyTransfer = () => ({ date: new Date().toISOString().slice(0, 10), from_method: 'cash', to_method: 'online', amount: '' });
	const emptyEmployee = () => ({ name: '', role: EMPLOYEE_ROLE_OPTIONS[0], contact: '', salary: 0, comments: '' });
	const emptyVehicle = () => ({ name: '', vehicle_number: '', vehicle_type: '', comments: '' });
	const emptyTown = () => ({ name: '', comments: '' });
	const transferModeLabels = { cash: 'Cash', online: 'Online' };

	const formatVehicleLabel = (vehicle) => {
		const name = String(vehicle?.name || '').trim();
		const number = String(vehicle?.vehicle_number || '').trim();
		return number ? `${name} (${number})` : name || '-';
	};

	let balances = emptyBalances();
	let employees = [];
	let vehicles = [];
	let towns = [];
	let transfers = [];
	let drawerOpen = false;
	let drawerKind = 'balances';
	let editingId = null;
	let message = '';
	let employeeForm = emptyEmployee();
	let vehicleForm = emptyVehicle();
	let townForm = emptyTown();
	let balanceForm = emptyBalances();
	let transferForm = emptyTransfer();

	const loadAll = async () => {
		const [balancesRes, employeesRes, vehiclesRes, townsRes, transfersRes] = await Promise.all([
			fetch('/api/master-balances'),
			fetch('/api/employees'),
			fetch('/api/vehicles'),
			fetch('/api/towns'),
			fetch('/api/master-transfers')
		]);
		if (balancesRes.ok) {
			balances = await balancesRes.json();
			balanceForm = {
				master_cash_balance: balances.master_cash_balance,
				master_account_balance: balances.master_account_balance
			};
		}
		if (employeesRes.ok) employees = await employeesRes.json();
		if (vehiclesRes.ok) vehicles = await vehiclesRes.json();
		if (townsRes.ok) towns = await townsRes.json();
		if (transfersRes.ok) transfers = await transfersRes.json();
	};

	const openBalances = () => {
		drawerKind = 'balances';
		editingId = null;
		message = '';
		balanceForm = {
			master_cash_balance: balances.master_cash_balance,
			master_account_balance: balances.master_account_balance
		};
		drawerOpen = true;
	};

	const openEmployee = (employee = null) => {
		drawerKind = 'employee';
		editingId = employee?.id || null;
		message = '';
		employeeForm = employee
			? {
				name: employee.name || '',
				role: employee.role || EMPLOYEE_ROLE_OPTIONS[0],
				contact: employee.contact || '',
				salary: Number(employee.salary || 0),
				comments: employee.comments || ''
			}
			: emptyEmployee();
		drawerOpen = true;
	};

	const openTransfer = () => {
		drawerKind = 'transfer';
		editingId = null;
		message = '';
		transferForm = emptyTransfer();
		drawerOpen = true;
	};

	const openVehicle = (vehicle = null) => {
		drawerKind = 'vehicle';
		editingId = vehicle?.id || null;
		message = '';
		vehicleForm = vehicle
			? {
				name: vehicle.name || '',
				vehicle_number: vehicle.vehicle_number || '',
				vehicle_type: vehicle.vehicle_type || '',
				comments: vehicle.comments || ''
			}
			: emptyVehicle();
		drawerOpen = true;
	};

	const openTown = (town = null) => {
		drawerKind = 'town';
		editingId = town?.id || null;
		message = '';
		townForm = town ? { name: town.name || '', comments: town.comments || '' } : emptyTown();
		drawerOpen = true;
	};

	const closeDrawer = () => {
		drawerOpen = false;
		editingId = null;
		message = '';
	};

	const saveBalances = async () => {
		const res = await fetch('/api/master-balances', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(balanceForm)
		});
		if (res.ok) {
			await loadAll();
			closeDrawer();
			return;
		}
		const error = await res.json();
		message = error.error || 'Unable to save master balances.';
	};

	const saveEmployee = async () => {
		const endpoint = editingId ? `/api/employees/${editingId}` : '/api/employees';
		const method = editingId ? 'PUT' : 'POST';
		const res = await fetch(endpoint, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(employeeForm)
		});
		if (res.ok) {
			await loadAll();
			closeDrawer();
			return;
		}
		const error = await res.json();
		message = error.error || 'Unable to save employee.';
	};

	const saveTransfer = async () => {
		const res = await fetch('/api/master-transfers', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...transferForm,
				amount: Number(transferForm.amount || 0)
			})
		});
		if (res.ok) {
			await loadAll();
			closeDrawer();
			return;
		}
		const error = await res.json();
		message = error.error || 'Unable to save transfer.';
	};

	const saveVehicle = async () => {
		const endpoint = editingId ? `/api/vehicles/${editingId}` : '/api/vehicles';
		const method = editingId ? 'PUT' : 'POST';
		const res = await fetch(endpoint, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(vehicleForm)
		});
		if (res.ok) {
			await loadAll();
			closeDrawer();
			return;
		}
		const error = await res.json();
		message = error.error || 'Unable to save vehicle.';
	};

	const saveTown = async () => {
		const endpoint = editingId ? `/api/towns/${editingId}` : '/api/towns';
		const method = editingId ? 'PUT' : 'POST';
		const res = await fetch(endpoint, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(townForm)
		});
		if (res.ok) {
			await loadAll();
			closeDrawer();
			return;
		}
		const error = await res.json();
		message = error.error || 'Unable to save town.';
	};

	const removeItem = async (kind, item) => {
		if (!window.confirm(`Delete this ${kind}?`)) return;
		const res = await fetch(`/api/${kind}s/${item.id}`, { method: 'DELETE' });
		if (res.ok) {
			await loadAll();
			return;
		}
		const error = await res.json();
		window.alert(error.error || `Unable to delete ${kind}.`);
	};

	const removeTransfer = async (transfer) => {
		if (!window.confirm('Delete this transfer?')) return;
		const res = await fetch(`/api/master-transfers/${transfer.id}`, { method: 'DELETE' });
		if (res.ok) {
			await loadAll();
			return;
		}
		const error = await res.json();
		window.alert(error.error || 'Unable to delete transfer.');
	};

	onMount(loadAll);
</script>

<svelte:head>
	<title>Masters | Brilliant Global School</title>
</svelte:head>

<section class="hero-panel">
	<div>
		<p class="eyebrow">Masters</p>
		<h2>School lookup data and master balances</h2>
		<p class="muted">Manage the lookup tables used across students, income, and expenses.</p>
	</div>
</section>

<section class="stats-grid compact-top">
	<article class="stat-card">
		<span>Master Cash Balance</span>
		<strong>{formatINR(balances.master_cash_balance)}</strong>
		<small>Opening cash plus cash income minus cash expenses plus net cash transfers</small>
	</article>
	<article class="stat-card">
		<span>Master Account Balance</span>
		<strong>{formatINR(balances.master_account_balance)}</strong>
		<small>Opening account plus online income minus online expenses plus net online transfers</small>
	</article>
	<article class="stat-card">
		<span>Lookup Counts</span>
		<strong>{employees.length + vehicles.length + towns.length}</strong>
		<small>{employees.length} employees, {vehicles.length} vehicles, {towns.length} towns</small>
	</article>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Master Balance Transfers</h3>
			<p class="muted">Move money between master cash and master account while keeping a dated transfer history.</p>
		</div>
		<button class="primary-button" on:click={openTransfer}>Add Transfer</button>
	</div>
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>From</th>
					<th>To</th>
					<th>Amount</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{#if transfers.length === 0}
					<tr><td colspan="5" class="empty-cell">No master balance transfers recorded yet.</td></tr>
				{:else}
					{#each transfers as transfer}
						<tr>
							<td>{transfer.date}</td>
							<td>{transferModeLabels[transfer.from_method] || transfer.from_method}</td>
							<td>{transferModeLabels[transfer.to_method] || transfer.to_method}</td>
							<td>{formatINR(transfer.amount)}</td>
							<td>
								<button class="ghost-button" on:click={() => removeTransfer(transfer)}>Delete</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Reset Master Balances</h3>
			<p class="muted">Set the live master cash and account balances directly if you need to correct or reset them.</p>
		</div>
		<button class="primary-button" on:click={openBalances}>Edit Balances</button>
	</div>
	<div class="stats-grid" style="margin-bottom: 0;">
		<article class="stat-card">
			<span>Current Master Cash</span>
			<strong>{formatINR(balances.master_cash_balance)}</strong>
		</article>
		<article class="stat-card">
			<span>Current Master Account</span>
			<strong>{formatINR(balances.master_account_balance)}</strong>
		</article>
	</div>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Employees</h3>
			<p class="muted">Used when recording Salary expenses.</p>
		</div>
		<button class="primary-button" on:click={() => openEmployee()}>Add Employee</button>
	</div>
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Role</th>
					<th>Contact</th>
					<th>Salary</th>
					<th>Comments</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{#if employees.length === 0}
					<tr><td colspan="6" class="empty-cell">No employees added yet.</td></tr>
				{:else}
					{#each employees as employee}
						<tr>
							<td>{employee.name}</td>
							<td>{employee.role || '-'}</td>
							<td>{employee.contact || '-'}</td>
							<td>{formatINR(employee.salary)}</td>
							<td>{employee.comments || '-'}</td>
							<td>
								<div class="action-row">
									<button class="secondary-button" on:click={() => openEmployee(employee)}>Edit</button>
									<button class="ghost-button" on:click={() => removeItem('employee', employee)}>Delete</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Vehicles</h3>
			<p class="muted">Used when recording Vehicle Expense entries.</p>
		</div>
		<button class="primary-button" on:click={() => openVehicle()}>Add Vehicle</button>
	</div>
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Vehicle Name</th>
					<th>Vehicle Number</th>
					<th>Type</th>
					<th>Comments</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{#if vehicles.length === 0}
					<tr><td colspan="5" class="empty-cell">No vehicles added yet.</td></tr>
				{:else}
					{#each vehicles as vehicle}
						<tr>
							<td>{vehicle.name}</td>
							<td>{vehicle.vehicle_number || '-'}</td>
							<td>{vehicle.vehicle_type || '-'}</td>
							<td>{vehicle.comments || '-'}</td>
							<td>
								<div class="action-row">
									<button class="secondary-button" on:click={() => openVehicle(vehicle)}>Edit</button>
									<button class="ghost-button" on:click={() => removeItem('vehicle', vehicle)}>Delete</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Towns</h3>
			<p class="muted">Used in the student admission form.</p>
		</div>
		<button class="primary-button" on:click={() => openTown()}>Add Town</button>
	</div>
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Town</th>
					<th>Comments</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{#if towns.length === 0}
					<tr><td colspan="3" class="empty-cell">No towns added yet.</td></tr>
				{:else}
					{#each towns as town}
						<tr>
							<td>{town.name}</td>
							<td>{town.comments || '-'}</td>
							<td>
								<div class="action-row">
									<button class="secondary-button" on:click={() => openTown(town)}>Edit</button>
									<button class="ghost-button" on:click={() => removeItem('town', town)}>Delete</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<Drawer
	open={drawerOpen}
	title={drawerKind === 'balances' ? 'Set Master Balances' : drawerKind === 'transfer' ? 'Add Master Balance Transfer' : drawerKind === 'employee' ? (editingId ? 'Edit Employee' : 'Add Employee') : drawerKind === 'vehicle' ? (editingId ? 'Edit Vehicle' : 'Add Vehicle') : (editingId ? 'Edit Town' : 'Add Town')}
	subtitle={drawerKind === 'balances' ? 'This sets the current master balances directly and recalculates the internal base values.' : drawerKind === 'transfer' ? 'Transfers move amount from one master balance to the other on the selected date.' : drawerKind === 'employee' ? 'Employees are linked to Salary expenses.' : drawerKind === 'vehicle' ? 'Vehicles are linked to Fuel expenses.' : 'Towns appear in the student admission form.'}
	on:close={closeDrawer}
>
	{#if drawerKind === 'balances'}
		<form class="drawer-form" on:submit|preventDefault={saveBalances}>
			<div class="form-grid">
				<label>
					<span>Master Cash Balance</span>
					<input type="number" min="0" step="1" bind:value={balanceForm.master_cash_balance} />
				</label>
				<label>
					<span>Master Account Balance</span>
					<input type="number" min="0" step="1" bind:value={balanceForm.master_account_balance} />
				</label>
			</div>
			{#if message}<p class="form-error">{message}</p>{/if}
			<div class="drawer-actions">
				<button type="button" class="ghost-button" on:click={closeDrawer}>Cancel</button>
				<button type="submit" class="primary-button">Reset Balances</button>
			</div>
		</form>
	{:else if drawerKind === 'transfer'}
		<form class="drawer-form" on:submit|preventDefault={saveTransfer}>
			<div class="form-grid">
				<label>
					<span>Date</span>
					<input type="date" bind:value={transferForm.date} />
				</label>
				<label>
					<span>From</span>
					<select bind:value={transferForm.from_method}>
						<option value="cash">Cash</option>
						<option value="online">Online</option>
					</select>
				</label>
				<label>
					<span>To</span>
					<select bind:value={transferForm.to_method}>
						<option value="cash">Cash</option>
						<option value="online">Online</option>
					</select>
				</label>
				<label>
					<span>Amount</span>
					<input type="number" min="1" step="1" bind:value={transferForm.amount} />
				</label>
			</div>
			{#if message}<p class="form-error">{message}</p>{/if}
			<div class="drawer-actions">
				<button type="button" class="ghost-button" on:click={closeDrawer}>Cancel</button>
				<button type="submit" class="primary-button">Save Transfer</button>
			</div>
		</form>
	{:else if drawerKind === 'employee'}
		<form class="drawer-form" on:submit|preventDefault={saveEmployee}>
			<div class="form-grid">
				<label><span>Name</span><input type="text" bind:value={employeeForm.name} /></label>
				<label>
					<span>Role</span>
					<select bind:value={employeeForm.role}>
						{#each EMPLOYEE_ROLE_OPTIONS as role}
							<option value={role}>{role}</option>
						{/each}
					</select>
				</label>
				<label><span>Contact</span><input type="text" bind:value={employeeForm.contact} /></label>
				<label><span>Salary</span><input type="number" min="0" step="1" bind:value={employeeForm.salary} /></label>
				<label class="wide"><span>Comments</span><textarea rows="4" bind:value={employeeForm.comments}></textarea></label>
			</div>
			{#if message}<p class="form-error">{message}</p>{/if}
			<div class="drawer-actions">
				<button type="button" class="ghost-button" on:click={closeDrawer}>Cancel</button>
				<button type="submit" class="primary-button">Save Employee</button>
			</div>
		</form>
	{:else if drawerKind === 'vehicle'}
		<form class="drawer-form" on:submit|preventDefault={saveVehicle}>
			<div class="form-grid">
				<label><span>Vehicle Name</span><input type="text" bind:value={vehicleForm.name} /></label>
				<label><span>Vehicle Number</span><input type="text" bind:value={vehicleForm.vehicle_number} /></label>
				<label><span>Type</span><input type="text" bind:value={vehicleForm.vehicle_type} /></label>
				<label class="wide"><span>Comments</span><textarea rows="4" bind:value={vehicleForm.comments}></textarea></label>
			</div>
			{#if message}<p class="form-error">{message}</p>{/if}
			<div class="drawer-actions">
				<button type="button" class="ghost-button" on:click={closeDrawer}>Cancel</button>
				<button type="submit" class="primary-button">Save Vehicle</button>
			</div>
		</form>
	{:else}
		<form class="drawer-form" on:submit|preventDefault={saveTown}>
			<div class="form-grid">
				<label><span>Town Name</span><input type="text" bind:value={townForm.name} /></label>
				<label class="wide"><span>Comments</span><textarea rows="4" bind:value={townForm.comments}></textarea></label>
			</div>
			{#if message}<p class="form-error">{message}</p>{/if}
			<div class="drawer-actions">
				<button type="button" class="ghost-button" on:click={closeDrawer}>Cancel</button>
				<button type="submit" class="primary-button">Save Town</button>
			</div>
		</form>
	{/if}
</Drawer>
