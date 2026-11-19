<script lang="ts">
	import {
		BorderBeam,
		sizeThemePresets,
		type BorderBeamColorVariant,
		type BorderBeamSize,
		type BorderBeamTheme
	} from 'runeglow/border-beam';
	import CodeField from '#lib/components/CodeField.svelte';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { SITE } from '#lib/site.ts';
	import Subject, { type SubjectKind } from './Subject.svelte';

	type Family = 'rotate' | 'pulse';

	const FAMILIES = [
		{ value: 'rotate', label: 'Rotate' },
		{ value: 'pulse', label: 'Pulse' }
	] as const;

	const TYPES: Record<Family, ReadonlyArray<{ value: BorderBeamSize; label: string }>> = {
		rotate: [
			{ value: 'md', label: 'Large' },
			{ value: 'sm', label: 'Small' },
			{ value: 'line', label: 'Line' }
		],
		pulse: [
			{ value: 'pulse-inner', label: 'Inner' },
			{ value: 'pulse-outside', label: 'Outside' }
		]
	};

	const COLORS: ReadonlyArray<{ value: BorderBeamColorVariant; label: string; paint: string }> = [
		{ value: 'colorful', label: 'Colorful', paint: 'conic-gradient(from 210deg, #ff3264, #ff7828, #32c850, #288cff, #6446ff, #f032b4, #ff3264)' },
		{ value: 'mono', label: 'Mono', paint: 'linear-gradient(135deg, #ffffff, #6a6a6a)' },
		{ value: 'ocean', label: 'Ocean', paint: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
		{ value: 'sunset', label: 'Sunset', paint: 'linear-gradient(135deg, #ffd166, #ff8a3c 45%, #ff3d5a)' },
		{ value: 'forest', label: 'Forest', paint: 'linear-gradient(135deg, #34d399, #0d9488)' },
		{ value: 'candy', label: 'Candy', paint: 'linear-gradient(135deg, #ff7ac6, #d946ef)' },
		{ value: 'ice', label: 'Ice', paint: 'linear-gradient(135deg, #cffafe, #38bdf8)' },
		{ value: 'gold', label: 'Gold', paint: 'linear-gradient(135deg, #fde68a, #f59e0b)' }
	];

	const THEMES = [
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' },
		{ value: 'auto', label: 'Auto' }
	] as const;

	const SUBJECTS = [
		{ value: 'chat', label: 'Chat' },
		{ value: 'card', label: 'Card' },
		{ value: 'button', label: 'Button' },
		{ value: 'search', label: 'Search' }
	] as const;

	/* Each beam type is tuned against one shape; it reads best on that one. */
	const SUBJECT_FOR: Record<BorderBeamSize, SubjectKind> = {
		md: 'chat',
		sm: 'button',
		line: 'search',
		'pulse-inner': 'chat',
		'pulse-outside': 'chat'
	};

	const SUBJECT_RADIUS: Record<SubjectKind, number> = {
		chat: 20,
		card: 16,
		button: 18,
		search: 20,
		tasks: 18
	};

	/* `null` means "left alone": the component then uses its own per-type
	   default, and the snippet does not mention the prop. */
	const DEFAULTS = {
		size: 'md' as BorderBeamSize,
		colorVariant: 'colorful' as BorderBeamColorVariant,
		theme: 'dark' as BorderBeamTheme,
		active: true,
		staticColors: false,
		strength: 100,
		duration: null as number | null,
		glowSize: 1,
		brightness: null as number | null,
		saturation: null as number | null,
		hueRange: 30,
		hueShift: 0,
		radius: null as number | null,
		spikes: 1,
		strokeOpacity: 1,
		innerOpacity: 1,
		bloomOpacity: 1,
		glowSx: 1,
		glowSy: 1,
		glowBoost: 1,
		css: ''
	};
	type Settings = typeof DEFAULTS;

	let s = $state<Settings>({ ...DEFAULTS });
	let subject = $state<SubjectKind>('chat');

	let systemDark = $state(true);
	$effect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mq.matches;
		const on = (e: MediaQueryListEvent) => (systemDark = e.matches);
		mq.addEventListener('change', on);
		return () => mq.removeEventListener('change', on);
	});

	const family = $derived<Family>(s.size.startsWith('pulse') ? 'pulse' : 'rotate');
	const isPulse = $derived(family === 'pulse');
	const isLine = $derived(s.size === 'line');
	const stageTheme = $derived(s.theme === 'auto' ? (systemDark ? 'dark' : 'light') : s.theme);
	const preset = $derived(sizeThemePresets[s.size][stageTheme]);
	const huesLocked = $derived(s.staticColors || s.colorVariant === 'mono');

	const defaultDuration = $derived(isLine ? 3.1 : isPulse ? 2.3 : 1.96);
	const duration = $derived(s.duration ?? defaultDuration);
	const brightness = $derived(s.brightness ?? preset.brightness ?? 1.3);
	const saturation = $derived(s.saturation ?? preset.saturation);
	const radius = $derived(s.radius ?? SUBJECT_RADIUS[subject]);

	const modified = $derived(
		(Object.keys(DEFAULTS) as (keyof Settings)[]).filter((k) => s[k] !== DEFAULTS[k]).length
	);

	function setSize(next: BorderBeamSize) {
		s.size = next;
		subject = SUBJECT_FOR[next];
	}

	function reset() {
		s = { ...DEFAULTS };
		subject = SUBJECT_FOR[DEFAULTS.size];
	}

	const num = (v: number) => String(+v.toFixed(2));
	const times = (v: number) => `${num(v)}×`;

	/* The CSS hooks the stylesheet reads with a fallback. Only touched ones
	   are written, so the snippet stays as short as the change. */
	const vars = $derived.by(() => {
		const v: [string, string][] = [];
		if (s.hueShift !== 0 && !huesLocked) v.push(['--beam-hue-base', `${s.hueShift}deg`]);
		if (isLine && s.spikes !== 1) v.push(['--beam-spike-mul', num(s.spikes)]);
		if (s.strokeOpacity !== 1) v.push(['--beam-stroke-opacity', num(s.strokeOpacity)]);
		if (s.innerOpacity !== 1) v.push(['--beam-inner-opacity', num(s.innerOpacity)]);
		if (s.bloomOpacity !== 1) v.push(['--beam-bloom-opacity', num(s.bloomOpacity)]);
		if (isPulse && s.glowSx !== 1) v.push(['--pulse-glow-sx', num(s.glowSx)]);
		if (isPulse && s.glowSy !== 1) v.push(['--pulse-glow-sy', num(s.glowSy)]);
		if (isPulse && s.glowBoost !== 1) v.push(['--pulse-glow-boost', num(s.glowBoost)]);
		return v;
	});
	const styleAttr = $derived(vars.map(([k, v]) => `${k}: ${v}`).join('; '));
	const extraCss = $derived(s.css.trim());

	const snippet = $derived.by(() => {
		const p: string[] = [];
		if (s.size !== 'md') p.push(`size="${s.size}"`);
		if (s.colorVariant !== 'colorful') p.push(`colorVariant="${s.colorVariant}"`);
		if (s.theme !== 'dark') p.push(`theme="${s.theme}"`);
		if (s.strength !== 100) p.push(`strength={${num(s.strength / 100)}}`);
		if (s.duration != null) p.push(`duration={${num(s.duration)}}`);
		if (s.glowSize !== 1) p.push(`glowSize={${num(s.glowSize)}}`);
		if (s.brightness != null) p.push(`brightness={${num(s.brightness)}}`);
		if (s.saturation != null) p.push(`saturation={${num(s.saturation)}}`);
		if (s.hueRange !== 30 && !huesLocked && !isPulse) p.push(`hueRange={${s.hueRange}}`);
		if (s.radius != null) p.push(`borderRadius={${s.radius}}`);
		if (s.staticColors && s.colorVariant !== 'mono') p.push('staticColors');
		if (!s.active) p.push('active={false}');
		if (vars.length) p.push(`style="${styleAttr}"`);
		if (extraCss) p.push('css={beamCss}');
		const attrs = p.length ? `\n  ${p.join('\n  ')}\n` : '';
		const decl = extraCss
			? `\n\n  const beamCss = \`\n${extraCss
					.split('\n')
					.map((l) => `    ${l}`)
					.join('\n')}\n  \`;`
			: '';
		return `<script>\n  import { BorderBeam } from '${SITE.pkg}/border-beam';${decl}\n<\/script>\n\n<BorderBeam${attrs}>\n  <Card>Content</Card>\n</BorderBeam>`;
	});

	const prompt = $derived(`Add the Border Beam effect from ${SITE.name} to this Svelte 5 app.

1. Install the package with the project's package manager, for example: pnpm add ${SITE.pkg}
2. Import the component: import { BorderBeam } from '${SITE.pkg}/border-beam'
3. Wrap the element that should glow. BorderBeam renders one wrapper <div>, reads the
   border-radius of its first child and draws the effect around it. Keep my existing
   markup, classes and event handlers on the wrapped element.
4. Use exactly this configuration:

${snippet}

Parameter vocabulary, for later changes:
- size: "md" full border (default) | "sm" small buttons | "line" bottom edge only |
  "pulse-inner" breathing glow inside the border | "pulse-outside" halo that blooms outward
- colorVariant: "colorful" | "mono" | "ocean" | "sunset" | "forest" | "candy" | "ice" | "gold"
- theme: "dark" | "light" | "auto" (follows prefers-color-scheme); match it to the background
- strength: 0 to 1, opacity of the effect layers only
- duration: seconds per cycle (defaults: 1.96 rotate, 3.1 line, 2.3 pulse)
- active: boolean; fades in and out, with onActivate / onDeactivate callbacks
- borderRadius: px; omit it to auto-detect from the first child
- brightness, saturation, glowSize: multipliers on the glow
- hueRange: degrees of hue drift on the rotate types (pulse types rotate the full
  circle); staticColors turns the drift off
- style: CSS hooks --beam-hue-base, --beam-stroke-opacity, --beam-inner-opacity,
  --beam-bloom-opacity, --beam-spike-mul (line), --pulse-glow-sx, --pulse-glow-sy,
  --pulse-glow-boost (pulse)
- css: extra CSS appended to the generated sheet; write {id} for the instance id

Notes:
- "pulse-outside" renders behind the content, so the wrapped element needs an opaque
  background, its own 1px border, and room around it for the halo.
- The effect layers are decorative and ignore pointer events.`);
</script>

<PlaygroundShell
	label="Border beam controls"
	{stageTheme}
	playing={s.active}
	ontoggle={() => (s.active = !s.active)}
	{modified}
	onreset={reset}
	code={snippet}
	{prompt}
>
	{#snippet stageTop()}
		<Segmented label="Demo element" hideLabel options={SUBJECTS} bind:value={subject} />
	{/snippet}
	{#snippet stage()}
		<BorderBeam
			size={s.size}
			colorVariant={s.colorVariant}
			theme={s.theme}
			active={s.active}
			staticColors={s.staticColors}
			strength={s.strength / 100}
			duration={s.duration ?? undefined}
			glowSize={s.glowSize}
			brightness={s.brightness ?? undefined}
			saturation={s.saturation ?? undefined}
			hueRange={s.hueRange}
			borderRadius={s.radius ?? undefined}
			style={styleAttr || undefined}
			css={extraCss || undefined}
		>
			<Subject kind={subject} radius={s.radius} theme={stageTheme} />
		</BorderBeam>
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented
				label="Family"
				options={FAMILIES}
				value={family}
				onchange={(f) => setSize(f === 'pulse' ? 'pulse-inner' : 'md')}
			/>
			<Segmented label="Type" options={TYPES[family]} value={s.size} onchange={setSize} />
			<Segmented label="Color" options={COLORS} bind:value={s.colorVariant} />
			<Segmented label="Theme" options={THEMES} bind:value={s.theme} />
		</PanelGroup>

		<PanelGroup>
			<Slider
				label="Duration"
				value={duration}
				min={0.5}
				max={6}
				step={0.02}
				format={(v) => `${num(v)}s`}
				modified={s.duration != null}
				oninput={(v) => (s.duration = v)}
				onreset={() => (s.duration = null)}
			/>
			<Toggle
				label="Static colors"
				hint={s.colorVariant === 'mono'
					? 'Mono is always static.'
					: isPulse
						? 'Pulse rotates through every hue; this holds it still.'
						: undefined}
				checked={s.staticColors || s.colorVariant === 'mono'}
				onchange={(v) => (s.staticColors = v)}
			/>
			{#if !huesLocked && !isPulse}
				<Slider
					label="Hue range"
					value={s.hueRange}
					min={0}
					max={120}
					format={(v) => `${v}°`}
					modified={s.hueRange !== 30}
					oninput={(v) => (s.hueRange = v)}
					onreset={() => (s.hueRange = 30)}
					hint={isLine ? 'Line caps this at 13°.' : undefined}
				/>
			{/if}
			{#if !huesLocked}
				<Slider
					label="Hue shift"
					value={s.hueShift}
					min={-180}
					max={180}
					step={5}
					format={(v) => `${v}°`}
					modified={s.hueShift !== 0}
					oninput={(v) => (s.hueShift = v)}
					onreset={() => (s.hueShift = 0)}
				/>
			{/if}
		</PanelGroup>

		<PanelGroup>
			<Slider
				label="Strength"
				value={s.strength}
				min={0}
				max={100}
				format={(v) => `${v}%`}
				modified={s.strength !== 100}
				oninput={(v) => (s.strength = v)}
				onreset={() => (s.strength = 100)}
			/>
			<Slider
				label="Glow size"
				value={s.glowSize}
				min={0.25}
				max={3}
				step={0.05}
				format={times}
				modified={s.glowSize !== 1}
				oninput={(v) => (s.glowSize = v)}
				onreset={() => (s.glowSize = 1)}
			/>
			<Slider
				label="Brightness"
				value={brightness}
				min={0.5}
				max={2.2}
				step={0.05}
				format={times}
				modified={s.brightness != null}
				oninput={(v) => (s.brightness = v)}
				onreset={() => (s.brightness = null)}
			/>
			<Slider
				label="Saturation"
				value={saturation}
				min={0.4}
				max={2.2}
				step={0.05}
				format={times}
				modified={s.saturation != null}
				oninput={(v) => (s.saturation = v)}
				onreset={() => (s.saturation = null)}
			/>
			<Slider
				label="Corner radius"
				value={radius}
				min={0}
				max={40}
				format={(v) => `${v}px`}
				modified={s.radius != null}
				oninput={(v) => (s.radius = v)}
				onreset={() => (s.radius = null)}
				hint={s.radius == null ? 'Auto, from the wrapped element.' : undefined}
			/>
		</PanelGroup>

		<PanelGroup>
			<Slider
				label="Stroke"
				value={s.strokeOpacity}
				min={0}
				max={2}
				step={0.05}
				format={times}
				modified={s.strokeOpacity !== 1}
				oninput={(v) => (s.strokeOpacity = v)}
				onreset={() => (s.strokeOpacity = 1)}
			/>
			<Slider
				label="Inner glow"
				value={s.innerOpacity}
				min={0}
				max={2}
				step={0.05}
				format={times}
				modified={s.innerOpacity !== 1}
				oninput={(v) => (s.innerOpacity = v)}
				onreset={() => (s.innerOpacity = 1)}
			/>
			<Slider
				label="Bloom"
				value={s.bloomOpacity}
				min={0}
				max={2}
				step={0.05}
				format={times}
				modified={s.bloomOpacity !== 1}
				oninput={(v) => (s.bloomOpacity = v)}
				onreset={() => (s.bloomOpacity = 1)}
			/>
			{#if isLine}
				<Slider
					label="Spikes"
					value={s.spikes}
					min={0}
					max={2}
					step={0.05}
					format={times}
					modified={s.spikes !== 1}
					oninput={(v) => (s.spikes = v)}
					onreset={() => (s.spikes = 1)}
				/>
			{/if}
			{#if isPulse}
				<Slider
					label="Glow spread X"
					value={s.glowSx}
					min={0.5}
					max={2}
					step={0.05}
					format={times}
					modified={s.glowSx !== 1}
					oninput={(v) => (s.glowSx = v)}
					onreset={() => (s.glowSx = 1)}
					hint={s.size === 'pulse-outside' ? 'Outside sets the spread from its element.' : undefined}
				/>
				<Slider
					label="Glow spread Y"
					value={s.glowSy}
					min={0.5}
					max={2}
					step={0.05}
					format={times}
					modified={s.glowSy !== 1}
					oninput={(v) => (s.glowSy = v)}
					onreset={() => (s.glowSy = 1)}
				/>
				<Slider
					label="Glow boost"
					value={s.glowBoost}
					min={0.5}
					max={2}
					step={0.05}
					format={times}
					modified={s.glowBoost !== 1}
					oninput={(v) => (s.glowBoost = v)}
					onreset={() => (s.glowBoost = 1)}
				/>
			{/if}
		</PanelGroup>

		<PanelGroup>
			<CodeField
				label="Custom CSS"
				bind:value={s.css}
				placeholder={'[data-beam="{id}"]::after {\n  filter: blur(1px);\n}'}
				hint={'Appended to the generated sheet. {id} is the instance id.'}
			/>
		</PanelGroup>
	{/snippet}
</PlaygroundShell>
