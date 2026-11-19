<script lang="ts">
	interface Props {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		format?: (value: number) => string;
		/** True once the value is something other than its default. */
		modified?: boolean;
		oninput: (value: number) => void;
		onreset?: () => void;
		hint?: string;
	}

	let {
		label,
		value,
		min,
		max,
		step = 1,
		format = (v) => String(v),
		modified = false,
		oninput,
		onreset,
		hint
	}: Props = $props();

	const uid = $props.id();
	const pct = $derived(Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)));
</script>

<div class="slider" class:modified>
	<div class="head">
		<label for={uid}>{label}</label>
		{#if modified && onreset}
			<button type="button" class="reset" onclick={onreset} aria-label="Reset {label}">Reset</button>
		{/if}
		<output for={uid}>{format(value)}</output>
	</div>
	<input
		id={uid}
		type="range"
		{min}
		{max}
		{step}
		{value}
		style:--p="{pct}%"
		oninput={(e) => oninput(e.currentTarget.valueAsNumber)}
		aria-describedby={hint ? `${uid}-hint` : undefined}
	/>
	{#if hint}<p id="{uid}-hint" class="hint">{hint}</p>{/if}
</div>

<style>
	.slider {
		display: grid;
		gap: 4px;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-size: 13px;
	}
	label {
		flex: 1;
		color: var(--fg-2);
	}
	output {
		color: var(--fg-3);
		font-variant-numeric: tabular-nums;
	}
	.modified output {
		color: #fff;
	}
	.reset {
		font-size: 12px;
		color: var(--fg-3);
	}
	.reset:hover {
		color: #fff;
	}
	input {
		appearance: none;
		-webkit-appearance: none;
		width: 100%;
		height: 18px;
		margin: 0;
		background: transparent;
		cursor: pointer;
	}
	input::-webkit-slider-runnable-track {
		height: 3px;
		border-radius: 3px;
		background: linear-gradient(to right, #d6d6d6 var(--p), rgba(255, 255, 255, 0.12) var(--p));
	}
	input::-moz-range-track {
		height: 3px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.12);
	}
	input::-moz-range-progress {
		height: 3px;
		border-radius: 3px;
		background: #d6d6d6;
	}
	input::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		margin-top: -4.5px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
	}
	input::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border: 0;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
	}
	.modified input::-webkit-slider-runnable-track {
		background:
			linear-gradient(to right, transparent var(--p), #2e2e2e var(--p)),
			linear-gradient(to right, var(--amber), var(--rose));
	}
	.modified input::-moz-range-progress {
		background: var(--rose);
	}
	.hint {
		font-size: 12px;
		line-height: 1.4;
		color: var(--fg-3);
	}
</style>
