<script lang="ts">
	interface Props {
		/** Counts up while true. */
		running?: boolean;
		tone?: 'dark' | 'light';
	}
	let { running = true, tone = 'dark' }: Props = $props();

	let seconds = $state(0);
	$effect(() => {
		if (!running) return;
		const id = setInterval(() => (seconds += 1), 1000);
		return () => clearInterval(id);
	});

	const mm = $derived(String(Math.floor(seconds / 60)).padStart(2, '0'));
	const ss = $derived(String(seconds % 60).padStart(2, '0'));
</script>

<div class="pill" data-tone={tone} role="img" aria-label="Recording pill example">
	<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
		<rect x="5.75" y="1.75" width="4.5" height="7.5" rx="2.25" />
		<path d="M3.5 7.75a4.5 4.5 0 0 0 9 0M8 12.25v2" />
	</svg>
	<span class="time">{mm}:{ss}</span>
	<span class="stop"></span>
</div>

<style>
	.pill {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 150px;
		height: 44px;
		padding: 0 8px 0 15px;
		border-radius: 22px;
		background: #1c1c1c;
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #9a9a9a;
	}
	.pill[data-tone='light'] {
		background: #fbfbfc;
		border-color: rgba(0, 0, 0, 0.1);
		color: #4a4a4a;
	}
	.pill[data-tone='light'] .stop {
		background: rgba(252, 252, 252, 0.4);
		box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.14);
	}
	/* Above the glow's layers (z-index up to 4), so a light pill's wash does
	   not paint over the icon, the time and the stop button. */
	.pill > :global(*) {
		position: relative;
		z-index: 5;
	}
	.time {
		flex: 1;
		font-size: 14px;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}
	.stop {
		position: relative;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(127, 127, 127, 0.18);
	}
	.stop::after {
		content: '';
		position: absolute;
		inset: 9px;
		border-radius: 3px;
		background: currentColor;
	}
</style>
