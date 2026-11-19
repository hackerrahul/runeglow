<script lang="ts">
	import { VoiceBeam } from 'runeglow/voice-glow';
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
	import { demoGetter, demoGetterLate } from '#lib/demos/voice-glow/voice.ts';
	import { SITE } from '#lib/site.ts';

	const transcript = createTranscript();

	const quickStart = `<script>
  import { VoiceBeam, useMicrophone } from '${SITE.pkg}/voice-glow';

  const mic = useMicrophone();
<\/script>

<button onclick={mic.start}>Listen</button>

<VoiceBeam stream={mic.stream}>
  <ChatInput />
</VoiceBeam>`;

	const manual = `<script>
  import { VoiceBeam } from '${SITE.pkg}/voice-glow';

  // From your own audio pipeline, a text-to-speech player, anything.
  let { level } = $props();
<\/script>

<VoiceBeam type="pill" {level} colorVariant="ocean">
  <RecordingPill />
</VoiceBeam>`;

	const status = `<script>
  import { VoiceBeam, useMicrophone } from '${SITE.pkg}/voice-glow';

  const mic = useMicrophone();
<\/script>

{#if mic.state === 'denied'}
  <p>Microphone blocked. Allow it in the browser's site settings.</p>
{/if}

<VoiceBeam type="mobile" stream={mic.stream} active={mic.state === 'live'}>
  <VoiceScreen />
</VoiceBeam>`;

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
		{ name: 'onActivate, onDeactivate', type: '() => void', description: 'Called when a fade in or out finishes.' },
		{ name: 'ref', type: 'HTMLDivElement | null', description: 'The wrapper element. Bindable with bind:ref.' },
		{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and other attributes are forwarded to the wrapper.' }
	];

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

	const micApi: PropRow[] = [
		{ name: 'stream', type: 'MediaStream | null', description: 'The live stream to hand to VoiceBeam.' },
		{ name: 'state', type: "'idle' | 'requesting' | 'live' | 'denied' | 'unsupported' | 'error'", description: 'Where the request stands.' },
		{ name: 'error', type: 'Error | null', description: 'The error behind a denied or error state.' },
		{ name: 'supported', type: 'boolean', description: 'Whether this browser can capture audio.' },
		{ name: 'start()', type: '() => Promise<MediaStream | null>', description: 'Asks for the microphone. Call it from a click.' },
		{ name: 'stop()', type: '() => void', description: 'Stops every track and drops the stream.' }
	];
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
			<CodeBlock code={`import { VoiceBeam, useMicrophone } from '${SITE.pkg}/voice-glow';`} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			Wrap the element the voice belongs to and hand the beam a microphone stream.
			<code class="icode">useMicrophone</code> asks for it; call <code class="icode">start</code> from a
			click so the browser lets audio begin.
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			Or drive it yourself with <code class="icode">level</code>: a number from 0 to 1, or a function
			the beam calls every frame.
		</p>
		<CodeBlock code={manual} />
		<p class="text">The microphone’s state is reactive, so the interface can follow it.</p>
		<CodeBlock code={status} />
	</section>

	<section id="props">
		<h2>Props</h2>
		<PropsTable rows={props} />
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
		<h2>useMicrophone</h2>
		<p class="text">
			Call it while a component is being set up. Read its values from the returned object, as they
			are reactive: <code class="icode">mic.stream</code>, not a destructured copy.
		</p>
		<PropsTable rows={micApi} nameLabel="Member" />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>Nothing is recorded or played back. The stream is only analysed for its level.</li>
			<li>
				If the glow stays flat while you speak, the browser has probably opened an input that is
				switched off, such as a laptop’s built-in microphone while its lid is closed. Pick the
				input yourself with
				<code class="icode">{'useMicrophone({ constraints: { deviceId } })'}</code>.
			</li>
			<li>
				The wrapper is a block element. If the wrapped element is narrower than its container, give
				the wrapper <code class="icode">style="width: fit-content"</code>.
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
				The React source also contains two unreleased looks, dots and lines. They are switched off
				here exactly as they are in the published React package.
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
