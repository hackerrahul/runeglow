<!-- The framework switch. Every one of these on the site shows and sets the
     same choice, so picking React anywhere turns every example to React. -->
<script lang="ts">
	import { FRAMEWORK_IDS, FRAMEWORKS, type Framework } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';

	interface Props {
		/** Names the tabs for assistive tech. */
		label?: string;
		/** False shows no tab as chosen: for a bar where something else is open. */
		active?: boolean;
		onpick?: (framework: Framework) => void;
	}
	let { label = 'Framework', active = true, onpick }: Props = $props();

	// After hydration: the server always renders Svelte.
	$effect(() => framework.restore());

	function pick(next: Framework) {
		framework.set(next);
		onpick?.(next);
	}

	function onkeydown(e: KeyboardEvent) {
		const i = FRAMEWORK_IDS.indexOf(framework.id);
		const next =
			e.key === 'ArrowRight' ? FRAMEWORK_IDS[(i + 1) % FRAMEWORK_IDS.length]
			: e.key === 'ArrowLeft' ? FRAMEWORK_IDS[(i - 1 + FRAMEWORK_IDS.length) % FRAMEWORK_IDS.length]
			: null;
		if (!next) return;
		e.preventDefault();
		pick(next);
		(e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-fw="${next}"]`)?.focus();
	}
</script>

<div class="fw" role="tablist" aria-label={label} tabindex="-1" {onkeydown}>
	{#each FRAMEWORK_IDS as id (id)}
		<button
			type="button"
			role="tab"
			data-fw={id}
			aria-selected={active && framework.id === id}
			tabindex={framework.id === id ? 0 : -1}
			onclick={() => pick(id)}
		>
			{FRAMEWORKS[id].label}
		</button>
	{/each}
</div>

<style>
	.fw {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	button {
		height: 26px;
		padding: 0 9px;
		border-radius: 999px;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--fg-3);
	}
	button:hover {
		color: #fff;
	}
	button[aria-selected='true'] {
		background: var(--chip);
		color: #fff;
	}
</style>
