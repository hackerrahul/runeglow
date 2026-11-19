<script lang="ts">
	interface Props {
		label: string;
		options: ReadonlyArray<{ value: string; label: string }>;
		/** `null` is the automatic choice, when `autoLabel` offers one. */
		value: string | null;
		/** Adds an "auto" choice in front, with this as its name. */
		autoLabel?: string;
		/** What the colour picker starts from while the value is automatic. */
		fallback?: string;
		onchange?: (value: string | null) => void;
	}

	let { label, options, value = $bindable(), autoLabel, fallback = '#888888', onchange }: Props = $props();
	const uid = $props.id();

	const current = $derived(
		value === null ? (autoLabel ?? '') : (options.find((o) => o.value.toLowerCase() === value?.toLowerCase())?.label ?? value)
	);

	/* A colour input only accepts #rrggbb; anything else gets a neutral grey. */
	const HEX = /^#[0-9a-f]{6}$/i;
	const picked = $derived(
		value && HEX.test(value) ? value : fallback && HEX.test(fallback) ? fallback : '#888888'
	);

	function set(next: string | null) {
		value = next;
		onchange?.(next);
	}
</script>

<fieldset>
	<legend>
		{label}
		<span>{current}</span>
	</legend>
	<div class="row">
		{#if autoLabel}
			<label class="auto" class:on={value === null}>
				<input class="sr-only" type="radio" name={uid} checked={value === null} onchange={() => set(null)} />
				{autoLabel}
			</label>
		{/if}
		{#each options as option (option.value)}
			<label class="dot" class:on={value?.toLowerCase() === option.value.toLowerCase()} title={option.label}>
				<input
					class="sr-only"
					type="radio"
					name={uid}
					checked={value?.toLowerCase() === option.value.toLowerCase()}
					onchange={() => set(option.value)}
				/>
				<span style:background={option.value}></span>
				<span class="sr-only">{option.label}</span>
			</label>
		{/each}
		<input
			class="pick"
			type="color"
			value={picked}
			oninput={(e) => set(e.currentTarget.value)}
			aria-label="Custom {label.toLowerCase()}"
			title="Custom"
		/>
	</div>
</fieldset>

<style>
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		display: flex;
		justify-content: space-between;
		width: 100%;
		padding: 0;
		margin-bottom: 8px;
		font-size: 13px;
		color: var(--fg-2);
	}
	legend span {
		color: var(--fg-3);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
	}
	.auto,
	.dot {
		/* contains the hidden radio, so focusing it never scrolls the page */
		position: relative;
	}
	.auto {
		display: inline-flex;
		align-items: center;
		height: 24px;
		padding: 0 9px;
		margin-right: 2px;
		border-radius: 999px;
		background: var(--chip);
		font-size: 12.5px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.62);
		cursor: pointer;
	}
	.auto.on {
		background: var(--chip-on);
		color: #fff;
	}
	.dot {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: inset 0 0 0 1.5px transparent;
		transition: box-shadow 0.15s;
	}
	.dot:hover {
		box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.3);
	}
	.dot.on {
		box-shadow: inset 0 0 0 1.5px #fff;
	}
	.dot span:first-of-type {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
	}
	label:has(:focus-visible) {
		outline: 2px solid var(--violet);
		outline-offset: 2px;
	}
	.pick {
		width: 24px;
		height: 18px;
		margin-left: 4px;
		padding: 0;
		border: 0;
		border-radius: 5px;
		background: none;
		cursor: pointer;
	}
	.pick::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.pick::-webkit-color-swatch {
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 5px;
	}
	.pick::-moz-color-swatch {
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 5px;
	}
</style>
