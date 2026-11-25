<script lang="ts">
	import {
		VoiceBeam,
		resolveVoiceDefaults,
		resolveVoiceStyle,
		themePresets,
		type VoiceBeamColorVariant,
		type VoiceBeamProps,
		type VoiceBeamTheme,
		type VoiceBeamType,
		type VoiceGeometry
	} from '@runeglow/svelte/voice-glow';
	import CodeField from '#lib/components/CodeField.svelte';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import Subject from '#lib/demos/border-beam/Subject.svelte';
	import { FRAMEWORKS, attrs, expr, options, perFramework, type Framework, type PropValue, type Props } from '#lib/code.ts';
	import { SITE } from '#lib/site.ts';
	import PhoneScreen from './PhoneScreen.svelte';
	import RecordingPill from './RecordingPill.svelte';
	import { createMicInput } from './micInput.svelte.ts';
	import { htmlFile, openTag, pad, reactFile, sections, svelteFile, vueFile } from './snippets.ts';
	import { createTranscript } from './transcript.svelte.ts';
	import { MIC_STATUS, SWEEP_DEFAULTS, createSweep, demoGetter } from './voice.ts';

	type Source = 'demo' | 'mic' | 'manual' | 'sweep';

	const TYPES = [
		{ value: 'default', label: 'Chat input' },
		{ value: 'pill', label: 'Recording pill' },
		{ value: 'mobile', label: 'Mobile' }
	] as const;
	const SOURCES = [
		{ value: 'demo', label: 'Demo voice' },
		{ value: 'mic', label: 'Microphone' },
		{ value: 'manual', label: 'Manual' },
		{ value: 'sweep', label: 'Sweep' }
	] as const;
	const THEMES = [
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' },
		{ value: 'auto', label: 'Auto' }
	] as const;
	const COLORS: ReadonlyArray<{ value: VoiceBeamColorVariant; label: string; paint: string }> = [
		{ value: 'colorful', label: 'Colorful', paint: 'conic-gradient(from 210deg, #ff3264, #ff7828, #32c850, #288cff, #6446ff, #f032b4, #ff3264)' },
		{ value: 'mono', label: 'Mono', paint: 'linear-gradient(135deg, #ffffff, #6a6a6a)' },
		{ value: 'ocean', label: 'Ocean', paint: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
		{ value: 'sunset', label: 'Sunset', paint: 'linear-gradient(135deg, #ffd166, #ff8a3c 45%, #ff3d5a)' },
		{ value: 'forest', label: 'Forest', paint: 'linear-gradient(135deg, #34d399, #0d9488)' },
		{ value: 'candy', label: 'Candy', paint: 'linear-gradient(135deg, #ff7ac6, #d946ef)' },
		{ value: 'ice', label: 'Ice', paint: 'linear-gradient(135deg, #cffafe, #38bdf8)' },
		{ value: 'gold', label: 'Gold', paint: 'linear-gradient(135deg, #fde68a, #f59e0b)' }
	];
	const SWATCHES = [
		{ value: '#ff4650', label: 'Red' },
		{ value: '#ff9d3c', label: 'Orange' },
		{ value: '#ffe45c', label: 'Yellow' },
		{ value: '#5aff96', label: 'Green' },
		{ value: '#508cff', label: 'Blue' },
		{ value: '#b47bff', label: 'Violet' },
		{ value: '#ff7ab6', label: 'Pink' },
		{ value: '#ffffff', label: 'White' }
	];
	const LOBES = ['Centre', 'Inner left', 'Inner right', 'Mid left', 'Mid right', 'Outer left', 'Outer right'];
	const BAND_SLOTS = [
		['core', 'Band core'],
		['above', 'Band above'],
		['mid', 'Band middle'],
		['below', 'Band below']
	] as const;
	type BandKey = (typeof BAND_SLOTS)[number][0];

	type Unit = 'x' | 'px' | 'pct' | 'num' | 'flow';
	interface GeoDef {
		key: keyof VoiceGeometry;
		label: string;
		min: number;
		max: number;
		step: number;
		unit: Unit;
	}
	const GEO: { title: string; items: GeoDef[] }[] = [
		{
			title: 'Shape',
			items: [
				{ key: 'scale', label: 'Scale', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'reach', label: 'Reach', min: 0, max: 3, step: 0.05, unit: 'x' },
				{ key: 'spread', label: 'Spread', min: 0, max: 1.5, step: 0.05, unit: 'x' },
				{ key: 'flow', label: 'Flow', min: -200, max: 200, step: 4, unit: 'flow' },
				{ key: 'idle', label: 'Idle presence', min: 0, max: 1, step: 0.01, unit: 'pct' }
			]
		},
		{
			title: 'Bend and band',
			items: [
				{ key: 'bend', label: 'Bend', min: 0, max: 80, step: 1, unit: 'px' },
				{ key: 'bandCurve', label: 'Curve', min: 0.6, max: 4, step: 0.05, unit: 'num' },
				{ key: 'bandSpread', label: 'Band spread', min: 0.15, max: 1.2, step: 0.01, unit: 'x' },
				{ key: 'bandSkew', label: 'Skew', min: -0.6, max: 0.6, step: 0.02, unit: 'num' },
				{ key: 'bandStrength', label: 'Band strength', min: 0, max: 3, step: 0.05, unit: 'x' },
				{ key: 'bandWidth', label: 'Band width', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'bandPosition', label: 'Band height', min: 0.1, max: 1.3, step: 0.01, unit: 'pct' },
				{ key: 'bandTail', label: 'Tail lift', min: 0, max: 1, step: 0.01, unit: 'pct' },
				{ key: 'bandTailPosition', label: 'Tail position', min: 0, max: 0.98, step: 0.01, unit: 'pct' },
				{ key: 'bandTailCurve', label: 'Tail curve', min: 1, max: 6, step: 0.1, unit: 'num' },
				{ key: 'bandTailOverflow', label: 'Tail overflow', min: 0, max: 60, step: 1, unit: 'px' },
				{ key: 'bandOffset', label: 'Line offset', min: -40, max: 60, step: 1, unit: 'px' },
				{ key: 'bandAberration', label: 'Aberration', min: 0, max: 1, step: 0.01, unit: 'pct' },
				{ key: 'distortion', label: 'Distortion', min: 0, max: 1, step: 0.01, unit: 'pct' },
				{ key: 'distortionDetail', label: 'Distortion detail', min: 0.3, max: 3, step: 0.05, unit: 'x' }
			]
		},
		{
			title: 'Glow shape',
			items: [
				{ key: 'glowWidth', label: 'Lobe width', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'glowHeight', label: 'Lobe height', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'lobeSpacing', label: 'Lobe spacing', min: 0.4, max: 2.2, step: 0.05, unit: 'x' },
				{ key: 'rangeWidth', label: 'Range width', min: 0.4, max: 2.5, step: 0.05, unit: 'x' },
				{ key: 'rangeHeight', label: 'Range height', min: 0.4, max: 2.5, step: 0.05, unit: 'x' },
				{ key: 'softness', label: 'Softness', min: 0.6, max: 1.35, step: 0.01, unit: 'x' },
				{ key: 'coreSize', label: 'Core', min: 0, max: 3, step: 0.05, unit: 'x' },
				{ key: 'strokeScale', label: 'Stroke size', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'innerScale', label: 'Inner size', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'innerHeight', label: 'Inner height', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'bloomScale', label: 'Bloom size', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'bloomHeight', label: 'Bloom height', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'coreLight', label: 'Epicentre', min: 0, max: 3, step: 0.05, unit: 'pct' },
				{ key: 'coreLightWidth', label: 'Epicentre width', min: 0.3, max: 3, step: 0.05, unit: 'x' },
				{ key: 'coreLightHeight', label: 'Epicentre height', min: 0.3, max: 3, step: 0.05, unit: 'x' }
			]
		},
		{
			title: 'Layers',
			items: [
				{ key: 'glowSize', label: 'Glow size', min: 0.25, max: 3, step: 0.05, unit: 'x' },
				{ key: 'strokeOpacity', label: 'Stroke', min: 0, max: 2, step: 0.05, unit: 'x' },
				{ key: 'innerOpacity', label: 'Inner glow', min: 0, max: 2, step: 0.05, unit: 'x' },
				{ key: 'bloomOpacity', label: 'Bloom', min: 0, max: 2, step: 0.05, unit: 'x' }
			]
		}
	];

	const num = (v: number) => String(+v.toFixed(3));
	const fmt = (unit: Unit) => (v: number) =>
		unit === 'x' ? `${num(v)}×`
		: unit === 'px' ? `${num(v)}px`
		: unit === 'pct' ? `${Math.round(v * 100)}%`
		: unit === 'flow' ? `${v} px/s`
		: num(v);

	/* `null` means "left alone": the component then uses the value its type
	   and theme are tuned with, and the snippet leaves the prop out. */
	const fresh = () => ({
		type: 'default' as VoiceBeamType,
		theme: 'dark' as VoiceBeamTheme,
		source: 'demo' as Source,
		manual: 60,
		colorVariant: 'colorful' as VoiceBeamColorVariant,
		lobes: [null, null, null, null, null, null, null] as (string | null)[],
		band: { core: null, above: null, mid: null, below: null } as Record<BandKey, string | null>,
		sensitivity: 3.1,
		threshold: 0.015,
		attack: 0.325,
		release: 0.86,
		breathe: 5.2,
		bands: true,
		staticColors: false,
		strength: null as number | null,
		radius: null as number | null,
		brightness: null as number | null,
		saturation: null as number | null,
		hueRange: null as number | null,
		hueDuration: null as number | null,
		hueShift: 0,
		geo: {} as Partial<Record<keyof VoiceGeometry, number | undefined>>,
		active: true,
		paused: false,
		css: '',
		sweep: { ...SWEEP_DEFAULTS }
	});

	let s = $state(fresh());

	const mic = createMicInput();
	/* Choosing Microphone starts listening right away: the click is the user
	   gesture browsers require. Leaving it releases the device. */
	function chooseSource(next: Source) {
		s.source = next;
		if (next === 'mic') void mic.start();
		else mic.stop();
	}

	let systemDark = $state(true);
	$effect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mq.matches;
		const on = (e: MediaQueryListEvent) => (systemDark = e.matches);
		mq.addEventListener('change', on);
		return () => mq.removeEventListener('change', on);
	});
	const stageTheme = $derived(s.theme === 'auto' ? (systemDark ? 'dark' : 'light') : s.theme);

	/* The phone here is drawn at about two thirds of a real screen, so the
	   glow, which is authored in px, is scaled to match it. */
	const hostScale = $derived(s.type === 'mobile' ? 0.85 : undefined);
	const base = $derived.by(() => {
		const d = resolveVoiceDefaults(s.type, stageTheme);
		return { ...d, scale: hostScale ?? d.scale };
	});
	const preset = $derived(themePresets[stageTheme]);
	const typeStyle = $derived(resolveVoiceStyle(s.type, stageTheme));
	const strength = $derived(s.strength ?? Math.round((typeStyle.strength ?? preset.strength ?? 1) * 100));
	const brightness = $derived(s.brightness ?? typeStyle.brightness ?? preset.brightness);
	const saturation = $derived(s.saturation ?? typeStyle.saturation ?? preset.saturation);
	const hueRange = $derived(s.hueRange ?? preset.hueRange ?? 24);
	const hueDuration = $derived(s.hueDuration ?? preset.hueDuration ?? 12);
	const huesLocked = $derived(s.staticColors || s.colorVariant === 'mono');

	const sweep = createSweep(() => ({ active: s.source === 'sweep', tuning: s.sweep }));

	/* On the phone the demo voice is transcribed as it speaks. */
	const transcript = createTranscript();
	$effect(() => {
		s.type;
		s.source;
		transcript.reset();
	});
	const phonePrompt = $derived(
		s.source === 'sweep' ? 'Thinking…' : s.source === 'mic' && mic.state === 'live' ? 'Listening…' : 'How can I help you?'
	);

	const geoSet = $derived(
		(Object.entries(s.geo) as [keyof VoiceGeometry, number | undefined][]).filter(
			(e): e is [keyof VoiceGeometry, number] => e[1] != null
		)
	);
	const colors = $derived.by(() => {
		const last = s.lobes.findLastIndex((c) => c != null);
		return last < 0 ? undefined : s.lobes.slice(0, last + 1).map((c) => c ?? '');
	});
	const bandColors = $derived.by(() => {
		const set = Object.entries(s.band).filter(([, v]) => v != null);
		return set.length ? (Object.fromEntries(set) as Record<string, string>) : undefined;
	});
	const styleAttr = $derived(s.hueShift !== 0 && !huesLocked ? `--voice-hue-base: ${s.hueShift}deg` : '');
	const extraCss = $derived(s.css.trim());

	/* Every prop that differs from the library's defaults, apart from the
	   source. The stage is rendered from this same object. */
	const overrides = $derived.by(() => {
		const o: Record<string, unknown> = {};
		const put = (key: string, value: unknown, def: unknown) => {
			if (value !== def) o[key] = value;
		};
		put('type', s.type, 'default');
		put('theme', s.theme, 'dark');
		put('colorVariant', s.colorVariant, 'colorful');
		if (colors) o.colors = colors;
		if (bandColors) o.bandColors = bandColors;
		if (hostScale != null && s.geo.scale == null) o.scale = hostScale;
		for (const [k, v] of geoSet) o[k] = v;
		put('sensitivity', s.sensitivity, 3.1);
		put('threshold', s.threshold, 0.015);
		put('attack', s.attack, 0.325);
		put('release', s.release, 0.86);
		put('breatheDuration', s.breathe, 5.2);
		if (!s.bands) o.bands = false;
		if (s.staticColors && s.colorVariant !== 'mono') o.staticColors = true;
		if (s.strength != null) o.strength = +(s.strength / 100).toFixed(2);
		if (s.radius != null) o.borderRadius = s.radius;
		if (s.brightness != null) o.brightness = s.brightness;
		if (s.saturation != null) o.saturation = s.saturation;
		if (!huesLocked && s.hueRange != null) o.hueRange = s.hueRange;
		if (!huesLocked && s.hueDuration != null) o.hueDuration = s.hueDuration;
		if (!s.active) o.active = false;
		if (s.paused) o.paused = true;
		if (styleAttr) o.style = styleAttr;
		if (extraCss) o.css = extraCss;
		return o;
	});

	const modified = $derived.by(() => {
		const d = fresh();
		let n = Object.keys(overrides).filter((k) => !(k === 'scale' && s.geo.scale == null)).length;
		if (s.source !== d.source) n++;
		if (s.source === 'manual' && s.manual !== d.manual) n++;
		n += (Object.keys(SWEEP_DEFAULTS) as (keyof typeof SWEEP_DEFAULTS)[]).filter(
			(k) => s.sweep[k] !== SWEEP_DEFAULTS[k]
		).length;
		return n;
	});
	function reset() {
		mic.stop();
		s = fresh();
	}

	/* What each type wraps: a component in a framework, the page's own markup
	   elsewhere, and the id of the wrapper a page with no framework mounts on. */
	const HOSTS: Record<VoiceBeamType, { child: string; html: string; id: string; what: string }> = {
		default: { child: '<ChatInput />', html: '<div class="chat-input">…</div>', id: 'composer', what: 'chat input' },
		pill: { child: '<RecordingPill />', html: '<div class="recording-pill">…</div>', id: 'recorder', what: 'recording pill' },
		mobile: { child: '<VoiceScreen />', html: '<div class="voice-screen">…</div>', id: 'screen', what: 'voice screen' }
	};

	const LEVEL_NOTE = 'A number from 0 to 1, or a function returning one, called every frame.';

	/* The overrides as the code shows them: numbers rounded, and the extra CSS
	   by the name of the constant that holds it. */
	const shown = $derived.by(() => {
		const p: Props = {};
		for (const [k, v] of Object.entries(overrides)) {
			p[k] = k === 'css' ? expr('voiceCss') : typeof v === 'number' ? +v.toFixed(3) : (v as PropValue);
		}
		return p;
	});

	/* The sweep's motion and the extra CSS, as the lines that define them:
	   `to` is what they are assigned to. */
	const sweepLines = (to: string) => [
		'// Called every frame. gather pulls the glow into one beam; offset moves it.',
		`${to} = () => ({`,
		'  gather: 1,',
		`  offset: Math.sin((performance.now() / 1000 / ${num(s.sweep.duration)}) * Math.PI) * ${num(s.sweep.travel)},`,
		`  heldLevel: ${num(s.sweep.level)}`,
		'});'
	];
	const cssLines = (to: string) => (extraCss ? [`${to} = \`\n${pad(extraCss, '  ')}\n\`;`] : []);

	const snippet = $derived(
		perFramework((fw) => {
			const from = `'${FRAMEWORKS[fw].pkg}/voice-glow'`;
			const host = HOSTS[s.type];
			const source = s.source;
			const level = num(s.manual / 100);

			if (fw === 'elements') {
				/* text goes in attributes; a stream, a function and the CSS are set as properties */
				const list = attrs(fw, shown);
				if (source === 'manual') list.unshift(`level="${level}"`);
				const scripted = source !== 'manual' || !!extraCss;
				const script = sections(
					[source === 'mic' ? `import { createMicrophone } from ${from};` : `import ${from};`],
					scripted
						? ["const beam = document.querySelector('runeglow-voice-beam');", ...(source === 'mic' ? ['const mic = createMicrophone();'] : [])]
						: [],
					source === 'mic'
						? [
								'// A stream is a property: no attribute can carry it.',
								'mic.subscribe(() => (beam.stream = mic.stream));',
								"document.querySelector('#listen').addEventListener('click', mic.start);"
							]
						: source === 'demo'
							? [`// Your own level. ${LEVEL_NOTE}`, '// A function is a property: no attribute can carry it.', 'beam.level = () => meter.level;']
							: source === 'sweep'
								? sweepLines('beam.motion')
								: [],
					cssLines('beam.css')
				);
				const before = source === 'mic' ? '<button id="listen">Listen</button>\n\n' : '';
				return htmlFile(script, `${before}${openTag('runeglow-voice-beam', list)}\n  ${host.html}\n</runeglow-voice-beam>`);
			}

			if (fw === 'vanilla') {
				/* the hue shift is a custom property of the wrapper, which is the page's own element */
				const { style: _style, ...rest } = shown;
				const first: Props =
					source === 'manual' ? { level: +level }
					: source === 'demo' ? { level: expr('() => meter.level') }
					: source === 'sweep' ? { motion: expr('sweep') }
					: {};
				const opts = options({ ...first, ...rest });
				return sections(
					[`import { mountVoiceBeam${source === 'mic' ? ', createMicrophone' : ''} } from ${from};`],
					source === 'sweep' ? sweepLines('const sweep') : [],
					cssLines('const voiceCss'),
					[
						`// <div id="${host.id}">${host.html}</div>`,
						`// The beam is put on the wrapper, and glows along the bottom of the ${host.what} inside.`,
						...(source === 'demo' ? [`// level is yours to supply. ${LEVEL_NOTE}`] : []),
						`const beam = mountVoiceBeam(document.querySelector('#${host.id}')${opts ? `, ${opts}` : ''});`,
						...(source === 'mic' ? ['const mic = createMicrophone();'] : [])
					],
					styleAttr ? [`beam.element.style.setProperty('--voice-hue-base', '${s.hueShift}deg');`] : [],
					source === 'mic'
						? ['mic.subscribe(() => beam.update({ stream: mic.stream }));', "document.querySelector('#listen').addEventListener('click', mic.start);"]
						: []
				);
			}

			/* a component: the source is its first prop, then every override */
			const bind = (name: string, value: string) => (fw === 'vue' ? `:${name}="${value}"` : `${name}={${value}}`);
			const list = attrs(fw, fw === 'react' && styleAttr ? { ...shown, style: { '--voice-hue-base': `${s.hueShift}deg` } } : shown);
			list.unshift(
				source === 'mic' ? bind('stream', 'mic.stream')
				: source === 'manual' ? bind('level', level)
				: source === 'sweep' ? bind('motion', 'sweep')
				: fw === 'svelte' ? '{level}'
				: bind('level', 'level')
			);
			const names = `import { VoiceBeam${source === 'mic' ? ', useMicrophone' : ''} } from ${from};`;
			const hook = source === 'mic' ? ['const mic = useMicrophone();'] : [];
			const sweepFn = source === 'sweep' ? sweepLines('const sweep') : [];
			const beam = `${openTag('VoiceBeam', list)}\n  ${host.child}\n</VoiceBeam>`;

			if (fw === 'react') {
				return reactFile({
					top: sections([names], sweepFn, cssLines('const voiceCss')),
					note: source === 'demo' ? `// level: ${LEVEL_NOTE[0].toLowerCase()}${LEVEL_NOTE.slice(1)}` : undefined,
					params: source === 'demo' ? 'level' : undefined,
					body: hook.join('\n'),
					markup: source === 'mic' ? ['<button onClick={mic.start}>Listen</button>', '', beam] : beam
				});
			}
			const taken =
				source !== 'demo' ? []
				: [`// ${LEVEL_NOTE}`, fw === 'svelte' ? 'let { level } = $props();' : "defineProps(['level']);"];
			const script = sections([names], hook, sweepFn, taken, cssLines('const voiceCss'));
			if (fw === 'svelte') return svelteFile(script, `${source === 'mic' ? '<button onclick={mic.start}>Listen</button>\n\n' : ''}${beam}`);
			return vueFile(script, `${source === 'mic' ? '<button @click="mic.start">Listen</button>\n\n' : ''}${beam}`);
		})
	);

	/* the steps of the prompt that are worded for the framework */
	const STEPS: Record<Framework, { import: string; wrap: string; feed: string; hue: string; notes: string[] }> = {
		svelte: {
			import: `Import it: import { VoiceBeam, useMicrophone } from '${FRAMEWORKS.svelte.pkg}/voice-glow'`,
			wrap: `VoiceBeam renders one wrapper <div> and reads the border-radius
   of its first child.`,
			feed: `Either stream={mic.stream} from useMicrophone() (call mic.start from a
   click, so the browser allows audio), or level={…} with a number from 0 to 1 or a
   function returning one.`,
			hue: 'style="--voice-hue-base: 20deg"',
			notes: []
		},
		react: {
			import: `Import it: import { VoiceBeam, useMicrophone } from '${FRAMEWORKS.react.pkg}/voice-glow'`,
			wrap: `VoiceBeam renders one wrapper <div> round its children and reads
   the border-radius of the first one. className, style and a ref go on that wrapper.`,
			feed: `Either stream={mic.stream} from the useMicrophone() hook (call
   mic.start from a click, so the browser allows audio), or level={…} with a number from
   0 to 1 or a function returning one.`,
			hue: "style={{ '--voice-hue-base': '20deg' }}",
			notes: []
		},
		vue: {
			import: `Import it: import { VoiceBeam, useMicrophone } from '${FRAMEWORKS.vue.pkg}/voice-glow'`,
			wrap: `VoiceBeam renders one wrapper <div> round its default slot and
   reads the border-radius of the first element in it. class and style go on that wrapper.`,
			feed: `Either :stream="mic.stream" from useMicrophone() (call it in setup,
   read mic.stream from the object it returns without destructuring, and call mic.start
   from a click, so the browser allows audio), or :level="…" with a number from 0 to 1 or
   a function returning one.`,
			hue: 'style="--voice-hue-base: 20deg"',
			notes: ['In a template, write the props in kebab-case: colorVariant is color-variant.']
		},
		elements: {
			import: `Import it once, which registers the <runeglow-voice-beam> tag: import '${FRAMEWORKS.elements.pkg}/voice-glow'
   The microphone helper is in the same module: import { createMicrophone } from '${FRAMEWORKS.elements.pkg}/voice-glow'`,
			wrap: `<runeglow-voice-beam> is the wrapper itself: a block element
   in the page's own DOM, with no shadow root, that reads the border-radius of its first child.`,
			feed: `Either set the element's stream property from createMicrophone(), as
   in mic.subscribe(() => (beam.stream = mic.stream)), calling mic.start from a click so the
   browser allows audio; or give it a level, the attribute level="0.6" for a number from 0 to
   1, or the level property for a function returning one.`,
			hue: 'style="--voice-hue-base: 20deg"',
			notes: [
				`Every option is a property of the element in camelCase and, where text can say it, an
  attribute in kebab-case: colorVariant is color-variant. colors, band-colors and motion are
  written as JSON; a boolean that is off is written bands="false".`,
				`stream, a function for level or motion, onLevel, onActivate and onDeactivate are properties
  only. The end of a fade is also an activate or deactivate event on the element.`
			]
		},
		vanilla: {
			import: `Import it: import { mountVoiceBeam, createMicrophone } from '${FRAMEWORKS.vanilla.pkg}/voice-glow'`,
			wrap: `mountVoiceBeam(wrapper, options) takes an element the page already
   has, the wrapper round that content. It adds its layers and a stylesheet inside the wrapper,
   after the content, and reads the border-radius of the wrapper's first child.`,
			feed: `Either beam.update({ stream: mic.stream }) from createMicrophone(),
   inside mic.subscribe(…), calling mic.start from a click so the browser allows audio; or the
   level option, a number from 0 to 1 or a function returning one.`,
			hue: 'the custom property --voice-hue-base: 20deg on the wrapper',
			notes: [
				`mountVoiceBeam returns { element, update, destroy }: update(options) changes some options
  and keeps the rest, and destroy() takes the beam off the wrapper, leaving it and its content.`
			]
		}
	};

	const prompt = $derived(
		perFramework((fw, info) => {
			const step = STEPS[fw];
			return `Add the Voice glow from ${SITE.name} to this ${info.app}: a coloured beam along the bottom
edge of an element that rises with the level of a voice.

1. Install the package with the project's package manager, for example: pnpm add ${info.pkg}
2. ${step.import}
3. Wrap the element the voice belongs to: a chat input, a recording pill, or the bottom
   of a mobile screen. ${step.wrap}
4. Feed it sound. ${step.feed}
5. Start from this configuration:

${snippet[fw]}

Parameter vocabulary, for later changes:
- type: "default" (chat input, about 350px wide) | "pill" (small recording pill) |
  "mobile" (bottom of a phone screen). Each retunes the geometry defaults.
- stream, level: the sound source. sensitivity, threshold, attack, release shape the response.
- colorVariant: "colorful" | "mono" | "ocean" | "sunset" | "forest" | "candy" | "ice" | "gold"
- colors: up to seven lobe colours, centre first; bandColors: { core, above, mid, below }
- theme: "dark" | "light" | "auto"
- scale: one multiplier on every pixel dimension of the effect
- reach, spread, flow, idle, breatheDuration: how the glow rises, widens, drifts and rests
- bend, bandStrength, bandWidth, bandPosition, bandCurve, bandSpread, bandSkew, bandOffset,
  bandTail, bandTailPosition, bandTailCurve, bandTailOverflow, bandAberration: the band of
  light along the glow's ceiling
- distortion, distortionDetail: a liquid warp under the band
- glowWidth, glowHeight, lobeSpacing, rangeWidth, rangeHeight, softness, coreSize,
  coreLight, strokeScale, innerScale, innerHeight, bloomScale, bloomHeight: the glow's shape
- strength, glowSize, brightness, saturation, strokeOpacity, innerOpacity, bloomOpacity
- hueRange, hueDuration, staticColors; ${step.hue} shifts the palette
- active (fades in and out), paused (holds the current frame)
- motion: { gather, offset, stretch, heldLevel } or a function returning it; gathers the
  glow into one beam that you can move, for a "working on it" state
- onLevel: called every frame with the smoothed level
- css: extra CSS appended to the generated sheet; write {id} for the instance id

Notes:
${step.notes.map((note) => `- ${note}\n`).join('')}- Nothing is recorded or played back: the stream is only analysed for its level.
- Under prefers-reduced-motion the glow holds still.`;
		})
	);

	const micNote = $derived.by(() => {
		if (s.source !== 'mic') return '';
		// Moving off a silent input reopens the device; that is not a permission prompt.
		if (mic.state !== 'live' && mic.switchedFrom) return 'Switching input…';
		if (mic.state !== 'live') return MIC_STATUS[mic.state];
		const name = mic.label || 'the microphone';
		if (mic.silent) return `No sound is coming from ${name}. Check that it is connected and not muted.`;
		if (mic.switchedFrom) return `Listening on ${name}. ${mic.switchedFrom} was silent.`;
		return `Listening on ${name}.`;
	});
</script>

{#snippet geo(k: GeoDef)}
	<Slider
		label={k.label}
		value={s.geo[k.key] ?? base[k.key]}
		min={k.min}
		max={k.max}
		step={k.step}
		format={fmt(k.unit)}
		modified={s.geo[k.key] != null}
		oninput={(v) => (s.geo[k.key] = v)}
		onreset={() => (s.geo[k.key] = undefined)}
	/>
{/snippet}

<PlaygroundShell
	label="Voice controls"
	{stageTheme}
	clipStage={s.type === 'mobile'}
	playing={!s.paused}
	ontoggle={() => (s.paused = !s.paused)}
	{modified}
	onreset={reset}
	code={snippet}
	{prompt}
>
	{#snippet stageTop()}
		{#if micNote}<p class="note" data-theme={stageTheme}>{micNote}</p>{/if}
	{/snippet}
	{#snippet stage()}
		<VoiceBeam
			{...overrides as VoiceBeamProps}
			stream={s.source === 'mic' ? mic.stream : null}
			level={s.source === 'demo' ? demoGetter : s.source === 'manual' ? s.manual / 100 : 0}
			motion={s.source === 'sweep' ? sweep : null}
			onLevel={s.type === 'mobile' && s.source === 'demo' ? transcript.onLevel : undefined}
			class={s.type === 'mobile' ? 'vg-hang' : undefined}
		>
			{#if s.type === 'pill'}
				<RecordingPill running={!s.paused} tone={stageTheme} />
			{:else if s.type === 'mobile'}
				<PhoneScreen tone={stageTheme} words={s.source === 'demo' ? transcript.words : []} prompt={phonePrompt} />
			{:else}
				<Subject kind="chat" theme={stageTheme} />
			{/if}
		</VoiceBeam>
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="Type" options={TYPES} bind:value={s.type} />
			<Segmented label="Source" options={SOURCES} value={s.source} onchange={chooseSource} />
			{#if s.source === 'mic' && mic.devices.length > 1}
				<label class="input">
					<span>Input</span>
					<select
						value={mic.devices.find((d) => d.label === mic.label)?.id ?? ''}
						onchange={(e) => void mic.choose(e.currentTarget.value)}
					>
						{#each mic.devices as device (device.id)}
							<option value={device.id}>{device.label}</option>
						{/each}
					</select>
				</label>
			{/if}
			{#if s.source === 'manual'}
				<Slider
					label="Level"
					value={s.manual}
					min={0}
					max={100}
					format={(v) => `${v}%`}
					modified={s.manual !== 60}
					oninput={(v) => (s.manual = v)}
					onreset={() => (s.manual = 60)}
				/>
			{:else if s.source === 'sweep'}
				<Slider label="Pass duration" value={s.sweep.duration} min={0.3} max={3} step={0.05} format={(v) => `${num(v)}s`} modified={s.sweep.duration !== SWEEP_DEFAULTS.duration} oninput={(v) => (s.sweep.duration = v)} onreset={() => (s.sweep.duration = SWEEP_DEFAULTS.duration)} />
				<Slider label="Held level" value={s.sweep.level} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} modified={s.sweep.level !== SWEEP_DEFAULTS.level} oninput={(v) => (s.sweep.level = v)} onreset={() => (s.sweep.level = SWEEP_DEFAULTS.level)} />
				<Slider label="Travel" value={s.sweep.travel} min={0} max={2} step={0.05} format={(v) => `${num(v)}×`} modified={s.sweep.travel !== SWEEP_DEFAULTS.travel} oninput={(v) => (s.sweep.travel = v)} onreset={() => (s.sweep.travel = SWEEP_DEFAULTS.travel)} />
			{/if}
			<Segmented label="Theme" options={THEMES} bind:value={s.theme} />
		</PanelGroup>

		<PanelGroup title="Color">
			<Segmented label="Palette" options={COLORS} bind:value={s.colorVariant} />
			{#each LOBES as label, i (label)}
				<SwatchRow {label} options={SWATCHES} bind:value={s.lobes[i]} autoLabel="Palette's" />
			{/each}
			{#each BAND_SLOTS as [key, label] (key)}
				<SwatchRow {label} options={SWATCHES} bind:value={s.band[key]} autoLabel="Theme's" />
			{/each}
		</PanelGroup>

		<PanelGroup title="Response">
			<Slider label="Sensitivity" value={s.sensitivity} min={0.2} max={4} step={0.05} format={(v) => `${num(v)}×`} modified={s.sensitivity !== 3.1} oninput={(v) => (s.sensitivity = v)} onreset={() => (s.sensitivity = 3.1)} />
			<Slider label="Threshold" value={s.threshold} min={0} max={0.3} step={0.005} format={num} modified={s.threshold !== 0.015} oninput={(v) => (s.threshold = v)} onreset={() => (s.threshold = 0.015)} />
			<Slider label="Attack" value={s.attack} min={0} max={0.5} step={0.005} format={(v) => `${Math.round(v * 1000)}ms`} modified={s.attack !== 0.325} oninput={(v) => (s.attack = v)} onreset={() => (s.attack = 0.325)} />
			<Slider label="Release" value={s.release} min={0.02} max={1.5} step={0.01} format={(v) => `${Math.round(v * 1000)}ms`} modified={s.release !== 0.86} oninput={(v) => (s.release = v)} onreset={() => (s.release = 0.86)} />
		</PanelGroup>

		{#each GEO as group (group.title)}
			<PanelGroup title={group.title}>
				{#each group.items as k (k.key)}
					{@render geo(k)}
				{/each}
				{#if group.title === 'Shape'}
					<Slider label="Breathe" value={s.breathe} min={1} max={8} step={0.1} format={(v) => `${num(v)}s`} modified={s.breathe !== 5.2} oninput={(v) => (s.breathe = v)} onreset={() => (s.breathe = 5.2)} />
					<Toggle label="Bands" hint="Split the voice into low, mid and high, one per lobe pair." bind:checked={s.bands} />
				{/if}
			</PanelGroup>
		{/each}

		<PanelGroup title="Styling">
			<Slider label="Strength" value={strength} min={0} max={100} format={(v) => `${v}%`} modified={s.strength != null} oninput={(v) => (s.strength = v)} onreset={() => (s.strength = null)} />
			<Slider
				label="Corner radius"
				value={s.radius ?? (s.type === 'mobile' ? 45 : s.type === 'pill' ? 22 : 20)}
				min={0}
				max={120}
				format={(v) => `${v}px`}
				modified={s.radius != null}
				oninput={(v) => (s.radius = v)}
				onreset={() => (s.radius = null)}
				hint={s.radius == null ? 'Auto, from the wrapped element.' : undefined}
			/>
			<Slider label="Brightness" value={brightness} min={0.5} max={2.2} step={0.05} format={(v) => `${num(v)}×`} modified={s.brightness != null} oninput={(v) => (s.brightness = v)} onreset={() => (s.brightness = null)} />
			<Slider label="Saturation" value={saturation} min={0.4} max={2.2} step={0.05} format={(v) => `${num(v)}×`} modified={s.saturation != null} oninput={(v) => (s.saturation = v)} onreset={() => (s.saturation = null)} />
			<Toggle
				label="Static colors"
				hint={s.colorVariant === 'mono' ? 'Mono is always static.' : 'Stops the hue drift.'}
				checked={s.staticColors || s.colorVariant === 'mono'}
				onchange={(v) => (s.staticColors = v)}
			/>
			{#if !huesLocked}
				<Slider label="Hue range" value={hueRange} min={0} max={120} format={(v) => `${v}°`} modified={s.hueRange != null} oninput={(v) => (s.hueRange = v)} onreset={() => (s.hueRange = null)} />
				<Slider label="Hue speed" value={hueDuration} min={2} max={40} step={0.5} format={(v) => `${num(v)}s`} modified={s.hueDuration != null} oninput={(v) => (s.hueDuration = v)} onreset={() => (s.hueDuration = null)} />
				<Slider label="Hue shift" value={s.hueShift} min={-180} max={180} step={5} format={(v) => `${v}°`} modified={s.hueShift !== 0} oninput={(v) => (s.hueShift = v)} onreset={() => (s.hueShift = 0)} />
			{/if}
			<Toggle label="Active" hint="Off fades the glow out; on fades it back in." bind:checked={s.active} />
		</PanelGroup>

		<PanelGroup title="Custom CSS">
			<CodeField
				label="Extra rules"
				bind:value={s.css}
				placeholder={'[data-voice-beam="{id}"] [data-voice-beam-bloom] {\n  mix-blend-mode: screen;\n}'}
				hint={'Appended to the generated sheet. {id} is the instance id.'}
			/>
		</PanelGroup>
	{/snippet}
</PlaygroundShell>

<style>
	/* The phone hangs off the top of the stage, which clips it: its top
	   corners are never seen. */
	:global(.vg-hang) {
		align-self: start;
		margin-top: -46px;
	}
	.input {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 8px;
		font-size: 13px;
		color: var(--fg-2);
	}
	.input select {
		appearance: none;
		width: 100%;
		height: 32px;
		padding: 0 30px 0 12px;
		border: 0;
		border-radius: 10px;
		background: var(--chip)
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' stroke='%23a0a0a0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
			no-repeat right 11px center / 11px;
		font: inherit;
		font-weight: 500;
		color: #e3e3e3;
		text-overflow: ellipsis;
		cursor: pointer;
	}
	.input select:hover {
		background-color: var(--chip-hover);
	}
	.note {
		max-width: 34ch;
		text-align: center;
		text-wrap: balance;
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.note[data-theme='light'] {
		color: #7a7a7a;
	}
</style>
