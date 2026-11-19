<script lang="ts">
	interface Props {
		label: string;
		checked: boolean;
		onchange?: (checked: boolean) => void;
		hint?: string;
	}

	let { label, checked = $bindable(), onchange, hint }: Props = $props();
</script>

<label class="toggle">
	<span class="text">
		<span class="name">{label}</span>
		{#if hint}<span class="hint">{hint}</span>{/if}
	</span>
	<input
		class="sr-only"
		type="checkbox"
		role="switch"
		{checked}
		onchange={(e) => {
			checked = e.currentTarget.checked;
			onchange?.(checked);
		}}
	/>
	<span class="switch" aria-hidden="true"></span>
</label>

<style>
	.toggle {
		/* contains the hidden checkbox, so focusing it never scrolls the page */
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		cursor: pointer;
	}
	.text {
		display: grid;
		gap: 2px;
	}
	.name {
		font-size: 13px;
		color: var(--fg-2);
	}
	.hint {
		font-size: 12px;
		line-height: 1.4;
		color: var(--fg-3);
	}
	.switch {
		position: relative;
		flex: none;
		width: 30px;
		height: 18px;
		margin-top: 1px;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.14);
		transition: background 0.15s;
	}
	.switch::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #9a9a9a;
		transition:
			transform 0.15s,
			background 0.15s;
	}
	input:checked + .switch {
		background: linear-gradient(100deg, var(--rose), var(--violet));
	}
	input:checked + .switch::after {
		transform: translateX(12px);
		background: #fff;
	}
	input:focus-visible + .switch {
		outline: 2px solid rgba(255, 255, 255, 0.7);
		outline-offset: 2px;
	}
</style>
