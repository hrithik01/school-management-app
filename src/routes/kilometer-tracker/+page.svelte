<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { toDateInput } from '$lib/constants.js';

	const formatVehicleLabel = (vehicle) => {
		const name = String(vehicle?.name || '').trim();
		const number = String(vehicle?.vehicle_number || '').trim();
		return number ? `${name} (${number})` : name || '-';
	};

	const getExistingEntryForDate = (entries, vehicleId, date) =>
		entries.find((entry) => Number(entry.vehicle_id) === Number(vehicleId) && entry.date === date) || null;

	const getPreviousEntryBeforeDate = (entries, vehicleId, date) =>
		entries.find((entry) => Number(entry.vehicle_id) === Number(vehicleId) && entry.date < date) || null;

	let vehicles = [];
	let trackerEntries = [];
	let loading = true;
	let saving = false;
	let message = '';
	let selectedDate = toDateInput(new Date());
	let entryInputs = {};
	let filters = {
		vehicle_type: 'all'
	};

	const loadData = async () => {
		loading = true;
		const [vehiclesRes, trackerRes] = await Promise.all([fetch('/api/vehicles'), fetch('/api/kilometer-tracker')]);
		if (vehiclesRes.ok) vehicles = await vehiclesRes.json();
		if (trackerRes.ok) trackerEntries = await trackerRes.json();
		hydrateEntryInputs(selectedDate);
		loading = false;
	};

	const hydrateEntryInputs = (date) => {
		const nextInputs = {};
		for (const vehicle of vehicles) {
			const existingEntry = getExistingEntryForDate(trackerEntries, vehicle.id, date);
			nextInputs[vehicle.id] = existingEntry ? Number(existingEntry.kilometer_reading || 0) : '';
		}
		entryInputs = nextInputs;
	};

	const changeSelectedDate = (date) => {
		selectedDate = date;
		message = '';
		hydrateEntryInputs(date);
	};

	const saveEntries = async () => {
		message = '';
		const entriesToSave = vehicles
			.map((vehicle) => ({
				vehicle_id: Number(vehicle.id),
				kilometer_reading: entryInputs[vehicle.id]
			}))
			.filter((entry) => entry.kilometer_reading !== '' && entry.kilometer_reading !== null && entry.kilometer_reading !== undefined);

		if (entriesToSave.length === 0) {
			message = 'Enter at least one kilometer reading for the selected date.';
			return;
		}

		saving = true;
		const res = await fetch('/api/kilometer-tracker', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				date: selectedDate,
				entries: entriesToSave
			})
		});

		if (res.ok) {
			await loadData();
			message = 'Kilometer readings saved.';
			saving = false;
			return;
		}

		const error = await res.json();
		message = error.error || 'Unable to save kilometer entries.';
		saving = false;
	};

	const loadDateIntoEntryTable = (date) => {
		changeSelectedDate(date);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const deleteEntry = async (entry) => {
		if (!window.confirm('Delete this kilometer entry?')) return;
		const res = await fetch(`/api/kilometer-tracker/${entry.id}`, { method: 'DELETE' });
		if (res.ok) await loadData();
	};

	$: vehicleTypeOptions = [...new Set(vehicles.map((vehicle) => String(vehicle.vehicle_type || '').trim()).filter(Boolean))].sort(
		(left, right) => left.localeCompare(right)
	);
	$: filteredHistoryEntries = trackerEntries.filter((entry) => {
		if (filters.vehicle_type === 'all') return true;
		return String(entry.vehicle_type || '').trim() === filters.vehicle_type;
	});
	$: filteredVehicles = vehicles.filter((vehicle) => {
		if (filters.vehicle_type === 'all') return true;
		return String(vehicle.vehicle_type || '').trim() === filters.vehicle_type;
	});
	$: entryRows = filteredVehicles.map((vehicle) => {
		const existingEntry = getExistingEntryForDate(trackerEntries, vehicle.id, selectedDate);
		const previousEntry = getPreviousEntryBeforeDate(trackerEntries, vehicle.id, selectedDate);
		const currentValue = entryInputs[vehicle.id];
		const hasCurrentValue = currentValue !== '' && currentValue !== null && currentValue !== undefined;
		const currentReading = hasCurrentValue ? Number(currentValue) : null;
		return {
			vehicle,
			existingEntry,
			previousEntry,
			currentReading,
			difference:
				currentReading != null && previousEntry
					? currentReading - Number(previousEntry.kilometer_reading || 0)
					: null
		};
	});
	$: latestEntry = filteredHistoryEntries[0] || null;
	$: trackedVehicleCount = new Set(filteredHistoryEntries.map((entry) => Number(entry.vehicle_id))).size;
	$: selectedDateEntryCount = filteredHistoryEntries.filter((entry) => entry.date === selectedDate).length;

	onMount(loadData);
</script>

<svelte:head>
	<title>Kilometer Tracker | Brilliant Global School</title>
</svelte:head>

<section class="hero-panel">
	<div>
		<p class="eyebrow">Kilometer Tracker</p>
		<h2>Vehicle kilometer history</h2>
		<p class="muted">Choose one date and enter readings for all vehicles in the same table. The difference is calculated inline from the last saved reading.</p>
	</div>
</section>

<section class="stats-grid compact-top">
	<article class="stat-card">
		<span>Total Entries</span>
		<strong>{filteredHistoryEntries.length}</strong>
		<small>{filters.vehicle_type === 'all' ? 'All recorded kilometer readings' : 'Visible rows for the selected vehicle type'}</small>
	</article>
	<article class="stat-card">
		<span>Vehicles Tracked</span>
		<strong>{trackedVehicleCount}</strong>
		<small>{filters.vehicle_type === 'all' ? 'Vehicles with at least one reading' : 'Vehicles matching the selected type'}</small>
	</article>
	<article class="stat-card">
		<span>Saved On Selected Date</span>
		<strong>{selectedDateEntryCount}</strong>
		<small>{selectedDate}</small>
	</article>
</section>

<section class="panel">
	<div class="section-header">
		<div>
			<h3>Date Entry Table</h3>
			<p class="muted">Enter or update all vehicle readings for one date from a single table.</p>
		</div>
		<div class="hero-actions">
			<button class="primary-button" on:click={saveEntries} disabled={saving}>{saving ? 'Saving...' : 'Save Date Entries'}</button>
		</div>
	</div>

	<div class="filter-bar">
		<label>
			<span>Date</span>
			<input type="date" bind:value={selectedDate} on:change={() => changeSelectedDate(selectedDate)} />
		</label>
		<label>
			<span>Vehicle Type</span>
			<select bind:value={filters.vehicle_type}>
				<option value="all">All Types</option>
				{#each vehicleTypeOptions as vehicleType}
					<option value={vehicleType}>{vehicleType}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if message}
		<p class:form-error={!message.includes('saved')} class:save-message={message.includes('saved')}>{message}</p>
	{/if}

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Vehicle</th>
					<th>Type</th>
					<th>Last Reading</th>
					<th>Current Reading</th>
					<th>Difference</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#if loading}
					<tr><td colspan="6" class="empty-cell">Loading vehicles...</td></tr>
				{:else if entryRows.length === 0}
					<tr>
						<td colspan="6" class="empty-cell">
							{vehicles.length === 0 ? 'No vehicles added yet in Masters.' : 'No vehicles match the selected vehicle type.'}
						</td>
					</tr>
				{:else}
					{#each entryRows as row}
						<tr>
							<td>{formatVehicleLabel(row.vehicle)}</td>
							<td>{row.vehicle.vehicle_type || '-'}</td>
							<td>{row.previousEntry ? Number(row.previousEntry.kilometer_reading || 0) : '-'}</td>
							<td>
								<input type="number" min="0" step="1" bind:value={entryInputs[row.vehicle.id]} />
							</td>
							<td>
								<span class:negative-difference={row.difference != null && Number(row.difference) < 0}>
									{row.currentReading == null ? '-' : row.difference == null ? 'First reading' : Number(row.difference)}
								</span>
							</td>
							<td>
								{row.existingEntry ? 'Already saved for this date' : 'New for this date'}
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
			<h3>Kilometer Register</h3>
			<p class="muted">Saved history across all dates. Use Load Date to reopen any date in the entry table above.</p>
		</div>
		{#if latestEntry}
			<span class="pill">Latest: {latestEntry.date} · {formatVehicleLabel(latestEntry)}</span>
		{/if}
	</div>

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Date</th>
					<th>Vehicle</th>
					<th>Type</th>
					<th>Kilometer Reading</th>
					<th>Last Reading</th>
					<th>Difference</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if filteredHistoryEntries.length === 0}
					<tr>
						<td colspan="7" class="empty-cell">
							{trackerEntries.length === 0 ? 'No kilometer readings recorded yet.' : 'No kilometer readings match the selected vehicle type.'}
						</td>
					</tr>
				{:else}
					{#each filteredHistoryEntries as entry}
						<tr>
							<td>{entry.date}</td>
							<td>{formatVehicleLabel(entry)}</td>
							<td>{entry.vehicle_type || '-'}</td>
							<td>{Number(entry.kilometer_reading || 0)}</td>
							<td>{entry.last_kilometer_reading == null ? '-' : Number(entry.last_kilometer_reading)}</td>
							<td>
								<span class:negative-difference={entry.kilometer_difference != null && Number(entry.kilometer_difference) < 0}>
									{entry.kilometer_difference == null ? '-' : Number(entry.kilometer_difference)}
								</span>
							</td>
							<td>
								<div class="action-row">
									<button class="secondary-button" on:click={() => loadDateIntoEntryTable(entry.date)}>Load Date</button>
									<button class="ghost-button" on:click={() => deleteEntry(entry)}>Delete</button>
								</div>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<style>
	.negative-difference {
		color: #b53c24;
		font-weight: 600;
	}

	.save-message {
		margin: 0 0 1rem;
		color: #1f4b3f;
		font-weight: 600;
	}
</style>