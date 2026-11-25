<script lang="ts">
	import { VoiceOrb, VoiceRing, type VoiceOrbState, type VoiceOrbType, type VoiceRingType } from '@runeglow/svelte/voice-ring';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import { micName } from '#lib/demos/voice-glow/snippets.ts';
	import { demoGetter, demoGetterLate } from '#lib/demos/voice-glow/voice.ts';
	import Playground from '#lib/demos/voice-ring/Playground.svelte';
	import { FRAMEWORKS, example, expr, perFramework, tag, type Framework } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';
	import { SITE } from '#lib/site.ts';

	/* Each ring with a voice in it (the user's or the assistant's, which look
	   alike) and at work. */
	const EXAMPLES: { label: string; type: VoiceRingType; state: VoiceOrbState; level?: () => number }[] = [
		{ label: 'Listening', type: 'ring', state: 'listening', level: demoGetter },
		{ label: 'Processing', type: 'ring', state: 'processing' },
		{ label: 'Mono, speaking', type: 'mono', state: 'speaking', level: demoGetterLate },
		{ label: 'Mono, processing', type: 'mono', state: 'processing' }
	];

	const ORBS: { type: VoiceOrbType; label: string; accent?: 'green' | 'red' | 'blue' }[] = [
		{ type: 'orbit', label: 'orbit' },
		{ type: 'sash', label: 'sash', accent: 'blue' },
		{ type: 'signal', label: 'signal' },
		{ type: 'swell', label: 'swell', accent: 'green' },
		{ type: 'pixel', label: 'pixel' }
	];

	/* The microphone is a hook in a framework and a plain object outside one,
	   so the examples that listen are written out five times. */
	const importOnly = perFramework((fw, info) =>
		fw === 'elements' ? `// Importing it registers <runeglow-voice-ring> and <runeglow-voice-orb>.\nimport { createMicrophone } from '${info.pkg}/voice-ring';`
		: fw === 'vanilla' ? `import { mountVoiceRing, mountVoiceOrb, createMicrophone } from '${info.pkg}/voice-ring';`
		: `import { VoiceRing, VoiceOrb, useMicrophone } from '${info.pkg}/voice-ring';`
	);

	const quickStart = perFramework((fw, info) => {
		const from = `'${info.pkg}/voice-ring'`;
		switch (fw) {
			case 'svelte':
				return `<script>
  import { VoiceRing, useMicrophone } from ${from};

  const mic = useMicrophone();
<\/script>

<VoiceRing size={240} state="listening" stream={mic.stream} />
<button onclick={mic.start}>Listen</button>`;
			case 'react':
				return `import { VoiceRing, useMicrophone } from ${from};

export function Assistant() {
  const mic = useMicrophone();

  return (
    <>
      <VoiceRing size={240} state="listening" stream={mic.stream} />
      <button onClick={mic.start}>Listen</button>
    </>
  );
}`;
			case 'vue':
				return `<script setup>
import { VoiceRing, useMicrophone } from ${from};

const mic = useMicrophone();
<\/script>

<template>
  <VoiceRing :size="240" state="listening" :stream="mic.stream" />
  <button @click="mic.start">Listen</button>
</template>`;
			case 'elements':
				return `<script type="module">
  import { createMicrophone } from ${from};

  const ring = document.querySelector('runeglow-voice-ring');
  const mic = createMicrophone();

  // A stream is a property: no attribute can carry it.
  mic.subscribe(() => (ring.stream = mic.stream));
  document.querySelector('#listen').addEventListener('click', mic.start);
<\/script>

<runeglow-voice-ring size="240" state="listening"></runeglow-voice-ring>
<button id="listen">Listen</button>`;
			case 'vanilla':
				return `import { mountVoiceRing, createMicrophone } from ${from};

// makes its canvas inside #assistant
const ring = mountVoiceRing(document.querySelector('#assistant'), { size: 240, state: 'listening' });
const mic = createMicrophone();

mic.subscribe(() => ring.update({ stream: mic.stream }));
document.querySelector('#listen').addEventListener('click', mic.start);`;
		}
	});

	/* With components there is a ring for each speaker. Outside a framework
	   there is one ring, and a stream wins over an analyser, so it is given
	   one or the other. */
	const conversation = perFramework((fw, info) => {
		const from = `'${info.pkg}/voice-ring'`;
		switch (fw) {
			case 'svelte':
				return `<script>
  import { VoiceRing, useMicrophone } from ${from};

  const mic = useMicrophone();
  // 'idle' | 'listening' | 'processing' | 'speaking', from your own app.
  let { turn, player } = $props();
<\/script>

{#if turn === 'speaking'}
  <!-- The assistant's voice: any AnalyserNode, or a level you compute. -->
  <VoiceRing state="speaking" analyser={player.analyser} />
{:else}
  <VoiceRing state={turn} stream={mic.stream} />
{/if}`;
			case 'react':
				return `import { VoiceRing, useMicrophone } from ${from};

// turn: 'idle' | 'listening' | 'processing' | 'speaking', from your own app.
export function Assistant({ turn, player }) {
  const mic = useMicrophone();

  return turn === 'speaking' ? (
    // The assistant's voice: any AnalyserNode, or a level you compute.
    <VoiceRing state="speaking" analyser={player.analyser} />
  ) : (
    <VoiceRing state={turn} stream={mic.stream} />
  );
}`;
			case 'vue':
				return `<script setup>
import { VoiceRing, useMicrophone } from ${from};

const mic = useMicrophone();
// 'idle' | 'listening' | 'processing' | 'speaking', from your own app.
defineProps(['turn', 'player']);
<\/script>

<template>
  <!-- The assistant's voice: any AnalyserNode, or a level you compute. -->
  <VoiceRing v-if="turn === 'speaking'" state="speaking" :analyser="player.analyser" />
  <VoiceRing v-else :state="turn" :stream="mic.stream" />
</template>`;
			case 'elements':
				return `<script type="module">
  import { createMicrophone } from ${from};

  const ring = document.querySelector('runeglow-voice-ring');
  const mic = createMicrophone();

  // 'idle' | 'listening' | 'processing' | 'speaking', from your own app.
  let turn = 'idle';

  function show() {
    ring.state = turn;
    // The assistant's voice: any AnalyserNode, or a level you compute.
    // A stream wins over an analyser, so the ring is given one or the other.
    ring.analyser = turn === 'speaking' ? player.analyser : null;
    ring.stream = turn === 'speaking' ? null : mic.stream;
  }
  mic.subscribe(show);

  // Call this as the conversation moves.
  function setTurn(next) {
    turn = next;
    show();
  }
<\/script>

<runeglow-voice-ring state="idle"></runeglow-voice-ring>`;
			case 'vanilla':
				return `import { mountVoiceRing, createMicrophone } from ${from};

const ring = mountVoiceRing(document.querySelector('#assistant'), { state: 'idle' });
const mic = createMicrophone();

// 'idle' | 'listening' | 'processing' | 'speaking', from your own app.
let turn = 'idle';

function show() {
  const speaking = turn === 'speaking';
  ring.update({
    state: turn,
    // The assistant's voice: any AnalyserNode, or a level you compute.
    // A stream wins over an analyser, so the ring is given one or the other.
    analyser: speaking ? player.analyser : null,
    stream: speaking ? null : mic.stream
  });
}
mic.subscribe(show);

// Call this as the conversation moves.
export function setTurn(next) {
  turn = next;
  show();
}`;
		}
	});

	const FEELING = { type: 'mono', state: 'speaking', level: expr('level'), emotion: 'calm', direction: -0.6, hoverBend: true };
	const feeling = perFramework((fw) => {
		switch (fw) {
			case 'svelte':
				return `<VoiceRing
  type="mono"
  state="speaking"
  {level}
  emotion="calm"
  direction={-0.6}
  hoverBend
/>`;
			case 'elements':
				// the tag leaves `level` out: it is a function here, and so a property
				return `${tag(fw, 'VoiceRing', FEELING)}

<script type="module">
  // A function is a property: no attribute can carry it.
  document.querySelector('runeglow-voice-ring').level = level;
<\/script>`;
			case 'vanilla':
				return `mountVoiceRing(document.querySelector('#assistant'), {
  type: 'mono',
  state: 'speaking',
  level,
  emotion: 'calm',
  direction: -0.6,
  hoverBend: true
});`;
			default:
				return tag(fw, 'VoiceRing', FEELING);
		}
	});

	const orbs = {
		...example({
			component: 'VoiceOrb',
			props: { type: 'swell', size: 160, state: 'listening', level: expr('level'), accent: 'green' },
			input: 'level',
			wrapper: 'Orb'
		}),
		svelte: `<script>
  import { VoiceOrb } from '${FRAMEWORKS.svelte.pkg}/voice-ring';
<\/script>

<VoiceOrb type="swell" size={160} state="listening" {level} accent="green" />`,
		elements: `<script type="module">
  import '${FRAMEWORKS.elements.pkg}/voice-ring';

  // A function is a property: no attribute can carry it.
  document.querySelector('runeglow-voice-orb').level = level;
<\/script>

<runeglow-voice-orb type="swell" size="160" state="listening" accent="green"></runeglow-voice-orb>`,
		vanilla: `import { mountVoiceOrb } from '${FRAMEWORKS.vanilla.pkg}/voice-ring';

// makes its canvas inside #assistant
const orb = mountVoiceOrb(document.querySelector('#assistant'), {
  type: 'swell',
  size: 160,
  state: 'listening',
  level,
  accent: 'green'
});`
	};

	const props: PropRow[] = [
		{ name: 'type', type: "'ring' | 'mono'", default: "'ring'", description: 'ring is a glassy ribbon with a spectrum running round it. mono is two loops of grey tube that a voice opens into a turning globe.' },
		{ name: 'state', type: "'idle' | 'listening' | 'speaking' | 'processing'", default: "'listening'", description: 'The conversation state. Listening and speaking follow the source; idle and processing ignore it.' },
		{ name: 'size', type: 'number', default: '160', description: 'Rendered size in CSS px. Designed at 200.' },
		{ name: 'stream', type: 'MediaStream | null', description: 'A live audio stream, usually mic.stream. Wins over analyser and level.' },
		{ name: 'analyser', type: 'AnalyserNode | null', description: 'An AnalyserNode you already have, such as the assistant’s voice playing back. Wins over level.' },
		{ name: 'level', type: 'number | (() => number)', description: 'Drive it yourself, 0 to 1. A function is called every frame.' },
		{ name: 'sensitivity', type: 'number', default: '0.85', description: 'Input gain. Raise it for quiet sources.' },
		{ name: 'threshold', type: 'number', default: '0.04', description: 'Noise gate: below this it hears silence.' },
		{ name: 'attack', type: 'number', default: '0.06', description: 'Seconds to rise.' },
		{ name: 'release', type: 'number', default: '0.32', description: 'Seconds to settle.' },
		{ name: 'idle', type: 'number', default: '0.1', description: 'Breathing kept under the voice, so silence never looks dead.' },
		{ name: 'calm', type: 'number', default: '0.4', description: 'The pace while it waits, as a share of the tuned speed.' },
		{ name: 'speed', type: 'number', default: '1', description: 'Multiplier on the motion.' },
		{ name: 'voiceSpeed', type: 'number', default: 'per type', description: 'How much a voice speeds the motion up.' },
		{ name: 'emotion', type: "'positive' | 'negative' | 'calm' | null", default: 'null', description: 'Shifts the colour toward green, red or blue. It eases in and crossfades. Detection is yours to supply.' },
		{ name: 'emotionColors', type: 'Partial<Record<emotion, { r, g, b }>>', description: 'Your own colour for any emotion, 0 to 255 per channel.' },
		{ name: 'direction', type: 'number | (() => number)', description: 'Where the voice comes from, -1 left to 1 right. The ring leans that way while a voice is heard.' },
		{ name: 'hoverBend', type: 'boolean | number', default: 'false', description: 'Bends toward the cursor near the rim while idle or processing. true is 0.55; a number sets the strength.' },
		{ name: 'theme', type: "'auto' | 'dark' | 'light'", default: "'auto'", description: 'auto reads an ancestor’s data-theme or dark/light class, then the system setting.' },
		{ name: 'paused', type: 'boolean', default: 'false', description: 'Holds the current frame.' },
		{ name: 'dots', type: 'number', default: '1', description: 'Density multiplier on the type’s dot and segment counts.' },
		{ name: 'opts', type: 'Record<string, number>', description: 'The type’s own knobs, such as { rings: 8, halo: 0.7 }. The playground lists them.' },
		{ name: 'onLevel', type: '(level: number) => void', description: 'Called every frame with the shaped level, 0 to 1.' }
	];

	/* the canvas, and what cannot be written as text, which each framework has its own way with */
	const reach: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'ref', type: 'HTMLCanvasElement | null', description: 'The canvas. Bindable with bind:ref.' },
			{ name: '...rest', type: 'HTMLCanvasAttributes', description: 'class, style, aria-label and other attributes are forwarded to the canvas.' }
		],
		react: [
			{ name: 'ref', type: 'Ref<HTMLCanvasElement>', description: 'Reaches the canvas.' },
			{ name: '...rest', type: 'CanvasHTMLAttributes', description: 'className, style, aria-label and other attributes are forwarded to the canvas.' }
		],
		vue: [
			{ name: 'template ref', type: '{ element }', description: 'A ref on the component gives the canvas as element.' },
			{ name: 'attributes', type: 'fallthrough', description: 'class, style, aria-label and other attributes fall through to the canvas.' },
			{ name: 'in a template', type: 'kebab-case', description: 'voiceSpeed is written voice-speed and hoverBend hover-bend. onLevel is a prop: bind it as :on-level, or listen with @level.' }
		],
		elements: [
			{ name: 'label', type: 'string', description: 'The accessible name, in place of the state.' },
			{ name: 'attributes', type: 'kebab-case', description: 'Every option is a property in camelCase and, where text can say it, an attribute: voiceSpeed is voice-speed. level and direction are written as numbers, hover-bend alone or as a number, emotion-colors and opts as JSON.' },
			{ name: 'properties only', type: 'live objects, functions', description: 'stream, analyser, directionBounds, a function for level or direction, and onLevel cannot be attributes: set them from a script.' },
			{ name: 'styling', type: 'shadow root', description: 'The canvas is in the element’s shadow root. class and style on the tag lay out the element, an inline box of size by size.' }
		],
		vanilla: [
			{ name: 'first argument', type: 'Element | ShadowRoot', description: 'The parent the canvas is made in.' },
			{ name: 'class', type: 'string', description: 'A class for the canvas.' },
			{ name: 'label', type: 'string', description: 'The accessible name, in place of the state.' },
			{ name: 'returns', type: '{ element, update, destroy }', description: 'The canvas; update(options) changes some options and keeps the rest; destroy() stops it and removes the canvas.' }
		]
	};

	/* what the page calls the two in the chosen framework: components, tags, or the core's functions */
	const NAMES: Record<Framework, { ring: string; orb: string; kind: string; option: string }> = {
		svelte: { ring: 'VoiceRing', orb: 'VoiceOrb', kind: 'component', option: 'prop' },
		react: { ring: 'VoiceRing', orb: 'VoiceOrb', kind: 'component', option: 'prop' },
		vue: { ring: 'VoiceRing', orb: 'VoiceOrb', kind: 'component', option: 'prop' },
		elements: { ring: '<runeglow-voice-ring>', orb: '<runeglow-voice-orb>', kind: 'element', option: 'option' },
		vanilla: { ring: 'mountVoiceRing', orb: 'mountVoiceOrb', kind: 'function', option: 'option' }
	};
	const names = $derived(NAMES[framework.id]);
	const mic = $derived(micName(framework.id));

	const lean: PropRow[] = [
		{ name: 'directionMove', type: 'number', default: 'per type', description: 'How far it drifts toward the voice, as a share of its radius.' },
		{ name: 'directionPull', type: 'number', default: 'per type', description: 'How far its near side is pulled out beyond the far side.' },
		{ name: 'directionDeform', type: 'number', default: 'per type', description: 'How much the near flank bulges.' },
		{ name: 'directionSquash', type: 'number', default: 'per type', description: 'At the edge, how much it squashes against it, 0 to 1.' },
		{ name: 'directionLens', type: 'number', default: 'per type', description: 'At the edge, how strongly it is refracted into it, as through glass, 0 to 2.' },
		{ name: 'directionStretch, directionSplit, directionBlur', type: 'number', default: 'per type', description: 'The edge lens’s distortion, colour split and blur, 0 to 2.' },
		{ name: 'directionBounce', type: 'number', default: 'per type', description: 'How much it bounces as it meets the edge, 0 to 2.' },
		{ name: 'directionMargin', type: 'number', default: '32', description: 'CSS px it stops short of the edge.' },
		{ name: 'directionBounds', type: 'Element | null', description: 'An element whose left and right edges it leans up to, instead of the screen’s. Give that element overflow: hidden.' }
	];

	const ink: PropRow[] = [
		{ name: 'accent', type: "'green' | 'red' | 'blue' | null", default: 'null', description: 'A fixed colour for the gradient, shown even without an emotion.' },
		{ name: 'saturation', type: 'number', default: '2', description: 'How strong the colour gets: 0 never, 1 the colour itself, up to 2 purer and deeper.' },
		{ name: 'neutral', type: 'number', default: '1', description: '1 starts the gradient in plain ink; 0 covers the orb in the colour.' },
		{ name: 'colorBrightness, colorHue', type: 'number', default: '1.02, 0', description: 'The colour’s brightness, and degrees to turn its hue.' },
		{ name: 'gradientAngle, gradientSpin', type: 'number', default: '99, 12', description: 'Which way the gradient runs in degrees, and how fast it turns in degrees per second.' },
		{ name: 'gradientStart, gradientWidth', type: 'number', default: '0.1, 0.6', description: 'Where across the orb the colour begins, and how far it takes to arrive in full.' },
		{ name: 'color', type: 'string', description: 'An ink tint: #rgb, #rrggbb or rgb(). Depth shading is kept on it.' },
		{ name: 'dotSize', type: 'number', default: 'per type', description: 'Multiplier on every dot radius.' },
		{ name: 'frame', type: 'TypeFrame', description: 'Replace the type’s geometry with your own function.' }
	];
	const frameIsProperty: PropRow = { name: 'properties only', type: 'frame', description: 'frame is a function, so it is a property of the element and never an attribute.' };
	/* the orb's own rows: its types, named after the ring as this framework calls it, then the ink's */
	const orbRows = $derived<PropRow[]>([
		{ name: 'type', type: "'orbit' | 'sash' | 'signal' | 'swell' | 'pixel' | 'aura' | 'aura-mono'", default: "'orbit'", description: `Which orb. aura and aura-mono are ${names.ring}’s ring and mono.` },
		...ink,
		...(framework.id === 'elements' ? [frameIsProperty] : [])
	]);
</script>

<DocsShell>
	<header>
		<LibIcon slug="voice-ring" />
		<h1>Voice ring</h1>
		<p class="lead">A ring of light that bends with a voice, takes the colour of its mood and leans toward the speaker.</p>
	</header>

	<div class="examples">
		{#each EXAMPLES as ex (ex.label)}
			<figure class="cell">
				<VoiceRing type={ex.type} size={150} state={ex.state} level={ex.level ?? 0} theme="dark" />
				<figcaption>{ex.label}</figcaption>
			</figure>
		{/each}
	</div>
	<p class="caption">These play a synthetic voice. The playground can listen to your microphone.</p>

	<section id="playground">
		<h2>Playground</h2>
		<Playground />
	</section>

	<section id="install">
		<h2>Install</h2>
		<div class="stack">
			<InstallTabs registry="voice-ring" />
			<CodeBlock code={importOnly} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			Place the ring and hand it a microphone stream. <code class="icode">{mic}</code> asks for
			it; call <code class="icode">start</code> from a click so the browser lets audio begin.
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			Set <code class="icode">state</code> as the conversation moves. Listening and speaking draw the
			same way and differ only in what they follow: the microphone, or the assistant’s own audio
			through <code class="icode">analyser</code> or <code class="icode">level</code>.
		</p>
		<CodeBlock code={conversation} />
		<p class="text">
			An emotion tints it, a direction makes it lean, and <code class="icode">hoverBend</code> lets it
			reach for the cursor while it waits.
		</p>
		<CodeBlock code={feeling} />
	</section>

	<section id="props">
		<h2>Props</h2>
		<PropsTable rows={[...props, ...reach[framework.id]]} />
	</section>

	<section id="lean">
		<h2>Leaning toward a voice</h2>
		<p class="text">
			These apply once <code class="icode">direction</code> is set. A browser microphone is mono, so the
			side has to come from you: a stereo capture, a diarised speaker, or where that person sits in
			your interface.
		</p>
		<PropsTable rows={lean} />
	</section>

	<section id="orbs">
		<h2>{names.orb}</h2>
		<p class="text">
			The ring is drawn by a more general {names.kind} that the package also exports. It has five more
			types, drawn in ink instead of light, which can take a colour gradient.
		</p>
		<div class="orbs">
			{#each ORBS as o (o.type)}
				<figure class="cell small">
					<VoiceOrb type={o.type} size={96} state="listening" level={demoGetter} accent={o.accent ?? null} theme="dark" />
					<figcaption><code class="icode">{o.label}</code></figcaption>
				</figure>
			{/each}
		</div>
		<div class="gap">
			<CodeBlock code={orbs} />
		</div>
		<p class="text">It takes every {names.option} above, and these as well:</p>
		<PropsTable rows={orbRows} />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>Nothing is recorded or played back. The stream is only analysed.</li>
			<li>
				It shares one audio context and one microphone helper with
				<a href="/voice-glow">Voice</a>, so a stream opened for one can drive the other.
			</li>
			<li>
				If it stays still while you speak, the browser has probably opened an input that is switched
				off, such as a laptop’s built-in microphone while its lid is closed. Pick the input yourself
				with <code class="icode">{`${mic}({ constraints: { deviceId } })`}</code>.
			</li>
			<li>
				With a <code class="icode">direction</code>, the canvas grows sideways into negative margins
				so the lean is never cut off. The layout still measures
				<code class="icode">size</code> by <code class="icode">size</code>.
			</li>
			<li>
				It pauses while offscreen or on a hidden tab, and holds a still frame under
				<code class="icode">prefers-reduced-motion</code>.
			</li>
			<li>
				The {SITE.upstream.name} package this is ported from pairs with two separate models for detecting
				emotion and direction. They are not part of Runeglow: pass your own values to
				<code class="icode">emotion</code> and <code class="icode">direction</code>.
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
		max-width: 60ch;
		color: var(--fg-2);
	}

	.examples {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
	}
	.orbs {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 10px;
	}
	.cell {
		display: grid;
		justify-items: center;
		gap: 6px;
		margin: 0;
		padding: 18px 8px 16px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
		overflow: hidden;
	}
	.cell.small {
		padding: 16px 8px 14px;
	}
	figcaption {
		font-size: 12.5px;
		color: var(--fg-3);
		text-align: center;
	}
	.caption {
		margin-top: 10px;
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.gap {
		margin-top: 10px;
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
	.notes a {
		color: var(--fg);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	@media (max-width: 760px) {
		.examples {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.orbs {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
