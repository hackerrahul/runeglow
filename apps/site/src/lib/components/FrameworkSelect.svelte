<!-- The framework choice as a dropdown, for the docs sidebar: the same
     choice the tabs on the code blocks show and set. -->
<script lang="ts">
	import { FRAMEWORK_IDS, FRAMEWORKS, type Framework } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';
	import FrameworkLogo from './FrameworkLogo.svelte';

	/* the names in full: the tabs abbreviate, here there is room */
	const NAMES: Record<Framework, string> = {
		svelte: 'Svelte',
		react: 'React',
		vue: 'Vue',
		elements: 'HTML elements',
		vanilla: 'JavaScript'
	};

	const uid = $props.id();
	let open = $state(false);
	let root = $state<HTMLElement | null>(null);
	let list = $state<HTMLElement | null>(null);

	// After hydration: the server always renders Svelte.
	$effect(() => framework.restore());

	function pick(next: Framework) {
		framework.set(next);
		open = false;
		root?.querySelector<HTMLElement>('button.current')?.focus();
	}

	/* opening puts the focus on the chosen one, so the arrows start from it */
	$effect(() => {
		if (open) list?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
	});

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			open = false;
			root?.querySelector<HTMLElement>('button.current')?.focus();
			return;
		}
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				open = true;
			}
			return;
		}
		const options = [...(list?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
		const at = options.indexOf(document.activeElement as HTMLElement);
		const to =
			e.key === 'ArrowDown' ? (at + 1) % options.length
			: e.key === 'ArrowUp' ? (at - 1 + options.length) % options.length
			: e.key === 'Home' ? 0
			: e.key === 'End' ? options.length - 1
			: -1;
		if (to < 0) return;
		e.preventDefault();
		options[to].focus();
	}
</script>

<svelte:window
	onclick={(e) => {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="select" bind:this={root} {onkeydown}>
	<p class="label" id="{uid}-label">Framework</p>
	<button
		type="button"
		class="current"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{uid}-list"
		aria-labelledby="{uid}-label {uid}-value"
		onclick={() => (open = !open)}
	>
		<FrameworkLogo id={framework.id} />
		<span id="{uid}-value">{NAMES[framework.id]}</span>
		<svg class="chevron" viewBox="0 0 12 12" width="11" height="11" fill="none" aria-hidden="true">
			<path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>
	{#if open}
		<div class="list" role="listbox" id="{uid}-list" aria-labelledby="{uid}-label" bind:this={list}>
			{#each FRAMEWORK_IDS as id (id)}
				<button type="button" role="option" aria-selected={framework.id === id} onclick={() => pick(id)}>
					<FrameworkLogo {id} />
					<span class="text">
						<span class="name">{NAMES[id]}</span>
						<span class="pkg">{FRAMEWORKS[id].pkg}</span>
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.select {
		position: relative;
		margin-bottom: 18px;
	}
	.label {
		margin: 0 0 8px 6px;
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.current {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		height: 36px;
		padding: 0 10px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.04);
		box-shadow: inset 0 0 0 1px var(--line-2);
		font-size: 13.5px;
		text-align: left;
		transition: background 0.15s;
	}
	.current:hover,
	.current[aria-expanded='true'] {
		background: var(--chip);
	}
	.current span {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.chevron {
		flex: none;
		color: var(--fg-3);
		transition: transform 0.2s;
	}
	.current[aria-expanded='true'] .chevron {
		transform: rotate(180deg);
	}
	.list {
		position: absolute;
		z-index: 20;
		top: calc(100% + 6px);
		left: 0;
		/* wider than the sidebar, so a package name fits beside the logo */
		width: max(100%, 216px);
		padding: 5px;
		border-radius: 12px;
		background: #1c1c1c;
		box-shadow:
			inset 0 0 0 1px var(--line-2),
			0 12px 32px rgba(0, 0, 0, 0.5);
	}
	.list button {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 7px 8px;
		border-radius: 8px;
		text-align: left;
	}
	.list button:hover,
	.list button:focus-visible {
		background: var(--chip);
		outline: none;
	}
	.list button[aria-selected='true'] {
		background: var(--chip-hover);
	}
	.text {
		display: grid;
		min-width: 0;
	}
	.name {
		font-size: 13.5px;
	}
	.pkg {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--fg-3);
	}
</style>
