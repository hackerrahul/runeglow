<script lang="ts">
	import { framework } from '#lib/framework.svelte.ts';
	import { SITE } from '#lib/site.ts';
	import CopyButton from './CopyButton.svelte';
	import FrameworkTabs from './FrameworkTabs.svelte';

	interface Props {
		/** Other packages to install alongside, such as a peer dependency. */
		extra?: string;
		/** A library's name in the registry: also offers copying its source in. */
		registry?: string;
	}
	let { extra = '', registry }: Props = $props();

	/* copying the source in is the shadcn-svelte CLI's doing: Svelte only */
	const copyIn = $derived(
		registry && framework.id === 'svelte' ? `npx shadcn-svelte@latest add ${SITE.url}/r/${registry}.json` : ''
	);

	const VERBS = { pnpm: 'pnpm add', npm: 'npm install', yarn: 'yarn add', bun: 'bun add' } as const;
	const MANAGERS = $derived(
		Object.fromEntries(
			Object.entries(VERBS).map(([name, verb]) => [name, `${verb} ${framework.info.pkg}${extra ? ` ${extra}` : ''}`])
		) as Record<keyof typeof VERBS, string>
	);
	type Manager = keyof typeof VERBS;
	const NAMES = Object.keys(VERBS) as Manager[];
	const KEY = 'runeglow:pm';

	let pm = $state<Manager>('pnpm');

	// Remembered per browser; it is a convenience, so a blocked store is fine.
	$effect(() => {
		try {
			const saved = localStorage.getItem(KEY);
			if (saved && saved in VERBS) pm = saved as Manager;
		} catch {
			/* private mode or blocked storage */
		}
	});

	function pick(next: Manager) {
		pm = next;
		try {
			localStorage.setItem(KEY, next);
		} catch {
			/* see above */
		}
	}

	function onkeydown(e: KeyboardEvent) {
		const i = NAMES.indexOf(pm);
		const next =
			e.key === 'ArrowRight' ? NAMES[(i + 1) % NAMES.length]
			: e.key === 'ArrowLeft' ? NAMES[(i - 1 + NAMES.length) % NAMES.length]
			: null;
		if (!next) return;
		e.preventDefault();
		pick(next);
		(e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-pm="${next}"]`)?.focus();
	}
</script>

<div class="install">
	<div class="frameworks"><FrameworkTabs /></div>
	<div class="tabs" role="tablist" aria-label="Package manager" tabindex="-1" {onkeydown}>
		{#each NAMES as name (name)}
			<button
				type="button"
				role="tab"
				data-pm={name}
				aria-selected={pm === name}
				tabindex={pm === name ? 0 : -1}
				onclick={() => pick(name)}
			>
				{name}
			</button>
		{/each}
	</div>
	<div class="line" role="tabpanel">
		<code>{MANAGERS[pm]}</code>
		<CopyButton text={MANAGERS[pm]} label="Copy install command" />
	</div>
	{#if copyIn}
		<p class="or">Or copy just this library’s source into your project, with the shadcn-svelte CLI:</p>
		<div class="line">
			<code>{copyIn}</code>
			<CopyButton text={copyIn} label="Copy registry command" />
		</div>
	{/if}
</div>

<style>
	.install {
		border-radius: 14px;
		background: var(--card);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.frameworks {
		padding: 10px 10px 8px;
		border-bottom: 1px solid var(--line);
	}
	.tabs {
		display: flex;
		gap: 4px;
		padding: 10px 10px 0;
	}
	.tabs button {
		height: 26px;
		padding: 0 9px;
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--fg-3);
	}
	.tabs button:hover {
		color: #fff;
	}
	.tabs button[aria-selected='true'] {
		background: var(--chip);
		color: #fff;
	}
	.line {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px 12px 20px;
	}
	.or {
		padding: 10px 20px 0;
		border-top: 1px solid var(--line);
		font-size: 12.5px;
		color: var(--fg-3);
	}
	code {
		flex: 1;
		min-width: 0;
		overflow-x: auto;
		white-space: nowrap;
		font-size: 12.5px;
		color: #e3e3e3;
		scrollbar-width: none;
	}
</style>
