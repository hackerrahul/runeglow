<script lang="ts">
	import { page } from '$app/state';
	import { LIBRARIES, SITE } from '#lib/site.ts';
	import LibIcon from './LibIcon.svelte';
	import Logo from './Logo.svelte';

	let libsOpen = $state(false);
	let menuOpen = $state(false);
	let libsEl = $state<HTMLElement | null>(null);
	let menuEl = $state<HTMLElement | null>(null);

	// Navigating closes both, so neither sits open over the next page.
	$effect(() => {
		page.url.pathname;
		page.url.hash;
		libsOpen = false;
		menuOpen = false;
	});

	function onWindowClick(e: MouseEvent) {
		const target = e.target as Node;
		if (libsOpen && libsEl && !libsEl.contains(target)) libsOpen = false;
		if (menuOpen && menuEl && !menuEl.contains(target)) menuOpen = false;
	}
</script>

<svelte:window
	onclick={onWindowClick}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			libsOpen = false;
			menuOpen = false;
		}
	}}
/>

{#snippet libraryList()}
	<ul class="libs">
		{#each LIBRARIES as lib (lib.slug)}
			<li>
				{#if lib.status === 'ready'}
					<a href="/{lib.slug}">
						<LibIcon slug={lib.slug} />
						<span class="text">
							<span class="name">{lib.name}</span>
							<span class="blurb">{lib.blurb}</span>
						</span>
					</a>
				{:else}
					<span class="row soon">
						<LibIcon slug={lib.slug} />
						<span class="text">
							<span class="name">{lib.name}</span>
							<span class="blurb">{lib.blurb}</span>
						</span>
						<span class="tag">Soon</span>
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<header class="nav">
	<div class="wrap bar">
		<a class="brand" href="/" aria-label="{SITE.name} home">
			<Logo />
			<span>Rune<span class="dim">glow</span></span>
		</a>

		<nav class="links" aria-label="Main">
			<div class="drop" bind:this={libsEl}>
				<button
					type="button"
					class="link"
					aria-expanded={libsOpen}
					aria-controls="nav-libraries"
					onclick={() => (libsOpen = !libsOpen)}
				>
					Libraries
					<svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true">
						<path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
				{#if libsOpen}
					<div class="sheet" id="nav-libraries">
						{@render libraryList()}
					</div>
				{/if}
			</div>
			<a class="link" href="/install">Install</a>
			<a class="link" href="/#how">How to use</a>
			<a class="link" href="/#faq">FAQs</a>
		</nav>

		<div class="right">
			<span class="version">v{SITE.version}</span>
			<a class="icon" href={SITE.author.x} rel="noreferrer" aria-label="{SITE.author.name} on X" title="{SITE.author.handle} on X">
				<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
					<path d="M12.2 1.5h2.2L9.6 7l5.7 7.5h-4.5L7.3 9.9l-4 4.6H1.1l5.2-5.9L.8 1.5h4.6l3.2 4.2zm-.8 11.7h1.2L4.7 2.7H3.4z" />
				</svg>
			</a>
			{#if SITE.repo}
				<a class="pill" href={SITE.repo} rel="noreferrer" aria-label="Star {SITE.name} on GitHub">
					<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
						<path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.33.66.07-.52.28-.87.5-1.07-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z" />
					</svg>
					Star
				</a>
			{/if}
			<a class="pill tint" href="/border-beam">Playground</a>

			<div class="more" bind:this={menuEl}>
				<button
					type="button"
					class="pill icon"
					aria-label="Menu"
					aria-expanded={menuOpen}
					aria-controls="nav-menu"
					onclick={() => (menuOpen = !menuOpen)}
				>
					<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
						<path d="M2.5 5h11M2.5 11h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
					</svg>
				</button>
				{#if menuOpen}
					<div class="sheet menu" id="nav-menu">
						<a class="menu-link" href="/install">Install</a>
						<a class="menu-link" href="/#how">How to use</a>
						<a class="menu-link" href="/#faq">FAQs</a>
						{#if SITE.repo}<a class="menu-link" href={SITE.repo} rel="noreferrer">Star on GitHub</a>{/if}
						<a class="menu-link" href={SITE.author.x} rel="noreferrer">{SITE.author.handle} on X</a>
						<p class="label">Libraries</p>
						{@render libraryList()}
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 50;
		height: var(--nav-h);
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 24px;
		height: 100%;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 16.5px;
		font-weight: 600;
		letter-spacing: -0.025em;
	}
	.dim {
		color: rgba(255, 255, 255, 0.5);
	}

	.links {
		display: flex;
		align-items: center;
		gap: 2px;
		flex: 1;
	}
	.link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 32px;
		padding: 0 11px;
		border-radius: 999px;
		font-size: 13.5px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.72);
		transition:
			background 0.15s,
			color 0.15s;
	}
	.link:hover,
	.link[aria-expanded='true'] {
		background: var(--chip);
		color: #fff;
	}
	.link svg {
		opacity: 0.6;
		transition: transform 0.2s;
	}
	.link[aria-expanded='true'] svg {
		transform: rotate(180deg);
	}

	.right {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}
	.version {
		margin-right: 4px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--fg-3);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		color: #cfcfcf;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.icon:hover {
		background: var(--chip);
		color: #fff;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 32px;
		padding: 0 13px;
		border-radius: 999px;
		background: var(--chip);
		font-size: 13.5px;
		font-weight: 500;
		color: #e9e9e9;
		transition: background 0.15s;
	}
	.pill:hover {
		background: var(--chip-hover);
	}
	.pill.tint {
		background: rgba(145, 128, 255, 0.18);
		color: #cfc8ff;
	}
	.pill.tint:hover {
		background: rgba(145, 128, 255, 0.28);
	}
	.pill.icon {
		width: 32px;
		padding: 0;
		justify-content: center;
	}
	.more {
		position: relative;
		display: none;
	}

	.drop {
		position: relative;
	}
	.sheet {
		position: absolute;
		top: calc(100% + 10px);
		left: -6px;
		width: 330px;
		padding: 8px;
		border-radius: 20px;
		background: #1a1a1a;
		box-shadow:
			inset 0 0 0 1px var(--line-2),
			0 24px 60px rgba(0, 0, 0, 0.55);
	}
	.sheet.menu {
		left: auto;
		right: 0;
		width: min(330px, calc(100vw - 32px));
		max-height: calc(100dvh - var(--nav-h) - 24px);
		overflow-y: auto;
	}
	.libs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1px;
	}
	.libs a,
	.row {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 7px 8px;
		border-radius: 13px;
	}
	.libs a:hover {
		background: var(--chip);
	}
	.libs :global(.tile) {
		width: 32px;
		height: 32px;
		border-radius: 9px;
	}
	.libs :global(.tile svg) {
		width: 16px;
		height: 16px;
	}
	.text {
		flex: 1;
		min-width: 0;
	}
	.name,
	.blurb {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		line-height: 1.35;
	}
	.name {
		font-size: 13.5px;
		font-weight: 500;
	}
	.blurb {
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.soon .name {
		color: rgba(255, 255, 255, 0.6);
	}
	.soon :global(.tile) {
		opacity: 0.6;
	}
	.tag {
		padding: 1px 8px;
		border-radius: 999px;
		background: var(--chip);
		font-size: 11.5px;
		color: var(--fg-3);
	}
	.menu-link {
		display: block;
		padding: 9px 10px;
		border-radius: 12px;
		font-size: 14px;
		font-weight: 500;
	}
	.menu-link:hover {
		background: var(--chip);
	}
	.label {
		margin: 8px 10px 4px;
		font-size: 12.5px;
		color: var(--fg-3);
	}

	@media (max-width: 760px) {
		.links,
		.version,
		.icon {
			display: none;
		}
		.more {
			display: block;
		}
	}
	/* On a phone the star link moves into the menu, with the X link. */
	@media (max-width: 480px) {
		.pill:not(.tint) {
			display: none;
		}
	}
</style>
