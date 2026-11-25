<script lang="ts">
	import { codeFor, type Code } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';
	import { highlightShell, highlightSvelte } from '#lib/highlight.ts';
	import CopyButton from './CopyButton.svelte';
	import FrameworkTabs from './FrameworkTabs.svelte';

	interface Props {
		/** One text, or one per framework: then the block has framework tabs and shows the chosen one. */
		code: Code;
		/** With a text per framework: leave the tabs out, where a bar above the block already has them. */
		tabs?: boolean;
		lang?: 'svelte' | 'shell' | 'text';
		copyLabel?: string;
		/** Cap the height and scroll inside, for long blocks. */
		maxHeight?: number;
	}

	let { code: given, tabs = true, lang = 'svelte', copyLabel = 'Copy code', maxHeight }: Props = $props();

	const code = $derived(codeFor(given, framework.id));
	const tabbed = $derived(tabs && typeof given !== 'string');

	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const html = $derived(
		lang === 'svelte' ? highlightSvelte(code) : lang === 'shell' ? highlightShell(code) : esc(code)
	);
</script>

<div class="code" class:tabbed>
	{#if tabbed}<div class="fw-bar"><FrameworkTabs /></div>{/if}
	<div class="copy-slot"><CopyButton text={code} label={copyLabel} /></div>
	<pre style:max-height={maxHeight ? `${maxHeight}px` : undefined}><code>{@html html}</code></pre>
</div>

<style>
	.code {
		position: relative;
		border-radius: 14px;
		background: var(--card);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.fw-bar {
		/* room on the right for the copy button, which sits on the same line */
		padding: 10px 52px 0 10px;
	}
	.copy-slot {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 1;
		border-radius: 8px;
		background: var(--card);
	}
	pre {
		margin: 0;
		padding: 16px 48px 16px 20px;
		overflow: auto;
		font-size: 12.5px;
		line-height: 1.65;
		color: #e3e3e3;
		tab-size: 2;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.14) transparent;
	}
	code {
		font-size: inherit;
	}
	.code :global(.t-com),
	.code :global(.t-pun) {
		color: #6f6f6f;
	}
	.code :global(.t-str) {
		color: #ffc890;
	}
	.code :global(.t-num) {
		color: #8fd3ff;
	}
	.code :global(.t-att) {
		color: #c9c9c9;
	}
	.code :global(.t-cmp) {
		color: #b9aeff;
	}
	.code :global(.t-tag),
	.code :global(.t-key) {
		color: #ff93ab;
	}
</style>
