<script lang="ts">
	interface Props {
		text: string;
		label?: string;
		/** Show the label next to the icon rather than only to screen readers. */
		showLabel?: boolean;
	}

	let { text, label = 'Copy', showLabel = false }: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			// Clipboard access can be refused (insecure origin, denied permission);
			// the old selection-based route still works there.
			const area = document.createElement('textarea');
			area.value = text;
			area.style.position = 'fixed';
			area.style.opacity = '0';
			document.body.appendChild(area);
			area.select();
			document.execCommand('copy');
			area.remove();
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1600);
	}

	$effect(() => () => clearTimeout(timer));
</script>

<button type="button" class="copy" class:labelled={showLabel} onclick={copy}>
	{#if copied}
		<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
			<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	{:else}
		<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
			<rect x="5.5" y="5.5" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.3" />
			<path d="M10.5 3.5v-.25A1.75 1.75 0 0 0 8.75 1.5h-5.5A1.75 1.75 0 0 0 1.5 3.25v5.5c0 .97.78 1.75 1.75 1.75h.25" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
		</svg>
	{/if}
	<span class:sr-only={!showLabel}>{copied ? 'Copied' : label}</span>
	<span class="sr-only" aria-live="polite">{copied ? 'Copied to clipboard' : ''}</span>
</button>

<style>
	.copy {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-width: 28px;
		height: 28px;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.6);
		font-size: 13px;
		font-weight: 500;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.copy.labelled {
		height: 30px;
		padding: 0 12px 0 10px;
		border-radius: 999px;
		background: var(--chip);
		color: #e3e3e3;
	}
	.copy:hover {
		color: #fff;
		background: var(--chip-hover);
	}
</style>
