<script>
	import { createEventDispatcher } from 'svelte';

	export let open = false;
	export let title = '';
	export let subtitle = '';

	const dispatch = createEventDispatcher();

	const close = () => dispatch('close');
</script>

{#if open}
	<div class="drawer-shell" role="presentation">
		<button class="backdrop" aria-label="Close panel" on:click={close}></button>
		<div class="drawer" role="dialog" aria-modal="true" aria-label={title}>
			<div class="drawer-head">
				<div>
					<h2>{title}</h2>
					{#if subtitle}
						<p>{subtitle}</p>
					{/if}
				</div>
				<button class="close-button" type="button" on:click={close}>Close</button>
			</div>
			<div class="drawer-body">
				<slot />
			</div>
		</div>
	</div>
{/if}

<style>
	.drawer-shell {
		position: fixed;
		inset: 0;
		z-index: 60;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(15, 23, 42, 0.14);
	}

	.drawer {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		width: min(34rem, 100%);
		background: var(--panel-bg);
		border-left: 1px solid var(--border);
		box-shadow: -24px 0 60px rgba(15, 23, 42, 0.18);
		display: flex;
		flex-direction: column;
	}

	.drawer-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.25rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.drawer-head h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.drawer-head p {
		margin: 0.35rem 0 0;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.drawer-body {
		padding: 1.25rem;
		overflow: auto;
	}

	.close-button {
		border: 1px solid var(--border);
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border-radius: 999px;
		padding: 0.7rem 1rem;
		cursor: pointer;
		height: fit-content;
	}

	@media (max-width: 640px) {
		.drawer {
			width: 100%;
		}
	}
</style>
