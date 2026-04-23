<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { CLASS_OPTIONS, formatINR, formatStudentName } from '$lib/constants.js';

	const emptyForm = () => ({
		name: '',
		parent_name: '',
		class_name: CLASS_OPTIONS[0],
		town_id: '',
		date_of_birth: '',
		contact_number: '',
		aadhaar_number: '',
		comments: '',
		school_bus_opted: false,
		total_annual_fees: 0
	});

	let students = [];
	let towns = [];
	let filterClass = 'all';
	let searchTerm = '';
	let drawerOpen = false;
	let editingId = null;
	let message = '';
	let form = emptyForm();
	let showTownColumn = false;
	let showContactColumn = false;
	let showBusColumn = false;
	let showAnnualFeesColumn = false;
	let showActionColumn = false;

	const loadData = async () => {
		const [studentsRes, townsRes] = await Promise.all([fetch('/api/students'), fetch('/api/towns')]);
		if (studentsRes.ok) students = await studentsRes.json();
		if (townsRes.ok) towns = await townsRes.json();
	};

	const openCreate = () => {
		editingId = null;
		message = '';
		form = {
			...emptyForm(),
			town_id: towns[0]?.id ? String(towns[0].id) : ''
		};
		drawerOpen = true;
	};

	const openEdit = (student) => {
		editingId = student.id;
		message = '';
		form = {
			name: student.name || '',
			parent_name: student.parent_name || '',
			class_name: student.class_name || CLASS_OPTIONS[0],
			town_id: String(student.town_id || ''),
			date_of_birth: student.date_of_birth || '',
			contact_number: student.contact_number || '',
			aadhaar_number: student.aadhaar_number || '',
			comments: student.comments || '',
			school_bus_opted: Boolean(student.school_bus_opted),
			total_annual_fees: Number(student.total_annual_fees || 0)
		};
		drawerOpen = true;
	};

	const closeDrawer = () => {
		drawerOpen = false;
		editingId = null;
		message = '';
	};

	const submitStudent = async () => {
		message = '';
		const endpoint = editingId ? `/api/students/${editingId}` : '/api/students';
		const method = editingId ? 'PUT' : 'POST';
		const res = await fetch(endpoint, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...form,
				town_id: Number(form.town_id),
				total_annual_fees: Number(form.total_annual_fees || 0)
			})
		});

		if (res.ok) {
			await loadData();
			closeDrawer();
			return;
		}

		const error = await res.json();
		message = error.error || 'Unable to save student.';
	};

	const deleteStudent = async (student) => {
		if (!window.confirm(`Delete ${formatStudentName(student)}?`)) return;
		const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
		if (res.ok) {
			await loadData();
		}
	};

	$: filteredStudents = students.filter((student) => {
		const label = formatStudentName(student).toLowerCase();
		const matchesSearch =
			!searchTerm ||
			label.includes(searchTerm.toLowerCase()) ||
			String(student.town_name || '').toLowerCase().includes(searchTerm.toLowerCase());
		const matchesClass = filterClass === 'all' || student.class_name === filterClass;
		return matchesSearch && matchesClass;
	});

	$: totalAnnualFees = students.reduce((sum, student) => sum + Number(student.total_annual_fees || 0), 0);
	$: totalCollected = students.reduce((sum, student) => sum + Number(student.income_from_student || 0), 0);

	onMount(loadData);
</script>

<svelte:head>
	<title>Students | Brilliant Global School</title>
</svelte:head>

<section class="hero-panel">
	<div>
		<p class="eyebrow">Students</p>
		<h2>Admissions and fee-linked student records</h2>
		<p class="muted max-copy">
			Maintain the student directory, track annual fees, and keep every fees installment linked back to the right child.
		</p>
	</div>
	<div class="hero-actions">
		{#if towns.length === 0}
			<span class="pill warn">Add a town in Masters before creating students</span>
		{/if}
		<button class="primary-button" on:click={openCreate} disabled={towns.length === 0}>Add Student</button>
	</div>
</section>

<section class="stats-grid compact-top">
	<article class="stat-card">
		<span>Total Students</span>
		<strong>{students.length}</strong>
		<small>Active records in the school ledger</small>
	</article>
	<article class="stat-card">
		<span>Total Annual Fees</span>
		<strong>{formatINR(totalAnnualFees)}</strong>
		<small>Configured fee targets across all students</small>
	</article>
	<article class="stat-card">
		<span>Collected from Students</span>
		<strong>{formatINR(totalCollected)}</strong>
		<small>Live sum from linked income installments</small>
	</article>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Student List</h3>
			<p class="muted">Name is shown as Name c/o ParentName everywhere student references appear.</p>
		</div>
	</div>
	<div class="filter-bar">
		<label>
			<span>Search</span>
			<input type="text" placeholder="Search by student or town" bind:value={searchTerm} />
		</label>
		<label>
			<span>Class</span>
			<select bind:value={filterClass}>
				<option value="all">All Classes</option>
				{#each CLASS_OPTIONS as className}
					<option value={className}>{className}</option>
				{/each}
			</select>
		</label>
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showTownColumn} />
			<span>Show Town</span>
		</label>
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showContactColumn} />
			<span>Show Contact</span>
		</label>
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showBusColumn} />
			<span>Show Bus</span>
		</label>
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showAnnualFeesColumn} />
			<span>Show Annual Fees</span>
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
					<th>Student</th>
					<th>Class</th>
					{#if showTownColumn}
						<th>Town</th>
					{/if}
					{#if showContactColumn}
						<th>Contact</th>
					{/if}
					{#if showBusColumn}
						<th>Bus</th>
					{/if}
					{#if showAnnualFeesColumn}
						<th>Annual Fees</th>
					{/if}
					<th>Income from Student</th>
					<th>Comments</th>
					{#if showActionColumn}
						<th>Action</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#if filteredStudents.length === 0}
					<tr>
						<td colspan={5 + (showTownColumn ? 1 : 0) + (showContactColumn ? 1 : 0) + (showBusColumn ? 1 : 0) + (showAnnualFeesColumn ? 1 : 0) + (showActionColumn ? 1 : 0)} class="empty-cell">No students match the current filters.</td>
					</tr>
				{:else}
					{#each filteredStudents as student}
						<tr>
							<td>
								<div class="name-stack">
									<strong>{formatStudentName(student)}</strong>
									{#if student.date_of_birth}
										<small>DOB: {student.date_of_birth}</small>
									{/if}
								</div>
							</td>
							<td>{student.class_name}</td>
							{#if showTownColumn}
								<td>{student.town_name}</td>
							{/if}
							{#if showContactColumn}
								<td>{student.contact_number || '-'}</td>
							{/if}
							{#if showBusColumn}
								<td>{student.school_bus_opted ? 'Yes' : 'No'}</td>
							{/if}
							{#if showAnnualFeesColumn}
								<td>{formatINR(student.total_annual_fees)}</td>
							{/if}
							<td>{formatINR(student.income_from_student)}</td>
							<td>{student.comments || '-'}</td>
							{#if showActionColumn}
								<td>
									<div class="action-row">
										<button class="secondary-button" on:click={() => openEdit(student)}>Edit</button>
										<button class="ghost-button" on:click={() => deleteStudent(student)}>Delete</button>
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
	title={editingId ? 'Edit Student' : 'Add Student'}
	subtitle="Student fees are derived automatically from linked income entries."
	on:close={closeDrawer}
>
	<form class="drawer-form" on:submit|preventDefault={submitStudent}>
		<div class="form-grid">
			<label>
				<span>Name *</span>
				<input type="text" bind:value={form.name} required />
			</label>
			<label>
				<span>Parent's Name *</span>
				<input type="text" bind:value={form.parent_name} required />
			</label>
			<label>
				<span>Class *</span>
				<select bind:value={form.class_name}>
					{#each CLASS_OPTIONS as className}
						<option value={className}>{className}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Town *</span>
				<select bind:value={form.town_id}>
					<option value="">Select town</option>
					{#each towns as town}
						<option value={town.id}>{town.name}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Date of Birth</span>
				<input type="date" bind:value={form.date_of_birth} />
			</label>
			<label>
				<span>Contact Number</span>
				<input type="text" bind:value={form.contact_number} />
			</label>
			<label>
				<span>Aadhaar Number</span>
				<input type="text" bind:value={form.aadhaar_number} />
			</label>
			<label>
				<span>Total Annual Fees</span>
				<input type="number" min="0" step="1" bind:value={form.total_annual_fees} />
			</label>
			<label class="wide">
				<span>Comments</span>
				<textarea rows="4" bind:value={form.comments}></textarea>
			</label>
			<label class="checkbox-field wide inline-checkbox">
				<input type="checkbox" bind:checked={form.school_bus_opted} />
				<span>School bus opted</span>
			</label>
		</div>
		{#if message}
			<p class="form-error">{message}</p>
		{/if}
		<div class="drawer-actions">
			<button type="button" class="ghost-button" on:click={closeDrawer}>Cancel</button>
			<button type="submit" class="primary-button">{editingId ? 'Save Changes' : 'Create Student'}</button>
		</div>
	</form>
</Drawer>

<style>
	.max-copy {
		max-width: 52rem;
	}

	.name-stack {
		display: grid;
		gap: 0.22rem;
	}

	.name-stack small {
		color: var(--muted);
	}
</style>
