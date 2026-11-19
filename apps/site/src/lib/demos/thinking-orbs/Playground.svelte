<script lang="ts">
	import {
		ThinkingOrb,
		GRAVITY_DEFAULTS,
		countDots,
		getGravityStatus,
		resolvePreset,
		scaleCounts,
		type GravityOptions,
		type OrbSize,
		type OrbState,
		type OrbTheme
	} from 'runeglow/thinking-orbs';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { SITE } from '#lib/site.ts';
	import { arrowCursor } from './cursor.ts';
	import OrbPill from './OrbPill.svelte';
	import { spiral, spiralSource } from './spiral.ts';

	const STATES: OrbState[] = [
		'working',
		'searching',
		'solving',
		'listening',
		'connecting',
		'weaving',
		'composing',
		'breathing',
		'shaping'
	];
	const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
	const STATE_OPTIONS = STATES.map((value) => ({ value, label: cap(value) }));

	const SIZE_OPTIONS = [
		{ value: '64', label: '64px' },
		{ value: '32', label: '32px' },
		{ value: '20', label: '20px' }
	] as const;

	const THEMES = [
		{ value: 'auto', label: 'Auto' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' }
	] as const;

	const SUBJECTS = [
		{ value: 'orb', label: 'Orb' },
		{ value: 'pill', label: 'Status pill' }
	] as const;

	/* '' is the stock grayscale ink: no `color` prop is written for it. */
	const INKS = [
		{ value: '', label: 'Default', paint: 'linear-gradient(135deg, #ffffff, #8a8a8a)' },
		{ value: '#7cd4ff', label: 'Sky', paint: '#7cd4ff' },
		{ value: '#ffd28f', label: 'Amber', paint: '#ffd28f' },
		{ value: '#ff9ec9', label: 'Pink', paint: '#ff9ec9' },
		{ value: '#9fe8a8', label: 'Mint', paint: '#9fe8a8' },
		{ value: '#b9aeff', label: 'Violet', paint: '#b9aeff' }
	] as const;

	const SHAPES = [
		{ value: 'cycle', label: 'Cycle' },
		{ value: 'circle', label: 'Circle' },
		{ value: 'triangle', label: 'Triangle' },
		{ value: 'square', label: 'Square' }
	] as const;
	type Shape = (typeof SHAPES)[number]['value'];
	const SHAPE_INDEX: Record<Shape, number> = { cycle: -1, circle: 0, triangle: 1, square: 2 };

	const FRAMES = [
		{ value: 'builtin', label: 'Built-in' },
		{ value: 'custom', label: 'Custom' }
	] as const;

	const num = (v: number) => String(+v.toFixed(2));
	const times = (v: number) => `${num(v)}×`;
	const pct = (v: number) => `${Math.round(v * 100)}%`;

	/* The engine's own options, per state. `engine` is the key the library
	   reads through `opts`; `fallback` is what the engine assumes when the
	   preset carries no value. Each slider starts on the tuned value, so the
	   snippet only ever writes real overrides. */
	interface Knob {
		engine: string;
		label: string;
		states: readonly OrbState[];
		min: number;
		max: number;
		step: number;
		fallback: number;
		format: (v: number) => string;
	}
	const SASH: readonly OrbState[] = ['composing', 'breathing'];
	const KNOBS: Knob[] = [
		{ engine: 'spread', label: 'Spread', states: ['shaping', 'connecting'], min: 0.8, max: 2, step: 0.05, fallback: 1, format: times },
		{ engine: 'ghostA', label: 'Orbit paths', states: ['working'], min: 0, max: 1, step: 0.05, fallback: 0.5, format: pct },
		{ engine: 'particles', label: 'Particles', states: ['working'], min: 1, max: 8, step: 1, fallback: 3, format: (v) => `${v}` },
		{ engine: 'scanMul', label: 'Scan speed', states: ['searching'], min: 0.5, max: 8, step: 0.1, fallback: 1, format: times },
		{ engine: 'dimBase', label: 'Unscanned dots', states: ['searching'], min: 0.1, max: 1, step: 0.05, fallback: 1, format: pct },
		{ engine: 'thr', label: 'Link reach', states: ['connecting'], min: 0.3, max: 1.2, step: 0.02, fallback: 0.72, format: num },
		{ engine: 'signals', label: 'Signals', states: ['connecting'], min: 0, max: 12, step: 1, fallback: 5, format: (v) => `${v}` },
		{ engine: 'lineW', label: 'Line width', states: ['connecting'], min: 0.3, max: 2.5, step: 0.1, fallback: 0.8, format: (v) => `${num(v)}px` },
		{ engine: 'turns', label: 'Turns', states: ['weaving'], min: 1, max: 6, step: 0.5, fallback: 3, format: num },
		{ engine: 'wobMul', label: 'Wobble', states: SASH, min: 0, max: 2.5, step: 0.05, fallback: 1, format: times },
		{ engine: 'bandMul', label: 'Band width', states: SASH, min: 1, max: 6, step: 0.1, fallback: 1, format: times },
		{ engine: 'spin', label: 'Spin', states: SASH, min: 0, max: 2, step: 0.05, fallback: 1, format: times }
	];

	type GravityKey = Exclude<keyof GravityOptions, 'sprite' | 'fadeMs'>;
	const GRAVITY_KNOBS: {
		key: GravityKey;
		label: string;
		min: number;
		max: number;
		step: number;
		format: (v: number) => string;
	}[] = [
		{ key: 'reach', label: 'Reach', min: 24, max: 240, step: 4, format: (v) => `${v}px` },
		{ key: 'strength', label: 'Tail', min: 0, max: 48, step: 1, format: (v) => `${v}px` },
		{ key: 'deform', label: 'Bend', min: 0, max: 24, step: 0.5, format: (v) => `${num(v)}px` },
		{ key: 'taper', label: 'Taper', min: 1, max: 4, step: 0.05, format: num },
		{ key: 'curve', label: 'Curve', min: 1, max: 4, step: 0.05, format: num },
		{ key: 'falloff', label: 'Falloff', min: 2, max: 120, step: 2, format: (v) => `${v}px` },
		{ key: 'smoothing', label: 'Inertia', min: 0, max: 1, step: 0.05, format: pct },
		{ key: 'handover', label: 'Handover', min: 0, max: 1, step: 0.05, format: pct },
		{ key: 'squash', label: 'Squash', min: 0, max: 3, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
		{ key: 'blur', label: 'Blur', min: 0, max: 24, step: 0.5, format: (v) => `${v}px` }
	];
	const gravityDefaults = (): Record<GravityKey, number> => ({
		reach: GRAVITY_DEFAULTS.reach,
		strength: GRAVITY_DEFAULTS.strength,
		deform: GRAVITY_DEFAULTS.deform,
		taper: GRAVITY_DEFAULTS.taper,
		curve: GRAVITY_DEFAULTS.curve,
		falloff: GRAVITY_DEFAULTS.falloff,
		smoothing: GRAVITY_DEFAULTS.smoothing,
		handover: GRAVITY_DEFAULTS.handover,
		squash: GRAVITY_DEFAULTS.squash,
		blur: GRAVITY_DEFAULTS.blur
	});

	let orb = $state<OrbState>('listening');
	let size = $state<OrbSize>(64);
	let theme = $state<OrbTheme>('auto');
	let subject = $state<'orb' | 'pill'>('orb');
	let speed = $state(100);
	let paused = $state(false);
	let ink = $state('');
	let dots = $state(1);
	let dotSize = $state(1);
	let shape = $state<Shape>('cycle');
	let frameMode = $state<'builtin' | 'custom'>('builtin');
	/* Engine overrides are remembered per state, so tuning one and visiting
	   another does not lose it. */
	let adv = $state<Partial<Record<OrbState, Record<string, number>>>>({});
	let gravity = $state(false);
	let g = $state(gravityDefaults());

	/* This site is dark and says so with data-theme on <html>, which is what
	   `auto` reads first. */
	const stageTheme = $derived(theme === 'auto' ? 'dark' : theme);

	const resolved = $derived(resolvePreset(orb, size));
	const dotTotal = $derived(countDots(scaleCounts(resolved.opts, Math.max(0.1, dots))));
	const liveKnobs = $derived(KNOBS.filter((k) => k.states.includes(orb)));
	const knobDefault = (k: Knob) => resolved.opts[k.engine] ?? k.fallback;
	const knobValue = (k: Knob) => adv[orb]?.[k.engine] ?? knobDefault(k);

	/* What actually reaches the library: engine keys, overrides only. */
	const engineOpts = $derived.by(() => {
		const out: Record<string, number> = {};
		for (const k of liveKnobs) {
			const v = knobValue(k);
			if (v !== knobDefault(k)) out[k.engine] = v;
		}
		if (orb === 'shaping' && shape !== 'cycle') out.shape = SHAPE_INDEX[shape];
		return out;
	});
	const hasOpts = $derived(Object.keys(engineOpts).length > 0);

	const gravityOverrides = $derived(
		GRAVITY_KNOBS.filter((k) => g[k.key] !== GRAVITY_DEFAULTS[k.key]).map((k) => [k.key, g[k.key]] as const)
	);
	const gravityProp = $derived<GravityOptions | undefined>(
		gravity ? { sprite: arrowCursor, ...Object.fromEntries(gravityOverrides) } : undefined
	);

	/* Gravity switches itself off in several situations (zoomed pages, touch
	   pointers, reduced motion). Saying which one saves a confused minute. */
	let blockedBy = $state<string | null>(null);
	$effect(() => {
		if (!gravity) {
			blockedBy = null;
			return;
		}
		const read = () => (blockedBy = getGravityStatus().blockedBy);
		const first = setTimeout(read, 300);
		const timer = setInterval(read, 1000);
		return () => {
			clearTimeout(first);
			clearInterval(timer);
		};
	});

	const modified = $derived(
		[
			orb !== 'listening',
			size !== 64,
			theme !== 'auto',
			speed !== 100,
			ink !== '',
			dots !== 1,
			dotSize !== 1,
			frameMode !== 'builtin',
			gravity,
			hasOpts,
			gravityOverrides.length > 0
		].filter(Boolean).length
	);

	function reset() {
		orb = 'listening';
		size = 64;
		theme = 'auto';
		speed = 100;
		paused = false;
		ink = '';
		dots = 1;
		dotSize = 1;
		shape = 'cycle';
		frameMode = 'builtin';
		adv = {};
		gravity = false;
		g = gravityDefaults();
	}

	function setKnob(k: Knob, v: number) {
		adv = { ...adv, [orb]: { ...(adv[orb] ?? {}), [k.engine]: v } };
	}
	function resetKnob(k: Knob) {
		const rest = { ...(adv[orb] ?? {}) };
		delete rest[k.engine];
		adv = { ...adv, [orb]: rest };
	}

	const snippet = $derived.by(() => {
		const p: string[] = [`state="${orb}"`];
		if (size !== 64) p.push(`size={${size}}`);
		if (theme !== 'auto') p.push(`theme="${theme}"`);
		if (speed !== 100) p.push(`speed={${num(speed / 100)}}`);
		if (paused) p.push('paused');
		if (ink) p.push(`color="${ink}"`);
		if (dots !== 1) p.push(`dots={${num(dots)}}`);
		if (dotSize !== 1) p.push(`dotSize={${num(dotSize)}}`);
		if (hasOpts) {
			const body = Object.entries(engineOpts)
				.map(([k, v]) => `${k}: ${num(v)}`)
				.join(', ');
			p.push(`opts={{ ${body} }}`);
		}
		if (frameMode === 'custom') p.push('frame={spiral}');
		if (gravity) {
			const body = ['sprite: cursor', ...gravityOverrides.map(([k, v]) => `${k}: ${num(v)}`)].join(', ');
			p.push(`gravity={{ ${body} }}`);
		}

		const imports = [`  import { ThinkingOrb${frameMode === 'custom' ? ', finalizeFrame, radiusScale' : ''} } from '${SITE.pkg}/thinking-orbs';`];
		if (gravity) {
			imports.push("  // A raster of the pointer to draw near the orb: { src, width, height, hotX, hotY }.");
			imports.push("  import { cursor } from './cursor';");
		}
		const decl =
			frameMode === 'custom'
				? `\n\n${spiralSource
						.split('\n')
						.map((l) => `  ${l}`)
						.join('\n')}`
				: '';
		const tag = p.length <= 2 ? `<ThinkingOrb ${p.join(' ')} />` : `<ThinkingOrb\n  ${p.join('\n  ')}\n/>`;
		return `<script>\n${imports.join('\n')}${decl}\n<\/script>\n\n${tag}`;
	});

	const prompt = $derived(`Add a Thinking orb loading indicator from ${SITE.name} to this Svelte 5 app.

1. Install the package with the project's package manager, for example: pnpm add ${SITE.pkg}
2. Import the component: import { ThinkingOrb } from '${SITE.pkg}/thinking-orbs'
3. Place it where the app shows that an agent or request is busy: next to a status
   label, as a chat avatar, or inline in a line of text. It renders one <canvas>.
4. Use exactly this configuration:

${snippet}

Parameter vocabulary, for later changes:
- state: "working" | "searching" | "solving" | "listening" | "connecting" | "weaving" |
  "composing" | "breathing" | "shaping". Pick the verb that matches what the app is doing.
- size: 64 (avatar scale, default) | 32 | 20 (inline with text). These are tuned presets,
  not a scale factor; do not pass other numbers.
- theme: "auto" (default; follows a data-theme attribute or dark/light class on an
  ancestor, then prefers-color-scheme) | "dark" (light dots) | "light" (dark dots)
- speed: multiplier on the preset's speed, 1 by default
- paused: boolean; freezes on the current frame
- color: "#rgb", "#rrggbb" or "rgb()" ink tint; omit for the grayscale default
- dots: density multiplier (1 default; 0.5 halves, 2 doubles)
- dotSize: radius multiplier for every dot (1 default)
- opts: raw engine options merged over the preset, per state: ghostA, particles (working);
  scanMul, dimBase (searching); thr, signals, lineW, spread (connecting); turns (weaving);
  wobMul, bandMul, spin (composing, breathing); spread, shape 0|1|2 (shaping)
- frame: a function (size, t, opts) => { dots, lines } that replaces the state's geometry
- gravity: true or an options object; bends a drawn pointer toward the orb. It needs a
  pointer raster passed as gravity.sprite ({ src, width, height, hotX, hotY }).

Notes:
- The orb sets its own aria-label from the state; pass aria-label to override it, or
  aria-hidden="true" when a visible label sits next to it.
- It pauses itself offscreen and in hidden tabs, and shows one still frame under
  prefers-reduced-motion.`);
</script>

<PlaygroundShell
	label="Thinking orbs controls"
	{stageTheme}
	playing={!paused}
	ontoggle={() => (paused = !paused)}
	{modified}
	onreset={reset}
	code={snippet}
	{prompt}
>
	{#snippet stageTop()}
		<Segmented label="Demo element" hideLabel options={SUBJECTS} bind:value={subject} />
	{/snippet}
	{#snippet stage()}
		{#if subject === 'pill'}
			<OrbPill
				state={orb}
				{size}
				tone={stageTheme}
				speed={speed / 100}
				{paused}
				color={ink || undefined}
				{dots}
				{dotSize}
				opts={hasOpts ? engineOpts : undefined}
				frame={frameMode === 'custom' ? spiral : undefined}
				gravity={gravityProp}
			/>
		{:else}
			<ThinkingOrb
				state={orb}
				{size}
				{theme}
				speed={speed / 100}
				{paused}
				color={ink || undefined}
				{dots}
				{dotSize}
				opts={hasOpts ? engineOpts : undefined}
				frame={frameMode === 'custom' ? spiral : undefined}
				gravity={gravityProp}
			/>
		{/if}
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="State" options={STATE_OPTIONS} bind:value={orb} />
			<Segmented
				label="Size"
				options={SIZE_OPTIONS}
				value={String(size) as '64' | '32' | '20'}
				onchange={(v) => (size = Number(v) as OrbSize)}
			/>
			<Segmented label="Theme" options={THEMES} bind:value={theme} />
		</PanelGroup>

		<PanelGroup>
			<Slider
				label="Speed"
				value={speed}
				min={25}
				max={300}
				step={5}
				format={(v) => times(v / 100)}
				modified={speed !== 100}
				oninput={(v) => (speed = v)}
				onreset={() => (speed = 100)}
			/>
		</PanelGroup>

		<PanelGroup>
			<Segmented label="Color" options={INKS} bind:value={ink} />
			<label class="custom">
				<span>Custom color</span>
				<input
					type="color"
					value={ink || '#ededed'}
					oninput={(e) => (ink = e.currentTarget.value)}
					aria-label="Custom ink color"
				/>
			</label>
			<Slider
				label="Dots amount"
				value={dots}
				min={0.4}
				max={2}
				step={0.05}
				format={() => `${dotTotal} dots`}
				modified={dots !== 1}
				oninput={(v) => (dots = v)}
				onreset={() => (dots = 1)}
			/>
			<Slider
				label="Dot size"
				value={dotSize}
				min={0.5}
				max={2}
				step={0.05}
				format={times}
				modified={dotSize !== 1}
				oninput={(v) => (dotSize = v)}
				onreset={() => (dotSize = 1)}
			/>
		</PanelGroup>

		{#if liveKnobs.length || orb === 'shaping'}
			<PanelGroup title="{cap(orb)} settings">
				{#if orb === 'shaping'}
					<Segmented label="Shape" options={SHAPES} bind:value={shape} />
				{/if}
				{#each liveKnobs as k (k.engine)}
					<Slider
						label={k.label}
						value={knobValue(k)}
						min={k.min}
						max={k.max}
						step={k.step}
						format={k.format}
						modified={knobValue(k) !== knobDefault(k)}
						oninput={(v) => setKnob(k, v)}
						onreset={() => resetKnob(k)}
					/>
				{/each}
			</PanelGroup>
		{/if}

		<PanelGroup title="Cursor gravity">
			<Toggle
				label="Pull the pointer"
				hint={gravity
					? blockedBy
						? `Not active: ${blockedBy}.`
						: 'Move the pointer near the orb.'
					: 'The pointer bends toward the orb as it comes close.'}
				bind:checked={gravity}
			/>
			{#if gravity}
				{#each GRAVITY_KNOBS as k (k.key)}
					<Slider
						label={k.label}
						value={g[k.key]}
						min={k.min}
						max={k.max}
						step={k.step}
						format={k.format}
						modified={g[k.key] !== GRAVITY_DEFAULTS[k.key]}
						oninput={(v) => (g[k.key] = v)}
						onreset={() => (g[k.key] = GRAVITY_DEFAULTS[k.key])}
					/>
				{/each}
			{/if}
		</PanelGroup>

		<PanelGroup title="Geometry">
			<Segmented label="Frame function" options={FRAMES} bind:value={frameMode} />
			<p class="hint">
				{frameMode === 'custom'
					? 'A hand-written spiral, passed through the frame prop. Its source is in the code below.'
					: 'Custom swaps the state’s geometry for a function of your own.'}
			</p>
		</PanelGroup>
	{/snippet}
</PlaygroundShell>

<style>
	.custom {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
		color: var(--fg-2);
	}
	.custom input {
		width: 30px;
		height: 22px;
		padding: 0;
		border: 0;
		border-radius: 6px;
		background: none;
		cursor: pointer;
	}
	.custom input::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.custom input::-webkit-color-swatch {
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
	}
	.custom input::-moz-color-swatch {
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
	}
	.hint {
		font-size: 12px;
		line-height: 1.4;
		color: var(--fg-3);
	}
</style>
