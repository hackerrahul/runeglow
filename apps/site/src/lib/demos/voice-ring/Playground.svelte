<script lang="ts">
	import {
		PRESETS,
		VoiceOrb,
		resolvePreset,
		type VoiceOrbProps,
		type VoiceOrbState,
		type VoiceOrbType
	} from 'runeglow/voice-ring';
	import PanelGroup from '#lib/components/PanelGroup.svelte';
	import PlaygroundShell from '#lib/components/PlaygroundShell.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import Slider from '#lib/components/Slider.svelte';
	import SwatchRow from '#lib/components/SwatchRow.svelte';
	import Toggle from '#lib/components/Toggle.svelte';
	import { createMicInput } from '#lib/demos/voice-glow/micInput.svelte.ts';
	import { MIC_STATUS, demoGetter } from '#lib/demos/voice-glow/voice.ts';
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

	const attr = (key: string, value: unknown): string => {
		if (value === true) return key;
		if (typeof value === 'string') return `${key}="${value}"`;
		if (key === 'opts') {
			const body = Object.entries(value as Record<string, number>)
				.map(([k, v]) => `${k}: ${num(v)}`)
				.join(', ');
			return `opts={{ ${body} }}`;
		}
		if (key === 'emotionColors') {
			const body = Object.entries(value as Record<string, { r: number; g: number; b: number }>)
				.map(([k, v]) => `${k}: { r: ${v.r}, g: ${v.g}, b: ${v.b} }`)
				.join(', ');
			return `emotionColors={{ ${body} }}`;
		}
		return `${key}={${typeof value === 'number' ? num(value) : value}}`;
	};

	const tag = $derived(isRing ? 'VoiceRing' : 'VoiceOrb');
	const snippet = $derived.by(() => {
		const p = Object.entries(overrides).map(([k, v]) => attr(k, v));
		p.unshift(`state="${s.state}"`);
		if (s.pick === 'mono') p.unshift('type="mono"');
		else if (!isRing) p.unshift(`type="${s.pick}"`);
		const lines = [`  import { ${tag}${s.source === 'mic' ? ', useMicrophone' : ''} } from '${SITE.pkg}/voice-ring';`];
		let after = '';
		if (s.source === 'mic') {
			lines.push('', '  const mic = useMicrophone();');
			p.push('stream={mic.stream}');
			after = '\n<button onclick={mic.start}>Listen</button>';
		} else if (s.source === 'manual') {
			p.push(`level={${num(s.manual / 100)}}`);
		} else {
			lines.push('', '  // A number from 0 to 1, or a function returning one, called every frame.', '  let { level } = $props();');
			p.push('{level}');
		}
		if (s.direction === 'manual') {
			lines.push('', '  // The side the voice comes from, -1 left to 1 right: from your own stereo or diarised input.');
			p.push(`direction={${num(s.from)}}`);
		} else if (s.direction === 'sway') {
			lines.push('', '  // Called every frame: -1 left to 1 right.', '  const side = () => Math.sin(performance.now() / 1600);');
			p.push('direction={side}');
		}
		const open = p.length <= 3 ? `<${tag} ${p.join(' ')} />` : `<${tag}\n  ${p.join('\n  ')}\n/>`;
		return `<script>\n${lines.join('\n')}\n<\/script>\n\n${open}${after}`;
	});

	const prompt = $derived(`Add the Voice ring from ${SITE.name} to this Svelte 5 app: a ring of light, drawn on a canvas,
that bends with the level of a voice.

1. Install the package with the project's package manager, for example: pnpm add ${SITE.pkg}
2. Import it: import { VoiceRing, VoiceOrb, useMicrophone } from '${SITE.pkg}/voice-ring'
3. Place it where the voice lives. It renders one <canvas> of size × size CSS px.
4. Feed it sound. Either stream={mic.stream} from useMicrophone() (call mic.start from a
   click, so the browser allows audio), analyser={node} for audio you already play, or
   level={…} with a number from 0 to 1 or a function returning one.
5. Set state to follow the conversation: idle, listening, speaking or processing.
6. Start from this configuration:

${snippet}

Parameter vocabulary, for later changes:
- VoiceRing type: ring (a glassy spectrum) or mono (grey tube). VoiceOrb type: orbit, sash,
  signal, swell, pixel, aura, aura-mono.
- state: idle and processing ignore the source; listening and speaking follow it.
- sensitivity, threshold, attack, release shape the response. idle is the breathing kept
  under the voice, calm the waiting pace, speed and voiceSpeed the motion.
- emotion: positive, negative or calm tints it; emotionColors overrides a colour.
- direction: -1 left to 1 right, a number or a function. The direction… props tune the lean.
- hoverBend: bends toward the cursor while idle or processing.
- opts: the type's own knobs, for example { rings: 8, halo: 0.7 }.
- accent, saturation, neutral, gradientAngle and the other colour props apply to the ink
  types (orbit, sash, signal, swell, pixel), not to ring or mono.

Notes:
- Nothing is recorded or played back: the stream is only analysed.
- Under prefers-reduced-motion it holds a still frame.`);

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
