<script lang="ts">
	import { VoiceBeam } from '@runeglow/svelte/voice-glow';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import Subject from '#lib/demos/border-beam/Subject.svelte';
	import PhoneScreen from '#lib/demos/voice-glow/PhoneScreen.svelte';
	import Playground from '#lib/demos/voice-glow/Playground.svelte';
	import RecordingPill from '#lib/demos/voice-glow/RecordingPill.svelte';
	import { createTranscript } from '#lib/demos/voice-glow/transcript.svelte.ts';
	import { micName } from '#lib/demos/voice-glow/snippets.ts';
	import { demoGetter, demoGetterLate } from '#lib/demos/voice-glow/voice.ts';
	import { perFramework, type Framework } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';
	import { SITE } from '#lib/site.ts';

	const transcript = createTranscript();

	/* The microphone is a hook in a framework and a plain object outside one,
	   and the beam takes its content each framework's own way, so these are
	   written out five times. */
	const importOnly = perFramework((fw, info) =>
		fw === 'elements' ? `// Importing it registers <runeglow-voice-beam>.\nimport { createMicrophone } from '${info.pkg}/voice-glow';`
		: fw === 'vanilla' ? `import { mountVoiceBeam, createMicrophone } from '${info.pkg}/voice-glow';`
		: `import { VoiceBeam, useMicrophone } from '${info.pkg}/voice-glow';`
	);

	const quickStart = perFramework((fw, info) => {
		const from = `'${info.pkg}/voice-glow'`;
		switch (fw) {
			case 'svelte':
				return `<script>
  import { VoiceBeam, useMicrophone } from ${from};

  const mic = useMicrophone();
<\/script>

<button onclick={mic.start}>Listen</button>

<VoiceBeam stream={mic.stream}>
  <ChatInput />
</VoiceBeam>`;
			case 'react':
				return `import { VoiceBeam, useMicrophone } from ${from};

export function Composer() {
  const mic = useMicrophone();

  return (
    <>
      <button onClick={mic.start}>Listen</button>

      <VoiceBeam stream={mic.stream}>
        <ChatInput />
      </VoiceBeam>
    </>
  );
}`;
			case 'vue':
				return `<script setup>
import { VoiceBeam, useMicrophone } from ${from};

const mic = useMicrophone();
<\/script>

<template>
  <button @click="mic.start">Listen</button>

  <VoiceBeam :stream="mic.stream">
    <ChatInput />
  </VoiceBeam>
</template>`;
			case 'elements':
				return `<script type="module">
  import { createMicrophone } from ${from};

  const beam = document.querySelector('runeglow-voice-beam');
  const mic = createMicrophone();

  // A stream is a property: no attribute can carry it.
  mic.subscribe(() => (beam.stream = mic.stream));
  document.querySelector('#listen').addEventListener('click', mic.start);
<\/script>

<button id="listen">Listen</button>

<runeglow-voice-beam>
  <div class="chat-input">…</div>
</runeglow-voice-beam>`;
			case 'vanilla':
				return `import { mountVoiceBeam, createMicrophone } from ${from};

// <div id="composer"><div class="chat-input">…</div></div>
// The beam is put on the wrapper, and glows along the bottom of the chat input inside.
const beam = mountVoiceBeam(document.querySelector('#composer'));
const mic = createMicrophone();

mic.subscribe(() => beam.update({ stream: mic.stream }));
document.querySelector('#listen').addEventListener('click', mic.start);`;
		}
	});

	const manual = perFramework((fw, info) => {
		const from = `'${info.pkg}/voice-glow'`;
		switch (fw) {
			case 'svelte':
				return `<script>
  import { VoiceBeam } from ${from};

  // From your own audio pipeline, a text-to-speech player, anything.
  let { level } = $props();
<\/script>

<VoiceBeam type="pill" {level} colorVariant="ocean">
  <RecordingPill />
</VoiceBeam>`;
			case 'react':
				return `import { VoiceBeam } from ${from};

// level: from your own audio pipeline, a text-to-speech player, anything.
export function Recorder({ level }) {
  return (
    <VoiceBeam type="pill" level={level} colorVariant="ocean">
      <RecordingPill />
    </VoiceBeam>
  );
}`;
			case 'vue':
				return `<script setup>
import { VoiceBeam } from ${from};

// From your own audio pipeline, a text-to-speech player, anything.
defineProps(['level']);
<\/script>

<template>
  <VoiceBeam type="pill" :level="level" color-variant="ocean">
    <RecordingPill />
  </VoiceBeam>
</template>`;
			case 'elements':
				return `<script type="module">
  import ${from};

  const beam = document.querySelector('runeglow-voice-beam');

  // From your own audio pipeline, a text-to-speech player, anything.
  // A function is a property; a number can also be the attribute level="0.6".
  beam.level = () => meter.level;
<\/script>

<runeglow-voice-beam type="pill" color-variant="ocean">
  <div class="recording-pill">…</div>
</runeglow-voice-beam>`;
			case 'vanilla':
				return `import { mountVoiceBeam } from ${from};

// <div id="recorder"><div class="recording-pill">…</div></div>
const beam = mountVoiceBeam(document.querySelector('#recorder'), {
  type: 'pill',
  // From your own audio pipeline, a text-to-speech player, anything.
  level: () => meter.level,
  colorVariant: 'ocean'
});

// A number works too: update changes the options it is given and keeps the rest.
beam.update({ level: 0.6 });`;
		}
	});

	const status = perFramework((fw, info) => {
		const from = `'${info.pkg}/voice-glow'`;
		switch (fw) {
			case 'svelte':
				return `<script>
  import { VoiceBeam, useMicrophone } from ${from};

  const mic = useMicrophone();
<\/script>

{#if mic.state === 'denied'}
  <p>Microphone blocked. Allow it in the browser's site settings.</p>
{/if}

<VoiceBeam type="mobile" stream={mic.stream} active={mic.state === 'live'}>
  <VoiceScreen />
</VoiceBeam>`;
			case 'react':
				return `import { VoiceBeam, useMicrophone } from ${from};

export function VoiceMode() {
  const mic = useMicrophone();

  return (
    <>
      {mic.state === 'denied' && (
        <p>Microphone blocked. Allow it in the browser's site settings.</p>
      )}

      <VoiceBeam type="mobile" stream={mic.stream} active={mic.state === 'live'}>
        <VoiceScreen />
      </VoiceBeam>
    </>
  );
}`;
			case 'vue':
				return `<script setup>
import { VoiceBeam, useMicrophone } from ${from};

const mic = useMicrophone();
<\/script>

<template>
  <p v-if="mic.state === 'denied'">
    Microphone blocked. Allow it in the browser's site settings.
  </p>

  <VoiceBeam type="mobile" :stream="mic.stream" :active="mic.state === 'live'">
    <VoiceScreen />
  </VoiceBeam>
</template>`;
			case 'elements':
				return `<script type="module">
  import { createMicrophone } from ${from};

  const beam = document.querySelector('runeglow-voice-beam');
  const blocked = document.querySelector('#blocked');
  const mic = createMicrophone();

  // Called whenever the stream, the state or the error changes.
  mic.subscribe(() => {
    blocked.hidden = mic.state !== 'denied';
    beam.stream = mic.stream;
    beam.active = mic.state === 'live';
  });
<\/script>

<p id="blocked" hidden>Microphone blocked. Allow it in the browser's site settings.</p>

<runeglow-voice-beam type="mobile" active="false">
  <div class="voice-screen">…</div>
</runeglow-voice-beam>`;
			case 'vanilla':
				return `import { mountVoiceBeam, createMicrophone } from ${from};

// <div id="screen"><div class="voice-screen">…</div></div>
const beam = mountVoiceBeam(document.querySelector('#screen'), { type: 'mobile', active: false });
const blocked = document.querySelector('#blocked');
const mic = createMicrophone();

// Called whenever the stream, the state or the error changes.
mic.subscribe(() => {
  blocked.hidden = mic.state !== 'denied';
  beam.update({ stream: mic.stream, active: mic.state === 'live' });
});`;
		}
	});

	const props: PropRow[] = [
		{ name: 'type', type: "'default' | 'pill' | 'mobile'", default: "'default'", description: 'The host the glow is tuned for: a chat input, a small recording pill, or the bottom of a phone screen.' },
		{ name: 'stream', type: 'MediaStream | null', default: 'null', description: 'A live audio stream to listen to, usually mic.stream.' },
		{ name: 'level', type: 'number | (() => number)', default: '0', description: 'Drive the glow yourself, 0 to 1. A function is called every frame.' },
		{ name: 'sensitivity', type: 'number', default: '3.1', description: 'Gain on the incoming level.' },
		{ name: 'threshold', type: 'number', default: '0.015', description: 'Levels under this count as silence.' },
		{ name: 'attack', type: 'number', default: '0.325', description: 'Seconds the glow takes to rise.' },
		{ name: 'release', type: 'number', default: '0.86', description: 'Seconds the glow takes to fall.' },
		{ name: 'colorVariant', type: "'colorful' | 'mono' | 'ocean' | 'sunset' | 'forest' | 'candy' | 'ice' | 'gold'", default: "'colorful'", description: 'The palette.' },
		{ name: 'colors', type: 'string[]', description: 'Your own lobe colours, centre first then the pairs outward, up to seven.' },
		{ name: 'bandColors', type: '{ core?, above?, mid?, below? }', description: 'Colours of the band of light along the glow’s ceiling.' },
		{ name: 'theme', type: "'dark' | 'light' | 'auto'", default: "'dark'", description: 'Tunes the glow for the background it sits on.' },
		{ name: 'scale', type: 'number', default: 'per type', description: 'One multiplier on every pixel dimension of the effect.' },
		{ name: 'active', type: 'boolean', default: 'true', description: 'Fades the effect in and out.' },
		{ name: 'paused', type: 'boolean', default: 'false', description: 'Holds the current frame.' },
		{ name: 'strength', type: 'number', default: 'per type', description: 'Opacity of the effect layers, 0 to 1.' },
		{ name: 'borderRadius', type: 'number', default: 'auto', description: 'Corner radius in px. Omit it to read the first child’s.' },
		{ name: 'motion', type: 'VoiceBeamMotion | (() => VoiceBeamMotion)', description: '{ gather, offset, stretch, heldLevel, cornerFollow }. Gathers the glow into one beam you can move.' },
		{ name: 'css', type: 'string', description: 'Extra CSS appended to the generated sheet. {id} is replaced with the instance id.' },
		{ name: 'onLevel', type: '(level: number) => void', description: 'Called every frame with the smoothed level the glow is showing.' },
		{ name: 'onActivate, onDeactivate', type: '() => void', description: 'Called when a fade in or out finishes.' }
	];

	/* the wrapper, the content and what cannot be written as text, which each framework has its own way with */
	const reach: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'children', type: 'Snippet', description: 'The content the glow wraps: whatever is written inside the component.' },
			{ name: 'ref', type: 'HTMLDivElement | null', description: 'The wrapper element. Bindable with bind:ref.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and other attributes are forwarded to the wrapper.' }
		],
		react: [
			{ name: 'children', type: 'ReactNode', description: 'The content the glow wraps.' },
			{ name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Reaches the wrapper element.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'className, style, onClick and other attributes are forwarded to the wrapper.' }
		],
		vue: [
			{ name: 'default slot', type: 'slot', description: 'The content the glow wraps.' },
			{ name: 'template ref', type: '{ element }', description: 'A ref on the component gives the wrapper as element.' },
			{ name: 'attributes', type: 'fallthrough', description: 'class, style, @click and other attributes go on the wrapper.' },
			{ name: 'in a template', type: 'kebab-case', description: 'colorVariant is written color-variant. The three callbacks are props: bind them as :on-level, :on-activate and :on-deactivate, or listen with @level, @activate and @deactivate.' }
		],
		elements: [
			{ name: 'content', type: 'child elements', description: 'What is written inside the tag is what the glow wraps. The element is the wrapper itself, in the page’s own DOM with no shadow root, and it is a block.' },
			{ name: 'attributes', type: 'kebab-case', description: 'Every option is a property in camelCase and, where text can say it, an attribute: colorVariant is color-variant. colors, band-colors and motion are written as JSON, and a boolean that is off as bands="false".' },
			{ name: 'properties only', type: 'stream, functions', description: 'stream, a function for level or motion, onLevel, onActivate and onDeactivate cannot be attributes: set them from a script.' },
			{ name: 'activate, deactivate', type: 'Event', description: 'Fired on the element when a fade in or out finishes, as well as the two callbacks.' }
		],
		vanilla: [
			{ name: 'first argument', type: 'HTMLElement', description: 'An element the page already has: the wrapper round the content. The beam adds its layers and a stylesheet inside it, after the content.' },
			{ name: 'class', type: 'string', description: 'A class to add to the wrapper.' },
			{ name: 'returns', type: '{ element, update, destroy }', description: 'The wrapper; update(options) changes some options and keeps the rest; destroy() takes the beam off the wrapper, leaving it and its content.' }
		]
	};

	const shape: PropRow[] = [
		{ name: 'reach', type: 'number', default: 'per type', description: 'How far the glow rises with the voice.' },
		{ name: 'spread', type: 'number', default: 'per type', description: 'How much it widens as it rises.' },
		{ name: 'flow', type: 'number', default: 'per type', description: 'Sideways drift of the colours, px per second.' },
		{ name: 'idle', type: 'number', default: 'per type', description: 'How present the glow is in silence, 0 to 1.' },
		{ name: 'breatheDuration', type: 'number', default: '5.2', description: 'Seconds per idle breath.' },
		{ name: 'bands', type: 'boolean', default: 'true', description: 'Split the voice into low, mid and high, one per lobe pair.' },
		{ name: 'bend, bandStrength, bandWidth, bandPosition, bandCurve, bandSpread, bandSkew, bandOffset', type: 'number', default: 'per type', description: 'The band of light along the glow’s ceiling: how far it bows, how strong, how wide, where it sits and how it curves.' },
		{ name: 'bandTail, bandTailPosition, bandTailCurve, bandTailOverflow', type: 'number', default: 'per type', description: 'How the band’s ends rise again toward the corners.' },
		{ name: 'bandAberration', type: 'number', default: 'per type', description: 'Chromatic fringes on the band, 0 to 1.' },
		{ name: 'distortion, distortionDetail', type: 'number', default: 'per type', description: 'A liquid warp under the band. Switched off on large hosts in Safari, where it is too slow.' },
		{ name: 'glowWidth, glowHeight, lobeSpacing', type: 'number', default: 'per type', description: 'Size and spacing of the coloured lobes.' },
		{ name: 'rangeWidth, rangeHeight, softness', type: 'number', default: 'per type', description: 'The area the glow may fill, and how softly it ends.' },
		{ name: 'coreSize, coreLight, coreLightWidth, coreLightHeight', type: 'number', default: 'per type', description: 'The bright centre.' },
		{ name: 'strokeScale, innerScale, innerHeight, bloomScale, bloomHeight', type: 'number', default: 'per type', description: 'Size of each of the three layers.' },
		{ name: 'glowSize, strokeOpacity, innerOpacity, bloomOpacity', type: 'number', default: 'per type', description: 'Blur of the bloom and a multiplier on each layer’s opacity.' },
		{ name: 'brightness, saturation', type: 'number', default: 'per theme', description: 'Multipliers on the glow.' },
		{ name: 'hueRange, hueDuration, staticColors', type: 'number, number, boolean', default: 'per theme', description: 'The slow hue drift: its range in degrees, seconds per cycle, and an off switch.' }
	];

	/* the beam as the chosen framework has it: a component, a tag, or what mountVoiceBeam returns */
	const beamName = $derived(framework.id === 'elements' ? '<runeglow-voice-beam>' : framework.id === 'vanilla' ? 'the beam' : 'VoiceBeam');
	const micApi = $derived<PropRow[]>([
		{ name: 'stream', type: 'MediaStream | null', description: `The live stream to hand to ${beamName}.` },
		{ name: 'state', type: "'idle' | 'requesting' | 'live' | 'denied' | 'unsupported' | 'error'", description: 'Where the request stands.' },
		{ name: 'error', type: 'Error | null', description: 'The error behind a denied or error state.' },
		{ name: 'supported', type: 'boolean', description: 'Whether this browser can capture audio.' },
		{ name: 'start()', type: '() => Promise<MediaStream | null>', description: 'Asks for the microphone. Call it from a click.' },
		{ name: 'stop()', type: '() => void', description: 'Stops every track and drops the stream.' }
	]);
	/* Outside a framework nothing is reactive and nothing is torn down for
	   you, so the object says when it changes and can be let go of. */
	const micPlain: PropRow[] = [
		{ name: 'subscribe()', type: '(listener: () => void) => () => void', description: 'Calls the listener whenever stream, state or error changes. Returns the function that stops it.' },
		{ name: 'destroy()', type: '() => void', description: 'Stops every track without telling the listeners, for when the page that owned the microphone goes away.' }
	];

	/* the microphone helper by its name in the chosen framework */
	const mic = $derived(micName(framework.id));
	const plain = $derived(framework.id === 'elements' || framework.id === 'vanilla');
	/* where a wrapper narrower than its container is told to shrink */
	const fitContent: Record<Framework, string> = {
		svelte: 'style="width: fit-content"',
		react: "style={{ width: 'fit-content' }}",
		vue: 'style="width: fit-content"',
		elements: 'style="width: fit-content"',
		vanilla: 'width: fit-content'
	};
</script>

<DocsShell>
	<header>
		<LibIcon slug="voice-glow" />
		<h1>Voice</h1>
		<p class="lead">A glow that rises with your voice from the bottom of a chat input or phone screen.</p>
	</header>

	<div class="examples">
		<div class="cell phone">
			<VoiceBeam type="mobile" scale={0.85} level={demoGetterLate} onLevel={transcript.onLevel} class="hang">
				<PhoneScreen words={transcript.words} />
			</VoiceBeam>
		</div>
		<div class="cell">
			<VoiceBeam level={demoGetter}>
				<Subject kind="chat" />
			</VoiceBeam>
		</div>
		<div class="cell">
			<VoiceBeam type="pill" level={demoGetter} colorVariant="ocean">
				<RecordingPill />
			</VoiceBeam>
		</div>
	</div>
	<p class="caption">These play a synthetic voice. The playground can listen to your microphone.</p>

	<section id="playground">
		<h2>Playground</h2>
		<Playground />
	</section>

	<section id="install">
		<h2>Install</h2>
		<div class="stack">
			<InstallTabs registry="voice-glow" />
			<CodeBlock code={importOnly} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			Wrap the element the voice belongs to and hand the beam a microphone stream.
			<code class="icode">{mic}</code> asks for it; call <code class="icode">start</code> from a
			click so the browser lets audio begin.
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			Or drive it yourself with <code class="icode">level</code>: a number from 0 to 1, or a function
			the beam calls every frame.
		</p>
		<CodeBlock code={manual} />
		<p class="text">
			{#if plain}
				The microphone tells its subscribers whenever its state changes, so the interface can follow it.
			{:else}
				The microphone’s state is reactive, so the interface can follow it.
			{/if}
		</p>
		<CodeBlock code={status} />
	</section>

	<section id="props">
		<h2>Props</h2>
		<PropsTable rows={[...props, ...reach[framework.id]]} />
	</section>

	<section id="shape">
		<h2>Shape and styling</h2>
		<p class="text">
			Each of these has a tuned default for the type and theme. The playground has a slider for every
			one.
		</p>
		<PropsTable rows={shape} />
	</section>

	<section id="mic">
		<h2>{mic}</h2>
		<p class="text">
			{#if framework.id === 'svelte'}
				Call it while a component is being set up. Read its values from the returned object, as they
				are reactive: <code class="icode">mic.stream</code>, not a destructured copy.
			{:else if framework.id === 'react'}
				It is a hook: call it in a component. The component renders again whenever
				<code class="icode">stream</code>, <code class="icode">state</code> or
				<code class="icode">error</code> changes, and <code class="icode">start</code> and
				<code class="icode">stop</code> stay the same functions throughout. The stream is stopped when
				the component unmounts.
			{:else if framework.id === 'vue'}
				Call it in <code class="icode">setup</code>. What comes back is one reactive object: read
				<code class="icode">mic.stream</code> from it, in a template or in code, not a destructured
				copy. The stream is stopped when the component is unmounted.
			{:else}
				{#if framework.id === 'elements'}
					It is the core’s own function, exported from the elements’ module as well.
				{/if}
				What comes back is a plain object: <code class="icode">mic.stream</code> is always the current
				stream, and <code class="icode">subscribe</code> tells you when it changes.
			{/if}
		</p>
		<PropsTable rows={plain ? [...micApi, ...micPlain] : micApi} nameLabel="Member" />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>Nothing is recorded or played back. The stream is only analysed for its level.</li>
			<li>
				If the glow stays flat while you speak, the browser has probably opened an input that is
				switched off, such as a laptop’s built-in microphone while its lid is closed. Pick the
				input yourself with
				<code class="icode">{`${mic}({ constraints: { deviceId } })`}</code>.
			</li>
			<li>
				{#if framework.id === 'vanilla'}
					The beam spans the wrapper you mount it on. If the wrapped element is narrower than that
					wrapper, give the wrapper <code class="icode">{fitContent.vanilla}</code>.
				{:else}
					The wrapper is a block element. If the wrapped element is narrower than its container, give
					the wrapper <code class="icode">{fitContent[framework.id]}</code>.
				{/if}
			</li>
			<li>
				The glow is drawn over the wrapped element, and its radius is read from that element’s
				top-left corner. Give the text and buttons inside
				<code class="icode">position: relative; z-index: 5</code> so they stay above the light,
				which matters most on a light surface.
			</li>
			<li>
				The glow is authored in px for its type’s usual size. Use
				<code class="icode">scale</code> when your element is much smaller or larger.
			</li>
			<li>
				It pauses while offscreen, and holds still under
				<code class="icode">prefers-reduced-motion</code>.
			</li>
			<li>
				The {SITE.upstream.name} source this is ported from also contains two unreleased looks, dots
				and lines. They are switched off here exactly as they are in its published package.
			</li>
		</ul>
	</section>
</DocsShell>

<style>
	header {
		margin-bottom: 22px;
	}
	h1 {
		margin-top: 14px;
		font-size: 30px;
		font-weight: 600;
		letter-spacing: -0.03em;
	}
	.lead {
		margin-top: 8px;
		color: var(--fg-2);
	}

	.examples {
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		grid-template-rows: 1fr 1fr;
		gap: 10px;
	}
	.cell {
		display: grid;
		place-items: center;
		min-height: 200px;
		padding: 20px 16px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
		overflow: hidden;
	}
	.cell.phone {
		grid-row: 1 / -1;
		align-items: start;
		padding: 0 8px 28px;
	}
	/* The phone hangs off the top of its cell, which clips it. */
	.cell.phone :global(.hang) {
		margin-top: -46px;
	}
	.caption {
		margin-top: 10px;
		font-size: 12.5px;
		color: var(--fg-3);
	}

	section {
		margin-top: 56px;
	}
	h2 {
		margin-bottom: 14px;
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.stack {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 10px;
	}
	.text {
		max-width: 62ch;
		margin: 18px 0 10px;
		color: var(--fg-2);
	}
	h2 + .text {
		margin-top: 0;
	}
	section > .text:last-of-type + :global(.table) {
		margin-top: 16px;
	}
	.notes {
		margin: 0;
		padding-left: 18px;
		display: grid;
		gap: 8px;
		max-width: 68ch;
		color: var(--fg-2);
	}

	@media (max-width: 700px) {
		.examples {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: none;
		}
		.cell.phone {
			grid-row: auto;
		}
	}
</style>
