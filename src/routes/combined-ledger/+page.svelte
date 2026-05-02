<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { EXPENSE_TYPE_OPTIONS, INCOME_TYPE_OPTIONS, METHOD_OPTIONS, formatINR } from '$lib/constants.js';

	const typeLabel = (kind, type) => {
		if (kind === 'income') {
			return INCOME_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;
		}

		return EXPENSE_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;
	};

	const methodLabel = (method) => METHOD_OPTIONS.find((option) => option.value === method)?.label || method;

	const counterpartyLabel = (entry) => {
		if (entry.entry_kind === 'income') {
			const name = String(entry.student_name || '').trim();
			const parent = String(entry.parent_name || '').trim();
			if (!name) return '-';
			return parent ? `${name} c/o ${parent}` : name;
		}

		if (entry.type === 'salary') {
			return entry.employee_name || '-';
		}

		if (entry.type === 'fuel') {
			const vehicleName = String(entry.vehicle_name || '').trim();
			const vehicleNumber = String(entry.vehicle_number || '').trim();
			if (!vehicleName && !vehicleNumber) return '-';
			return vehicleNumber ? `${vehicleName} (${vehicleNumber})` : vehicleName;
		}

		return '-';
	};

	let rows = [];
	let loading = true;
	let message = '';
	let showTypeColumn = true;
	let showPartyColumn = true;
	let totals = {
		master_cash_balance: 0,
		master_account_balance: 0
	};

	const loadLedger = async () => {
		loading = true;
		message = '';
		const res = await fetch('/api/combined-ledger');

		if (!res.ok) {
			message = 'Unable to load combined ledger entries.';
			loading = false;
			return;
		}

		const data = await res.json();
		rows = data.rows || [];
		totals = {
			master_cash_balance: data.master_cash_balance || 0,
			master_account_balance: data.master_account_balance || 0
		};
		loading = false;
	};

	onMount(loadLedger);
</script>

<svelte:head>
	<title>Combined Ledger | Brilliant Global School</title>
</svelte:head>

<section class="hero-panel">
	<div>
		<p class="eyebrow">Combined Ledger</p>
		<h2>Last 200 income and expense entries together</h2>
		<p class="muted">Each row includes the master cash/account balance snapshot as of that exact entry time.</p>
	</div>
</section>

<section class="stats-grid compact-top">
	<article class="stat-card">
		<span>Current Master Cash</span>
		<strong>{formatINR(totals.master_cash_balance)}</strong>
	</article>
	<article class="stat-card">
		<span>Current Master Account</span>
		<strong>{formatINR(totals.master_account_balance)}</strong>
	</article>
	<article class="stat-card">
		<span>Total Entries Shown</span>
		<strong>{rows.length}</strong>
	</article>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Combined Entries (Latest 200)</h3>
			<p class="muted">Income appears as positive values and expenses appear as negative values.</p>
		</div>
	</div>

	<div class="filter-bar">
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showTypeColumn} />
			<span>Show Type</span>
		</label>
		<label class="inline-checkbox">
			<input type="checkbox" bind:checked={showPartyColumn} />
			<span>Show Party</span>
		</label>
	</div>

	{#if loading}
		<p class="muted">Loading combined ledger...</p>
	{:else if message}
		<p class="form-error">{message}</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Entry</th>
						{#if showTypeColumn}
							<th>Type</th>
						{/if}
						<th>Method</th>
						{#if showPartyColumn}
							<th>Party</th>
						{/if}
						<th>Receipt No.</th>
						<th>Amount</th>
						<th>Master Cash</th>
						<th>Master Account</th>
						<th>Comments</th>
					</tr>
				</thead>
				<tbody>
					{#if rows.length === 0}
						<tr>
							<td colspan={8 + (showTypeColumn ? 1 : 0) + (showPartyColumn ? 1 : 0)} class="empty-cell">No entries available yet.</td>
						</tr>
					{:else}
						{#each rows as entry}
							<tr>
								<td>{entry.date}</td>
								<td>
									<span class={entry.entry_kind === 'income' ? 'entry-pill income' : 'entry-pill expense'}>
										{entry.entry_kind === 'income' ? 'Income' : 'Expense'}
									</span>
								</td>
								{#if showTypeColumn}
									<td>{typeLabel(entry.entry_kind, entry.type)}</td>
								{/if}
								<td>{methodLabel(entry.method)}</td>
								{#if showPartyColumn}
									<td>{counterpartyLabel(entry)}</td>
								{/if}
								<td>{entry.receipt_number || '-'}</td>
								<td class:positive={entry.amount_signed > 0} class:negative={entry.amount_signed < 0}>
									{formatINR(entry.amount_signed)}
								</td>
								<td><strong>{formatINR(entry.master_cash_balance)}</strong></td>
								<td>{formatINR(entry.master_account_balance)}</td>
								<td>{entry.comments || '-'}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.entry-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.entry-pill.income {
		background: rgba(31, 75, 63, 0.12);
		color: #1f4b3f;
	}

	.entry-pill.expense {
		background: rgba(198, 106, 73, 0.14);
		color: #8a3d25;
	}

	:global(body[data-theme='dark']) .entry-pill.income {
		background: rgba(121, 214, 167, 0.16);
		color: #8fe8bb;
	}

	:global(body[data-theme='dark']) .entry-pill.expense {
		background: rgba(248, 143, 103, 0.2);
		color: #ffc4aa;
	}

	.positive {
		color: #1f7a45;
		font-weight: 600;
	}

	.negative {
		color: #b4412e;
		font-weight: 600;
	}

	:global(body[data-theme='dark']) .positive {
		color: #77d8a0;
	}

	:global(body[data-theme='dark']) .negative {
		color: #ff9f80;
	}
</style>
