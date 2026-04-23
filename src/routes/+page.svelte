<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { SCHOOL_NAME, formatDayName, formatFullDate, formatINR, toDateInput } from '$lib/constants.js';

	let balances = {
		master_cash_balance: 0,
		master_account_balance: 0,
		cash_income: 0,
		cash_expense: 0,
		online_income: 0,
		online_expense: 0
	};
	let todos = [];
	let students = [];
	let newTodo = '';
	let message = '';
	let balanceDate = toDateInput(new Date());

	const today = new Date();

	const loadAll = async () => {
		const balanceQuery = balanceDate ? `?date=${balanceDate}` : '';
		const [balanceRes, boardRes, studentsRes] = await Promise.all([
			fetch(`/api/master-balances${balanceQuery}`),
			fetch('/api/boards'),
			fetch('/api/students')
		]);

		if (balanceRes.ok) balances = await balanceRes.json();
		if (boardRes.ok) {
			const boardData = await boardRes.json();
			todos = boardData.todos || [];
		}
		if (studentsRes.ok) students = await studentsRes.json();
	};

	const saveTodos = async () => {
		message = '';
		const res = await fetch('/api/boards', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ todos })
		});

		if (!res.ok) {
			const error = await res.json();
			message = error.error || 'Unable to save checklist.';
		}
	};

	const addTodo = async () => {
		const text = newTodo.trim();
		if (!text) return;
		todos = [...todos, { text, done: false }];
		newTodo = '';
		await saveTodos();
	};

	const toggleTodo = async (index) => {
		todos = todos.map((item, itemIndex) =>
			itemIndex === index ? { ...item, done: !item.done } : item
		);
		await saveTodos();
	};

	const deleteTodo = async (index) => {
		todos = todos.filter((_, itemIndex) => itemIndex !== index);
		await saveTodos();
	};

	$: totalStudentFees = students.reduce((sum, student) => sum + Number(student.total_annual_fees || 0), 0);
	$: collectedStudentFees = students.reduce((sum, student) => sum + Number(student.income_from_student || 0), 0);

	const reloadBalancesForDate = async () => {
		const res = await fetch(`/api/master-balances?date=${balanceDate}`);
		if (res.ok) {
			balances = await res.json();
		}
	};

	onMount(loadAll);
</script>

<svelte:head>
	<title>Home | Brilliant Global School</title>
</svelte:head>

<section class="hero-panel">
	<div>
		<p class="eyebrow">Today at a glance</p>
		<h2>{SCHOOL_NAME}</h2>
		<p class="muted">{formatDayName(today)} · {formatFullDate(today)}</p>
	</div>
	<div class="hero-actions">
		<a class="primary-button" href="/students">Open Students</a>
		<a class="secondary-button" href="/income">Add Collection</a>
	</div>
</section>

<section class="stats-grid compact-top">
	<article class="stat-card">
		<span>Master Cash Balance</span>
		<strong>{formatINR(balances.master_cash_balance)}</strong>
		<small>As on {balances.selected_date || balanceDate}: {formatINR(balances.cash_income)} income, {formatINR(balances.cash_expense)} expenses, {formatINR(balances.cash_transfer_out)} transferred out, {formatINR(balances.cash_transfer_in)} transferred in</small>
	</article>
	<article class="stat-card">
		<span>Master Account Balance</span>
		<strong>{formatINR(balances.master_account_balance)}</strong>
		<small>As on {balances.selected_date || balanceDate}: {formatINR(balances.online_income)} income, {formatINR(balances.online_expense)} expenses, {formatINR(balances.online_transfer_out)} transferred out, {formatINR(balances.online_transfer_in)} transferred in</small>
	</article>
	<article class="stat-card">
		<span>Registered Students</span>
		<strong>{students.length}</strong>
		<small>{formatINR(collectedStudentFees)} collected against {formatINR(totalStudentFees)} annual fees</small>
	</article>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Master Balance By Date</h3>
			<p class="muted">Choose a date to view the master balances as they stood on that day.</p>
		</div>
	</div>
	<div class="filter-bar">
		<label>
			<span>Balance Date</span>
			<input type="date" bind:value={balanceDate} on:change={reloadBalancesForDate} />
		</label>
	</div>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>To-Do Checklist</h3>
			<p class="muted">Add, complete, and remove school operations tasks. The list is stored in SQLite.</p>
		</div>
	</div>

	<div class="filter-bar">
		<label class="wide">
			<span>New Task</span>
			<input type="text" placeholder="Add a task for today" bind:value={newTodo} on:keydown={(event) => event.key === 'Enter' && addTodo()} />
		</label>
		<div class="hero-actions">
			<button class="primary-button" on:click={addTodo}>Add Task</button>
		</div>
	</div>

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Status</th>
					<th>Task</th>
					<th>Action</th>
				</tr>
			</thead>
			<tbody>
				{#if todos.length === 0}
					<tr>
						<td colspan="3" class="empty-cell">No tasks yet.</td>
					</tr>
				{:else}
					{#each todos as todo, index}
						<tr>
							<td>
								<label class="inline-checkbox">
									<input type="checkbox" checked={todo.done} on:change={() => toggleTodo(index)} />
									<span>{todo.done ? 'Done' : 'Open'}</span>
								</label>
							</td>
							<td><span class:muted={todo.done} class:done-text={todo.done}>{todo.text}</span></td>
							<td>
								<button class="ghost-button" on:click={() => deleteTodo(index)}>Delete</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if message}
		<p class="form-error" style="margin-top: 1rem;">{message}</p>
	{/if}
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Quick Navigation</h3>
			<p class="muted">Jump into the main sections used during the school day.</p>
		</div>
	</div>
	<div class="stats-grid" style="margin-bottom: 0;">
		<a class="stat-card" href="/students">
			<span>Students</span>
			<strong>Admissions</strong>
			<small>Profiles, towns, and fee targets</small>
		</a>
		<a class="stat-card" href="/income">
			<span>Income</span>
			<strong>Collections</strong>
			<small>Fees, donations, owner input, school items</small>
		</a>
		<a class="stat-card" href="/expenses">
			<span>Expenses</span>
			<strong>Outflows</strong>
			<small>Salaries, fuel, maintenance, and payouts</small>
		</a>
		<a class="stat-card" href="/masters">
			<span>Masters</span>
			<strong>Lookups</strong>
			<small>Employees, vehicles, towns, and opening balances</small>
		</a>
	</div>
</section>

<style>
	.done-text {
		text-decoration: line-through;
	}
</style>
