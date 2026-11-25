<script lang="ts">
	import { DistortionWave, defaultStyle, duration, type PaletteName, type WaveType } from '@runeglow/svelte/distortion-waves';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { perFramework, type Props } from '#lib/code.ts';
	import { SITE } from '#lib/site.ts';
	import { functionsLine, playgroundCode, promptImport, runStep, sourceWord, viewsStep } from './code.ts';
	import { CURVES, CURVE_OPTIONS, KNOB_GROUPS, type CurveKey, type Knob, type KnobKey } from './knobs.ts';
	import Scene, { type SceneKind } from './Scene.svelte';

	type Theme = 'dark' | 'light';
	type PaletteChoice = 'own' | PaletteName | 'custom';
	type SourceChoice = 'control' | 'corner' | 'middle';
	type Live = 'on' | 'animations' | 'off';
	type Motion = 'system' | 'always' | 'never';

	const TYPES: { value: WaveType; label: string }[] = [
		{ value: 'vertical', label: 'Vertical' },
		{ value: 'center', label: 'Center' },
		{ value: 'horizontal', label: 'Horizontal' }
	];
	const SCENE: Record<WaveType, SceneKind> = { vertical: 'transfer', center: 'credits', horizontal: 'toast' };
	const PALETTE_OPTIONS: { value: PaletteChoice; label: string; paint?: string }[] = [
		{ value: 'own', label: "Type's own" },
		{ value: 'colorful', label: 'Colorful', paint: 'linear-gradient(135deg, #ffc915, #b428e6, #7ec4ff)' },
		{ value: 'green', label: 'Green', paint: '#35ba00' },
		{ value: 'ocean', label: 'Ocean', paint: '#2878ff' },
		{ value: 'sunset', label: 'Sunset', paint: '#ff7a3d' },
		{ value: 'mono', label: 'Mono', paint: '#bdbdbd' },
		{ value: 'custom', label: 'One colour' }
	];
	const SWATCHES = [
		{ value: '#ff6f91', label: 'Rose' },
		{ value: '#9180ff', label: 'Violet' },
		{ value: '#ffb86b', label: 'Amber' },
		{ value: '#5ce096', label: 'Green' },
		{ value: '#6bd0ff', label: 'Sky' }
	];
	const SOURCES: { value: SourceChoice; label: string }[] = [
		{ value: 'control', label: 'Its control' },
		{ value: 'corner', label: 'Top left corner' },
		{ value: 'middle', label: 'Middle' }
	];
	const THEMES: { value: Theme; label: string }[] = [
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' }
	];
	const LIVE: { value: Live; label: string }[] = [
		{ value: 'on', label: 'After changes' },
		{ value: 'animations', label: 'Also animations' },
		{ value: 'off', label: 'Never' }
	];
	const MOTION: { value: Motion; label: string }[] = [
		{ value: 'system', label: 'System' },
		{ value: 'never', label: 'Always wave' },
		{ value: 'always', label: 'Always fade' }
	];

	const num = (v: number) => +v.toFixed(3);
	const UNIT: Record<Knob['unit'], (v: number) => string> = {
		s: (v) => `${num(v)}s`,
		pt: (v) => `${num(v)}pt`,
		pct: (v) => `${Math.round(v * 100)}%`,
		x: (v) => `${num(v)}×`,
		n: (v) => String(v)
	};

	/* Flat on purpose: "Reset all" writes each field back in place. */
	const fresh = () => ({
		type: 'vertical' as WaveType,
		theme: 'dark' as Theme,
		palette: 'own' as PaletteChoice,
		color: '#9180ff' as string | null,
		source: 'control' as SourceChoice,
		curve: 'default' as CurveKey,
		scale: null as number | null,
		radius: null as number | null,
		scrubbing: false,
		scrub: 0.4,
		lens: true,
		live: 'on' as Live,
		prewarm: true,
		resolution: null as number | null,
		motion: 'system' as Motion
	});
	type State = ReturnType<typeof fresh>;
	const s = $state(fresh());
	const DEFAULTS = fresh();
	/* The moved numbers, under "vertical.travel", "center.travel"…: each type
	   keeps its own. Emptied in place on reset. */
	const knobs = $state<Record<string, number>>({});

	let revealed = $state(false);
	let api = $state<ReturnType<typeof DistortionWave> | null>(null);
	let finished = $state<string>('');

	const base = $derived(defaultStyle(s.type));
	const knobValue = (k: Knob) => knobs[`${s.type}.${k.key}`] ?? base[k.key];
	const moved = $derived.by(() => {
		const prefix = `${s.type}.`;
		const out: Partial<Record<KnobKey, number>> = {};
		for (const [key, v] of Object.entries(knobs)) if (key.startsWith(prefix)) out[key.slice(prefix.length) as KnobKey] = v;
		return out;
	});
	const curve = $derived(CURVES[s.curve]);
	const waveStyle = $derived.by(() => {
		const out: Record<string, number> = { ...moved };
		if (s.curve !== 'default') [out.easeX1, out.easeY1, out.easeX2, out.easeY2] = curve;
		return Object.keys(out).length ? out : undefined;
	});
	const palette = $derived(s.palette === 'own' ? undefined : s.palette === 'custom' ? (s.color ?? '#9180ff') : s.palette);
	const source = $derived(
		s.source === 'corner' ? { x: -1, y: -1, w: 2, h: 2 } : s.source === 'middle' ? { x: 130, y: 130, w: 40, h: 40 } : undefined
	);
	const total = $derived(duration({ ...base, ...moved }));

	/* What the stage passes to the wave. */
	const wave = $derived({
		palette,
		waveStyle,
		...(source ? { source } : {}),
		scale: s.scale ?? ('auto' as const),
		cornerRadius: s.radius ?? undefined,
		scrub: s.scrubbing ? s.scrub : null,
		capture: s.lens,
		live: s.live === 'on' ? true : s.live === 'animations' ? ('animations' as const) : false,
		prewarm: s.prewarm,
		resolution: s.resolution ?? undefined,
		reducedMotion: s.motion,
		onFinish: (now: boolean) => (finished = now ? 'Finished on the second view.' : 'Back on the first view.')
	});

	const modified = $derived(
		(Object.keys(DEFAULTS) as (keyof State)[]).filter((k) => s[k] !== DEFAULTS[k]).length + Object.keys(knobs).length
	);
	function reset() {
		for (const key of Object.keys(knobs)) delete knobs[key];
		const d = fresh();
		for (const key of Object.keys(d) as (keyof State)[]) (s[key] as State[keyof State]) = d[key];
		restart();
	}
	function restart() {
		api?.reset();
		revealed = false;
		finished = '';
	}
	/* A new type is a new scene: start it on its first view. */
	function chooseType(next: WaveType) {
		revealed = false;
		finished = '';
		s.type = next;
	}

	/* The wave's options as the snippet prints them: what differs from the
	   defaults, and nothing else. */
	const printed = $derived.by(() => {
		const p: Props = {};
		if (s.type !== 'vertical') p.type = s.type;
		if (palette) p.palette = palette;
		if (source) p.source = source;
		if (waveStyle) p.waveStyle = Object.fromEntries(Object.entries(waveStyle).map(([k, v]) => [k, num(v)]));
		if (s.scale != null) p.scale = num(s.scale);
		if (s.radius != null) p.cornerRadius = s.radius;
		if (s.scrubbing) p.scrub = num(s.scrub);
		if (!s.lens) p.capture = false;
		if (s.live !== 'on') p.live = s.live === 'animations' ? 'animations' : false;
		if (!s.prewarm) p.prewarm = false;
		if (s.resolution != null) p.resolution = num(s.resolution);
		if (s.motion !== 'system') p.reducedMotion = s.motion;
		return p;
	});
	const snippet = $derived(playgroundCode(s.type, printed));

	const prompt = $derived(
		perFramework(
			(fw, info) => `Add a Distortion wave from ${SITE.name} to this ${info.app}: a coloured wave that leaves a
button and carries one view into another, bending the page as it passes.

1. Install the package with the project's package manager, for example: pnpm add ${info.pkg}
2. ${promptImport(fw)}
3. ${viewsStep[fw]}
4. ${runStep[fw]}
5. Start from this configuration:

${snippet[fw]}

Parameter vocabulary, for later changes:
- type: vertical, horizontal or center. palette: colorful, green, ocean, sunset, mono, a
  #RRGGBB colour, or a Palette object.
- source: ${sourceWord[fw]}. Default: the control last
  pressed inside it.
- waveStyle: any of the wave's numbers (travel, anticipation, amplitude, blur, aberration,
  strength, rimStrength, particleCount and so on). Lengths are in points and grow with scale.
- scale ("auto" or CSS px per point), cornerRadius, scrub (0 to 1, holds the wave there),
  capture (false draws the colour alone), live, prewarm, resolution, reducedMotion.
${functionsLine[fw]}

Notes:
- The wave bends a picture of the views, so what animates inside a view stands still
  while it passes. Anything that must stay live goes in the overlay.
- It needs WebGL 2. Without it, or under reduced motion, it crossfades.`
		)
	);
</script>

{#snippet knob(k: Knob)}
	<Slider
		label={k.label}
		value={knobValue(k)}
		min={k.min}
		max={k.max}
		step={k.step}
		format={UNIT[k.unit]}
		modified={knobs[`${s.type}.${k.key}`] != null}
		oninput={(v) => (knobs[`${s.type}.${k.key}`] = v)}
		onreset={() => delete knobs[`${s.type}.${k.key}`]}
	/>
{/snippet}

<PlaygroundShell label="Distortion waves controls" stageTheme={s.theme} {modified} onreset={reset} code={snippet} {prompt}>
	{#snippet stageTop()}
		<p class="status" data-theme={s.theme}>{finished || 'Press the button in the card.'}</p>
	{/snippet}
	{#snippet stage()}
		{#key s.type}
			<Scene kind={SCENE[s.type]} tone={s.theme} bind:revealed bind:api {wave} ownSource={s.source === 'control'} />
		{/key}
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="Type" options={TYPES} value={s.type} onchange={chooseType} />
			<div class="actions">
				<button type="button" class="chip" onclick={() => (revealed = !revealed)}>{revealed ? 'Run it back' : 'Run the wave'}</button>
				<button type="button" class="chip" onclick={restart}>Reset</button>
			</div>
			<p class="hint">One run takes about {total.toFixed(1)}s, until the last colour has faded.</p>
			<Segmented label="Theme" options={THEMES} bind:value={s.theme} />
		</PanelGroup>

		<PanelGroup title="Colour">
			<Segmented label="Palette" options={PALETTE_OPTIONS} bind:value={s.palette} />
			{#if s.palette === 'custom'}
				<SwatchRow label="Colour" options={SWATCHES} bind:value={s.color} fallback="#9180ff" />
			{/if}
		</PanelGroup>

		<PanelGroup title="Source">
			<Segmented label="Starts from" options={SOURCES} bind:value={s.source} />
			<p class="hint">
				{s.source === 'control'
					? 'The button or icon in the card. Where you press it leans the front that way.'
					: 'A rectangle in the card’s own pixels, passed as source.'}
			</p>
		</PanelGroup>

		<PanelGroup title="Hold">
			<Toggle label="Scrub" hint="Holds the wave at one point of its run instead of playing." bind:checked={s.scrubbing} />
			{#if s.scrubbing}
				<Slider label="Position" value={s.scrub} min={0} max={1} step={0.005} format={(v) => `${Math.round(v * 100)}%`} modified={s.scrub !== 0.4} oninput={(v) => (s.scrub = v)} onreset={() => (s.scrub = 0.4)} />
			{/if}
		</PanelGroup>

		{#each KNOB_GROUPS as group (group.title)}
			<PanelGroup title={group.title}>
				{#each group.items as k (`${s.type}.${k.key}`)}
					{@render knob(k)}
				{/each}
				{#if group.title === 'Timing'}
					<Segmented label="Travel curve" options={CURVE_OPTIONS} bind:value={s.curve} />
				{/if}
			</PanelGroup>
		{/each}

		<PanelGroup title="Size">
			<Slider label="Scale" value={s.scale ?? 1} min={0.4} max={2} step={0.05} format={(v) => (s.scale == null ? 'Auto' : `${num(v)}×`)} modified={s.scale != null} oninput={(v) => (s.scale = v)} onreset={() => (s.scale = null)} hint="CSS pixels per point. Auto sizes the wave to the element." />
			<Slider label="Edge radius" value={s.radius ?? 28} min={0} max={80} format={(v) => (s.radius == null ? 'Auto' : `${v}px`)} modified={s.radius != null} oninput={(v) => (s.radius = v)} onreset={() => (s.radius = null)} hint="The radius the edge colour follows. Auto reads the element's." />
			<Slider label="Resolution" value={s.resolution ?? 2} min={0.5} max={3} step={0.25} format={(v) => (s.resolution == null ? 'Display' : `${num(v)}×`)} modified={s.resolution != null} oninput={(v) => (s.resolution = v)} onreset={() => (s.resolution = null)} hint="Canvas pixels per CSS pixel." />
		</PanelGroup>

		<PanelGroup title="Picture">
			<Toggle label="Lens" hint="The wave bends a picture of the card. Off draws the colour alone." bind:checked={s.lens} />
			<Segmented label="Picture follows the card" options={LIVE} bind:value={s.live} />
			<Toggle label="Prewarm" hint="Takes the first picture when the browser is idle, so the first wave has its lens." bind:checked={s.prewarm} />
			<Segmented label="Reduced motion" options={MOTION} bind:value={s.motion} />
		</PanelGroup>
	{/snippet}
</PlaygroundShell>

<style>
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
	.hint {
		font-size: 12px;
		line-height: 1.5;
		color: var(--fg-3);
	}
	.status {
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.status[data-theme='light'] {
		color: #7a7a7a;
	}
</style>
