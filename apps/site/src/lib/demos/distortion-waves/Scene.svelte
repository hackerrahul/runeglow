<script lang="ts" module>
	import type { WaveType } from 'runeglow/distortion-waves';

	/* Three small interfaces for the wave to cross, one per type:
	   - transfer: a payment review that becomes its receipt (vertical)
	   - credits: a token that becomes a check, ringed from the middle (center)
	   - toast: an upload notice that completes, crossed from its icon (horizontal) */
	export type SceneKind = 'transfer' | 'credits' | 'toast';
	export const SCENE_TYPE: Record<SceneKind, WaveType> = { transfer: 'vertical', credits: 'center', toast: 'horizontal' };
</script>

<script lang="ts">
	import { DistortionWave, type DistortionWaveProps } from 'runeglow/distortion-waves';

	interface Props {
		kind: SceneKind;
		tone?: 'dark' | 'light';
		/** Which view shows. Bindable. */
		revealed?: boolean;
		/** Run the wave back and forth on a timer while the scene is on screen. */
		autoplay?: boolean;
		/** Wave options passed straight to DistortionWave. */
		wave?: Partial<DistortionWaveProps>;
		/** Use the scene's own icon as the wave's source, where it has one. */
		ownSource?: boolean;
		/** The DistortionWave component, for its functions. Bindable. */
		api?: ReturnType<typeof DistortionWave> | null;
	}
	let {
		kind,
		tone = 'dark',
		revealed = $bindable(false),
		autoplay = false,
		wave = {},
		ownSource = true,
		api = $bindable(null)
	}: Props = $props();

	let root = $state<HTMLDivElement | null>(null);
	let token = $state<HTMLSpanElement | null>(null);
	let button = $state<HTMLButtonElement | null>(null);

	/* The wave leaves the button on the transfer, and the icon on the others. */
	const source = $derived(ownSource ? (kind === 'transfer' ? button : token) : undefined);

	/* Autoplay: out, hold, back, hold, only while the scene can be seen. */
	$effect(() => {
		if (!autoplay || !root) return;
		let timer = 0;
		let seen = false;
		const tick = () => {
			revealed = !revealed;
			timer = window.setTimeout(tick, revealed ? 4200 : 2600);
		};
		const io = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting === seen) return;
			seen = entry.isIntersecting;
			clearTimeout(timer);
			if (seen) timer = window.setTimeout(tick, 1400);
		});
		io.observe(root);
		return () => {
			io.disconnect();
			clearTimeout(timer);
		};
	});
</script>

{#snippet check()}
	<svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M5 12.5l4.5 4.5L19 7.5" />
	</svg>
{/snippet}

<div class="scene" data-kind={kind} data-tone={tone}>
	<DistortionWave bind:this={api} bind:ref={root} type={SCENE_TYPE[kind]} {revealed} {source} {...wave} class="wave">
		{#if kind === 'transfer'}
			<div class="view">
				<p class="eyebrow">Send to Maya Chen</p>
				<p class="amount">$240.00</p>
				<dl>
					<div><dt>From</dt><dd>Checking ··42</dd></div>
					<div><dt>Arrives</dt><dd>Today</dd></div>
					<div><dt>Fee</dt><dd>Free</dd></div>
				</dl>
			</div>
		{:else if kind === 'credits'}
			<div class="view">
				<span class="token" bind:this={token}>
					<svg viewBox="0 0 24 24" width="50%" height="50%" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.6 6.9 6.9 2.6-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6z" /></svg>
				</span>
				<p class="title">Add 500 credits</p>
				<p class="sub">$5.00, charged to Visa ··18</p>
			</div>
		{:else}
			<div class="view">
				<span class="token" bind:this={token}><span class="spin"></span></span>
				<span class="lines">
					<span class="title">Uploading report.pdf</span>
					<span class="sub">2.4 MB</span>
				</span>
			</div>
		{/if}

		{#snippet revealedContent()}
			{#if kind === 'transfer'}
				<div class="view done">
					<span class="token ok">{@render check()}</span>
					<p class="amount">$240.00</p>
					<p class="sub">Sent to Maya Chen</p>
				</div>
			{:else if kind === 'credits'}
				<div class="view">
					<span class="token ok">{@render check()}</span>
					<p class="title">500 credits added</p>
					<p class="sub">Your balance is 1,240</p>
				</div>
			{:else}
				<div class="view">
					<span class="token ok">{@render check()}</span>
					<span class="lines">
						<span class="title">Uploaded</span>
						<span class="sub">report.pdf is ready to share</span>
					</span>
				</div>
			{/if}
		{/snippet}

		{#snippet overlay()}
			<div class="bar">
				<button type="button" bind:this={button} onclick={() => (revealed = !revealed)}>
					{#if kind === 'transfer'}
						{revealed ? 'Done' : 'Confirm'}
					{:else if kind === 'credits'}
						{revealed ? 'Done' : 'Buy'}
					{:else}
						{revealed ? 'Undo' : 'Send'}
					{/if}
				</button>
			</div>
		{/snippet}
	</DistortionWave>
</div>

<style>
	.scene {
		--surface: #1c1c1f;
		--ink: #f2f2f3;
		--ink-2: #8f8f96;
		--chip: rgba(255, 255, 255, 0.07);
		--line: rgba(255, 255, 255, 0.07);
		--button: #f2f2f3;
		--button-ink: #161618;
		max-width: 100%;
		color: var(--ink);
	}
	.scene[data-tone='light'] {
		--surface: #ffffff;
		--ink: #17171a;
		--ink-2: #74747c;
		--chip: rgba(0, 0, 0, 0.05);
		--line: rgba(0, 0, 0, 0.08);
		--button: #17171a;
		--button-ink: #ffffff;
	}
	.scene :global(.wave) {
		width: 300px;
		max-width: 100%;
		border-radius: 28px;
		overflow: hidden;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.scene[data-kind='toast'] :global(.wave) {
		width: 340px;
		border-radius: 20px;
	}

	/* Both views are opaque and the same size, so the wave has a whole picture
	   of each. */
	.view {
		display: grid;
		justify-items: center;
		align-content: start;
		gap: 6px;
		height: 100%;
		padding: 26px 22px 84px;
		background: var(--surface);
		text-align: center;
	}
	[data-kind='credits'] .view {
		padding-top: 30px;
	}
	[data-kind='transfer'] .view {
		min-height: 300px;
	}
	[data-kind='transfer'] .view.done {
		align-content: center;
		padding-top: 0;
	}
	[data-kind='toast'] .view {
		grid-template-columns: auto minmax(0, 1fr);
		justify-items: start;
		align-items: center;
		gap: 12px;
		padding: 14px 92px 14px 14px;
		text-align: left;
	}

	.eyebrow {
		font-size: 13px;
		color: var(--ink-2);
	}
	.amount {
		margin: 2px 0 12px;
		font-size: 38px;
		font-weight: 600;
		letter-spacing: -0.03em;
		line-height: 1.1;
	}
	.done .amount {
		margin: 12px 0 0;
	}
	dl {
		display: grid;
		gap: 0;
		width: 100%;
		margin: 0;
		font-size: 13px;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		padding: 9px 2px;
		border-top: 1px solid var(--line);
	}
	dt {
		color: var(--ink-2);
	}
	dd {
		margin: 0;
	}
	.title {
		font-size: 15px;
		font-weight: 550;
		letter-spacing: -0.01em;
	}
	.sub {
		font-size: 13px;
		color: var(--ink-2);
	}
	.lines {
		display: grid;
		gap: 1px;
		min-width: 0;
	}
	.lines .title,
	.lines .sub {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.token {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		margin-bottom: 10px;
		border-radius: 50%;
		background: var(--chip);
		color: var(--ink);
	}
	.token.ok {
		background: #2fbf71;
		color: #fff;
	}
	[data-kind='toast'] .token {
		width: 36px;
		height: 36px;
		margin: 0;
	}
	.spin {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid var(--line);
		border-top-color: var(--ink);
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}

	/* The overlay stays live above the wave: the button that starts it. */
	.bar {
		position: absolute;
		left: 18px;
		right: 18px;
		bottom: 18px;
	}
	[data-kind='toast'] .bar {
		left: auto;
		right: 12px;
		top: 50%;
		bottom: auto;
		transform: translateY(-50%);
	}
	button {
		width: 100%;
		height: 46px;
		border: 0;
		border-radius: 23px;
		background: var(--button);
		font: inherit;
		font-size: 14.5px;
		font-weight: 550;
		color: var(--button-ink);
		cursor: pointer;
	}
	[data-kind='toast'] button {
		width: auto;
		height: 32px;
		padding: 0 14px;
		border-radius: 16px;
		background: var(--chip);
		font-size: 13px;
		color: var(--ink);
	}
	@media (prefers-reduced-motion: reduce) {
		.spin {
			animation: none;
		}
	}
</style>
