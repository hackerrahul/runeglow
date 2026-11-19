<script lang="ts">
	import { MetalFx, useMetalBend } from 'runeglow/metal-fx';
	import './demo.css';

	/* A chat composer whose send button is a metal ring: the ring dents under
	   the cursor and the chip next to it catches its light. */
	let { strength = 0.81 }: { strength?: number } = $props();

	let send = $state<HTMLDivElement | null>(null);
	let chip = $state<HTMLDivElement | null>(null);
	useMetalBend(() => send);
</script>

<div class="composer">
	<p class="input">Build anything…</p>
	<div class="bottom">
		<span class="plus" aria-hidden="true">
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
		</span>
		<span class="spacer"></span>
		<div class="mfx-chip">
			<span>Agent</span>
			<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
		</div>
		<div class="mfx-chip" bind:this={chip}>
			<span>Auto</span>
			<svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
		</div>
		<MetalFx bind:ref={send} variant="circle" theme="dark" {strength} innerShadow reflectionTargets={[chip]}>
			<button type="button" class="mfx-send" aria-label="Send">
				<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
			</button>
		</MetalFx>
	</div>
</div>

<style>
	.composer {
		display: flex;
		flex-direction: column;
		width: 448px;
		max-width: 100%;
		padding: 20px 16px 16px;
		border-radius: 20px;
		background: rgba(29, 29, 29, 0.7);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
	}
	.input {
		margin: 0 0 18px 4px;
		font-size: 14px;
		line-height: 16px;
		color: #5a5a5a;
	}
	.bottom {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.spacer {
		flex: 1;
		min-width: 0;
	}
	.plus {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		flex: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.04);
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.02),
			inset 0 1px 0 0 rgba(255, 255, 255, 0.04);
		color: #caccd2;
	}
	@media (max-width: 420px) {
		.plus {
			display: none;
		}
	}
</style>
