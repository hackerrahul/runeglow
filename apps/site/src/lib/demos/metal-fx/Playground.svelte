<script lang="ts">
	import {
		BEND_DEFAULTS,
		CURSOR_LIGHT_DEFAULTS,
		GLOW_DEFAULTS,
		METAL_BADGE_DEFAULTS,
		METAL_TEXT_DEFAULTS,
		MetalBadge,
		MetalFx,
		MetalText,
		PRESETS,
		RIM_DEFAULTS,
		resetBendConfig,
		resetCursorLightConfig,
		resetGlowConfig,
		setBendConfig,
		setCursorLightConfig,
		setCursorSprite,
		setGlowConfig,
		setSharedPreset,
		setSharedPresetMode,
		useMetalBend,
		useMetalTextReflection,
		type MetalFxPreset,
		type PresetMode
	} from 'runeglow/metal-fx';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { arrowCursor } from '#lib/demos/thinking-orbs/cursor.ts';
	import { SITE } from '#lib/site.ts';
	import './demo.css';

	type Kind = 'circle' | 'button' | 'text' | 'badge';
	type Theme = 'dark' | 'light' | 'auto';

	const TYPES: { value: Kind; label: string }[] = [
		{ value: 'circle', label: 'Circle button' },
		{ value: 'button', label: 'Button' },
		{ value: 'text', label: 'Text' },
		{ value: 'badge', label: 'Badge' }
	];
	const PRESET_OPTIONS: { value: MetalFxPreset; label: string; paint: string }[] = [
		{ value: 'chromatic', label: 'Chromatic', paint: 'linear-gradient(135deg, #ff8ad1, #8ab4ff, #9dffcf)' },
		{ value: 'silver', label: 'Silver', paint: '#c9ccd3' },
		{ value: 'gold', label: 'Gold', paint: '#e2b866' }
	];
	const THEMES: { value: Theme; label: string }[] = [
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' },
		{ value: 'auto', label: 'Auto' }
	];
	const TEXT_COLORS = [
		{ value: '#e2e2e2', label: 'Silver' },
		{ value: '#ffffff', label: 'White' },
		{ value: '#ffd9a0', label: 'Warm' },
		{ value: '#b9c8ff', label: 'Cool' },
		{ value: '#323232', label: 'Graphite' }
	];

	/* What the demo ships for each type. The library's own default strength is
	   1; these are a touch lower, where the metal sits best on a dark page. */
	const BASE_STRENGTH: Record<Kind, number> = { circle: 81, button: 63, text: 90, badge: 90 };
	const BASE_SCALE: Record<Kind, number> = {
		circle: 1.3,
		button: 1.6,
		text: METAL_TEXT_DEFAULTS.shaderScale,
		badge: METAL_BADGE_DEFAULTS.shaderScale
	};
	const BASE_RING: Record<Kind, number> = { circle: 2, button: 1, text: 1, badge: 1 };
	const BASE_OPACITY: Record<Kind, number> = {
		circle: 1,
		button: 1,
		text: METAL_TEXT_DEFAULTS.metalOpacity,
		badge: METAL_BADGE_DEFAULTS.metalOpacity
	};
	const CORE = METAL_BADGE_DEFAULTS.core;
	const TEXT_RIM = METAL_TEXT_DEFAULTS.innerShadow;

	/* The material itself: Paper's liquidMetal parameters. One renderer draws
	   every instance on the page, so these are page-wide. */
	type MaterialKey = 'speed' | 'repetition' | 'softness' | 'shiftRed' | 'shiftBlue' | 'distortion' | 'contour' | 'angle';
	const MATERIAL: { key: MaterialKey; label: string; min: number; max: number; step: number; unit?: 'x' | 'deg' }[] = [
		{ key: 'speed', label: 'Speed', min: 0, max: 3, step: 0.05, unit: 'x' },
		{ key: 'repetition', label: 'Stripes', min: 1, max: 10, step: 0.1 },
		{ key: 'softness', label: 'Softness', min: 0, max: 1, step: 0.01 },
		{ key: 'shiftRed', label: 'Red shift', min: -1, max: 1, step: 0.01 },
		{ key: 'shiftBlue', label: 'Blue shift', min: -1, max: 1, step: 0.01 },
		{ key: 'distortion', label: 'Distortion', min: 0, max: 1, step: 0.01 },
		{ key: 'contour', label: 'Contour', min: 0, max: 1, step: 0.01 },
		{ key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, unit: 'deg' }
	];

	const num = (v: number) => String(+v.toFixed(3));
	const pct = (v: number) => `${Math.round(v * 100)}%`;
	const times = (v: number) => `${num(v)}×`;
	const px = (v: number) => `${num(v)}px`;

	/* Flat on purpose: "Reset all" writes each field back in place. */
	const fresh = () => ({
		type: 'circle' as Kind,
		preset: 'chromatic' as MetalFxPreset,
		theme: 'dark' as Theme,
		paused: false,
		strength: null as number | null,
		shaderScale: null as number | null,
		ring: null as number | null,
		metalOpacity: null as number | null,
		glowGain: 1,
		scale: 1,
		radius: null as number | null,
		normalize: true,
		noGlow: false,
		noReflection: false,
		reflection: null as number | null,
		innerShadow: true,
		rimOffset: null as number | null,
		rimBlur: null as number | null,
		rimAlpha: null as number | null,
		// text
		fontSize: 24,
		textColor: '#e2e2e2' as string | null,
		textGlow: false,
		textGlowGain: METAL_TEXT_DEFAULTS.glowGain as number,
		// badge
		badgeScale: 2,
		badgeText: '#323232' as string | null,
		coreSize: CORE.size as number,
		coreR: CORE.r as number,
		coreBlur: CORE.blur as number,
		coreA: CORE.a as number,
		badgeGradient: METAL_BADGE_DEFAULTS.gradient as number,
		badgeGlow: METAL_BADGE_DEFAULTS.glow as number,
		// page-wide: glow
		glowIntensity: GLOW_DEFAULTS.haloOpMul as number,
		glowAppear: GLOW_DEFAULTS.relocFadeMs as number,
		glowDisappear: GLOW_DEFAULTS.relocFadeOutMs as number,
		// page-wide: bend
		bend: true,
		bendStrength: BEND_DEFAULTS.strength as number,
		bendReach: BEND_DEFAULTS.reach as number,
		bendMax: BEND_DEFAULTS.maxDisp as number,
		// page-wide: cursor reflection
		cursor: false,
		cursorDistance: CURSOR_LIGHT_DEFAULTS.cursorDistance as number,
		cursorSpecular: CURSOR_LIGHT_DEFAULTS.cursorStrength as number,
		cursorFalloff: CURSOR_LIGHT_DEFAULTS.cursorFalloff as number,
		cursorReach: CURSOR_LIGHT_DEFAULTS.cursorReach as number,
		// page-wide: material
		speed: null as number | null,
		repetition: null as number | null,
		softness: null as number | null,
		shiftRed: null as number | null,
		shiftBlue: null as number | null,
		distortion: null as number | null,
		contour: null as number | null,
		angle: null as number | null
	});
	type State = ReturnType<typeof fresh>;

	const s = $state(fresh());
	const DEFAULTS = fresh();

	const isRing = $derived(s.type === 'circle' || s.type === 'button');

	let systemDark = $state(true);
	$effect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mq.matches;
		const on = (e: MediaQueryListEvent) => (systemDark = e.matches);
		mq.addEventListener('change', on);
		return () => mq.removeEventListener('change', on);
	});
	const stageTheme = $derived(s.theme === 'auto' ? (systemDark ? 'dark' : 'light') : s.theme);

	const strength = $derived(s.strength ?? BASE_STRENGTH[s.type]);
	const shaderScale = $derived(s.shaderScale ?? BASE_SCALE[s.type]);
	const ring = $derived(s.ring ?? BASE_RING[s.type]);
	const metalOpacity = $derived(s.metalOpacity ?? BASE_OPACITY[s.type]);
	const reflection = $derived(s.reflection ?? (s.type === 'text' ? 0.64 : 1));

	const rim = $derived({
		offsetY: s.rimOffset ?? (s.type === 'text' ? TEXT_RIM.offsetY : RIM_DEFAULTS.offsetY),
		blur: s.rimBlur ?? (s.type === 'text' ? TEXT_RIM.blur : RIM_DEFAULTS.blur),
		alpha: s.rimAlpha ?? (s.type === 'text' ? TEXT_RIM.alpha : RIM_DEFAULTS.alpha)
	});
	const rimMoved = $derived(s.rimOffset != null || s.rimBlur != null || s.rimAlpha != null);
	const core = $derived({ r: s.coreR, blur: s.coreBlur, a: s.coreA, size: s.coreSize });
	const coreMoved = $derived(
		s.coreR !== CORE.r || s.coreBlur !== CORE.blur || s.coreA !== CORE.a || s.coreSize !== CORE.size
	);
	const font = $derived(`500 ${s.fontSize}px/1.2 Inter, 'Geist', sans-serif`);

	/* ── Page-wide settings ─────────────────────────────────────────── */

	$effect(() => {
		setGlowConfig({ haloOpMul: s.glowIntensity, relocFadeMs: s.glowAppear, relocFadeOutMs: s.glowDisappear });
	});
	$effect(() => {
		setBendConfig({ enabled: s.bend, strength: s.bendStrength, reach: s.bendReach, maxDisp: s.bendMax });
	});
	/* The ring lights the pointer: a sprite stands in for it near the metal.
	   The sprite is this site's own arrow, so it is only set while this is on. */
	$effect(() => {
		setCursorSprite(s.cursor ? arrowCursor : null);
		setCursorLightConfig({
			cursor: s.cursor,
			cursorDistance: s.cursorDistance,
			cursorStrength: s.cursorSpecular,
			cursorFalloff: s.cursorFalloff,
			cursorReach: s.cursorReach
		});
	});

	const activePreset = $derived<MetalFxPreset>(isRing ? s.preset : 'chromatic');
	const basis = $derived(PRESETS[activePreset].modes[stageTheme]);
	const material = $derived.by(() => {
		const moved: Partial<Record<MaterialKey, number>> = {};
		for (const m of MATERIAL) {
			const v = s[m.key];
			if (v != null && v !== basis[m.key]) moved[m.key] = v;
		}
		return moved;
	});
	const materialMoved = $derived(Object.keys(material).length > 0);
	$effect(() => {
		if (materialMoved) setSharedPresetMode({ ...basis, ...material } as PresetMode);
		else {
			setSharedPresetMode(null);
			setSharedPreset(activePreset, stageTheme);
		}
	});

	$effect(() => () => {
		resetGlowConfig();
		resetBendConfig();
		resetCursorLightConfig();
		setCursorSprite(null);
		setSharedPresetMode(null);
	});

	/* ── Stage ──────────────────────────────────────────────────────── */

	let ringEl = $state<HTMLDivElement | null>(null);
	let searchEl = $state<HTMLLabelElement | null>(null);
	let planEl = $state<HTMLSpanElement | null>(null);
	let liveEl = $state<HTMLSpanElement | null>(null);
	useMetalBend(() => (isRing ? ringEl : null));
	useMetalTextReflection(() => (s.type === 'text' ? planEl : null));

	const ringTargets = $derived(s.noReflection ? undefined : [{ el: searchEl, strength: reflection }]);
	const textTargets = $derived(s.noReflection ? undefined : [{ el: planEl, strength: reflection }]);

	/* ── Snippet ────────────────────────────────────────────────────── */

	const modified = $derived(
		(Object.keys(DEFAULTS) as (keyof State)[]).filter((k) => k !== 'paused' && s[k] !== DEFAULTS[k]).length
	);
	function reset() {
		const d = fresh();
		for (const k of Object.keys(d) as (keyof State)[]) (s[k] as State[keyof State]) = d[k];
	}
	/* Each type starts from its own baseline. */
	function chooseType(next: Kind) {
		s.type = next;
		s.strength = s.shaderScale = s.ring = s.metalOpacity = s.reflection = null;
		s.rimOffset = s.rimBlur = s.rimAlpha = null;
		s.innerShadow = true;
	}

	const snippet = $derived.by(() => {
		const imports = new Set<string>();
		const setup: string[] = [];
		const config: string[] = [];
		let markup = '';
		const st = strength !== 100 ? `strength={${num(strength / 100)}}` : '';
		const th = s.theme !== 'auto' ? `theme="${s.theme}"` : '';
		const join = (tag: string, p: string[], child: string) => {
			const props = p.filter(Boolean);
			const open = props.length <= 3 ? `<${tag}${props.length ? ' ' + props.join(' ') : ''}` : `<${tag}\n  ${props.join('\n  ')}\n`;
			return child ? `${open}>\n  ${child}\n</${tag}>` : `${open}${props.length <= 3 ? ' ' : ''}/>`;
		};

		if (isRing) {
			imports.add('MetalFx');
			const p = [s.bend ? 'bind:ref={ring}' : '', s.type === 'circle' ? 'variant="circle"' : ''];
			if (s.preset !== 'chromatic') p.push(`preset="${s.preset}"`);
			p.push(th, st);
			if (s.shaderScale != null) p.push(`shaderScale={${num(s.shaderScale)}}`);
			if (s.ring != null) p.push(`ringCssPx={${num(s.ring)}}`);
			if (s.glowGain !== 1) p.push(`glowGain={${num(s.glowGain)}}`);
			if (s.scale !== 1) p.push(`scale={${num(s.scale)}}`);
			if (s.type === 'button' && s.radius != null) p.push(`borderRadius={${s.radius}}`);
			if (!s.normalize) p.push('normalizeHostStyles={false}');
			if (s.innerShadow) p.push(rimMoved ? `innerShadow={{ offsetY: ${num(rim.offsetY)}, blur: ${num(rim.blur)}, alpha: ${num(rim.alpha)} }}` : 'innerShadow');
			if (s.noGlow) p.push('disableGlow');
			if (!s.noReflection) p.push(reflection === 1 ? 'reflectionTargets={[search]}' : `reflectionTargets={[{ el: search, strength: ${num(reflection)} }]}`);
			if (s.bend) {
				imports.add('useMetalBend');
				setup.push('let ring = $state(null);', 'useMetalBend(() => ring); // the ring dents under the cursor');
			}
			if (!s.noReflection) setup.push('let search = $state(null); // a neighbour that catches the reflection');
			const child = s.type === 'circle' ? '<button aria-label="Send"><ArrowUp /></button>' : '<button>Upgrade to Pro</button>';
			markup = (s.noReflection ? '' : '<label bind:this={search}>…</label>\n') + join('MetalFx', p, child);
		} else if (s.type === 'text') {
			imports.add('MetalText');
			const p = ['text="Pro"', `font="${font.replace(", 'Geist'", '')}"`, `color="${s.textColor ?? '#e2e2e2'}"`, th, st];
			if (s.metalOpacity != null) p.push(`metalOpacity={${num(s.metalOpacity)}}`);
			if (s.shaderScale != null) p.push(`shaderScale={${num(s.shaderScale)}}`);
			if (!s.innerShadow) p.push('innerShadow={null}');
			else if (rimMoved) p.push(`innerShadow={{ offsetY: ${num(rim.offsetY)}, blur: ${num(rim.blur)}, alpha: ${num(rim.alpha)} }}`);
			if (s.textGlow && !s.noGlow) {
				p.push('glow');
				if (s.textGlowGain !== METAL_TEXT_DEFAULTS.glowGain) p.push(`glowGain={${num(s.textGlowGain)}}`);
			}
			if (!s.noReflection) {
				imports.add('useMetalTextReflection');
				setup.push('let plan = $state(null);', 'useMetalTextReflection(() => plan); // "Plan" catches the metal on its letters');
				p.push(`reflectionTargets={[{ el: plan, strength: ${num(reflection)} }]}`);
			}
			markup = (s.noReflection ? '' : '<span bind:this={plan}>Plan</span>\n') + join('MetalText', p, '');
		} else {
			imports.add('MetalBadge');
			const p = ['text="New"', th, st];
			if (s.badgeScale !== 1) p.push(`scale={${num(s.badgeScale)}}`);
			if (s.metalOpacity != null) p.push(`metalOpacity={${num(s.metalOpacity)}}`);
			if (s.shaderScale != null) p.push(`shaderScale={${num(s.shaderScale)}}`);
			if (coreMoved) p.push(`core={{ r: ${s.coreR}, blur: ${s.coreBlur}, a: ${num(s.coreA)}, size: ${s.coreSize} }}`);
			if (s.badgeGradient !== METAL_BADGE_DEFAULTS.gradient) p.push(`gradient={${num(s.badgeGradient)}}`);
			if (s.badgeGlow !== METAL_BADGE_DEFAULTS.glow) p.push(`glow={${num(s.badgeGlow)}}`);
			if (s.badgeText && s.badgeText !== '#323232') p.push(`textColor="${s.badgeText}"`);
			markup = join('MetalBadge', p, '');
		}

		const glow: string[] = [];
		if (s.glowIntensity !== DEFAULTS.glowIntensity) glow.push(`haloOpMul: ${num(s.glowIntensity)}`);
		if (s.glowAppear !== DEFAULTS.glowAppear) glow.push(`relocFadeMs: ${s.glowAppear}`);
		if (s.glowDisappear !== DEFAULTS.glowDisappear) glow.push(`relocFadeOutMs: ${s.glowDisappear}`);
		if (glow.length) {
			imports.add('setGlowConfig');
			config.push(`setGlowConfig({ ${glow.join(', ')} }); // the halo, page-wide`);
		}
		if (isRing && s.bend) {
			const b: string[] = [];
			if (s.bendStrength !== DEFAULTS.bendStrength) b.push(`strength: ${num(s.bendStrength)}`);
			if (s.bendReach !== DEFAULTS.bendReach) b.push(`reach: ${s.bendReach}`);
			if (s.bendMax !== DEFAULTS.bendMax) b.push(`maxDisp: ${num(s.bendMax)}`);
			if (b.length) {
				imports.add('setBendConfig');
				config.push(`setBendConfig({ ${b.join(', ')} }); // the cursor bend, page-wide`);
			}
		}
		if (s.cursor) {
			imports.add('setCursorSprite');
			const c: string[] = [];
			if (s.cursorDistance !== DEFAULTS.cursorDistance) c.push(`cursorDistance: ${s.cursorDistance}`);
			if (s.cursorSpecular !== DEFAULTS.cursorSpecular) c.push(`cursorStrength: ${num(s.cursorSpecular)}`);
			if (s.cursorFalloff !== DEFAULTS.cursorFalloff) c.push(`cursorFalloff: ${s.cursorFalloff}`);
			if (s.cursorReach !== DEFAULTS.cursorReach) c.push(`cursorReach: ${num(s.cursorReach)}`);
			config.push('// The ring lights the pointer. Supply an image of the pointer to draw in its place.', 'setCursorSprite({ src: pointerImage, width: 18, height: 24, hotX: 3, hotY: 3 });');
			if (c.length) {
				imports.add('setCursorLightConfig');
				config.push(`setCursorLightConfig({ ${c.join(', ')} });`);
			}
		}
		if (materialMoved) {
			imports.add('PRESETS');
			imports.add('setSharedPresetMode');
			const m = Object.entries(material).map(([k, v]) => `${k}: ${num(v)}`);
			config.push(
				'// The material itself, page-wide: every instance shares one renderer.',
				`setSharedPresetMode({ ...PRESETS.${activePreset}.modes.${stageTheme}, ${m.join(', ')} });`
			);
		}

		const lines = [`  import { ${[...imports].join(', ')} } from '${SITE.pkg}/metal-fx';`];
		if (setup.length) lines.push('', ...setup.map((l) => `  ${l}`));
		if (config.length) lines.push('', ...config.map((l) => `  ${l}`));
		return `<script>\n${lines.join('\n')}\n<\/script>\n\n${markup}`;
	});

	const prompt = $derived(`Add Liquid metal from ${SITE.name} to this Svelte 5 app: an animated WebGL metal ring around
a button, metal-filled text, or a metal badge.

1. Install the package with the project's package manager, for example: pnpm add ${SITE.pkg}
2. Import it: import { MetalFx, MetalText, MetalBadge, useMetalBend } from '${SITE.pkg}/metal-fx'
3. MetalFx wraps one element (a button, a link, a div) and draws the ring on top of it.
   The wrapper is display: inline-flex and sizes itself to that element.
4. Start from this configuration:

${snippet}

Parameter vocabulary, for later changes:
- variant: button (pill) or circle. preset: chromatic, silver or gold. theme: auto, dark, light.
- strength 0 to 1, glowGain, shaderScale (zoom of the metal), ringCssPx (ring thickness),
  scale (multiplies every pixel constant), borderRadius, innerShadow, disableGlow, paused.
- reflectionTargets: neighbouring elements that catch a reflection (dark theme only).
  Pass the element from bind:this, or { el, strength }.
- useMetalBend(() => el): the ring dents under the cursor. useMetalTextReflection(() => el):
  a text element catches the reflection on its letters only.
- MetalText: text, font (CSS shorthand), color, metalOpacity, innerShadow, glow.
- MetalBadge: text, scale, metalOpacity, core, gradient, glow, textColor.
- Page-wide settings: setGlowConfig, setBendConfig, setCursorLightConfig, setCursorSprite,
  setSharedPresetMode. One renderer draws every instance, so the preset and theme are shared.

Notes:
- Needs WebGL2. Without it the wrapped element renders as it is.
- Reflections are skipped in the light theme.`);
</script>

{#snippet search()}
	<label class="mfx-search" bind:this={searchEl} data-tone={stageTheme}>
		<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
			<circle cx="8" cy="8" r="5.5" />
			<path d="m15.5 15.5-3.4-3.4" />
		</svg>
		<input type="search" placeholder="Search" spellcheck="false" tabindex="-1" aria-label="Search" />
	</label>
{/snippet}

<PlaygroundShell
	label="Liquid metal controls"
	{stageTheme}
	playing={!s.paused}
	ontoggle={() => (s.paused = !s.paused)}
	{modified}
	onreset={reset}
	code={snippet}
	{prompt}
>
	{#snippet stage()}
		<div class="mfx-row">
			{#if s.type === 'circle' || s.type === 'button'}
				{@render search()}
				{#key s.type}
					<MetalFx
						bind:ref={ringEl}
						variant={s.type}
						preset={s.preset}
						theme={stageTheme}
						strength={strength / 100}
						shaderScale={s.shaderScale ?? undefined}
						ringCssPx={s.ring ?? undefined}
						glowGain={s.glowGain}
						scale={s.scale}
						borderRadius={s.type === 'button' ? (s.radius ?? undefined) : undefined}
						normalizeHostStyles={s.normalize}
						innerShadow={s.innerShadow ? (rimMoved ? rim : true) : undefined}
						paused={s.paused}
						disableGlow={s.noGlow}
						reflectionTargets={ringTargets}
					>
						{#if s.type === 'circle'}
							<button type="button" class="mfx-send" aria-label="Send">
								<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d="M12 19V5M5 12l7-7 7 7" />
								</svg>
							</button>
						{:else}
							<button type="button" class="mfx-pill">Upgrade to Pro</button>
						{/if}
					</MetalFx>
				{/key}
			{:else if s.type === 'text'}
				<div class="mfx-line plan">
					<span class="mfx-plan" bind:this={planEl} style:font data-tone={stageTheme}>Plan</span>
					<MetalText
						text="Pro"
						{font}
						color={s.textColor ?? '#e2e2e2'}
						theme={stageTheme}
						strength={strength / 100}
						{metalOpacity}
						{shaderScale}
						innerShadow={s.innerShadow ? rim : null}
						glow={s.textGlow && !s.noGlow}
						glowGain={s.textGlowGain}
						paused={s.paused}
						reflectionTargets={textTargets}
					/>
				</div>
			{:else}
				<div class="mfx-line">
					<span class="mfx-live" bind:this={liveEl} data-tone={stageTheme}>Live mode</span>
					<MetalBadge
						text="New"
						theme={stageTheme}
						strength={strength / 100}
						scale={s.badgeScale}
						{metalOpacity}
						{shaderScale}
						{core}
						gradient={s.badgeGradient}
						glow={s.badgeGlow}
						textColor={s.badgeText ?? '#323232'}
						paused={s.paused}
					/>
				</div>
			{/if}
		</div>
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="Type" options={TYPES} value={s.type} onchange={chooseType} />
			{#if isRing}
				<Segmented label="Color" options={PRESET_OPTIONS} bind:value={s.preset} />
			{/if}
			<Segmented label="Theme" options={THEMES} bind:value={s.theme} />
		</PanelGroup>

		<PanelGroup title="Metal">
			<Slider label="Strength" value={strength} min={0} max={100} format={(v) => `${v}%`} modified={s.strength != null} oninput={(v) => (s.strength = v)} onreset={() => (s.strength = null)} />
			<Slider label="Shader scale" value={shaderScale} min={0.6} max={4} step={0.05} format={times} modified={s.shaderScale != null} oninput={(v) => (s.shaderScale = v)} onreset={() => (s.shaderScale = null)} hint="Zoom of the metal's pattern." />
			{#if isRing}
				<Slider label="Ring width" value={ring} min={0.5} max={4} step={0.25} format={px} modified={s.ring != null} oninput={(v) => (s.ring = v)} onreset={() => (s.ring = null)} />
				<Slider label="Scale" value={s.scale} min={0.5} max={2.5} step={0.05} format={times} modified={s.scale !== 1} oninput={(v) => (s.scale = v)} onreset={() => (s.scale = 1)} hint="Multiplies every pixel constant, for a larger or zoomed interface." />
				{#if s.type === 'button'}
					<Slider label="Corner radius" value={s.radius ?? 20} min={0} max={20} format={px} modified={s.radius != null} oninput={(v) => (s.radius = v)} onreset={() => (s.radius = null)} hint={s.radius == null ? 'Auto, from the wrapped element.' : undefined} />
				{/if}
				<Toggle label="Normalize host styles" hint="Clears the wrapped element's own border and shadow so they don't fight the ring." bind:checked={s.normalize} />
			{:else}
				<Slider label="Metal opacity" value={metalOpacity} min={0} max={1} step={0.01} format={pct} modified={s.metalOpacity != null} oninput={(v) => (s.metalOpacity = v)} onreset={() => (s.metalOpacity = null)} />
			{/if}
		</PanelGroup>

		{#if s.type === 'text'}
			<PanelGroup title="Text">
				<Slider label="Font size" value={s.fontSize} min={14} max={72} format={px} modified={s.fontSize !== 24} oninput={(v) => (s.fontSize = v)} onreset={() => (s.fontSize = 24)} />
				<SwatchRow label="Base colour" options={TEXT_COLORS} bind:value={s.textColor} fallback="#e2e2e2" />
			</PanelGroup>
		{:else if s.type === 'badge'}
			<PanelGroup title="Badge">
				<Slider label="Size" value={s.badgeScale} min={1} max={4} step={0.1} format={times} modified={s.badgeScale !== 2} oninput={(v) => (s.badgeScale = v)} onreset={() => (s.badgeScale = 2)} />
				<SwatchRow label="Label colour" options={TEXT_COLORS} bind:value={s.badgeText} fallback="#323232" />
				<Slider label="Core size" value={s.coreSize} min={5} max={100} format={(v) => `${v}%`} modified={s.coreSize !== CORE.size} oninput={(v) => (s.coreSize = v)} onreset={() => (s.coreSize = CORE.size)} />
				<Slider label="White core" value={s.coreR} min={0} max={100} format={(v) => `${v}%`} modified={s.coreR !== CORE.r} oninput={(v) => (s.coreR = v)} onreset={() => (s.coreR = CORE.r)} />
				<Slider label="Core blur" value={s.coreBlur} min={0} max={100} format={(v) => `${v}%`} modified={s.coreBlur !== CORE.blur} oninput={(v) => (s.coreBlur = v)} onreset={() => (s.coreBlur = CORE.blur)} />
				<Slider label="Core strength" value={s.coreA} min={0} max={1} step={0.01} format={num} modified={s.coreA !== CORE.a} oninput={(v) => (s.coreA = v)} onreset={() => (s.coreA = CORE.a)} />
				<Slider label="Top gradient" value={s.badgeGradient} min={0} max={1} step={0.01} format={num} modified={s.badgeGradient !== METAL_BADGE_DEFAULTS.gradient} oninput={(v) => (s.badgeGradient = v)} onreset={() => (s.badgeGradient = METAL_BADGE_DEFAULTS.gradient)} />
				<Slider label="Inner glow" value={s.badgeGlow} min={0} max={1} step={0.01} format={num} modified={s.badgeGlow !== METAL_BADGE_DEFAULTS.glow} oninput={(v) => (s.badgeGlow = v)} onreset={() => (s.badgeGlow = METAL_BADGE_DEFAULTS.glow)} />
			</PanelGroup>
		{/if}

		{#if s.type !== 'badge'}
			<PanelGroup title="Inner shadow">
				<Toggle label="Inner shadow" hint="A hairline of light along the top inside edge." bind:checked={s.innerShadow} />
				{#if s.innerShadow}
					<Slider label="Offset" value={rim.offsetY} min={0} max={4} step={0.25} format={px} modified={s.rimOffset != null} oninput={(v) => (s.rimOffset = v)} onreset={() => (s.rimOffset = null)} />
					<Slider label="Blur" value={rim.blur} min={0} max={3} step={0.1} format={px} modified={s.rimBlur != null} oninput={(v) => (s.rimBlur = v)} onreset={() => (s.rimBlur = null)} />
					<Slider label="Opacity" value={rim.alpha} min={0} max={1} step={0.01} format={pct} modified={s.rimAlpha != null} oninput={(v) => (s.rimAlpha = v)} onreset={() => (s.rimAlpha = null)} />
				{/if}
			</PanelGroup>

			<PanelGroup title="Glow">
				<Toggle label="Glow" hint="A soft halo that wanders along the metal." checked={!s.noGlow} onchange={(v) => (s.noGlow = !v)} />
				{#if s.type === 'text'}
					<Toggle label="Text glow" hint="Off by default: the halo is clipped to the letters." bind:checked={s.textGlow} />
					{#if s.textGlow && !s.noGlow}
						<Slider label="Text glow gain" value={s.textGlowGain} min={0} max={6} step={0.05} format={times} modified={s.textGlowGain !== METAL_TEXT_DEFAULTS.glowGain} oninput={(v) => (s.textGlowGain = v)} onreset={() => (s.textGlowGain = METAL_TEXT_DEFAULTS.glowGain)} />
					{/if}
				{:else if !s.noGlow}
					<Slider label="Glow gain" value={s.glowGain} min={0} max={2} step={0.01} format={times} modified={s.glowGain !== 1} oninput={(v) => (s.glowGain = v)} onreset={() => (s.glowGain = 1)} />
				{/if}
				{#if !s.noGlow}
					<Slider label="Intensity" value={s.glowIntensity} min={0} max={3} step={0.01} format={times} modified={s.glowIntensity !== DEFAULTS.glowIntensity} oninput={(v) => (s.glowIntensity = v)} onreset={() => (s.glowIntensity = DEFAULTS.glowIntensity)} />
					<Slider label="Appear" value={s.glowAppear} min={0} max={2000} step={10} format={(v) => `${v}ms`} modified={s.glowAppear !== DEFAULTS.glowAppear} oninput={(v) => (s.glowAppear = v)} onreset={() => (s.glowAppear = DEFAULTS.glowAppear)} />
					<Slider label="Disappear" value={s.glowDisappear} min={0} max={3000} step={10} format={(v) => `${v}ms`} modified={s.glowDisappear !== DEFAULTS.glowDisappear} oninput={(v) => (s.glowDisappear = v)} onreset={() => (s.glowDisappear = DEFAULTS.glowDisappear)} />
				{/if}
			</PanelGroup>

			<PanelGroup title="Reflection">
				<Toggle
					label="Reflection"
					hint={stageTheme === 'light'
						? 'Reflections are skipped in the light theme.'
						: s.type === 'text'
							? '“Plan” catches the metal on its letters.'
							: 'The search field catches the ring’s light.'}
					checked={!s.noReflection}
					onchange={(v) => (s.noReflection = !v)}
				/>
				{#if !s.noReflection}
					<Slider label="Strength" value={reflection} min={0} max={1.5} step={0.01} format={times} modified={s.reflection != null} oninput={(v) => (s.reflection = v)} onreset={() => (s.reflection = null)} />
				{/if}
			</PanelGroup>
		{/if}

		{#if isRing}
			<PanelGroup title="Cursor bend">
				<Toggle label="Bend" hint="The ring dents like liquid under the cursor. Move across it, or press." bind:checked={s.bend} />
				{#if s.bend}
					<Slider label="Strength" value={s.bendStrength} min={0} max={3} step={0.01} format={times} modified={s.bendStrength !== DEFAULTS.bendStrength} oninput={(v) => (s.bendStrength = v)} onreset={() => (s.bendStrength = DEFAULTS.bendStrength)} />
					<Slider label="Reach" value={s.bendReach} min={0} max={120} format={px} modified={s.bendReach !== DEFAULTS.bendReach} oninput={(v) => (s.bendReach = v)} onreset={() => (s.bendReach = DEFAULTS.bendReach)} />
					<Slider label="Max dent" value={s.bendMax} min={0} max={30} step={0.5} format={px} modified={s.bendMax !== DEFAULTS.bendMax} oninput={(v) => (s.bendMax = v)} onreset={() => (s.bendMax = DEFAULTS.bendMax)} />
				{/if}
			</PanelGroup>
		{/if}

		<PanelGroup title="Cursor reflection">
			<Toggle label="Cursor reflection" hint="The metal lights the pointer as it comes near. The pointer is redrawn as a sprite while it is lit." bind:checked={s.cursor} />
			{#if s.cursor}
				<Slider label="Distance" value={s.cursorDistance} min={4} max={200} format={px} modified={s.cursorDistance !== DEFAULTS.cursorDistance} oninput={(v) => (s.cursorDistance = v)} onreset={() => (s.cursorDistance = DEFAULTS.cursorDistance)} />
				<Slider label="Specular" value={s.cursorSpecular} min={0} max={4} step={0.05} format={num} modified={s.cursorSpecular !== DEFAULTS.cursorSpecular} oninput={(v) => (s.cursorSpecular = v)} onreset={() => (s.cursorSpecular = DEFAULTS.cursorSpecular)} />
				<Slider label="Falloff" value={s.cursorFalloff} min={2} max={60} format={px} modified={s.cursorFalloff !== DEFAULTS.cursorFalloff} oninput={(v) => (s.cursorFalloff = v)} onreset={() => (s.cursorFalloff = DEFAULTS.cursorFalloff)} />
				<Slider label="Reach" value={s.cursorReach} min={1} max={30} step={0.5} format={px} modified={s.cursorReach !== DEFAULTS.cursorReach} oninput={(v) => (s.cursorReach = v)} onreset={() => (s.cursorReach = DEFAULTS.cursorReach)} />
			{/if}
		</PanelGroup>

		<PanelGroup title="Material">
			{#each MATERIAL as m (m.key)}
				<Slider
					label={m.label}
					value={s[m.key] ?? basis[m.key]}
					min={m.min}
					max={m.max}
					step={m.step}
					format={m.unit === 'x' ? times : m.unit === 'deg' ? (v) => `${v}°` : num}
					modified={s[m.key] != null && s[m.key] !== basis[m.key]}
					oninput={(v) => (s[m.key] = v)}
					onreset={() => (s[m.key] = null)}
				/>
			{/each}
			<p class="hint">One renderer draws every metal on the page, so the material, colour and theme are shared by all of them.</p>
		</PanelGroup>
	{/snippet}
</PlaygroundShell>

<style>
	.hint {
		font-size: 12px;
		line-height: 1.5;
		color: var(--fg-3);
	}
</style>
