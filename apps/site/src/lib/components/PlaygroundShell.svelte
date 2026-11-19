<script lang="ts">
	import type { Snippet } from 'svelte';
	import CodeBlock from './CodeBlock.svelte';
	import CopyButton from './CopyButton.svelte';

	interface Props {
		/** Names the control panel for assistive tech, e.g. "Border beam controls". */
		label: string;
		stageTheme?: 'dark' | 'light';
		/** Clip the stage, for a demo element that hangs off its top edge. */
		clipStage?: boolean;
		/** The live component. */
		stage: Snippet;
		/** Optional chips in the stage's top-left corner. */
		stageTop?: Snippet;
		/** Omit `ontoggle` to leave the Play/Pause pill out. */
		playing?: boolean;
		ontoggle?: () => void;
		controls: Snippet;
		/** How many controls differ from their defaults; shows "Reset all" above zero. */
		modified?: number;
		onreset?: () => void;
		code: string;
		prompt: string;
	}

	let {
		label,
		stageTheme = 'dark',
		clipStage = false,
		stage,
		stageTop,
		playing = true,
		ontoggle,
		controls,
		modified = 0,
		onreset,
		code,
		prompt
	}: Props = $props();

	let tab = $state<'code' | 'prompt'>('code');
</script>

<div class="pg">
	<div class="stage" class:clip={clipStage} data-stage-theme={stageTheme}>
		{#if stageTop}<div class="top">{@render stageTop()}</div>{/if}
		{@render stage()}
		{#if ontoggle}
			<button type="button" class="chip play" aria-pressed={playing} onclick={ontoggle}>
				{playing ? 'Pause' : 'Play'}
			</button>
		{/if}
	</div>

	<aside class="panel" aria-label={label}>
		{@render controls()}
		{#if modified > 0 && onreset}
			<button type="button" class="chip reset" onclick={onreset}>Reset all</button>
		{/if}
	</aside>
</div>

<div class="out">
	<div class="out-bar">
		<div class="tabs" role="tablist" aria-label="Output">
			<button type="button" role="tab" aria-selected={tab === 'code'} onclick={() => (tab = 'code')}>
				Svelte
			</button>
			<button type="button" role="tab" aria-selected={tab === 'prompt'} onclick={() => (tab = 'prompt')}>
				Prompt
			</button>
		</div>
		<CopyButton
			text={tab === 'code' ? code : prompt}
			label={tab === 'code' ? 'Copy code' : 'Copy prompt'}
			showLabel
		/>
	</div>
	<div role="tabpanel">
		{#if tab === 'code'}
			<CodeBlock {code} />
		{:else}
			<CodeBlock code={prompt} lang="text" maxHeight={320} />
		{/if}
	</div>
</div>

<style>
	.pg {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 248px;
		gap: 10px;
		height: 500px;
	}
	.stage {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 0;
		padding: 0 16px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
		transition: background 0.2s;
	}
	.stage[data-stage-theme='light'] {
		background: #f9f9f9;
	}
	.stage.clip {
		overflow: hidden;
	}
	.top {
		position: absolute;
		top: 12px;
		left: 12px;
		right: 12px;
	}
	.play {
		position: absolute;
		bottom: 14px;
		left: 50%;
		transform: translateX(-50%);
	}
	.stage[data-stage-theme='light'] .play,
	.stage[data-stage-theme='light'] .top :global(label) {
		background: rgba(0, 0, 0, 0.06);
		color: rgba(0, 0, 0, 0.6);
	}
	.stage[data-stage-theme='light'] .top :global(label.on) {
		background: rgba(0, 0, 0, 0.12);
		color: #000;
	}

	.panel {
		position: relative;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 14px 14px 16px;
		border-radius: 16px;
		background: var(--card);
		box-shadow: inset 0 0 0 1px var(--line);
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.14) transparent;
	}
	.reset {
		width: 100%;
		margin-top: 16px;
	}

	.out {
		margin-top: 10px;
	}
	.out-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	.tabs {
		display: flex;
		gap: 4px;
	}
	.tabs button {
		height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		font-size: 13px;
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
	.out :global(.copy-slot) {
		display: none;
	}
	.out :global(pre) {
		padding-right: 20px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	@media (max-width: 760px) {
		.pg {
			grid-template-columns: minmax(0, 1fr);
			height: auto;
		}
		.stage {
			height: 380px;
		}
		.panel {
			max-height: 460px;
		}
	}
</style>
