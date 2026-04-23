<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { SCHOOL_NAME } from '$lib/constants.js';

	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/students', label: 'Students' },
		{ href: '/income', label: 'Income' },
		{ href: '/expenses', label: 'Expenses' },
		{ href: '/masters', label: 'Masters' }
	];

	let theme = 'light';

	const applyTheme = (value) => {
		theme = value;
		document.body.dataset.theme = value;
		localStorage.setItem('theme', value);
	};

	const toggleTheme = () => {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	};

	onMount(() => {
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(stored || (prefersDark ? 'dark' : 'light'));
	});
</script>

<svelte:head>
	<title>{SCHOOL_NAME}</title>
	<meta name="description" content="School management system for Brilliant Global School, Bhungra" />
</svelte:head>

<div class="backdrop-orb backdrop-orb-one"></div>
<div class="backdrop-orb backdrop-orb-two"></div>

<div class="app-shell">
	<header class="header">
		<div>
			<p class="brand-kicker">School Ledger Suite</p>
			<h1>{SCHOOL_NAME}</h1>
			<p class="subtitle">Admissions, collections, expenses, and operational masters in one local dashboard.</p>
		</div>
		<div class="header-actions">
			<nav>
				{#each navItems as item}
					<a href={item.href} class:active={item.href === $page.url.pathname}>{item.label}</a>
				{/each}
			</nav>
			<button class="theme-toggle" on:click={toggleTheme}>
				{theme === 'dark' ? 'Light mode' : 'Dark mode'}
			</button>
		</div>
	</header>

	<main class="main">
		<slot />
	</main>
</div>

<style>
	:global(:root) {
		color-scheme: light;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		font-family: 'Avenir Next', 'Segoe UI', sans-serif;
		background:
			radial-gradient(circle at top left, rgba(230, 199, 138, 0.22), transparent 26%),
			linear-gradient(180deg, #f7f1e5 0%, #eef3ea 100%);
		color: var(--text);
		line-height: 1.5;
		--bg: #f5efe4;
		--text: #17312b;
		--muted: #5b6c67;
		--panel-bg: rgba(255, 252, 246, 0.88);
		--card-bg: #fffaf1;
		--border: rgba(30, 74, 64, 0.14);
		--panel-shadow: 0 22px 60px rgba(30, 53, 47, 0.12);
		--focus-ring: 0 0 0 3px rgba(198, 106, 73, 0.18);
		--primary-bg: linear-gradient(135deg, #1f4b3f 0%, #2a5c4f 100%);
		--primary-solid: #1f4b3f;
		--primary-text: #fffdf8;
		--secondary-bg: #ebe5d8;
		--secondary-text: #17312b;
		--ghost-text: #5b6c67;
		--input-bg: rgba(255, 255, 255, 0.84);
		--nav-bg: rgba(255, 255, 255, 0.72);
		--nav-text: #24473f;
		--nav-active-bg: #183a32;
		--nav-active-text: #fffdf8;
		--warn-bg: #fff0db;
		--warn-text: #8a4f1e;
		min-height: 100vh;
	}

	:global(body[data-theme='dark']) {
		color-scheme: dark;
		background:
			radial-gradient(circle at top left, rgba(225, 166, 98, 0.12), transparent 24%),
			linear-gradient(180deg, #091512 0%, #10211c 100%);
		--text: #edf5ee;
		--muted: #a5bcb3;
		--panel-bg: rgba(14, 31, 27, 0.88);
		--card-bg: #122923;
		--border: rgba(204, 224, 216, 0.12);
		--panel-shadow: 0 26px 64px rgba(2, 6, 23, 0.42);
		--focus-ring: 0 0 0 3px rgba(230, 199, 138, 0.2);
		--primary-bg: linear-gradient(135deg, #e7c47d 0%, #d98b5c 100%);
		--primary-solid: #e7c47d;
		--primary-text: #10211c;
		--secondary-bg: #16342d;
		--secondary-text: #edf5ee;
		--ghost-text: #a5bcb3;
		--input-bg: rgba(9, 21, 18, 0.84);
		--nav-bg: rgba(17, 36, 31, 0.84);
		--nav-text: #edf5ee;
		--nav-active-bg: #e7c47d;
		--nav-active-text: #10211c;
		--warn-bg: rgba(138, 79, 30, 0.18);
		--warn-text: #f7d6aa;
	}

	:global(a),
	:global(button),
	:global(input),
	:global(select),
	:global(textarea) {
		font: inherit;
	}

	:global(input),
	:global(select),
	:global(textarea) {
		width: 100%;
		padding: 0.78rem 0.9rem;
		border-radius: 14px;
		border: 1px solid var(--border);
		background: var(--input-bg);
		color: var(--text);
	}

	:global(textarea) {
		resize: vertical;
	}

	:global(input:focus),
	:global(select:focus),
	:global(textarea:focus),
	:global(button:focus-visible),
	:global(a:focus-visible) {
		outline: none;
		box-shadow: var(--focus-ring);
	}

	:global(button) {
		border: 0;
		border-radius: 999px;
		cursor: pointer;
		transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease;
	}

	:global(button:hover) {
		filter: brightness(1.03);
	}

	:global(button:active) {
		transform: translateY(1px);
	}

	:global(label) {
		display: grid;
		gap: 0.45rem;
		font-size: 0.95rem;
	}

	:global(label span) {
		color: var(--muted);
		font-size: 0.88rem;
	}

	:global(table) {
		width: 100%;
		border-collapse: collapse;
		min-width: 860px;
	}

	:global(th),
	:global(td) {
		padding: 0.95rem 0.9rem;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}

	:global(th) {
		font-size: 0.82rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}

	:global(tbody tr:hover) {
		background: color-mix(in srgb, var(--card-bg) 84%, transparent);
	}

	:global(.panel),
	:global(.hero-panel) {
		background: var(--panel-bg);
		border: 1px solid var(--border);
		box-shadow: var(--panel-shadow);
		backdrop-filter: blur(14px);
	}

	:global(.panel) {
		border-radius: 24px;
		padding: 1.35rem;
		margin-bottom: 1.25rem;
	}

	:global(.hero-panel) {
		border-radius: 28px;
		padding: 1.55rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1.25rem;
	}

	:global(.hero-panel h2),
	:global(.panel h3),
	:global(.panel h2) {
		margin: 0;
	}

	:global(.eyebrow),
	.brand-kicker {
		margin: 0 0 0.45rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 700;
		color: #c66a49;
	}

	:global(.muted) {
		color: var(--muted);
	}

	:global(.stats-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	:global(.compact-top) {
		margin-top: -0.1rem;
	}

	:global(.stat-card) {
		background: linear-gradient(180deg, color-mix(in srgb, var(--card-bg) 88%, white), var(--card-bg));
		border: 1px solid var(--border);
		border-radius: 22px;
		padding: 1.15rem;
		display: grid;
		gap: 0.42rem;
	}

	:global(.stat-card span),
	:global(.stat-card small) {
		color: var(--muted);
	}

	:global(.stat-card strong) {
		font-size: clamp(1.3rem, 2vw, 2rem);
	}

	:global(.section-header),
	:global(.hero-actions),
	:global(.action-row),
	.header-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	:global(.section-header) {
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	:global(.filter-bar),
	:global(.form-grid) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.95rem;
	}

	:global(.filter-bar) {
		padding: 1rem;
		background: color-mix(in srgb, var(--card-bg) 72%, transparent);
		border-radius: 18px;
		border: 1px solid var(--border);
		margin-bottom: 1rem;
	}

	:global(.table-wrap) {
		overflow: auto;
		border-radius: 20px;
		border: 1px solid var(--border);
		background: color-mix(in srgb, var(--panel-bg) 92%, transparent);
	}

	:global(.primary-button),
	.theme-toggle {
		background: var(--primary-bg);
		color: var(--primary-text);
		padding: 0.82rem 1.2rem;
	}

	:global(.secondary-button) {
		background: var(--secondary-bg);
		color: var(--secondary-text);
		padding: 0.76rem 1.08rem;
	}

	:global(.ghost-button) {
		background: transparent;
		color: var(--ghost-text);
		border: 1px solid var(--border);
		padding: 0.76rem 1.08rem;
	}

	:global(.pill) {
		padding: 0.55rem 0.8rem;
		border-radius: 999px;
		background: var(--secondary-bg);
		color: var(--secondary-text);
		border: 1px solid var(--border);
		font-size: 0.88rem;
	}

	:global(.pill.warn) {
		background: var(--warn-bg);
		color: var(--warn-text);
	}

	:global(.checkbox-row),
	:global(.inline-checkbox) {
		display: flex;
		gap: 0.65rem;
		align-items: center;
	}

	:global(.checkbox-field input),
	:global(.inline-checkbox input) {
		width: auto;
	}

	:global(.wide) {
		grid-column: 1 / -1;
	}

	:global(.drawer-form) {
		display: grid;
		gap: 1rem;
	}

	:global(.drawer-actions) {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	:global(.form-error) {
		margin: 0;
		color: #b53c24;
		font-weight: 600;
	}

	:global(.empty-cell) {
		text-align: center;
		color: var(--muted);
		padding: 1.4rem;
	}

	.backdrop-orb {
		position: fixed;
		width: 26rem;
		height: 26rem;
		border-radius: 999px;
		filter: blur(26px);
		opacity: 0.28;
		pointer-events: none;
		z-index: 0;
	}

	.backdrop-orb-one {
		top: -8rem;
		left: -7rem;
		background: #e7c47d;
	}

	.backdrop-orb-two {
		right: -8rem;
		top: 12rem;
		background: #7fb9a3;
	}

	.app-shell {
		position: relative;
		z-index: 1;
		max-width: 1220px;
		margin: 0 auto;
		padding: 24px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		background: var(--panel-bg);
		border: 1px solid var(--border);
		border-radius: 28px;
		padding: 1rem 1.15rem;
		box-shadow: var(--panel-shadow);
		backdrop-filter: blur(16px);
	}

	.header h1 {
		margin: 0;
		font-size: clamp(1.5rem, 2.2vw, 2.2rem);
	}

	.subtitle {
		margin: 0.35rem 0 0;
		color: var(--muted);
		max-width: 42rem;
	}

	nav {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	nav a {
		text-decoration: none;
		padding: 0.78rem 1rem;
		border-radius: 999px;
		background: var(--nav-bg);
		color: var(--nav-text);
		border: 1px solid var(--border);
		transition: all 0.2s ease;
	}

	nav a.active {
		background: var(--nav-active-bg);
		color: var(--nav-active-text);
		border-color: transparent;
	}

	.main {
		margin-top: 1.35rem;
	}

	@media (max-width: 768px) {
		:global(.hero-panel) {
			flex-direction: column;
		}

		.app-shell {
			padding: 16px;
		}

		.header {
			border-radius: 22px;
		}
	}
</style>
