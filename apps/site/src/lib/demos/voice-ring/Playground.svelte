<script lang="ts">
	import {
		PRESETS,
		VoiceOrb,
		resolvePreset,
		type VoiceOrbProps,
		type VoiceOrbState,
		type VoiceOrbType
	} from '@runeglow/svelte/voice-ring';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { createMicInput } from '#lib/demos/voice-glow/micInput.svelte.ts';
	import { htmlFile, openTag, reactFile, sections, svelteFile, vueFile } from '#lib/demos/voice-glow/snippets.ts';
	import { MIC_STATUS, demoGetter } from '#lib/demos/voice-glow/voice.ts';
	import { COMPONENTS, FRAMEWORKS, attrs, expr, options, perFramework, type Framework, type PropValue, type Props } from '#lib/code.ts';
	import { SITE } from '#lib/site.ts';
	import { KNOBS, LEAN_KEYS, ORB_TYPE, type Knob, type Pick } from './knobs.ts';

	type Source = 'demo' | 'mic' | 'manual';
	type Theme = 'dark' | 'light' | 'auto';
	type Emotion = 'off' | 'positive' | 'negative' | 'calm';
	type Accent = 'off' | 'green' | 'red' | 'blue';
	type Direction = 'off' | 'manual' | 'sway';
	type LeanKey = (typeof LEAN_KEYS)[number]['key'];

	const TYPES: { value: Pick; label: string }[] = [
		{ value: 'ring', label: 'Ring' },
		{ value: 'mono', label: 'Mono' },
		{ value: 'orbit', label: 'Orbit' },
		{ value: 'sash', label: 'Sash' },
		{ value: 'signal', label: 'Signal' },
		{ value: 'swell', label: 'Swell' },
		{ value: 'pixel', label: 'Pixel' }
	];
	const STATES: { value: VoiceOrbState; label: string }[] = [
		{ value: 'idle', label: 'Idle' },
		{ value: 'listening', label: 'Listening' },
		{ value: 'speaking', label: 'Speaking' },
		{ value: 'processing', label: 'Processing' }
	];
	const SOURCES: { value: Source; label: string }[] = [
		{ value: 'demo', label: 'Demo voice' },
		{ value: 'mic', label: 'Microphone' },
		{ value: 'manual', label: 'Manual' }
	];
	const THEMES: { value: Theme; label: string }[] = [
		{ value: 'dark', label: 'Dark' },
		{ value: 'light', label: 'Light' },
		{ value: 'auto', label: 'Auto' }
	];
	const EMOTIONS: { value: Emotion; label: string; paint?: string }[] = [
		{ value: 'off', label: 'Off' },
		{ value: 'positive', label: 'Positive', paint: '#5ce096' },
		{ value: 'negative', label: 'Negative', paint: '#ff6868' },
		{ value: 'calm', label: 'Calm', paint: '#68a2ff' }
	];
	const ACCENTS: { value: Accent; label: string; paint?: string }[] = [
		{ value: 'off', label: 'Off' },
		{ value: 'green', label: 'Green', paint: '#5ce096' },
		{ value: 'red', label: 'Red', paint: '#ff6868' },
		{ value: 'blue', label: 'Blue', paint: '#68a2ff' }
	];
	const DIRECTIONS: { value: Direction; label: string }[] = [
		{ value: 'off', label: 'Off' },
		{ value: 'manual', label: 'Manual' },
		{ value: 'sway', label: 'Sway' }
	];
	const SWATCHES = [
		{ value: '#ffb86b', label: 'Amber' },
		{ value: '#ff6f91', label: 'Rose' },
		{ value: '#9180ff', label: 'Violet' },
		{ value: '#6bd0ff', label: 'Sky' },
		{ value: '#5ce096', label: 'Green' },
		{ value: '#ffffff', label: 'White' }
	];
	const EMOTION_HEX: Record<Exclude<Emotion, 'off'>, string> = {
		positive: '#5ce096',
		negative: '#ff6868',
		calm: '#68a2ff'
	};

	const num = (v: number) => String(+v.toFixed(3));
	const pct = (v: number) => `${Math.round(v * 100)}%`;
	const times = (v: number) => `${num(v)}×`;
	const ms = (v: number) => `${Math.round(v * 1000)}ms`;
	const deg = (v: number) => `${v}°`;

	const fresh = () => ({
		pick: 'ring' as Pick,
		state: 'listening' as VoiceOrbState,
		source: 'demo' as Source,
		manual: 60,
		theme: 'dark' as Theme,
		paused: false,
		size: 240,
		speed: 1,
		sensitivity: 0.85,
		threshold: 0.04,
		attack: null as number | null,
		release: 0.32,
		idle: 0.1,
		calm: 0.4,
		voiceSpeed: null as number | null,
		dots: 1,
		dotSize: null as number | null,
		/* Only the knobs that were moved, under "ring.rings", "mono.rings"…:
		   each type keeps its own as the playground switches between them. */
		knobs: {} as Record<string, number>,
		emotion: 'off' as Emotion,
		emotionColor: null as string | null,
		accent: 'off' as Accent,
		saturation: 2,
		neutral: 1,
		colorBrightness: 1.02,
		colorHue: 0,
		gradientAngle: 99,
		gradientSpin: 12,
		gradientStart: 0.1,
		gradientWidth: 0.6,
		tint: null as string | null,
		direction: 'off' as Direction,
		from: 0.6,
		lean: {} as Partial<Record<LeanKey, number>>,
		margin: null as number | null,
		bend: false,
		bendStrength: 0.55
	});

	let s = $state(fresh());

	const orb = $derived<VoiceOrbType>(ORB_TYPE[s.pick]);
	const isRing = $derived(s.pick === 'ring' || s.pick === 'mono');
	/* The light and tube types carry their own colour; the ink types take a
	   gradient into an accent or an emotion. */
	const isInk = $derived(!isRing);
	const preset = $derived(PRESETS[orb]);
	const groups = $derived(KNOBS[s.pick]);

	const mic = createMicInput();
	/* Choosing Microphone starts listening right away: the click is the user
	   gesture browsers require. Leaving it releases the device. */
	function chooseSource(next: Source) {
		s.source = next;
		if (next === 'mic') void mic.start();
		else mic.stop();
	}

	/* The bend only shows while nothing else moves the ring, so turning it on
	   from Listening or Speaking moves the playground to Idle. */
	function chooseBend(on: boolean) {
		s.bend = on;
		if (on && s.state !== 'idle' && s.state !== 'processing') s.state = 'idle';
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

	/* Per-type defaults: what the library uses when the prop is left unset. */
	const attackDef = $derived(preset.attack ?? 0.06);
	const voiceSpeedDef = $derived(preset.voiceSpeed ?? 1);
	const dotSizeDef = $derived(preset.dotSize ?? 1);
	const marginDef = $derived(preset.margin ?? 32);
	const leanDef = (k: LeanKey) => preset.lean?.[k] ?? LEAN_KEYS.find((l) => l.key === k)!.def;

	/* The knobs as the type resolves them at this size and density, so a
	   count that scales with size shows the number actually drawn. */
	const resolved = $derived(resolvePreset(orb, s.size, s.dots, s.dotSize ?? dotSizeDef).opts);
	const knobDef = (k: Knob) => resolved[k.key] ?? k.def;
	const knobValue = (k: Knob) => s.knobs[`${s.pick}.${k.key}`] ?? knobDef(k);
	const opts = $derived.by(() => {
		const prefix = `${s.pick}.`;
		const moved = Object.entries(s.knobs).filter(([k]) => k.startsWith(prefix));
		return moved.length ? Object.fromEntries(moved.map(([k, v]) => [k.slice(prefix.length), v])) : undefined;
	});

	const hexToTint = (hex: string) => {
		const v = parseInt(hex.slice(1), 16);
		return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
	};
	const emotionColors = $derived(
		s.emotion !== 'off' && s.emotionColor ? { [s.emotion]: hexToTint(s.emotionColor) } : undefined
	);

	/* A voice that walks from one side to the other and back. */
	const sway = () => Math.sin(performance.now() / 1600);

	/* Every prop that differs from the library's defaults, apart from the
	   type, the state and the source. The stage is rendered from this object. */
	const overrides = $derived.by(() => {
		const o: Record<string, unknown> = {};
		const put = (key: string, value: unknown, def: unknown) => {
			if (value != null && value !== def) o[key] = value;
		};
		put('size', s.size, 160);
		put('speed', s.speed, 1);
		put('sensitivity', s.sensitivity, 0.85);
		put('threshold', s.threshold, 0.04);
		put('attack', s.attack, attackDef);
		put('release', s.release, 0.32);
		put('idle', s.idle, 0.1);
		put('calm', s.calm, 0.4);
		put('voiceSpeed', s.voiceSpeed, voiceSpeedDef);
		put('dots', s.dots, 1);
		if (isInk) put('dotSize', s.dotSize, dotSizeDef);
		if (opts) o.opts = opts;
		if (s.emotion !== 'off') o.emotion = s.emotion;
		if (emotionColors) o.emotionColors = emotionColors;
		if (isInk) {
			if (s.accent !== 'off') o.accent = s.accent;
			put('saturation', s.saturation, 2);
			put('neutral', s.neutral, 1);
			put('colorBrightness', s.colorBrightness, 1.02);
			put('colorHue', s.colorHue, 0);
			put('gradientAngle', s.gradientAngle, 99);
			put('gradientSpin', s.gradientSpin, 12);
			put('gradientStart', s.gradientStart, 0.1);
			put('gradientWidth', s.gradientWidth, 0.6);
			if (s.tint) o.color = s.tint;
		}
		if (s.direction !== 'off') {
			for (const l of LEAN_KEYS) put(l.prop, s.lean[l.key], leanDef(l.key));
			put('directionMargin', s.margin, marginDef);
		}
		if (s.bend) o.hoverBend = s.bendStrength === 0.55 ? true : s.bendStrength;
		if (s.theme === 'light') o.theme = 'light';
		return o;
	});

	const modified = $derived.by(() => {
		const d = fresh();
		let n = Object.keys(overrides).filter((k) => k !== 'size' && k !== 'opts').length;
		if (s.size !== d.size) n++;
		n += Object.keys(s.knobs).length;
		if (s.pick !== d.pick) n++;
		if (s.state !== d.state) n++;
		if (s.source !== d.source) n++;
		if (s.source === 'manual' && s.manual !== d.manual) n++;
		if (s.direction !== d.direction) n++;
		if (s.theme === 'auto') n++;
		return n;
	});
	function reset() {
		mic.stop();
		s = fresh();
	}

	/* The overrides as the code shows them: every number rounded, the knobs' too. */
	const rounded = (v: unknown): PropValue =>
		typeof v === 'number' ? +v.toFixed(3)
		: v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, rounded(w)]))
		: (v as PropValue);
	const shown = $derived<Props>(Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, rounded(v)])));

	const LEVEL_NOTE = 'A number from 0 to 1, or a function returning one, called every frame.';
	const SIDE_NOTE = 'The side the voice comes from, -1 left to 1 right: from your own stereo or diarised input.';
	const SWAY = '() => Math.sin(performance.now() / 1600)';

	const name = $derived(isRing ? 'VoiceRing' : 'VoiceOrb');
	const snippet = $derived(
		perFramework((fw) => {
			const info = COMPONENTS[name];
			const from = `'${FRAMEWORKS[fw].pkg}/voice-ring'`;
			const source = s.source;
			const level = num(s.manual / 100);
			const side = num(s.from);
			/* the type first (a ring's default is left out), then the state, then every override */
			const lead: Props = { type: s.pick === 'ring' ? undefined : s.pick, state: s.state };

			if (fw === 'elements') {
				/* text goes in attributes; a stream and a function are set as properties */
				const it = isRing ? 'ring' : 'orb';
				const list = attrs(fw, { ...lead, ...shown });
				if (source === 'manual') list.push(`level="${level}"`);
				if (s.direction === 'manual') list.push(`direction="${side}"`);
				const scripted = source !== 'manual' || s.direction === 'sway';
				const script = sections(
					[source === 'mic' ? `import { createMicrophone } from ${from};` : `import ${from};`],
					scripted ? [`const ${it} = document.querySelector('${info.element}');`, ...(source === 'mic' ? ['const mic = createMicrophone();'] : [])] : [],
					source === 'mic'
						? [
								'// A stream is a property: no attribute can carry it.',
								`mic.subscribe(() => (${it}.stream = mic.stream));`,
								"document.querySelector('#listen').addEventListener('click', mic.start);"
							]
						: source === 'demo'
							? [`// Your own level. ${LEVEL_NOTE}`, '// A function is a property: no attribute can carry it.', `${it}.level = () => meter.level;`]
							: [],
					s.direction === 'sway' ? ['// Called every frame: -1 left to 1 right.', `${it}.direction = ${SWAY};`] : []
				);
				const after = source === 'mic' ? '\n<button id="listen">Listen</button>' : '';
				return htmlFile(script, `${s.direction === 'manual' ? `<!-- direction: ${SIDE_NOTE[0].toLowerCase()}${SIDE_NOTE.slice(1)} -->\n` : ''}${openTag(info.element, list, false, 3)}</${info.element}>${after}`);
			}

			if (fw === 'vanilla') {
				const it = isRing ? 'ring' : 'orb';
				const opts = options({
					...lead,
					...shown,
					...(source === 'manual' ? { level: +level } : source === 'demo' ? { level: expr('() => meter.level') } : {}),
					...(s.direction === 'manual' ? { direction: +side } : s.direction === 'sway' ? { direction: expr('side') } : {})
				});
				return sections(
					[`import { ${info.mount}${source === 'mic' ? ', createMicrophone' : ''} } from ${from};`],
					s.direction === 'sway' ? ['// Called every frame: -1 left to 1 right.', `const side = ${SWAY};`] : [],
					[
						'// makes its canvas inside #assistant',
						...(source === 'demo' ? [`// level is yours to supply. ${LEVEL_NOTE}`] : []),
						...(s.direction === 'manual' ? [`// direction: ${SIDE_NOTE[0].toLowerCase()}${SIDE_NOTE.slice(1)}`] : []),
						`const ${it} = ${info.mount}(document.querySelector('#assistant'), ${opts});`,
						...(source === 'mic' ? ['const mic = createMicrophone();'] : [])
					],
					source === 'mic'
						? [`mic.subscribe(() => ${it}.update({ stream: mic.stream }));`, "document.querySelector('#listen').addEventListener('click', mic.start);"]
						: []
				);
			}

			/* a component: the source and the direction come after every override */
			const bind = (key: string, value: string) => (fw === 'vue' ? `:${key}="${value}"` : `${key}={${value}}`);
			const list = attrs(fw, { ...lead, ...shown });
			list.push(
				source === 'mic' ? bind('stream', 'mic.stream')
				: source === 'manual' ? bind('level', level)
				: fw === 'svelte' ? '{level}'
				: bind('level', 'level')
			);
			if (s.direction === 'manual') list.push(bind('direction', side));
			else if (s.direction === 'sway') list.push(bind('direction', 'side'));

			const names = `import { ${name}${source === 'mic' ? ', useMicrophone' : ''} } from ${from};`;
			const hook = source === 'mic' ? ['const mic = useMicrophone();'] : [];
			const sideNote = s.direction === 'manual' ? [`// ${SIDE_NOTE}`] : [];
			const sideFn = s.direction === 'sway' ? ['// Called every frame: -1 left to 1 right.', `const side = ${SWAY};`] : [];
			const ring = openTag(name, list, true, 3);

			if (fw === 'react') {
				const notes = [
					...(source === 'demo' ? [`// level: ${LEVEL_NOTE[0].toLowerCase()}${LEVEL_NOTE.slice(1)}`] : []),
					...(s.direction === 'manual' ? [`// direction: ${SIDE_NOTE[0].toLowerCase()}${SIDE_NOTE.slice(1)}`] : [])
				];
				return reactFile({
					top: sections([names], sideFn),
					note: notes.join('\n') || undefined,
					params: source === 'demo' ? 'level' : undefined,
					body: hook.join('\n'),
					markup: source === 'mic' ? [ring, '<button onClick={mic.start}>Listen</button>'] : ring
				});
			}
			const taken =
				source !== 'demo' ? []
				: [`// ${LEVEL_NOTE}`, fw === 'svelte' ? 'let { level } = $props();' : "defineProps(['level']);"];
			const script = sections([names], hook, taken, sideNote, sideFn);
			if (fw === 'svelte') return svelteFile(script, `${ring}${source === 'mic' ? '\n<button onclick={mic.start}>Listen</button>' : ''}`);
			return vueFile(script, `${ring}${source === 'mic' ? '\n<button @click="mic.start">Listen</button>' : ''}`);
		})
	);

	/* the steps of the prompt that are worded for the framework */
	const STEPS: Record<Framework, { import: string; place: string; feed: string; notes: string[] }> = {
		svelte: {
			import: `Import it: import { VoiceRing, VoiceOrb, useMicrophone } from '${FRAMEWORKS.svelte.pkg}/voice-ring'`,
			place: 'It renders one <canvas> of size × size CSS px.',
			feed: `Either stream={mic.stream} from useMicrophone() (call mic.start from a
   click, so the browser allows audio), analyser={node} for audio you already play, or
   level={…} with a number from 0 to 1 or a function returning one.`,
			notes: []
		},
		react: {
			import: `Import it: import { VoiceRing, VoiceOrb, useMicrophone } from '${FRAMEWORKS.react.pkg}/voice-ring'`,
			place: `It renders one <canvas> of size × size CSS px; className, style
   and a ref go on that canvas.`,
			feed: `Either stream={mic.stream} from the useMicrophone() hook (call
   mic.start from a click, so the browser allows audio), analyser={node} for audio you
   already play, or level={…} with a number from 0 to 1 or a function returning one.`,
			notes: []
		},
		vue: {
			import: `Import it: import { VoiceRing, VoiceOrb, useMicrophone } from '${FRAMEWORKS.vue.pkg}/voice-ring'`,
			place: `It renders one <canvas> of size × size CSS px; class and style
   fall through to that canvas.`,
			feed: `Either :stream="mic.stream" from useMicrophone() (call it in setup,
   read mic.stream from the object it returns without destructuring, and call mic.start
   from a click, so the browser allows audio), :analyser="node" for audio you already play,
   or :level="…" with a number from 0 to 1 or a function returning one.`,
			notes: ['In a template, write the props in kebab-case: voiceSpeed is voice-speed, hoverBend is hover-bend.']
		},
		elements: {
			import: `Import it once, which registers the <runeglow-voice-ring> and <runeglow-voice-orb> tags:
   import '${FRAMEWORKS.elements.pkg}/voice-ring'
   The microphone helper is in the same module: import { createMicrophone } from '${FRAMEWORKS.elements.pkg}/voice-ring'`,
			place: `The element is an inline box of size × size CSS px, with its
   canvas in a shadow root.`,
			feed: `Either set the element's stream property from createMicrophone(), as
   in mic.subscribe(() => (ring.stream = mic.stream)), calling mic.start from a click so the
   browser allows audio; set its analyser property for audio you already play; or give it a
   level, the attribute level="0.6" for a number from 0 to 1, or the level property for a
   function returning one.`,
			notes: [
				`Every option is a property of the element in camelCase and, where text can say it, an
  attribute in kebab-case: voiceSpeed is voice-speed. level and direction are written as
  numbers, hover-bend alone or as a number, emotion-colors and opts as JSON.`,
				`stream, analyser, directionBounds, a function for level or direction, onLevel, and frame on
  <runeglow-voice-orb>, are properties only.`,
				'The label attribute sets the accessible name, in place of the state.'
			]
		},
		vanilla: {
			import: `Import it: import { mountVoiceRing, mountVoiceOrb, createMicrophone } from '${FRAMEWORKS.vanilla.pkg}/voice-ring'`,
			place: `mountVoiceRing(parent, options) and mountVoiceOrb(parent, options)
   make one <canvas> of size × size CSS px inside the parent they are given.`,
			feed: `Either ring.update({ stream: mic.stream }) from createMicrophone(),
   inside mic.subscribe(…), calling mic.start from a click so the browser allows audio; the
   analyser option for audio you already play; or the level option, a number from 0 to 1 or a
   function returning one.`,
			notes: [
				`Both functions return { element, update, destroy }: the canvas, update(options), which
  changes some options and keeps the rest, and destroy(), which stops it and removes the canvas.`,
				'The class option sets the canvas’s class, and label its accessible name, in place of the state.'
			]
		}
	};

	const prompt = $derived(
		perFramework((fw, info) => {
			const step = STEPS[fw];
			/* what the two are called in this framework, and what an option is called */
			const ring = fw === 'elements' ? '<runeglow-voice-ring>' : fw === 'vanilla' ? 'mountVoiceRing' : 'VoiceRing';
			const orb = fw === 'elements' ? '<runeglow-voice-orb>' : fw === 'vanilla' ? 'mountVoiceOrb' : 'VoiceOrb';
			const word = fw === 'elements' || fw === 'vanilla' ? 'options' : 'props';
			return `Add the Voice ring from ${SITE.name} to this ${info.app}: a ring of light, drawn on a canvas,
that bends with the level of a voice.

1. Install the package with the project's package manager, for example: pnpm add ${info.pkg}
2. ${step.import}
3. Place it where the voice lives. ${step.place}
4. Feed it sound. ${step.feed}
5. Set state to follow the conversation: idle, listening, speaking or processing.
6. Start from this configuration:

${snippet[fw]}

Parameter vocabulary, for later changes:
- ${ring} type: ring (a glassy spectrum) or mono (grey tube). ${orb} type: orbit, sash,
  signal, swell, pixel, aura, aura-mono.
- state: idle and processing ignore the source; listening and speaking follow it.
- sensitivity, threshold, attack, release shape the response. idle is the breathing kept
  under the voice, calm the waiting pace, speed and voiceSpeed the motion.
- emotion: positive, negative or calm tints it; emotionColors overrides a colour.
- direction: -1 left to 1 right, a number or a function. The direction… ${word} tune the lean.
- hoverBend: bends toward the cursor while idle or processing.
- opts: the type's own knobs, for example { rings: 8, halo: 0.7 }.
- accent, saturation, neutral, gradientAngle and the other colour ${word} apply to the ink
  types (orbit, sash, signal, swell, pixel), not to ring or mono.

Notes:
${step.notes.map((note) => `- ${note}\n`).join('')}- Nothing is recorded or played back: the stream is only analysed.
- Under prefers-reduced-motion it holds a still frame.`;
		})
	);

	const micNote = $derived.by(() => {
		if (s.source !== 'mic') return '';
		if (mic.state !== 'live' && mic.switchedFrom) return 'Switching input…';
		if (mic.state !== 'live') return MIC_STATUS[mic.state];
		const name = mic.label || 'the microphone';
		if (mic.silent) return `No sound is coming from ${name}. Check that it is connected and not muted.`;
		if (mic.switchedFrom) return `Listening on ${name}. ${mic.switchedFrom} was silent.`;
		return `Listening on ${name}.`;
	});
	const quiet = $derived(s.state === 'idle' || s.state === 'processing');

	let bounds = $state<HTMLDivElement | null>(null);

	/* What the stage passes on top of the overrides. */
	const live = $derived({
		state: s.state,
		stream: s.source === 'mic' ? mic.stream : null,
		level: s.source === 'demo' ? demoGetter : s.source === 'manual' ? s.manual / 100 : 0,
		direction: s.direction === 'manual' ? s.from : s.direction === 'sway' ? sway : undefined,
		directionBounds: bounds,
		paused: s.paused,
		theme: stageTheme
	});
</script>

{#snippet knob(k: Knob)}
	<Slider
		label={k.label}
		value={knobValue(k)}
		min={k.min}
		max={k.max}
		step={k.step}
		format={k.unit === 'x' ? times : k.unit === 'deg' ? deg : num}
		modified={s.knobs[`${s.pick}.${k.key}`] != null}
		oninput={(v) => (s.knobs[`${s.pick}.${k.key}`] = v)}
		onreset={() => delete s.knobs[`${s.pick}.${k.key}`]}
	/>
{/snippet}

<PlaygroundShell
	label="Voice ring controls"
	{stageTheme}
	clipStage
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
		<!-- The lean stops at this box's edges, and it clips what reaches past. -->
		<div class="bounds" bind:this={bounds}>
			<!-- One component for every type: VoiceRing is VoiceOrb with its type fixed to
			     aura or aura-mono, so the ring drawn here is the ring VoiceRing draws. -->
			<VoiceOrb {...overrides as VoiceOrbProps} {...live} type={orb} />
		</div>
	{/snippet}
	{#snippet controls()}
		<PanelGroup>
			<Segmented label="Type" options={TYPES} bind:value={s.pick} />
			<Segmented label="State" options={STATES} bind:value={s.state} />
			<Segmented label="Source" options={SOURCES} value={s.source} onchange={chooseSource} />
			{#if quiet}
				<p class="hint">Idle and Processing ignore the source. Choose Listening or Speaking to hear it.</p>
			{/if}
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
				<Slider label="Level" value={s.manual} min={0} max={100} format={(v) => `${v}%`} modified={s.manual !== 60} oninput={(v) => (s.manual = v)} onreset={() => (s.manual = 60)} />
			{/if}
			<Segmented label="Theme" options={THEMES} bind:value={s.theme} />
			<Slider label="Size" value={s.size} min={64} max={320} step={4} format={(v) => `${v}px`} modified={s.size !== 240} oninput={(v) => (s.size = v)} onreset={() => (s.size = 240)} />
		</PanelGroup>

		<PanelGroup title="Motion">
			<Slider label="Speed" value={s.speed} min={0.25} max={3} step={0.05} format={times} modified={s.speed !== 1} oninput={(v) => (s.speed = v)} onreset={() => (s.speed = 1)} />
			<Slider label="Voice speed" value={s.voiceSpeed ?? voiceSpeedDef} min={0} max={3} step={0.05} format={times} modified={s.voiceSpeed != null} oninput={(v) => (s.voiceSpeed = v)} onreset={() => (s.voiceSpeed = null)} hint="How much a voice speeds the motion up." />
			<Slider label="Calm" value={s.calm} min={0} max={1} step={0.05} format={times} modified={s.calm !== 0.4} oninput={(v) => (s.calm = v)} onreset={() => (s.calm = 0.4)} hint="The pace while it waits." />
			<Slider label="Idle breathing" value={s.idle} min={0} max={0.5} step={0.01} format={num} modified={s.idle !== 0.1} oninput={(v) => (s.idle = v)} onreset={() => (s.idle = 0.1)} />
		</PanelGroup>

		<PanelGroup title="Response">
			<Slider label="Sensitivity" value={s.sensitivity} min={0.25} max={4} step={0.05} format={times} modified={s.sensitivity !== 0.85} oninput={(v) => (s.sensitivity = v)} onreset={() => (s.sensitivity = 0.85)} />
			<Slider label="Threshold" value={s.threshold} min={0} max={0.3} step={0.005} format={num} modified={s.threshold !== 0.04} oninput={(v) => (s.threshold = v)} onreset={() => (s.threshold = 0.04)} />
			<Slider label="Attack" value={s.attack ?? attackDef} min={0} max={0.5} step={0.005} format={ms} modified={s.attack != null} oninput={(v) => (s.attack = v)} onreset={() => (s.attack = null)} />
			<Slider label="Release" value={s.release} min={0.02} max={1.5} step={0.01} format={ms} modified={s.release !== 0.32} oninput={(v) => (s.release = v)} onreset={() => (s.release = 0.32)} />
		</PanelGroup>

		{#each groups as group (group.title)}
			<PanelGroup title={group.title}>
				{#each group.items as k (`${s.pick}.${k.key}`)}
					{@render knob(k)}
				{/each}
			</PanelGroup>
		{/each}

		<PanelGroup title="Detail">
			<Slider label="Density" value={s.dots} min={0.3} max={2} step={0.05} format={times} modified={s.dots !== 1} oninput={(v) => (s.dots = v)} onreset={() => (s.dots = 1)} hint="Multiplies the type's dot and segment counts." />
			{#if isInk}
				<Slider label="Mark size" value={s.dotSize ?? dotSizeDef} min={0.3} max={2} step={0.05} format={times} modified={s.dotSize != null} oninput={(v) => (s.dotSize = v)} onreset={() => (s.dotSize = null)} />
			{/if}
		</PanelGroup>

		<PanelGroup title="Emotion">
			<Segmented label="Emotion" options={EMOTIONS} bind:value={s.emotion} />
			{#if s.emotion !== 'off'}
				<SwatchRow label="Its colour" options={SWATCHES} bind:value={s.emotionColor} autoLabel="Built in" fallback={EMOTION_HEX[s.emotion]} />
			{/if}
			<p class="hint">
				{isInk
					? 'The colour washes in as a gradient. Detecting the emotion is up to your app.'
					: 'Shifts the ring toward the colour. Detecting the emotion is up to your app.'}
			</p>
		</PanelGroup>

		{#if isInk}
			<PanelGroup title="Colour">
				<Segmented label="Accent" options={ACCENTS} bind:value={s.accent} />
				<SwatchRow label="Ink tint" options={SWATCHES} bind:value={s.tint} autoLabel="Neutral" />
				{#if s.accent !== 'off' || s.emotion !== 'off'}
					<Slider label="Saturation" value={s.saturation} min={0} max={2} step={0.05} format={num} modified={s.saturation !== 2} oninput={(v) => (s.saturation = v)} onreset={() => (s.saturation = 2)} />
					<Slider label="Neutral start" value={s.neutral} min={0} max={1} step={0.05} format={pct} modified={s.neutral !== 1} oninput={(v) => (s.neutral = v)} onreset={() => (s.neutral = 1)} />
					<Slider label="Brightness" value={s.colorBrightness} min={0.5} max={1.6} step={0.02} format={times} modified={s.colorBrightness !== 1.02} oninput={(v) => (s.colorBrightness = v)} onreset={() => (s.colorBrightness = 1.02)} />
					<Slider label="Hue turn" value={s.colorHue} min={-180} max={180} step={5} format={deg} modified={s.colorHue !== 0} oninput={(v) => (s.colorHue = v)} onreset={() => (s.colorHue = 0)} />
					<Slider label="Gradient angle" value={s.gradientAngle} min={0} max={360} step={1} format={deg} modified={s.gradientAngle !== 99} oninput={(v) => (s.gradientAngle = v)} onreset={() => (s.gradientAngle = 99)} />
					<Slider label="Gradient spin" value={s.gradientSpin} min={0} max={90} step={1} format={(v) => `${v}°/s`} modified={s.gradientSpin !== 12} oninput={(v) => (s.gradientSpin = v)} onreset={() => (s.gradientSpin = 12)} />
					<Slider label="Gradient start" value={s.gradientStart} min={0} max={1} step={0.01} format={pct} modified={s.gradientStart !== 0.1} oninput={(v) => (s.gradientStart = v)} onreset={() => (s.gradientStart = 0.1)} />
					<Slider label="Gradient width" value={s.gradientWidth} min={0.05} max={1} step={0.01} format={pct} modified={s.gradientWidth !== 0.6} oninput={(v) => (s.gradientWidth = v)} onreset={() => (s.gradientWidth = 0.6)} />
				{:else}
					<p class="hint">Pick an accent or an emotion to colour the ink.</p>
				{/if}
			</PanelGroup>
		{/if}

		<PanelGroup title="Direction">
			<Segmented label="Voice from" options={DIRECTIONS} bind:value={s.direction} />
			{#if s.direction === 'manual'}
				<Slider
					label="Side"
					value={s.from}
					min={-1}
					max={1}
					step={0.05}
					format={(v) => (Math.abs(v) < 0.05 ? 'Ahead' : `${v < 0 ? 'Left' : 'Right'} ${Math.round(Math.abs(v) * 100)}%`)}
					modified={s.from !== 0.6}
					oninput={(v) => (s.from = v)}
					onreset={() => (s.from = 0.6)}
				/>
			{/if}
			{#if s.direction !== 'off'}
				{#each LEAN_KEYS as l (l.key)}
					<Slider
						label={l.label}
						value={s.lean[l.key] ?? leanDef(l.key)}
						min={0}
						max={l.max}
						step={0.01}
						format={num}
						modified={s.lean[l.key] != null}
						oninput={(v) => (s.lean[l.key] = v)}
						onreset={() => delete s.lean[l.key]}
					/>
				{/each}
				<Slider label="Edge margin" value={s.margin ?? marginDef} min={0} max={80} format={(v) => `${v}px`} modified={s.margin != null} oninput={(v) => (s.margin = v)} onreset={() => (s.margin = null)} />
				{#if quiet}
					<p class="hint">It leans while a voice is heard: choose Listening or Speaking.</p>
				{/if}
			{:else}
				<p class="hint">Leans toward the side the voice comes from. A browser microphone is mono, so the side is yours to supply.</p>
			{/if}
		</PanelGroup>

		<PanelGroup title="Hover">
			<Toggle
				label="Hover bend"
				hint="Move the cursor to the ring's rim and it reaches for it. Works while Idle or Processing, on desktop."
				checked={s.bend}
				onchange={chooseBend}
			/>
			{#if s.bend}
				<Slider label="Strength" value={s.bendStrength} min={0.05} max={1} step={0.05} format={num} modified={s.bendStrength !== 0.55} oninput={(v) => (s.bendStrength = v)} onreset={() => (s.bendStrength = 0.55)} />
				{#if !quiet}
					<p class="hint warn">Off while Listening or Speaking, where the voice moves the ring. Choose Idle or Processing.</p>
				{/if}
			{/if}
		</PanelGroup>
	{/snippet}
</PlaygroundShell>

<style>
	.bounds {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		overflow: hidden;
		border-radius: inherit;
	}
	.hint {
		font-size: 12px;
		line-height: 1.5;
		color: var(--fg-3);
	}
	.hint.warn {
		color: var(--amber);
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
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.note[data-theme='light'] {
		color: #7a7a7a;
	}
</style>
