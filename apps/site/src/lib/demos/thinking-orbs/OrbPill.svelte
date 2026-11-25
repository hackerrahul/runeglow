<script lang="ts">
	import { ThinkingOrb, type OrbSize, type OrbState, type ThinkingOrbProps } from '@runeglow/svelte/thinking-orbs';

	interface Props extends Omit<ThinkingOrbProps, 'state' | 'size'> {
		state: OrbState;
		size?: OrbSize;
		label?: string;
		tone?: 'dark' | 'light';
	}

	let { state: orbState, size = 20, label, tone = 'dark', ...rest }: Props = $props();

	const text = $derived(label ?? `${orbState.charAt(0).toUpperCase()}${orbState.slice(1)}…`);
</script>

<span class="pill" data-size={size} data-tone={tone}>
	<ThinkingOrb state={orbState} {size} theme={tone} aria-hidden="true" {...rest} />
	<span class="label">{text}</span>
</span>

<style>
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding: 7px 14px 7px 9px;
		border-radius: 999px;
		background: #1c1c1c;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
		font-size: 13.5px;
		color: #d9d9d9;
		white-space: nowrap;
		transition:
			background 0.2s,
			color 0.2s;
	}
	.pill[data-tone='light'] {
		background: #fff;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
		color: #333;
	}
	.pill[data-size='32'] {
		gap: 11px;
		padding: 8px 18px 8px 10px;
		font-size: 15px;
	}
	.pill[data-size='64'] {
		gap: 16px;
		padding: 12px 28px 12px 14px;
		font-size: 20px;
		letter-spacing: -0.01em;
	}
	/* The label breathes the way a "thinking" line does in a chat UI. */
	.label {
		background: linear-gradient(90deg, currentColor 35%, color-mix(in srgb, currentColor 45%, transparent) 50%, currentColor 65%)
			0 0 / 220% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: sheen 2.4s linear infinite;
	}
	@keyframes sheen {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: -120% 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.label {
			animation: none;
		}
	}
</style>
