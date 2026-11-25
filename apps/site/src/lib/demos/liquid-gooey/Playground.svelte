<script lang="ts">
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { perFramework, type Props } from '#lib/code.ts';
	import { SITE } from '#lib/site.ts';
	import BendDemo from './BendDemo.svelte';
	import { effectIs, importStep, playgroundCode, promptNotes, vocabulary, wrapStep, type Tuning } from './code.ts';
	import DissolveDemo from './DissolveDemo.svelte';
	import MeltDemo from './MeltDemo.svelte';
	import MorphDemo from './MorphDemo.svelte';
	import MoveDemo from './MoveDemo.svelte';
	import ShapeDemo from './ShapeDemo.svelte';
	import {
		BEND_DEFAULTS,
		DISSOLVE_DEFAULTS,
		EASES,
		FILLS,
		MELT_DEFAULTS,
		MORPH_DEFAULTS,
		MOVE_DEFAULTS,
		SHAPE_DEFAULTS,
		type DemoKind,
		type GooeyTheme,
		type GroupTuning
	} from './shared.ts';

	const KINDS = [
		{ value: 'morph', label: 'Morph' },
		{ value: 'shape', label: 'Shape' },
		{ value: 'dissolve', label: 'Dissolve' },
		{ value: 'move', label: 'Move' },
		{ value: 'bend', label: 'Bend' },
		{ value: 'melt', label: 'Melt' }
	] as const;
	const THEMES = [
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' }
	] as const;
	const EASE_OPTIONS = [
		{ value: 'Bouncy', label: 'Bouncy' },
		{ value: 'Smooth', label: 'Smooth' },
		{ value: 'Snappy', label: 'Snappy' }
	] as const;
	const FILL_OPTIONS = [
		{ value: '#e9e9e9', label: 'Light' },
		{ value: '#7cd4ff', label: 'Sky' },
		{ value: '#ffd28f', label: 'Amber' },
		{ value: '#ff9ec9', label: 'Pink' },
		{ value: '#9fe8a8', label: 'Mint' }
	];

	const HINTS: Record<DemoKind, string> = {
		morph: 'Click the plus.',
		shape: 'Click the pill.',
		dissolve: 'Drag the pictures together.',
		move: 'Drag the thumb.',
		bend: 'Drag the pill.',
		melt: 'Drag the pictures together.'
	};

	const GROUP_DEFAULTS = {
		blur: 6,
		contrast: 18,
		waviness: 0,
		wavinessFreq: 0.018,
		shadow: true,
		filterPadding: 24,
		fill: null as string | null
	};

	let kind = $state<DemoKind>('morph');
	let theme = $state<GooeyTheme>('dark');
	let g = $state({ ...GROUP_DEFAULTS });
	let morph = $state({ ...MORPH_DEFAULTS });
	let shape = $state({ ...SHAPE_DEFAULTS });
	let dissolve = $state({ ...DISSOLVE_DEFAULTS });
	let move = $state({ ...MOVE_DEFAULTS });
	let bend = $state({ ...BEND_DEFAULTS });
	let melt = $state({ ...MELT_DEFAULTS });

	const fill = $derived(g.fill ?? FILLS[theme][kind]);
	const group = $derived<GroupTuning>({
		blur: g.blur,
		contrast: g.contrast,
		waviness: g.waviness,
		wavinessFreq: g.wavinessFreq,
		shadow: g.shadow,
		filterPadding: g.filterPadding,
		fill
	});

	const changed = <T extends object>(now: T, def: T) =>
		(Object.keys(def) as (keyof T)[]).filter((k) => now[k] !== def[k]).length;
	const modified = $derived(
		changed(g, GROUP_DEFAULTS) +
			changed(morph, MORPH_DEFAULTS) +
			changed(shape, SHAPE_DEFAULTS) +
			changed(dissolve, DISSOLVE_DEFAULTS) +
			changed(move, MOVE_DEFAULTS) +
			changed(bend, BEND_DEFAULTS) +
			changed(melt, MELT_DEFAULTS) +
			(theme !== 'dark' ? 1 : 0)
	);

	function reset() {
		theme = 'dark';
		g = { ...GROUP_DEFAULTS };
		morph = { ...MORPH_DEFAULTS };
		shape = { ...SHAPE_DEFAULTS };
		dissolve = { ...DISSOLVE_DEFAULTS };
		move = { ...MOVE_DEFAULTS };
		bend = { ...BEND_DEFAULTS };
		melt = { ...MELT_DEFAULTS };
	}

	const num = (v: number) => +v.toFixed(3);
	/* The slider snippets below write one numeric key of a settings object. */
	const n = (o: object) => o as Record<string, number>;

	/* The group's options: only what differs from the library's defaults,
	   plus the fill, which every demo sets. */
	const groupOptions = $derived.by(() => {
		const p: Props = {};
		if (g.blur !== 6) p.blur = num(g.blur);
		if (g.contrast !== 18) p.contrast = num(g.contrast);
		p.fill = fill;
		if (g.shadow) p.shadow = '0 2px 6px rgb(0 0 0 / 0.05), 0 4px 42px rgb(0 0 0 / 0.24)';
		if (g.waviness !== 0) p.waviness = num(g.waviness);
		if (g.waviness !== 0 && g.wavinessFreq !== 0.018) p.wavinessFreq = num(g.wavinessFreq);
		if (g.filterPadding !== 24) p.filterPadding = g.filterPadding;
		return p;
	});

	/* the keys of a settings object that differ from the library's own defaults */
	const moved = <T extends object>(now: T, def: T): Tuning => {
		const out: Tuning = {};
		for (const key of Object.keys(def) as (keyof T & string)[]) if (now[key] !== def[key]) out[key] = num(now[key] as number);
		return out;
	};

	/* What the demo on the stage is given, as each framework writes it. */
	const snippet = $derived.by(() => {
		if (kind === 'morph') {
			return playgroundCode(groupOptions, {
				kind,
				transition: { duration: morph.openDur, ease: EASES[morph.openEase] },
				sx: num(54 * morph.spread),
				sy: num(34 * morph.spread),
				ty: num(64 * morph.spread),
				stagger: morph.openStagger
			});
		}
		if (kind === 'shape') {
			return playgroundCode(groupOptions, {
				kind,
				morph: { shape: true, ...moved({ speed: shape.speed, bounce: shape.bounce, contentBlur: shape.contentBlur }, { speed: 1, bounce: 0.5, contentBlur: 7 }) }
			});
		}
		if (kind === 'dissolve') {
			const k = dissolve.strength;
			return playgroundCode(groupOptions, {
				kind,
				dissolve: {
					warp: num(dissolve.warp * k),
					blur: num(5 * k),
					mix: num(dissolve.mix * k),
					gravity: num(dissolve.gravity * k),
					zone: num(dissolve.zone),
					range: num(dissolve.range)
				},
				morph: { advanced: { blobInset: num(dissolve.blobInset), bridgeGrow: num(dissolve.bridgeGrow) } }
			});
		}
		if (kind === 'move') {
			/* the library's own defaults, which are not the demo's */
			return playgroundCode(groupOptions, { kind, move: moved(move, { springiness: 0.5, wobble: 0.5, stretch: 0.36, trail: 0.575 }) });
		}
		if (kind === 'bend') {
			return playgroundCode(groupOptions, {
				kind,
				bend: moved({ vertical: bend.vertical, horizontal: bend.horizontal }, { vertical: 0.6, horizontal: 0.35 })
			});
		}
		return playgroundCode(groupOptions, { kind, melt: moved(melt, MELT_DEFAULTS) });
	});

	const prompt = $derived(
		perFramework(
			(fw, info) => `Add a Gooey (liquid) effect from ${SITE.name} to this ${info.app}.

1. Install the package with the project's package manager, for example: pnpm add ${info.pkg}
2. ${importStep(fw)}
3. ${wrapStep(fw)}
4. Start from this configuration:

${snippet[fw]}

Parameter vocabulary, for later changes:
${vocabulary[fw].group}
- blur: goo blur in px; how far apart pieces start bridging (default 6)
- contrast: how sharp the liquid edge is (default 18)
- fill: colour of the surface, any CSS colour
- shadow: box-shadow syntax, drawn on the merged surface; inset layers work
- waviness, wavinessFreq: make the edge undulate
- filterPadding: extra room for pieces that travel outside the group box
- filter: raw SVG filter primitives that replace the goo chain

${vocabulary[fw].item}
- effect: "morph" (default; pieces merge) | "move" (surface trails a moving element) |
  "bend" (body bows with velocity) | "melt" (two images run into each other)
- x, y, scale with transition and delay: the library moves the element and its liquid
  together. transition is "snappy" | "smooth" | "bouncy", a spring config, or
  { duration, ease }.
- observe: you move the element yourself and the liquid follows
- morph: { shape, speed, bounce, contentBlur, advanced: { blobInset, bridgeGrow } }.
  shape: true makes the surface spring behind size changes.
- dissolve: true, a 0 to 1 strength, or options (warp, blur, mix, gravity, zone, range,
  active, ...). Melts the item's picture into a touching neighbour.
- move: { springiness, wobble, stretch, trail }, each 0 to 1
- bend: { vertical, horizontal }, each 0 to 1
- melt: { blur, contrast, reach, fade, warp, mix, mixBlur, gravity, waviness, src }
- radius: overrides the measured border radius

Notes:
- dissolve is ignored on ${effectIs(fw, 'move')}.
- ${effectIs(fw, 'melt')} works on the first two melt items in a group and needs an image:
  an <img> inside the item, or melt.src.${promptNotes(fw)
		.map((line) => `\n${line}`)
		.join('')}`
		)
	);
</script>

{#snippet pct(target: Record<string, number>, key: string, label: string, def: number, min = 0, max = 1, step = 0.05)}
	<Slider
		{label}
		value={target[key]}
		{min}
		{max}
		{step}
		format={(v) => String(+v.toFixed(3))}
		modified={target[key] !== def}
		oninput={(v) => (target[key] = v)}
		onreset={() => (target[key] = def)}
	/>
{/snippet}

{#snippet ms(target: Record<string, number>, key: string, label: string, def: number, min: number, max: number, step: number)}
	<Slider
		{label}
		value={target[key]}
		{min}
		{max}
		{step}
		format={(v) => `${v}ms`}
		modified={target[key] !== def}
		oninput={(v) => (target[key] = v)}
		onreset={() => (target[key] = def)}
	/>
{/snippet}

<PlaygroundShell label="Gooey controls" stageTheme={theme} {modified} onreset={reset} code={snippet} {prompt}>
	{#snippet stageTop()}
		<p class="hint" data-theme={theme}>{HINTS[kind]}</p>
	{/snippet}
	{#snippet stage()}
		{#if kind === 'morph'}
			<MorphDemo {group} knobs={morph} {theme} />
		{:else if kind === 'shape'}
			<ShapeDemo {group} knobs={shape} {theme} />
		{:else if kind === 'dissolve'}
			<DissolveDemo {group} knobs={dissolve} {theme} />
		{:else if kind === 'move'}
			<MoveDemo {group} knobs={move} {theme} />
		{:else if kind === 'bend'}
			<BendDemo {group} knobs={bend} {theme} />
		{:else}
			<MeltDemo knobs={melt} />
		{/if}
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="Effect" options={KINDS} bind:value={kind} />
			<Segmented label="Theme" options={THEMES} bind:value={theme} />
		</PanelGroup>

		{#if kind !== 'melt'}
			<PanelGroup title="Surface">
				{@render pct(n(g), 'blur', 'Goo blur', 6, 0, 16, 0.5)}
				{@render pct(n(g), 'contrast', 'Contrast', 18, 4, 40, 1)}
				{@render pct(n(g), 'waviness', 'Waviness', 0, 0, 8, 0.5)}
				{#if g.waviness > 0}
					{@render pct(n(g), 'wavinessFreq', 'Wave frequency', 0.018, 0.004, 0.06, 0.002)}
				{/if}
				<SwatchRow label="Fill" options={FILL_OPTIONS} bind:value={g.fill} autoLabel="Default" fallback={fill} />
				<Toggle label="Shadow" hint="Drawn on the merged surface, so it follows the goo." bind:checked={g.shadow} />
				{@render pct(n(g), 'filterPadding', 'Filter padding', 24, 0, 80, 2)}
			</PanelGroup>
		{/if}

		{#if kind === 'morph'}
			<PanelGroup title="Menu animation">
				{@render ms(n(morph), 'openDur', 'Open duration', 550, 80, 1200, 10)}
				{@render ms(n(morph), 'closeDur', 'Close duration', 250, 80, 1200, 10)}
				<Segmented label="Open easing" options={EASE_OPTIONS} bind:value={morph.openEase} />
				{@render ms(n(morph), 'openStagger', 'Open stagger', 40, 0, 200, 5)}
				{@render ms(n(morph), 'closeStagger', 'Close stagger', 0, 0, 200, 5)}
				{@render pct(n(morph), 'spread', 'Spread', 1, 0.4, 2, 0.05)}
				{@render pct(n(morph), 'anticipDist', 'Anticipation', 5, 0, 24, 1)}
				{@render ms(n(morph), 'anticipDur', 'Anticipation duration', 700, 120, 1400, 20)}
				{@render ms(n(morph), 'iconDur', 'Icon fade', 180, 0, 600, 10)}
				{@render ms(n(morph), 'iconDelay', 'Icon delay', 120, 0, 600, 10)}
			</PanelGroup>
		{:else if kind === 'shape'}
			<PanelGroup title="Shape physics">
				{@render pct(n(shape), 'speed', 'Speed', 1, 0.25, 3, 0.05)}
				{@render pct(n(shape), 'bounce', 'Bounce', 0.5)}
				{@render pct(n(shape), 'contentBlur', 'Content blur', 7, 0, 20, 0.5)}
			</PanelGroup>
		{:else if kind === 'dissolve'}
			<PanelGroup title="Dissolve">
				{@render pct(n(dissolve), 'strength', 'Strength', 1)}
				{@render pct(n(dissolve), 'warp', 'Warp', 26, 0, 60, 1)}
				{@render pct(n(dissolve), 'mix', 'Mix', 0.7)}
				{@render pct(n(dissolve), 'gravity', 'Gravity', 60, 0, 120, 2)}
				{@render pct(n(dissolve), 'zone', 'Zone', 26, 6, 60, 1)}
				{@render pct(n(dissolve), 'range', 'Range', 44, 10, 100, 1)}
				{@render pct(n(dissolve), 'blobInset', 'Blob inset', 2, 0, 12, 1)}
				{@render pct(n(dissolve), 'bridgeGrow', 'Bridge grow', 10, 0, 24, 1)}
			</PanelGroup>
		{:else if kind === 'move'}
			<PanelGroup title="Move">
				{@render pct(n(move), 'springiness', 'Springiness', 0.5)}
				{@render pct(n(move), 'wobble', 'Wobble', 0.5)}
				{@render pct(n(move), 'stretch', 'Stretch', 0.6, 0, 1, 0.02)}
				{@render pct(n(move), 'trail', 'Trail', 0.35, 0, 1, 0.025)}
			</PanelGroup>
		{:else if kind === 'bend'}
			<PanelGroup title="Bend">
				{@render pct(n(bend), 'vertical', 'Vertical bow', 0.6)}
				{@render pct(n(bend), 'horizontal', 'Horizontal caps', 0.35)}
				{@render pct(n(bend), 'content', 'Content bend', 0.3)}
			</PanelGroup>
		{:else}
			<PanelGroup title="Melt">
				{@render pct(n(melt), 'blur', 'Goo blur', 7, 0, 20, 0.5)}
				{@render pct(n(melt), 'contrast', 'Contrast', 40, 10, 80, 1)}
				{@render pct(n(melt), 'reach', 'Reach', 0.8, 0, 2, 0.05)}
				{@render pct(n(melt), 'fade', 'Fade', 17, 0, 40, 1)}
				{@render pct(n(melt), 'warp', 'Warp', 0, 0, 40, 1)}
				{@render pct(n(melt), 'mix', 'Marbling', 1)}
				{@render pct(n(melt), 'mixBlur', 'Marbling blur', 8, 0, 24, 0.5)}
				{@render pct(n(melt), 'gravity', 'Gravity', 1.9, 0, 4, 0.1)}
				{@render pct(n(melt), 'waviness', 'Waviness', 12, 0, 40, 1)}
			</PanelGroup>
		{/if}
	{/snippet}
</PlaygroundShell>

<style>
	.hint {
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.hint[data-theme='light'] {
		color: #7a7a7a;
	}
</style>
