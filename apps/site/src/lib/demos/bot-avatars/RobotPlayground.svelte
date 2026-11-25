<script lang="ts">
	import {
		RobotHead,
		robotHeadColorwayNames,
		robotHeadColorways,
		robotHeadShapes,
		robotHeadStates,
		type RobotHeadColorwayName,
		type RobotHeadFinish,
		type RobotHeadPixels,
		type RobotHeadProps,
		type RobotHeadShape,
		type RobotHeadState
	} from '@runeglow/svelte/bot-avatars';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { example, importStep, labelOption, perFramework, type Props } from '#lib/code.ts';
	import { SITE } from '#lib/site.ts';

	const title = (v: string) => v[0].toUpperCase() + v.slice(1);

	const SHAPES = robotHeadShapes.map((v) => ({ value: v, label: title(v) }));
	const STATES = robotHeadStates.map((v) => ({ value: v, label: title(v) }));
	const COLORWAYS = robotHeadColorwayNames.map((v) => ({
		value: v,
		label: robotHeadColorways[v].label,
		paint: robotHeadColorways[v].color
	}));
	const FINISHES = [
		{ value: 'gloss', label: 'Gloss' },
		{ value: 'matte', label: 'Matte' },
		{ value: 'metal', label: 'Metal' }
	] as const;
	const PIXELS = [
		{ value: 'square', label: 'Square' },
		{ value: 'round', label: 'Round' }
	] as const;
	const SURFACES = [
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' }
	] as const;

	const SHELLS = robotHeadColorwayNames.map((v) => ({ value: robotHeadColorways[v].color, label: robotHeadColorways[v].label }));
	const TRIMS = [
		{ value: '#93a6c8', label: 'Steel' },
		{ value: '#d9dde6', label: 'Silver' },
		{ value: '#c9a25a', label: 'Brass' },
		{ value: '#c47a52', label: 'Copper' },
		{ value: '#3a3d45', label: 'Gunmetal' },
		{ value: '#f0d6b4', label: 'Cream' }
	];
	const LEDS = [
		{ value: '#e8f2ff', label: 'Cool white' },
		{ value: '#7dffb0', label: 'Green' },
		{ value: '#ffb347', label: 'Amber' },
		{ value: '#8fd0ff', label: 'Sky' },
		{ value: '#ff8ad1', label: 'Pink' },
		{ value: '#c7a6ff', label: 'Violet' }
	];

	/* Sliders work in whole units (percent, degrees) and the props are derived
	   from them. `null` means "left alone": the component then uses the
	   colourway's own. */
	const DEFAULTS = {
		shape: 'rectangle' as RobotHeadShape,
		state: 'idle' as RobotHeadState,
		size: 200,
		colorway: 'cobalt' as RobotHeadColorwayName,
		color: null as string | null,
		trimColor: null as string | null,
		screenColor: null as string | null,
		finish: 'gloss' as RobotHeadFinish,
		pixels: 'square' as RobotHeadPixels,
		antenna: true,
		floorShadow: true,
		surface: 'dark' as 'dark' | 'light',
		speed: 100,
		paused: false,
		seed: null as number | null,
		interactive: true,
		held: false,
		yaw: 35,
		pitch: 10,
		roll: 0
	};
	type Settings = typeof DEFAULTS;
	type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

	let s = $state<Settings>({ ...DEFAULTS });

	const way = $derived(robotHeadColorways[s.colorway]);
	const modified = $derived(
		(Object.keys(DEFAULTS) as (keyof Settings)[]).filter((k) => s[k] !== DEFAULTS[k]).length
	);
	const reset = () => (s = { ...DEFAULTS });

	const r3 = (v: number) => +v.toFixed(3);
	const rad = (deg: number) => +((deg * Math.PI) / 180).toFixed(2);

	/* Every prop that differs from the library's default, and nothing else.
	   The stage is rendered from this same object, so the code underneath is
	   what is on screen by construction. */
	const overrides = $derived.by(() => {
		const o: Record<string, unknown> = {};
		const put = (key: string, value: unknown, def: unknown) => {
			if (value !== def) o[key] = value;
		};
		put('shape', s.shape, 'rectangle');
		put('state', s.state, 'idle');
		put('size', s.size, 160);
		put('colorway', s.colorway, 'cobalt');
		if (s.color) o.color = s.color;
		if (s.trimColor) o.trimColor = s.trimColor;
		if (s.screenColor) o.screenColor = s.screenColor;
		put('finish', s.finish, 'gloss');
		put('pixels', s.pixels, 'square');
		if (!s.antenna) o.antenna = false;
		if (!s.floorShadow) o.floorShadow = false;
		put('speed', r3(s.speed / 100), 1);
		if (s.paused) o.paused = true;
		if (s.seed != null) o.seed = s.seed;
		if (!s.interactive) o.interactive = false;
		if (s.held) o.pose = { yaw: rad(s.yaw), pitch: rad(s.pitch), roll: rad(s.roll) };
		return o;
	});

	const snippet = $derived(example({ component: 'RobotHead', props: overrides as Props }));

	const prompt = $derived(
		perFramework(
			(fw, info) => `Add a Robot head from ${SITE.name} to this ${info.app}: a 3D robot head with an LED face
that shows what an AI agent is doing.

1. Install the package with the project's package manager, for example: pnpm add ${info.pkg}
2. ${importStep(fw, 'RobotHead')}
3. Place it where the agent is shown: beside its messages, in a header, or as a status
   indicator. It is a size by size box; hops, the antenna's glow and the floor shadow draw
   past the box without taking room in the layout, so do not put overflow: hidden right
   round it.
4. Use exactly this configuration:

${snippet[fw]}

Parameter vocabulary, for later changes${fw === 'elements' ? ' (as attributes, camelCase names become kebab-case: floorShadow is floor-shadow)' : ''}:
- shape: ${robotHeadShapes.map((v) => `"${v}"`).join(' | ')}
- state: ${robotHeadStates.map((v) => `"${v}"`).join(' | ')}.
  Drive it from the agent's real status. "waiting" means it needs the user; "success"
  shows a tick.
- size: px number (default 160)
- colorway: ${robotHeadColorwayNames.map((v) => `"${v}"`).join(' | ')}
- color, trimColor, screenColor: the shell, the ears and collar, the LEDs; each overrides
  its part of the colourway
- finish: "gloss" (default) | "matte" | "metal"
- pixels: "square" (default) | "round", the shape of each LED
- antenna (default true): false drops the stem and its light, for small avatars
- floorShadow (default true): the soft shadow under the head
- speed, paused, seed (0 to 1; the same seed means two heads move in step)
- interactive: head and eyes follow a nearby pointer and a click makes it hop and spin
  (default true)
- pose: { yaw, pitch, roll } in radians; holds the head at an orientation

Notes:
- It labels itself ("Robot, thinking"); pass ${labelOption(fw)} to change the wording.
- Under prefers-reduced-motion it shows the state's still pose.`
		)
	);
</script>

{#snippet num(key: NumKey, label: string, min: number, max: number, step: number, unit: string)}
	<Slider
		{label}
		value={s[key]}
		{min}
		{max}
		{step}
		format={(v) => `${v}${unit}`}
		modified={s[key] !== DEFAULTS[key]}
		oninput={(v) => (s[key] = v)}
		onreset={() => (s[key] = DEFAULTS[key])}
	/>
{/snippet}

<PlaygroundShell
	label="Robot head controls"
	stageTheme={s.surface}
	playing={!s.paused}
	ontoggle={() => (s.paused = !s.paused)}
	{modified}
	onreset={reset}
	code={snippet}
	{prompt}
>
	{#snippet stage()}
		<RobotHead {...overrides as RobotHeadProps} />
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="Shape" options={SHAPES} bind:value={s.shape} />
			<Segmented label="State" options={STATES} bind:value={s.state} />
		</PanelGroup>

		<PanelGroup title="Look">
			{@render num('size', 'Size', 32, 260, 4, 'px')}
			<Segmented label="Colourway" options={COLORWAYS} bind:value={s.colorway} />
			<Segmented label="Finish" options={FINISHES} bind:value={s.finish} />
			<Segmented label="Pixels" options={PIXELS} bind:value={s.pixels} />
			<Toggle label="Antenna" hint="Off, the knob stays and the head fills the box." bind:checked={s.antenna} />
			<Toggle label="Floor shadow" bind:checked={s.floorShadow} />
			<Segmented label="Surface" options={SURFACES} bind:value={s.surface} />
		</PanelGroup>

		<PanelGroup title="Colours">
			<SwatchRow label="Shell" options={SHELLS} bind:value={s.color} autoLabel="Colourway's" fallback={way.color} />
			<SwatchRow label="Trim" options={TRIMS} bind:value={s.trimColor} autoLabel="Colourway's" fallback={way.trimColor} />
			<SwatchRow label="LEDs" options={LEDS} bind:value={s.screenColor} autoLabel="Colourway's" fallback={way.screenColor} />
		</PanelGroup>

		<PanelGroup title="Motion">
			<Slider
				label="Speed"
				value={s.speed}
				min={25}
				max={300}
				step={5}
				format={(v) => `${+(v / 100).toFixed(2)}×`}
				modified={s.speed !== 100}
				oninput={(v) => (s.speed = v)}
				onreset={() => (s.speed = 100)}
			/>
			<Slider
				label="Seed"
				value={s.seed ?? 0}
				min={0}
				max={1}
				step={0.01}
				format={(v) => (s.seed == null ? 'auto' : String(v))}
				modified={s.seed != null}
				oninput={(v) => (s.seed = v)}
				onreset={() => (s.seed = null)}
				hint="Two heads with the same seed blink and glance in step."
			/>
			<Toggle label="Follow pointer" hint="Head and eyes follow a nearby pointer; a click makes it hop and spin." bind:checked={s.interactive} />
		</PanelGroup>

		<PanelGroup title="Pose">
			<Toggle label="Hold a pose" hint="Turns the head by hand. Try 180° of yaw to see the back." bind:checked={s.held} />
			{#if s.held}
				{@render num('yaw', 'Yaw', -180, 180, 5, '°')}
				{@render num('pitch', 'Pitch', -60, 60, 5, '°')}
				{@render num('roll', 'Roll', -60, 60, 5, '°')}
			{/if}
		</PanelGroup>
	{/snippet}
</PlaygroundShell>
