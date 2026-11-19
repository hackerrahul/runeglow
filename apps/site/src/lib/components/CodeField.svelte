<script lang="ts">
	interface Props {
		label: string;
		value: string;
		placeholder?: string;
		hint?: string;
		rows?: number;
	}

	let { label, value = $bindable(), placeholder, hint, rows = 4 }: Props = $props();
</script>

<label>
	<span>{label}</span>
	<textarea {rows} spellcheck="false" {placeholder} bind:value></textarea>
	{#if hint}<span class="hint">{hint}</span>{/if}
</label>

<style>
	label {
		display: grid;
		gap: 8px;
		font-size: 13px;
		color: var(--fg-2);
	}
	.hint {
		font-size: 12px;
		line-height: 1.4;
		color: var(--fg-3);
	}
	textarea {
		width: 100%;
		min-height: 84px;
		padding: 9px 10px;
		resize: vertical;
		border: 0;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.05);
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.55;
		color: #e3e3e3;
	}
	textarea::placeholder {
		color: #5c5c5c;
	}
</style>
