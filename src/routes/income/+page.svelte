<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import {
		CLASS_OPTIONS,
		DATE_RANGE_OPTIONS,
		INCOME_TYPES_SUPPORTING_STUDENT,
		INCOME_TYPES_REQUIRING_STUDENT,
		INCOME_TYPE_OPTIONS,
		METHOD_OPTIONS,
		formatINR,
		formatStudentName,
		getDateRange,
		toDateInput
	} from '$lib/constants.js';

	const getLatestEntryDate = (entries) => entries?.[0]?.date || toDateInput(new Date());
	const getLatestEntryReceiptNumber = (entries) => String(entries?.[0]?.receipt_number || '').trim();
	const normalizeFuzzyText = (value = '') =>
		String(value)
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();

	const levenshteinDistanceWithinLimit = (source, target, limit) => {
		if (!source || !target) return Math.max(source.length, target.length);
		if (Math.abs(source.length - target.length) > limit) return limit + 1;

		let previousRow = Array.from({ length: target.length + 1 }, (_, index) => index);

		for (let i = 1; i <= source.length; i += 1) {
			const currentRow = [i];
			let rowMin = currentRow[0];

			for (let j = 1; j <= target.length; j += 1) {
				const insertion = currentRow[j - 1] + 1;
				const deletion = previousRow[j] + 1;
				const substitution = previousRow[j - 1] + (source[i - 1] === target[j - 1] ? 0 : 1);
				const cell = Math.min(insertion, deletion, substitution);
				currentRow.push(cell);
				if (cell < rowMin) rowMin = cell;
			}

			if (rowMin > limit) return limit + 1;
			previousRow = currentRow;
		}

		return previousRow[target.length];
	};

	const fuzzyWordMatch = (queryToken, candidateToken) => {
		if (!queryToken || !candidateToken) return false;
		if (candidateToken.includes(queryToken) || queryToken.includes(candidateToken)) return true;

		if (queryToken.length <= 2) return false;
		const distanceLimit = queryToken.length <= 4 ? 1 : queryToken.length <= 7 ? 2 : 3;
		return levenshteinDistanceWithinLimit(queryToken, candidateToken, distanceLimit) <= distanceLimit;
	};

	const fuzzySearchMatch = (searchValue, fields = []) => {
		const normalizedQuery = normalizeFuzzyText(searchValue);
		if (!normalizedQuery) return true;

		const candidateText = normalizeFuzzyText(fields.filter(Boolean).join(' '));
		if (!candidateText) return false;
		if (candidateText.includes(normalizedQuery)) return true;

		const queryTokens = normalizedQuery.split(' ');
		const candidateTokens = candidateText.split(' ');
		return queryTokens.every((queryToken) =>
			candidateTokens.some((candidateToken) => fuzzyWordMatch(queryToken, candidateToken))
		);
	};

	const emptyForm = (defaultDate = toDateInput(new Date()), defaultReceiptNumber = '') => ({
		date: defaultDate,
		method: 'cash',
		type: 'fees',
		receipt_number: defaultReceiptNumber,
		class_filter: 'any',
		student_id: '',
		amount: '',
		comments: ''
	});

	let students = [];
	let incomeList = [];
	let drawerOpen = false;
	let editingId = null;
	let message = '';
	let form = emptyForm();
	let filters = {
		method: 'all',
		type: 'all',
		student_id: 'all',
		search: '',
		range: 'last-3-months',
		custom_start: toDateInput(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)),
		custom_end: toDateInput(new Date())
	};
	let showStudentColumn = false;
	let showClassColumn = false;
	let showActionColumn = false;
	let showCalculatedTotal = false;

	const loadData = async () => {
		const [studentsRes, incomeRes] = await Promise.all([fetch('/api/students'), fetch('/api/income')]);
		if (studentsRes.ok) students = await studentsRes.json();
		if (incomeRes.ok) incomeList = await incomeRes.json();
	};

	const openCreate = () => {
		editingId = null;
		message = '';
		form = emptyForm(getLatestEntryDate(incomeList), getLatestEntryReceiptNumber(incomeList));
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
			class_filter: entry.class_name || 'any',
			student_id: entry.student_id ? String(entry.student_id) : '',
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

	const submitIncome = async () => {
		message = '';
		if (editingId && !window.confirm('Save changes to this income entry?')) return;
		const endpoint = editingId ? `/api/income/${editingId}` : '/api/income';
		const method = editingId ? 'PUT' : 'POST';
		const res = await fetch(endpoint, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...form,
				student_id: form.student_id ? Number(form.student_id) : null,
				amount: Number(form.amount || 0)
			})
		});

		if (res.ok) {
			await loadData();
			closeDrawer();
			return;
		}

		const error = await res.json();
		message = error.error || 'Unable to save income entry.';
	};

	const deleteIncome = async (entry) => {
		if (!window.confirm('Delete this income entry?')) return;
		const res = await fetch(`/api/income/${entry.id}`, { method: 'DELETE' });
		if (res.ok) await loadData();
	};

	$: studentSupported = INCOME_TYPES_SUPPORTING_STUDENT.includes(form.type);
	$: studentRequired = INCOME_TYPES_REQUIRING_STUDENT.includes(form.type);
	$: filteredStudentsForForm = students.filter((student) => {
		if (form.class_filter === 'any') return true;
		return student.class_name === form.class_filter;
	});
	$: if (!studentSupported) form.student_id = '';

	$: currentRange = getDateRange(filters.range, filters.custom_start, filters.custom_end);
	$: filteredIncome = incomeList.filter((entry) => {
		if (filters.method !== 'all' && entry.method !== filters.method) return false;
		if (filters.type !== 'all' && entry.type !== filters.type) return false;
		if (
			INCOME_TYPES_SUPPORTING_STUDENT.includes(filters.type) &&
			filters.student_id !== 'all' &&
			String(entry.student_id || '') !== String(filters.student_id)
		) {
			return false;
		}
		if (currentRange.start && entry.date < currentRange.start) return false;
		if (currentRange.end && entry.date > currentRange.end) return false;
		if (
			!fuzzySearchMatch(filters.search, [
				entry.student_name,
				entry.parent_name,
				entry.town_name,
				entry.comments
			])
		) {
			return false;
		}
		return true;
	});
	$: filteredTotal = filteredIncome.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

	onMount(loadData);
</script>

<svelte:head>
	<title>Income | Brilliant Global School</title>
</svelte:head>

<section class="hero-panel">
	<div>
		<p class="eyebrow">Income</p>
		<h2>Collections and inward entries</h2>
		<p class="muted">Record fees, owner input, donations, school item payments, and other inward amounts.</p>
	</div>
	<div class="hero-actions">
		<button class="primary-button" on:click={openCreate}>Add Income</button>
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
		<strong>{filteredIncome.length}</strong>
		<small>Visible rows in the table below</small>
	</article>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Income Register</h3>
			<p class="muted">Default view shows amount, date, type, method, receipt number, and comments.</p>
		</div>
		<div class="action-row">
			{#if showCalculatedTotal}
				<span class="pill">Total of {filteredIncome.length} entries: <strong>{formatINR(filteredTotal)}</strong></span>
			{/if}
			<button class="secondary-button" on:click={() => (showCalculatedTotal = !showCalculatedTotal)}>
				{showCalculatedTotal ? 'Hide Total' : 'Calculate Total'}
			</button>
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
				{#each INCOME_TYPE_OPTIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
		{#if INCOME_TYPES_SUPPORTING_STUDENT.includes(filters.type)}
			<label>
				<span>Student Name</span>
				<select bind:value={filters.student_id}>
					<option value="all">All Students</option>
					{#each students as student}
						<option value={student.id}>{formatStudentName(student)}</option>
					{/each}
				</select>
			</label>
		{/if}
		<label>
			<span>Search Student / Comment</span>
			<input
				type="text"
				bind:value={filters.search}
				placeholder="Try: kiara, kira, kara, parent name"
			/>
		</label>
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
			<input type="checkbox" bind:checked={showStudentColumn} />
			<span>Show Student</span>
		</label>
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showClassColumn} />
			<span>Show Class</span>
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
					{#if showStudentColumn}
						<th>Student</th>
					{/if}
					{#if showClassColumn}
						<th>Class</th>
					{/if}
					<th class="comments-col">Comments</th>
					{#if showActionColumn}
						<th>Action</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#if filteredIncome.length === 0}
					<tr>
						<td colspan={7 + (showStudentColumn ? 1 : 0) + (showClassColumn ? 1 : 0) + (showActionColumn ? 1 : 0)} class="empty-cell">No income entries match the current filters.</td>
					</tr>
				{:else}
					{#each filteredIncome as entry}
						<tr>
							<td>{entry.date}</td>
							<td><strong>{formatINR(entry.amount)}</strong></td>
							<td>{INCOME_TYPE_OPTIONS.find((option) => option.value === entry.type)?.label || entry.type}</td>
							<td>{METHOD_OPTIONS.find((option) => option.value === entry.method)?.label || entry.method}</td>
							<td><strong>{entry.receipt_number || '-'}</strong></td>
							{#if showStudentColumn}
								<td>{entry.student_name ? formatStudentName(entry) : '-'}</td>
							{/if}
							{#if showClassColumn}
								<td>{entry.class_name || '-'}</td>
							{/if}
							<td class="comments-col">{entry.comments || '-'}</td>
							{#if showActionColumn}
								<td>
									<div class="action-row">
										<button class="secondary-button" on:click={() => openEdit(entry)}>Edit</button>
										<button class="ghost-button" on:click={() => deleteIncome(entry)}>Delete</button>
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
	title={editingId ? 'Edit Income Entry' : 'Add Income Entry'}
	subtitle="Fees and School Item can be saved without a student and linked later."
	on:close={closeDrawer}
>
	<form class="drawer-form" on:submit|preventDefault={submitIncome}>
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
					{#each INCOME_TYPE_OPTIONS as option}
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

			{#if studentSupported}
				<label>
					<span>Class Filter</span>
					<select bind:value={form.class_filter}>
						<option value="any">Any</option>
						{#each CLASS_OPTIONS as className}
							<option value={className}>{className}</option>
						{/each}
					</select>
				</label>
				<label class="wide">
					<span>Student {studentRequired ? '*' : '(optional)'}</span>
					<select bind:value={form.student_id}>
						<option value="">{studentRequired ? 'Select student' : 'Select student later'}</option>
						{#each filteredStudentsForForm as student}
							<option value={student.id}>{formatStudentName(student)}</option>
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
