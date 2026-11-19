<script lang="ts">
	import {
		ImageGeneration,
		PRESETS,
		type ImageGenerationCycleEvent,
		type ImageGenerationPreset
	} from 'runeglow/img-fx';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { SITE } from '#lib/site.ts';
	import { IMAGE_POOL, PALETTES, paletteColors, type PaletteKey } from './images.ts';

	type Theme = 'dark' | 'light' | 'auto';

	const PRESET_OPTIONS: { value: ImageGenerationPreset; label: string }[] = [
		{ value: 'pixels-organic', label: 'Organic' },
		{ value: 'pixels-mechanic', label: 'Mechanic' },
		{ value: 'sweep-gradient', label: 'Gradient sweep' }
	];
	const THEMES: { value: Theme; label: string }[] = [
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' },
		{ value: 'auto', label: 'Auto' }
	];
	const CARD_BGS = [
		{ value: '#1b1b24', label: 'Ink' },
		{ value: '#1a2330', label: 'Navy' },
		{ value: '#241a2e', label: 'Plum' },
		{ value: '#2a1f1a', label: 'Umber' },
		{ value: '#eeeeef', label: 'Paper' }
	];

	const num = (v: number) => String(+v.toFixed(3));
	const times = (v: number) => `${num(v)}×`;
	const secs = (v: number) => `${num(v)}s`;

	/* Flat on purpose: "Reset all" writes each field back in place. */
	const fresh = () => ({
		preset: 'pixels-organic' as ImageGenerationPreset,
		theme: 'dark' as Theme,
		paused: false,
		strength: 100,
		speed: 1,
		pixelScale: 1,
		palette: 'preset' as PaletteKey,
		cardBg: null as string | null,
		size: 280,
		radius: 20,
		autoReveal: false,
		delayMin: 2,
		delayMax: 4,
		initialDelay: null as number | null,
		holdMs: 2000,
		fadeOutMs: 300,
		regenMs: 3000,
		tint: true
	});
	type State = ReturnType<typeof fresh>;
	const s = $state(fresh());
	const DEFAULTS = fresh();

	let systemDark = $state(true);
	$effect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mq.matches;
		const on = (e: MediaQueryListEvent) => (systemDark = e.matches);
		mq.addEventListener('change', on);
		return () => mq.removeEventListener('change', on);
	});
	const stageTheme = $derived(s.theme === 'auto' ? (systemDark ? 'dark' : 'light') : s.theme);

	const colors = $derived(paletteColors(PRESETS[s.preset].modes[stageTheme], s.palette));
	const delayRange = $derived<[number, number]>([Math.min(s.delayMin, s.delayMax), Math.max(s.delayMin, s.delayMax)]);

	let card = $state<ReturnType<typeof ImageGeneration> | null>(null);
	let phase = $state<ImageGenerationCycleEvent['phase']>('idle');
	const revealed = $derived(phase === 'reveal' || phase === 'visible');
	function onCycle(e: ImageGenerationCycleEvent) {
		phase = e.phase;
	}
	function toggleReveal() {
		if (!card) return;
		if (card.isImageActive()) card.triggerHide();
		else card.triggerReveal({ hold: 'manual' });
	}
	function regenerate() {
		card?.triggerRegenerate({ durationMs: s.regenMs, tintFromImage: s.tint });
	}

	const PHASE_LABEL: Record<string, string> = {
		idle: 'Generating',
		reveal: 'Revealing',
		visible: 'Image shown',
		hide: 'Hiding'
	};

	const modified = $derived(
		(Object.keys(DEFAULTS) as (keyof State)[]).filter((k) => k !== 'paused' && s[k] !== DEFAULTS[k]).length
	);
	function reset() {
		const d = fresh();
		for (const k of Object.keys(d) as (keyof State)[]) (s[k] as State[keyof State]) = d[k];
	}

	const snippet = $derived.by(() => {
		const p = [`preset="${s.preset}"`];
		if (s.theme !== 'auto') p.push(`theme="${s.theme}"`);
		if (s.strength !== 100) p.push(`strength={${num(s.strength / 100)}}`);
		if (s.speed !== 1) p.push(`speed={${num(s.speed)}}`);
		if (s.pixelScale !== 1) p.push(`pixelScale={${num(s.pixelScale)}}`);
		if (s.cardBg) p.push(`cardBg="${s.cardBg}"`);
		if (colors) p.push(`colors={[${colors.map((c) => (c ? `'${c}'` : 'null')).join(', ')}]}`);
		p.push("images={['/images/a.jpg', '/images/b.jpg', '/images/c.jpg']}");
		if (s.autoReveal) {
			p.push('autoReveal');
			if (s.delayMin !== 2 || s.delayMax !== 4) p.push(`revealDelayRange={[${num(delayRange[0])}, ${num(delayRange[1])}]}`);
			if (s.initialDelay != null) p.push(`revealInitialDelay={${num(s.initialDelay)}}`);
		}
		if (s.holdMs !== 2000) p.push(`revealHoldMs={${s.holdMs}}`);
		if (s.fadeOutMs !== 300) p.push(`revealFadeOutMs={${s.fadeOutMs}}`);
		const regen = [`durationMs: ${s.regenMs}`];
		if (!s.tint) regen.push('tintFromImage: false');
		const lines = [
			'<script>',
			`  import { ImageGeneration } from '${SITE.pkg}/img-fx';`,
			'',
			'  let card; // the component, for its reveal functions',
			'<\/script>',
			'',
			`<ImageGeneration\n  bind:this={card}\n  ${p.join('\n  ')}\n>`,
			`  <div style="width: ${s.size}px; height: ${s.size}px; border-radius: ${s.radius}px;"></div>`,
			'</ImageGeneration>',
			'',
			"<button onclick={() => (card.isImageActive() ? card.triggerHide() : card.triggerReveal({ hold: 'manual' }))}>",
			'  Reveal or hide',
			'</button>',
			`<button onclick={() => card.triggerRegenerate({ ${regen.join(', ')} })}>Regenerate</button>`
		];
		return lines.join('\n');
	});

	const prompt = $derived(`Add the Image generation effect from ${SITE.name} to this Svelte 5 app: a WebGL mosaic
loader on a card that resolves into an image.

1. Install the packages with the project's package manager, for example:
   pnpm add ${SITE.pkg} three
2. Import it: import { ImageGeneration } from '${SITE.pkg}/img-fx'
3. Wrap one element, the card. The wrapper sizes itself to it and reads its border-radius.
4. Give it a pool of images (same-origin, or served with CORS headers).
5. Start from this configuration:

${snippet}

Parameter vocabulary, for later changes:
- preset: pixels-organic, pixels-mechanic or sweep-gradient. theme: auto, dark, light.
- strength 0 to 2, speed, pixelScale (cell size), cardBg (the surface the effect sits on),
  colors (seven palette slots; null keeps the preset's).
- autoReveal with revealDelayRange [min, max] seconds, revealInitialDelay, revealHoldMs,
  revealFadeOutMs. onCycle reports idle, reveal, visible, hide.
- The component's functions (bind:this): triggerReveal({ hold: 'manual' }), triggerHide(),
  triggerRegenerate({ durationMs, tintFromImage, autoReveal }), isImageActive().
- paused freezes the effect and the reveal schedule.

Notes:
- three is a peer dependency. One WebGL context is shared by every card on the page.
- Cards pause while offscreen.`);
</script>

<PlaygroundShell
	label="Image generation controls"
	{stageTheme}
	playing={!s.paused}
	ontoggle={() => (s.paused = !s.paused)}
	{modified}
	onreset={reset}
	code={snippet}
	{prompt}
>
	{#snippet stageTop()}
		<p class="phase" data-theme={stageTheme}><span class="dot" data-on={phase !== 'idle'}></span>{PHASE_LABEL[phase] ?? phase}</p>
	{/snippet}
	{#snippet stage()}
		<ImageGeneration
			bind:this={card}
			preset={s.preset}
			theme={stageTheme}
			strength={s.strength / 100}
			speed={s.speed}
			pixelScale={s.pixelScale}
			cardBg={s.cardBg ?? undefined}
			{colors}
			images={IMAGE_POOL}
			autoReveal={s.autoReveal}
			revealDelayRange={delayRange}
			revealInitialDelay={s.initialDelay ?? undefined}
			revealHoldMs={s.holdMs}
			revealFadeOutMs={s.fadeOutMs}
			paused={s.paused}
			{onCycle}
			style="max-width: 100%;"
		>
			<div class="card" style:width="{s.size}px" style:border-radius="{s.radius}px"></div>
		</ImageGeneration>
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="Type" options={PRESET_OPTIONS} bind:value={s.preset} />
			<div class="actions">
				<button type="button" class="chip" onclick={toggleReveal} disabled={s.paused} aria-pressed={revealed}>
					{revealed ? 'Hide image' : 'Reveal image'}
				</button>
				<button type="button" class="chip" onclick={regenerate} disabled={s.paused || !revealed}>Regenerate</button>
			</div>
			{#if s.paused}
				<p class="hint">Press Play to reveal or regenerate.</p>
			{:else if !revealed}
				<p class="hint">Reveal an image, then Regenerate breaks it up and resolves the next one.</p>
			{/if}
			<Segmented label="Theme" options={THEMES} bind:value={s.theme} />
		</PanelGroup>

		<PanelGroup title="Effect">
			<Slider label="Strength" value={s.strength} min={0} max={200} format={(v) => `${v}%`} modified={s.strength !== 100} oninput={(v) => (s.strength = v)} onreset={() => (s.strength = 100)} hint="100% is the preset's own look; above it boosts the intensity." />
			<Slider label="Speed" value={s.speed} min={0.25} max={3} step={0.05} format={times} modified={s.speed !== 1} oninput={(v) => (s.speed = v)} onreset={() => (s.speed = 1)} />
			<Slider label="Pixel scale" value={s.pixelScale} min={0.5} max={2} step={0.05} format={times} modified={s.pixelScale !== 1} oninput={(v) => (s.pixelScale = v)} onreset={() => (s.pixelScale = 1)} hint="Size of the mosaic's cells." />
		</PanelGroup>

		<PanelGroup title="Colour">
			<Segmented label="Palette" options={PALETTES} bind:value={s.palette} />
			<SwatchRow label="Card background" options={CARD_BGS} bind:value={s.cardBg} autoLabel="Preset's" fallback={PRESETS[s.preset].modes[stageTheme].cardBg} />
			<p class="hint">A palette re-hues the preset's ink and keeps its light and dark. The background is the surface the effect reasons against.</p>
		</PanelGroup>

		<PanelGroup title="Card">
			<Slider label="Size" value={s.size} min={120} max={360} step={4} format={(v) => `${v}px`} modified={s.size !== 280} oninput={(v) => (s.size = v)} onreset={() => (s.size = 280)} />
			<Slider label="Corner radius" value={s.radius} min={0} max={80} format={(v) => `${v}px`} modified={s.radius !== 20} oninput={(v) => (s.radius = v)} onreset={() => (s.radius = 20)} hint="Set on the wrapped card. The effect reads it." />
		</PanelGroup>

		<PanelGroup title="Reveal">
			<Toggle label="Auto reveal" hint="Reveals an image from the pool every few seconds." bind:checked={s.autoReveal} />
			{#if s.autoReveal}
				<Slider label="Shortest wait" value={s.delayMin} min={0} max={10} step={0.25} format={secs} modified={s.delayMin !== 2} oninput={(v) => (s.delayMin = v)} onreset={() => (s.delayMin = 2)} />
				<Slider label="Longest wait" value={s.delayMax} min={0} max={12} step={0.25} format={secs} modified={s.delayMax !== 4} oninput={(v) => (s.delayMax = v)} onreset={() => (s.delayMax = 4)} />
				<Slider label="First wait" value={s.initialDelay ?? 0} min={0} max={8} step={0.25} format={(v) => (s.initialDelay == null ? 'Auto' : secs(v))} modified={s.initialDelay != null} oninput={(v) => (s.initialDelay = v)} onreset={() => (s.initialDelay = null)} hint="Applies when the card is first mounted." />
			{/if}
			<Slider label="Hold" value={s.holdMs} min={200} max={8000} step={100} format={(v) => `${v}ms`} modified={s.holdMs !== 2000} oninput={(v) => (s.holdMs = v)} onreset={() => (s.holdMs = 2000)} hint="How long an auto-revealed image stays." />
			<Slider label="Fade out" value={s.fadeOutMs} min={0} max={2000} step={50} format={(v) => `${v}ms`} modified={s.fadeOutMs !== 300} oninput={(v) => (s.fadeOutMs = v)} onreset={() => (s.fadeOutMs = 300)} />
		</PanelGroup>

		<PanelGroup title="Regenerate">
			<Slider label="Churn" value={s.regenMs} min={500} max={8000} step={100} format={(v) => `${v}ms`} modified={s.regenMs !== 3000} oninput={(v) => (s.regenMs = v)} onreset={() => (s.regenMs = 3000)} hint="How long the image stays broken up before the next one resolves." />
			<Toggle label="Tint from image" hint="Recolours the effect from the image it is leaving." bind:checked={s.tint} />
		</PanelGroup>
	{/snippet}
</PlaygroundShell>

<style>
	.card {
		max-width: 100%;
		aspect-ratio: 1 / 1;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.actions .chip {
		border: 0;
		font-family: inherit;
		cursor: pointer;
	}
	.actions .chip:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.actions .chip[aria-pressed='true'] {
		background: var(--chip-hover);
		color: #fff;
	}
	.hint {
		font-size: 12px;
		line-height: 1.5;
		color: var(--fg-3);
	}
	.phase {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.phase[data-theme='light'] {
		color: #7a7a7a;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		opacity: 0.5;
	}
	.dot[data-on='true'] {
		background: var(--amber);
		opacity: 1;
	}
</style>
