<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { LIBRARIES } from '#lib/site.ts';
	import LibIcon from './LibIcon.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="wrap shell">
	<nav class="side" aria-label="Documentation">
		<p class="label">Guide</p>
		<ul class="guide">
			<li>
				<a href="/install" aria-current={page.url.pathname === '/install' ? 'page' : undefined}>
					<span class="glyph" aria-hidden="true">
						<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5v8.5M6.5 8.8 10 12.3l3.5-3.5M4 15.5h12" /></svg>
					</span>
					Installation
				</a>
			</li>
		</ul>
		<p class="label">Libraries</p>
		<ul>
			{#each LIBRARIES as lib (lib.slug)}
				<li>
					{#if lib.status === 'ready'}
						<a href="/{lib.slug}" aria-current={page.url.pathname === `/${lib.slug}` ? 'page' : undefined}>
							<LibIcon slug={lib.slug} />
							{lib.name}
						</a>
					{:else}
						<span class="soon">
							<LibIcon slug={lib.slug} />
							{lib.name}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
	<div class="main">
		{@render children()}
	</div>
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 168px minmax(0, 1fr);
		gap: 44px;
		padding-top: 28px;
	}
	.side {
		position: sticky;
		top: calc(var(--nav-h) + 20px);
		align-self: start;
	}
	.label {
		margin: 0 0 8px 6px;
		font-size: 12.5px;
		color: var(--fg-3);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 2px;
	}
	a,
	.soon {
		display: flex;
		align-items: center;
		gap: 9px;
		height: 34px;
		padding: 0 8px 0 6px;
		border-radius: 10px;
		font-size: 13.5px;
		white-space: nowrap;
	}
	a:hover,
	a[aria-current='page'] {
		background: var(--chip);
	}
	.soon {
		color: var(--fg-3);
	}
	.guide {
		margin-bottom: 18px;
	}
	/* The same footprint as a library's icon tile. */
	.glyph {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		flex: none;
		border-radius: 7px;
		background: rgba(255, 255, 255, 0.05);
		box-shadow: inset 0 0 0 1px var(--line);
		color: var(--amber);
	}
	.side :global(.tile) {
		width: 24px;
		height: 24px;
		border-radius: 7px;
	}
	.side :global(.tile svg) {
		width: 14px;
		height: 14px;
	}
	.soon :global(.tile) {
		opacity: 0.55;
	}
	@media (max-width: 820px) {
		.shell {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
		.side {
			display: none;
		}
	}
</style>
