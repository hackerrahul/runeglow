<script lang="ts" generics="T extends string">
	interface Props {
		label: string;
		options: ReadonlyArray<{ value: T; label: string; paint?: string }>;
		value: T;
		onchange?: (value: T) => void;
		hideLabel?: boolean;
	}

	let { label, options, value = $bindable(), onchange, hideLabel = false }: Props = $props();
	const uid = $props.id();
</script>

<fieldset>
	<legend class:sr-only={hideLabel}>{label}</legend>
	<div class="chips">
		{#each options as option (option.value)}
			<label class:on={option.value === value}>
				<input
					class="sr-only"
					type="radio"
					name={uid}
					value={option.value}
					checked={option.value === value}
					onchange={() => {
						value = option.value;
						onchange?.(option.value);
					}}
				/>
				{#if option.paint}<span class="dot" style:background={option.paint}></span>{/if}
				{option.label}
			</label>
		{/each}
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
		padding: 0;
		margin-bottom: 8px;
		font-size: 13px;
		color: var(--fg-2);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	label {
		/* contains the hidden radio, so focusing it never scrolls the page */
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		background: var(--chip);
		font-size: 13px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.62);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.dot {
		width: 9px;
		height: 9px;
		margin-left: -2px;
		border-radius: 50%;
	}
	label:hover {
		background: var(--chip-hover);
		color: #fff;
	}
	label.on {
		background: var(--chip-on);
		color: #fff;
	}
	label:has(:focus-visible) {
		outline: 2px solid rgba(255, 255, 255, 0.7);
		outline-offset: 2px;
	}
</style>
