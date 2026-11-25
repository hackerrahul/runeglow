<script lang="ts">
	import {
		BorderBeam,
		sizeThemePresets,
		type BorderBeamColorVariant,
		type BorderBeamSize,
		type BorderBeamTheme
	} from '@runeglow/svelte/border-beam';
	import CodeField from '#lib/components/CodeField.svelte';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { attrs, importLine, importStep, options, perFramework, expr, type Props } from '#lib/code.ts';
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

	/* Every option that differs from the library's default, as data: each
	   framework's text below is written from this one object. */
	const overrides = $derived.by(() => {
		const o: Props = {};
		if (s.size !== 'md') o.size = s.size;
		if (s.colorVariant !== 'colorful') o.colorVariant = s.colorVariant;
		if (s.theme !== 'dark') o.theme = s.theme;
		if (s.strength !== 100) o.strength = +num(s.strength / 100);
		if (s.duration != null) o.duration = +num(s.duration);
		if (s.glowSize !== 1) o.glowSize = +num(s.glowSize);
		if (s.brightness != null) o.brightness = +num(s.brightness);
		if (s.saturation != null) o.saturation = +num(s.saturation);
		if (s.hueRange !== 30 && !huesLocked && !isPulse) o.hueRange = s.hueRange;
		if (s.radius != null) o.borderRadius = s.radius;
		if (s.staticColors && s.colorVariant !== 'mono') o.staticColors = true;
		if (!s.active) o.active = false;
		return o;
	});

	const pad = (text: string, by: string) =>
		text
			.split('\n')
			.map((line) => (line ? by + line : line))
			.join('\n');

	/* The custom CSS as a template literal, its lines indented by `by`. What
	   would end the literal early, or be read as an escape, is escaped. */
	const cssLiteral = (by: string) =>
		`\`\n${pad(extraCss.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${'), `${by}  `)}\n${by}\``;

	/* A tag with one attribute per line, as this playground has always printed it. */
	const wrap = (name: string, list: string[], inner: string) =>
		`<${name}${list.length ? `\n  ${list.join('\n  ')}\n` : ''}>\n  ${inner}\n</${name}>`;

	const snippet = $derived(
		perFramework((fw) => {
			const css = extraCss ? { css: expr('beamCss') } : {};
			if (fw === 'vanilla') {
				/* the wrapper is the page's own, so its variables are set on it directly */
				const decl = extraCss ? `const beamCss = ${cssLiteral('')};\n\n` : '';
				const set = vars.map(([k, v]) => `wrapper.style.setProperty('${k}', '${v}');\n`).join('');
				const opts = options({ ...overrides, ...css });
				return `${importLine(fw, 'border-beam', ['attachBorderBeam'])}\n\n${decl}// The wrapper is an element of the page, round the one that should glow:\n// <div id="beam"><div class="card">Content</div></div>\nconst wrapper = document.querySelector('#beam');\n${set}${set ? '\n' : ''}const beam = attachBorderBeam(wrapper${opts ? `, ${opts}` : ''});`;
			}
			/* React takes inline style as an object, and a custom property's name is a
			   string key. Its adapter also lets that object win over the spread
			   pulse-outside measures from the element, where every other form (and
			   the stage) keeps the measured one: there the two are left out. */
			const measured = (name: string) => s.size === 'pulse-outside' && (name === '--pulse-glow-sx' || name === '--pulse-glow-sy');
			const reactVars = vars.filter(([name]) => !measured(name));
			const style =
				fw === 'react' ? (reactVars.length ? { style: Object.fromEntries(reactVars) } : {}) : vars.length ? { style: styleAttr } : {};
			if (fw === 'elements') {
				/* a stylesheet has quotes and line breaks of its own, so it is set as a property */
				const set = extraCss
					? `\n\n  // a stylesheet is easier to set as a property than to quote in an attribute\n  document.querySelector('runeglow-border-beam').css = ${cssLiteral('  ')};`
					: '';
				const markup = wrap('runeglow-border-beam', attrs(fw, { ...overrides, ...style }), '<div class="card">Content</div>');
				return `<script type="module">\n  ${importLine(fw, 'border-beam', [])}${set}\n<\/script>\n\n${markup}`;
			}
			const markup = wrap('BorderBeam', attrs(fw, { ...overrides, ...style, ...css }), '<Card>Content</Card>');
			const line = importLine(fw, 'border-beam', ['BorderBeam']);
			if (fw === 'svelte') {
				const decl = extraCss ? `\n\n  const beamCss = ${cssLiteral('  ')};` : '';
				return `<script>\n  ${line}${decl}\n<\/script>\n\n${markup}`;
			}
			if (fw === 'vue') {
				const decl = extraCss ? `\n\nconst beamCss = ${cssLiteral('')};` : '';
				return `<script setup>\n${line}${decl}\n<\/script>\n\n<template>\n${pad(markup, '  ')}\n</template>`;
			}
			const decl = extraCss ? `const beamCss = ${cssLiteral('')};\n\n` : '';
			return `${line}\n\n${decl}export function Example() {\n  return (\n${pad(markup, '    ')}\n  );\n}`;
		})
	);

	/* the parts of the prompt that are not the same in every framework */
	const WRAP_STEP = {
		svelte: `Wrap the element that should glow. BorderBeam renders one wrapper <div>, reads the
   border-radius of its first child and draws the effect around it. Keep my existing
   markup, classes and event handlers on the wrapped element.`,
		react: `Wrap the element that should glow. BorderBeam renders one wrapper <div>, reads the
   border-radius of its first child and draws the effect around it. Keep my existing
   markup, classes and event handlers on the wrapped element.`,
		vue: `Wrap the element that should glow. BorderBeam renders one wrapper <div>, reads the
   border-radius of its first child and draws the effect around it. Keep my existing
   markup, classes and event handlers on the wrapped element.`,
		elements: `Put the element that should glow inside <runeglow-border-beam>. The tag is the
   wrapper (a block element, with no shadow root): it reads the border-radius of its
   first child and draws the effect around it. Keep my existing markup, classes and
   event handlers on the wrapped element.`,
		vanilla: `Call attachBorderBeam on a wrapper element round the element that should glow,
   adding the wrapper if there is none. It reads the border-radius of the wrapper's
   first child and draws the effect around it. Keep my existing markup, classes and
   event handlers on the wrapped element. Call destroy() on what it returns when the
   wrapper leaves the page.`
	} as const;
	const FADE_ENDS = {
		svelte: 'with onActivate / onDeactivate callbacks',
		react: 'with onActivate / onDeactivate callbacks',
		vue: 'with activate / deactivate events (@activate, @deactivate)',
		elements: 'with activate / deactivate events fired on the tag',
		vanilla: 'with onActivate / onDeactivate callbacks in the third argument'
	} as const;
	const HOOKS = {
		svelte: `style: CSS hooks --beam-hue-base, --beam-stroke-opacity, --beam-inner-opacity,
  --beam-bloom-opacity, --beam-spike-mul (line), --pulse-glow-sx, --pulse-glow-sy,
  --pulse-glow-boost (pulse)`,
		react: `style: CSS hooks, in an object with each name as a string key: --beam-hue-base,
  --beam-stroke-opacity, --beam-inner-opacity, --beam-bloom-opacity, --beam-spike-mul
  (line), --pulse-glow-sx, --pulse-glow-sy, --pulse-glow-boost (pulse)`,
		vue: `style: CSS hooks --beam-hue-base, --beam-stroke-opacity, --beam-inner-opacity,
  --beam-bloom-opacity, --beam-spike-mul (line), --pulse-glow-sx, --pulse-glow-sy,
  --pulse-glow-boost (pulse)`,
		elements: `style: CSS hooks, written on the tag: --beam-hue-base, --beam-stroke-opacity,
  --beam-inner-opacity, --beam-bloom-opacity, --beam-spike-mul (line), --pulse-glow-sx,
  --pulse-glow-sy, --pulse-glow-boost (pulse)`,
		vanilla: `CSS hooks, set on the wrapper element: --beam-hue-base, --beam-stroke-opacity,
  --beam-inner-opacity, --beam-bloom-opacity, --beam-spike-mul (line), --pulse-glow-sx,
  --pulse-glow-sy, --pulse-glow-boost (pulse)`
	} as const;

	const prompt = $derived(
		perFramework(
			(fw, info) => `Add the Border Beam effect from ${SITE.name} to this ${info.app}.

1. Install the package with the project's package manager, for example: pnpm add ${info.pkg}
2. ${importStep(fw, 'BorderBeam')}
3. ${WRAP_STEP[fw]}
4. Use exactly this configuration:

${snippet[fw]}

Parameter vocabulary, for later changes${fw === 'elements' ? ' (as attributes, camelCase names become kebab-case:\ncolorVariant is color-variant; a boolean is on when present, such as static-colors, and\noff as active="false")' : ''}:
- size: "md" full border (default) | "sm" small buttons | "line" bottom edge only |
  "pulse-inner" breathing glow inside the border | "pulse-outside" halo that blooms outward
- colorVariant: "colorful" | "mono" | "ocean" | "sunset" | "forest" | "candy" | "ice" | "gold"
- theme: "dark" | "light" | "auto" (follows prefers-color-scheme); match it to the background
- strength: 0 to 1, opacity of the effect layers only
- duration: seconds per cycle (defaults: 1.96 rotate, 3.1 line, 2.3 pulse)
- active: boolean; fades in and out, ${FADE_ENDS[fw]}
- borderRadius: px; omit it to auto-detect from the first child
- brightness, saturation, glowSize: multipliers on the glow
- hueRange: degrees of hue drift on the rotate types (pulse types rotate the full
  circle); staticColors turns the drift off
- ${HOOKS[fw]}
- css: extra CSS appended to the generated sheet; write {id} for the instance id

Notes:
- "pulse-outside" renders behind the content, so the wrapped element needs an opaque
  background, its own 1px border, and room around it for the halo.
- The effect layers are decorative and ignore pointer events.${fw === 'vanilla' ? '\n- update(options) on what attachBorderBeam returns replaces every option, so pass the\n  whole set each time.' : ''}`
		)
	);
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
