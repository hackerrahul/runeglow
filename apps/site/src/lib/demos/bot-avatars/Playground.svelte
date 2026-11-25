<script lang="ts">
	import { untrack } from 'svelte';
	import {
		BotAvatar,
		botAvatarPalette,
		botAvatarPresets,
		botAvatarTypes,
		type BotAvatarFace,
		type BotAvatarGlasses,
		type BotAvatarHat,
		type BotAvatarProps,
		type BotAvatarShading,
		type BotAvatarSquashEase,
		type BotAvatarState,
		type BotAvatarType
	} from 'runeglow/bot-avatars';
	import CodeField from '#lib/components/CodeField.svelte';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { SITE } from '#lib/site.ts';
	import type { SoftFamily } from './families.ts';

	/* The family the page is showing: it sets the material the playground
	   starts in, and which materials it offers. */
	let { family = 'fabric' }: { family?: SoftFamily } = $props();

	const TYPES = botAvatarTypes.map((t) => ({ value: t, label: botAvatarPresets[t].label }));
	const FACES = [
		{ value: 'eyes', label: 'Eyes' },
		{ value: 'mouth', label: 'Mouth' },
		{ value: 'none', label: 'None' }
	] as const;
	const STATES = [
		{ value: 'default', label: 'Idle' },
		{ value: 'working', label: 'Working' },
		{ value: 'sleeping', label: 'Sleeping' }
	] as const;
	/* fabric and plastic are one material each; flat is three ways to light a vector body */
	const FLAT_SHADINGS = [
		{ value: 'crisp', label: 'Crisp' },
		{ value: 'smooth', label: 'Smooth' },
		{ value: 'flat', label: 'Flat' }
	] as const;
	const OWN_SHADING: Record<SoftFamily, BotAvatarShading> = { fabric: 'fabric', plastic: 'plastic', flat: 'crisp' };
	const THEMES = [
		{ value: 'auto', label: 'Auto' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' }
	] as const;
	const HATS = [
		{ value: 'none', label: 'None' },
		{ value: 'beret', label: 'Beret' },
		{ value: 'beanie', label: 'Beanie' },
		{ value: 'party', label: 'Party' },
		{ value: 'crown', label: 'Crown' }
	] as const;
	const GLASSES = [
		{ value: 'none', label: 'None' },
		{ value: 'round', label: 'Round' },
		{ value: 'square', label: 'Square' },
		{ value: 'shades', label: 'Shades' }
	] as const;
	const EASES = [
		{ value: 'sharp', label: 'Sharp' },
		{ value: 'pulse', label: 'Pulse' },
		{ value: 'soft', label: 'Soft' },
		{ value: 'bouncy', label: 'Bouncy' }
	] as const;
	const SPINS = [
		{ value: '0', label: 'None' },
		{ value: '1', label: 'One turn' },
		{ value: '2', label: 'Two turns' }
	] as const;

	const BODY_COLORS = botAvatarTypes
		.map((t) => ({ value: botAvatarPalette[t], label: botAvatarPresets[t].label }))
		.filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i);
	const INKS = [
		{ value: '#1F1B2E', label: 'Dark ink' },
		{ value: '#F6F4F0', label: 'Light ink' },
		{ value: '#35B8FF', label: 'Sky' },
		{ value: '#DC48FF', label: 'Magenta' }
	];
	const WEAR_COLORS = [
		{ value: '#27272b', label: 'Charcoal' },
		{ value: '#f4efe6', label: 'Cream' },
		{ value: '#c8323c', label: 'Red' },
		{ value: '#2f5fd0', label: 'Blue' },
		{ value: '#e9a93b', label: 'Mustard' },
		{ value: '#2e8b57', label: 'Green' }
	];

	/* The library's own light per material, in slider units. */
	const lightDefaults = (shading: BotAvatarShading) =>
		shading === 'fabric'
			? { shadow: 115, highlight: 145, light: 295, rim: 60, spread: 160 }
			: { shadow: 35, highlight: 130, light: 300, rim: 50, spread: 155 };
	/* Where the library puts the back light when none is given: above the
	   toy, toward the side away from the key. */
	const autoBack = (light: number) => {
		const a = (light * Math.PI) / 180;
		const x = -0.5 * Math.sin(a);
		const y = 0.5 * Math.cos(a) - 0.87;
		return Math.round(((((Math.atan2(x, -y) * 180) / Math.PI) % 360) + 360) % 360 / 5) * 5;
	};

	/* Sliders work in whole units (percent, milliseconds, degrees) and the
	   props are derived from them. `null` means "left alone": the component
	   then uses the type's or the material's own value. */
	/* The page remounts the playground when the family changes, so the
	   family is read once, here. */
	const ownShading = OWN_SHADING[untrack(() => family)];
	const DEFAULTS = {
		type: 'clover' as BotAvatarType,
		face: null as BotAvatarFace | null,
		state: 'default' as BotAvatarState,
		size: 124,
		color: null as string | null,
		ink: null as string | null,
		brightness: null as number | null,
		saturation: null as number | null,
		theme: 'auto' as 'auto' | 'dark' | 'light',
		shading: ownShading,
		shadow: null as number | null,
		highlight: null as number | null,
		light: null as number | null,
		rim: null as number | null,
		spread: null as number | null,
		backLight: null as number | null,
		lightFront: 32,
		backSoft: 100,
		shine: 0,
		sheen: 0,
		depth: 65,
		roundness: 100,
		furLength: 100,
		furDensity: 160,
		furFuzz: 90,
		furClumps: 40,
		furCurl: 70,
		furGravity: 90,
		hat: 'none' as BotAvatarHat,
		glasses: 'none' as BotAvatarGlasses,
		headphones: false,
		bowTie: false,
		wearColor: '#27272b' as string | null,
		speed: 100,
		paused: false,
		seed: null as number | null,
		turn: 100,
		interactive: true,
		whirl: false,
		whirlSize: 100,
		whirlWidth: 100,
		whirlLength: 100,
		whirlTilt: 100,
		jumpHeight: 26,
		jumpTime: 68,
		jumpStretch: 100,
		jumpSpin: '1' as '0' | '1' | '2',
		jumpLean: 6,
		jumpEvery: 8,
		jumpLand: 0,
		jumpSquash: 115,
		jumpSquashTime: 370,
		jumpSquashEase: 'pulse' as BotAvatarSquashEase,
		jumpClickSquashTime: 240,
		jumpGroundTime: 110,
		jumpGroundEase: 'pulse' as BotAvatarSquashEase,
		jumpRiseTime: 330,
		jumpRiseEase: 'pulse' as BotAvatarSquashEase,
		held: false,
		yaw: 35,
		pitch: 0,
		roll: 0,
		path: ''
	};
	type Settings = typeof DEFAULTS;
	type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

	let s = $state<Settings>({ ...DEFAULTS });

	const preset = $derived(botAvatarPresets[s.type]);
	const lit = $derived(lightDefaults(s.shading));
	const fabric = $derived(s.shading === 'fabric');
	const baked = $derived(s.shading === 'fabric' || s.shading === 'plastic');
	const wearing = $derived(s.hat !== 'none' || s.headphones || s.bowTie);
	const stageTheme = $derived(s.theme === 'auto' ? 'dark' : s.theme);

	const brightness = $derived(s.brightness ?? Math.round((preset.brightness ?? 1) * 100));
	const saturation = $derived(s.saturation ?? Math.round((preset.saturation ?? 1.5) * 100));

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
		put('type', s.type, 'clover');
		if (s.path.trim()) o.path = s.path.trim();
		if (s.face) o.face = s.face;
		put('state', s.state, 'default');
		put('size', s.size, 64);
		if (s.color) o.color = s.color;
		if (s.ink) o.ink = s.ink;
		if (s.brightness != null) o.brightness = r3(s.brightness / 100);
		if (s.saturation != null) o.saturation = r3(s.saturation / 100);
		put('theme', s.theme, 'auto');
		put('shading', s.shading, 'fabric');
		if (s.shading !== 'flat') {
			if (s.shadow != null) o.shadow = r3(s.shadow / 100);
			if (s.highlight != null) o.highlight = r3(s.highlight / 100);
			if (s.light != null) o.light = s.light;
			if (s.shading !== 'smooth' && s.rim != null) o.rim = r3(s.rim / 100);
			if (s.shading !== 'crisp' && s.spread != null) o.spread = r3(s.spread / 100);
			if (fabric) {
				put('lightFront', s.lightFront, 32);
				put('backSoftness', r3(s.backSoft / 100), 1);
				if (s.backLight != null) o.backLight = s.backLight;
				put('shine', r3(s.shine / 100), 0);
				put('sheen', r3(s.sheen / 100), 0);
			}
		}
		put('depth', r3(s.depth / 100), 0.65);
		if (baked) put('roundness', r3(s.roundness / 100), 1);
		if (fabric) {
			put('furLength', r3(s.furLength / 100), 1);
			put('furDensity', r3(s.furDensity / 100), 1.6);
			put('furFuzz', r3(s.furFuzz / 100), 0.9);
			put('furClumps', r3(s.furClumps / 100), 0.4);
			put('furCurl', r3(s.furCurl / 100), 0.7);
			put('furGravity', r3(s.furGravity / 100), 0.9);
		}
		put('hat', s.hat, 'none');
		put('glasses', s.glasses, 'none');
		if (s.headphones) o.headphones = true;
		if (s.bowTie) o.bowTie = true;
		if (wearing && s.wearColor && s.wearColor !== '#27272b') o.accessoryColor = s.wearColor;
		put('speed', r3(s.speed / 100), 1);
		if (s.paused) o.paused = true;
		if (s.seed != null) o.seed = s.seed;
		put('turn', r3(s.turn / 100), 1);
		if (!s.interactive) o.interactive = false;
		if (s.whirl) {
			o.whirl = 1;
			put('whirlSize', r3(s.whirlSize / 100), 1);
			put('whirlWidth', r3(s.whirlWidth / 100), 1);
			put('whirlLength', r3(s.whirlLength / 100), 1);
			put('whirlTilt', r3(s.whirlTilt / 100), 1);
		}
		put('jumpHeight', s.jumpHeight, 26);
		put('jumpTime', r3(s.jumpTime / 100), 0.68);
		put('jumpStretch', r3(s.jumpStretch / 100), 1);
		put('jumpSpin', Number(s.jumpSpin), 1);
		put('jumpLean', s.jumpLean, 6);
		put('jumpEvery', s.jumpEvery, 8);
		put('jumpLand', r3(s.jumpLand / 1000), 0);
		put('jumpSquash', r3(s.jumpSquash / 100), 1.15);
		put('jumpSquashTime', r3(s.jumpSquashTime / 1000), 0.37);
		put('jumpSquashEase', s.jumpSquashEase, 'pulse');
		put('jumpClickSquashTime', r3(s.jumpClickSquashTime / 1000), 0.24);
		put('jumpGroundTime', r3(s.jumpGroundTime / 1000), 0.11);
		put('jumpGroundEase', s.jumpGroundEase, 'pulse');
		put('jumpRiseTime', r3(s.jumpRiseTime / 1000), 0.33);
		put('jumpRiseEase', s.jumpRiseEase, 'pulse');
		if (s.held) o.pose = { yaw: rad(s.yaw), pitch: rad(s.pitch), roll: rad(s.roll) };
		return o;
	});

	const attr = (key: string, value: unknown): string => {
		if (key === 'path') return 'path={outline}';
		if (typeof value === 'string') return `${key}="${value}"`;
		if (value === true) return key;
		if (value && typeof value === 'object') {
			const body = Object.entries(value)
				.map(([k, v]) => `${k}: ${v}`)
				.join(', ');
			return `${key}={{ ${body} }}`;
		}
		return `${key}={${value}}`;
	};

	const snippet = $derived.by(() => {
		const p = Object.entries(overrides).map(([k, v]) => attr(k, v));
		const decl = 'path' in overrides ? `\n\n  const outline = '${overrides.path}';` : '';
		const tag =
			p.length === 0 ? '<BotAvatar />'
			: p.length <= 2 ? `<BotAvatar ${p.join(' ')} />`
			: `<BotAvatar\n  ${p.join('\n  ')}\n/>`;
		return `<script>\n  import { BotAvatar } from '${SITE.pkg}/bot-avatars';${decl}\n<\/script>\n\n${tag}`;
	});

	const prompt = $derived(`Add a Bot avatar from ${SITE.name} to this Svelte 5 app: an animated face for an AI agent.

1. Install the package with the project's package manager, for example: pnpm add ${SITE.pkg}
2. Import the component: import { BotAvatar } from '${SITE.pkg}/bot-avatars'
3. Place it where the agent is shown: beside its messages, in a header, or as a status
   indicator. It renders one <canvas> that lays out at \`size\` and leaves room to hop.
4. Use exactly this configuration:

${snippet}

Parameter vocabulary, for later changes:
- type: ${botAvatarTypes.map((t) => `"${t}"`).join(' | ')}
- state: "default" (idle) | "working" (hopping, spinning) | "sleeping". Drive it from the
  agent's real status.
- face: "eyes" | "mouth" | "none" (a bare body: a plain dot or orb)
- size: px number or any CSS length (default 64)
- color, ink: body colour and face ink; both default from the type
- brightness (0.5 to 1.5), saturation (0.5 to 2.5): shift the body colour
- shading: "fabric" (plush fur, default) | "plastic" | "crisp" | "smooth" | "flat"
- shadow, highlight, light (degrees), rim, spread: the lighting; fabric adds lightFront,
  backLight, backSoftness, shine and sheen
- depth (0.2 to 2), roundness (0 to 1): the body's thickness and profile
- furLength, furDensity, furFuzz, furClumps, furCurl, furGravity: the fabric pile
- hat: "none" | "beret" | "beanie" | "party" | "crown"; glasses: "none" | "round" |
  "square" | "shades"; headphones, bowTie: booleans; accessoryColor
- speed, paused, seed (0 to 1; same seed means two avatars move in step), turn (0 to 2)
- interactive: eyes follow a nearby pointer and a click makes it hop (default true)
- whirl (0 to 2) with whirlSize, whirlWidth, whirlLength, whirlTilt: a ring round a spin
- jumpHeight, jumpTime, jumpStretch, jumpSpin, jumpLean, jumpEvery, jumpLand, jumpSquash,
  jumpSquashTime, jumpSquashEase, jumpGroundTime, jumpGroundEase, jumpRiseTime,
  jumpRiseEase, jumpClickSquashTime: the jump. Times are in seconds; eases are
  "sharp" | "pulse" | "soft" | "bouncy".
- pose: { yaw, pitch, roll } in radians; holds the body at an orientation
- path: SVG path data in a 100 by 100 box, replacing the type's outline
- theme: "auto" | "dark" | "light", the surface it sits on

Notes:
- Fabric and plastic bake their material on idle time; the avatar fades in once ready.
- It labels itself ("Clover bot, working"); pass aria-label to change the wording.
- Under prefers-reduced-motion it shows the state's still pose.`);
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
	label="Bot avatars controls"
	{stageTheme}
	playing={!s.paused}
	ontoggle={() => (s.paused = !s.paused)}
	{modified}
	onreset={reset}
	code={snippet}
	{prompt}
>
	{#snippet stage()}
		<BotAvatar {...overrides as BotAvatarProps} />
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="Type" options={TYPES} bind:value={s.type} />
			<Segmented
				label="Face"
				options={FACES}
				value={s.face ?? preset.face}
				onchange={(v) => (s.face = v)}
			/>
			<Segmented label="State" options={STATES} bind:value={s.state} />
		</PanelGroup>

		<PanelGroup title="Look">
			{@render num('size', 'Size', 16, 200, 2, 'px')}
			<SwatchRow label="Color" options={BODY_COLORS} bind:value={s.color} autoLabel="Type's own" fallback={preset.color} />
			<Slider
				label="Brightness"
				value={brightness}
				min={50}
				max={150}
				format={(v) => `${v}%`}
				modified={s.brightness != null}
				oninput={(v) => (s.brightness = v)}
				onreset={() => (s.brightness = null)}
			/>
			<Slider
				label="Saturation"
				value={saturation}
				min={50}
				max={250}
				format={(v) => `${v}%`}
				modified={s.saturation != null}
				oninput={(v) => (s.saturation = v)}
				onreset={() => (s.saturation = null)}
			/>
			<SwatchRow label="Ink" options={INKS} bind:value={s.ink} autoLabel="Auto" fallback="#1F1B2E" />
			<Segmented label="Surface" options={THEMES} bind:value={s.theme} />
		</PanelGroup>

		<PanelGroup title="Material">
			{#if family === 'flat'}
				<Segmented label="Shading" options={FLAT_SHADINGS} value={s.shading as 'crisp' | 'smooth' | 'flat'} onchange={(v) => (s.shading = v)} />
			{/if}
			{#if s.shading !== 'flat'}
				<Slider
					label="Shadow"
					value={s.shadow ?? lit.shadow}
					min={0}
					max={200}
					step={5}
					format={(v) => `${v}%`}
					modified={s.shadow != null}
					oninput={(v) => (s.shadow = v)}
					onreset={() => (s.shadow = null)}
				/>
				<Slider
					label="Highlight"
					value={s.highlight ?? lit.highlight}
					min={0}
					max={200}
					step={5}
					format={(v) => `${v}%`}
					modified={s.highlight != null}
					oninput={(v) => (s.highlight = v)}
					onreset={() => (s.highlight = null)}
				/>
				<Slider
					label="Light angle"
					value={s.light ?? lit.light}
					min={0}
					max={360}
					step={5}
					format={(v) => `${v}°`}
					modified={s.light != null}
					oninput={(v) => (s.light = v)}
					onreset={() => (s.light = null)}
				/>
				{#if fabric}
					{@render num('lightFront', 'Key front', 0, 85, 1, '°')}
				{/if}
				{#if s.shading !== 'smooth'}
					<Slider
						label={fabric ? 'Back light' : 'Rim'}
						value={s.rim ?? lit.rim}
						min={0}
						max={200}
						step={5}
						format={(v) => `${v}%`}
						modified={s.rim != null}
						oninput={(v) => (s.rim = v)}
						onreset={() => (s.rim = null)}
					/>
				{/if}
				{#if fabric}
					{@render num('backSoft', 'Back light softness', 0, 100, 5, '%')}
					<Slider
						label="Back light angle"
						value={s.backLight ?? autoBack(s.light ?? lit.light)}
						min={0}
						max={360}
						step={5}
						format={(v) => (s.backLight == null ? `${v}° auto` : `${v}°`)}
						modified={s.backLight != null}
						oninput={(v) => (s.backLight = v)}
						onreset={() => (s.backLight = null)}
					/>
					{@render num('shine', 'Fibre shine', 0, 200, 5, '%')}
					{@render num('sheen', 'Sheen', 0, 200, 5, '%')}
				{/if}
				{#if s.shading !== 'crisp'}
					<Slider
						label="Spread"
						value={s.spread ?? lit.spread}
						min={40}
						max={250}
						step={5}
						format={(v) => `${v}%`}
						modified={s.spread != null}
						oninput={(v) => (s.spread = v)}
						onreset={() => (s.spread = null)}
					/>
				{/if}
			{/if}
			{@render num('depth', 'Depth', 20, 200, 5, '%')}
			{#if baked}
				{@render num('roundness', 'Roundness', 0, 100, 5, '%')}
			{/if}
		</PanelGroup>

		{#if fabric}
			<PanelGroup title="Fur">
				{@render num('furLength', 'Length', 30, 250, 5, '%')}
				{@render num('furDensity', 'Density', 30, 200, 5, '%')}
				{@render num('furFuzz', 'Edge fuzz', 0, 100, 5, '%')}
				{@render num('furClumps', 'Clumps', 0, 100, 5, '%')}
				{@render num('furCurl', 'Curl', 0, 100, 5, '%')}
				{@render num('furGravity', 'Gravity', 0, 100, 5, '%')}
			</PanelGroup>
		{/if}

		<PanelGroup title="Wear">
			<Segmented label="Hat" options={HATS} bind:value={s.hat} />
			<Segmented label="Glasses" options={GLASSES} bind:value={s.glasses} />
			<Toggle label="Headphones" bind:checked={s.headphones} />
			<Toggle label="Bow tie" bind:checked={s.bowTie} />
			{#if wearing}
				<SwatchRow label="Wear color" options={WEAR_COLORS} bind:value={s.wearColor} />
			{/if}
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
				hint="Two avatars with the same seed blink and glance in step."
			/>
			{@render num('turn', 'Side turn', 0, 200, 5, '%')}
			<Toggle label="Follow pointer" hint="Eyes follow a nearby pointer; a click makes it hop." bind:checked={s.interactive} />
			<Toggle label="Whirl ring" hint="A ring trails round each spin." bind:checked={s.whirl} />
			{#if s.whirl}
				{@render num('whirlSize', 'Ring size', 60, 160, 5, '%')}
				{@render num('whirlWidth', 'Trail width', 40, 200, 5, '%')}
				{@render num('whirlLength', 'Trail length', 40, 160, 5, '%')}
				{@render num('whirlTilt', 'Ring tilt', 50, 180, 5, '%')}
			{/if}
		</PanelGroup>

		<PanelGroup title="Jump">
			<Slider
				label="Every"
				value={s.jumpEvery}
				min={0}
				max={20}
				format={(v) => (v === 0 ? 'never' : `${v} s`)}
				modified={s.jumpEvery !== 8}
				oninput={(v) => (s.jumpEvery = v)}
				onreset={() => (s.jumpEvery = 8)}
				hint="Idle jumps. Click the avatar to see one now."
			/>
			{@render num('jumpHeight', 'Height', 0, 50, 1, '')}
			<Slider
				label="Air time"
				value={s.jumpTime}
				min={40}
				max={140}
				step={2}
				format={(v) => `${+(v / 100).toFixed(2)} s`}
				modified={s.jumpTime !== 68}
				oninput={(v) => (s.jumpTime = v)}
				onreset={() => (s.jumpTime = 68)}
			/>
			{@render num('jumpStretch', 'Stretch', 0, 200, 5, '%')}
			<Segmented label="Spin" options={SPINS} bind:value={s.jumpSpin} />
			{@render num('jumpLean', 'Lean', 0, 15, 1, '°')}
			{@render num('jumpSquash', 'Squash', 0, 200, 5, '%')}
			{@render num('jumpSquashTime', 'Squash time', 100, 600, 10, ' ms')}
			<Segmented label="Squash easing" options={EASES} bind:value={s.jumpSquashEase} />
			<Slider
				label="Ground time"
				value={s.jumpGroundTime}
				min={0}
				max={600}
				step={10}
				format={(v) => (v === 0 ? 'none' : `${v} ms`)}
				modified={s.jumpGroundTime !== 110}
				oninput={(v) => (s.jumpGroundTime = v)}
				onreset={() => (s.jumpGroundTime = 110)}
			/>
			{#if s.jumpGroundTime > 0}
				<Segmented label="Ground easing" options={EASES} bind:value={s.jumpGroundEase} />
			{/if}
			{@render num('jumpRiseTime', 'Rise time', 80, 800, 10, ' ms')}
			<Segmented label="Rise easing" options={EASES} bind:value={s.jumpRiseEase} />
			{@render num('jumpClickSquashTime', 'Click squash time', 100, 1000, 10, ' ms')}
			<Slider
				label="Land squash"
				value={s.jumpLand}
				min={-200}
				max={150}
				step={10}
				format={(v) => (v === 0 ? 'at contact' : v < 0 ? `${-v} ms early` : `${v} ms late`)}
				modified={s.jumpLand !== 0}
				oninput={(v) => (s.jumpLand = v)}
				onreset={() => (s.jumpLand = 0)}
			/>
		</PanelGroup>

		<PanelGroup title="Pose">
			<Toggle label="Hold a pose" hint="Turns the body by hand and stops its own motion." bind:checked={s.held} />
			{#if s.held}
				{@render num('yaw', 'Yaw', -180, 180, 5, '°')}
				{@render num('pitch', 'Pitch', -60, 60, 5, '°')}
				{@render num('roll', 'Roll', -60, 60, 5, '°')}
			{/if}
		</PanelGroup>

		<PanelGroup title="Outline">
			<CodeField
				label="Custom path"
				bind:value={s.path}
				rows={3}
				placeholder="M50 12L88 50L50 88L12 50Z"
				hint="SVG path data in a 100 by 100 box, centred on 50, 50. Replaces the type's outline."
			/>
		</PanelGroup>
	{/snippet}
</PlaygroundShell>
