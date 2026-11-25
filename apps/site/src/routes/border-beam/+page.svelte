<script lang="ts">
	import { BorderBeam } from '@runeglow/svelte/border-beam';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import Playground from '#lib/demos/border-beam/Playground.svelte';
	import Subject from '#lib/demos/border-beam/Subject.svelte';
	import { example, importLine, perFramework, type Framework, type FrameworkCode } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';

	const importOnly = perFramework((fw) => importLine(fw, 'border-beam', [fw === 'vanilla' ? 'attachBorderBeam' : 'BorderBeam']));

	/* With no framework the beam runs on a wrapper the page already has, which
	   `example` cannot know about: that text is written here. */
	const quickStart: FrameworkCode = {
		...example({
			component: 'BorderBeam',
			children: {
				svelte: '<div class="card">Your content here</div>',
				react: '<div className="card">Your content here</div>'
			}
		}),
		vanilla: `import { attachBorderBeam } from 'runeglow/border-beam';

// The wrapper is an element of the page, round the one that should glow:
// <div id="beam"><div class="card">Your content here</div></div>
const beam = attachBorderBeam(document.querySelector('#beam'));

// Or have the wrapper made as well: mountBorderBeam, from the same import,
// puts one inside a parent, round a node of the page.
// mountBorderBeam(parent, { content: card });`
	};

	/* state and the end of a fade are each framework's own business */
	const playPause: FrameworkCode = {
		svelte: `<script>
  import { BorderBeam } from '@runeglow/svelte/border-beam';

  let thinking = $state(false);
<\/script>

<BorderBeam
  size="pulse-inner"
  active={thinking}
  onDeactivate={() => console.log('faded out')}
>
  <textarea placeholder="Ask anything…"></textarea>
</BorderBeam>`,
		react: `import { useState } from 'react';
import { BorderBeam } from '@runeglow/react/border-beam';

export function Composer() {
  const [thinking, setThinking] = useState(false);

  return (
    <BorderBeam
      size="pulse-inner"
      active={thinking}
      onDeactivate={() => console.log('faded out')}
    >
      <textarea placeholder="Ask anything…" />
    </BorderBeam>
  );
}`,
		vue: `<script setup>
import { ref } from 'vue';
import { BorderBeam } from '@runeglow/vue/border-beam';

const thinking = ref(false);
const fadedOut = () => console.log('faded out');
<\/script>

<template>
  <BorderBeam
    size="pulse-inner"
    :active="thinking"
    @deactivate="fadedOut"
  >
    <textarea placeholder="Ask anything…"></textarea>
  </BorderBeam>
</template>`,
		elements: `<script type="module">
  import '@runeglow/elements/border-beam';

  const beam = document.querySelector('runeglow-border-beam');
  beam.addEventListener('deactivate', () => console.log('faded out'));

  // call it whenever the app starts or stops thinking
  function setThinking(thinking) {
    beam.active = thinking;
  }
<\/script>

<runeglow-border-beam size="pulse-inner" active="false">
  <textarea placeholder="Ask anything…"></textarea>
</runeglow-border-beam>`,
		vanilla: `import { attachBorderBeam } from 'runeglow/border-beam';

// <div id="beam"><textarea placeholder="Ask anything…"></textarea></div>
const options = { size: 'pulse-inner', active: false };
const beam = attachBorderBeam(document.querySelector('#beam'), options, {
  onDeactivate: () => console.log('faded out')
});

// call it whenever the app starts or stops thinking;
// update takes the whole set of options each time, not only what changed
function setThinking(thinking) {
  beam.update({ ...options, active: thinking });
}`
	};

	const hookCss = '[data-beam="{id}"] [data-beam-bloom] { mix-blend-mode: screen; }';

	/* the variables are inline style on the wrapper, which React writes as an
	   object; the stylesheet is a string, set from a script where there is one */
	const hooks: FrameworkCode = {
		svelte: `<BorderBeam
  size="line"
  style="--beam-hue-base: 40deg; --beam-spike-mul: 1.4"
  css={\`
    ${hookCss}
  \`}
>
  <SearchBar />
</BorderBeam>`,
		react: `{/* In TypeScript, cast the object: style={{ … } as React.CSSProperties} */}
<BorderBeam
  size="line"
  style={{ '--beam-hue-base': '40deg', '--beam-spike-mul': '1.4' }}
  css={\`
    ${hookCss}
  \`}
>
  <SearchBar />
</BorderBeam>`,
		vue: `<script setup>
import { BorderBeam } from '@runeglow/vue/border-beam';

const beamCss = \`
  ${hookCss}
\`;
<\/script>

<template>
  <BorderBeam
    size="line"
    style="--beam-hue-base: 40deg; --beam-spike-mul: 1.4"
    :css="beamCss"
  >
    <SearchBar />
  </BorderBeam>
</template>`,
		elements: `<script type="module">
  import '@runeglow/elements/border-beam';

  // a stylesheet is easier to set as a property than to quote in an attribute
  document.querySelector('runeglow-border-beam').css = \`
    ${hookCss}
  \`;
<\/script>

<runeglow-border-beam size="line" style="--beam-hue-base: 40deg; --beam-spike-mul: 1.4">
  <form class="search">…</form>
</runeglow-border-beam>`,
		vanilla: `// <div id="beam"><form class="search">…</form></div>
const wrapper = document.querySelector('#beam');

// the variables go on the wrapper: here, or in its style attribute
wrapper.style.setProperty('--beam-hue-base', '40deg');
wrapper.style.setProperty('--beam-spike-mul', '1.4');

attachBorderBeam(wrapper, {
  size: 'line',
  css: \`
    ${hookCss}
  \`
});`
	};

	/* what the beam is drawn round, which each framework hands over its own way */
	const content: Record<Framework, PropRow[]> = {
		svelte: [{ name: 'children', type: 'Snippet', description: 'The element to wrap. Its border radius is detected automatically.' }],
		react: [{ name: 'children', type: 'ReactNode', description: 'The element to wrap. Its border radius is detected automatically.' }],
		vue: [{ name: 'default slot', type: 'slot', description: 'The element to wrap. Its border radius is detected automatically.' }],
		elements: [{ name: 'children', type: 'elements', description: 'The element to wrap, written inside the tag. It stays in the page’s own DOM (there is no shadow root), and its border radius is detected automatically.' }],
		vanilla: [{ name: 'element', type: 'HTMLElement', description: 'The first argument of attachBorderBeam: the wrapper round the element to glow. The border radius of its first child is detected automatically.' }]
	};

	const options: PropRow[] = [
		{ name: 'size', type: "'md' | 'sm' | 'line' | 'pulse-inner' | 'pulse-outside'", default: "'md'", description: 'The beam type. md, sm and line travel; the pulse types breathe in place.' },
		{ name: 'colorVariant', type: "'colorful' | 'mono' | 'ocean' | 'sunset' | 'forest' | 'candy' | 'ice' | 'gold'", default: "'colorful'", description: 'The palette.' },
		{ name: 'theme', type: "'dark' | 'light' | 'auto'", default: "'dark'", description: 'Tunes the glow for the background it sits on. auto follows prefers-color-scheme.' },
		{ name: 'active', type: 'boolean', default: 'true', description: 'Fades the effect in and out.' },
		{ name: 'strength', type: 'number', default: '1', description: 'Opacity of the effect layers, 0 to 1. The wrapped content is untouched.' },
		{ name: 'duration', type: 'number', default: '1.96 / 3.1 / 2.3', description: 'Seconds per cycle. The default depends on the type: rotate, line, pulse.' },
		{ name: 'borderRadius', type: 'number', default: 'auto', description: 'Corner radius in pixels. Omit it to read the radius of the first child.' },
		{ name: 'brightness', type: 'number', default: 'per type', description: 'Brightness multiplier for the glow.' },
		{ name: 'saturation', type: 'number', default: 'per type', description: 'Saturation multiplier for the glow.' },
		{ name: 'glowSize', type: 'number', default: '1', description: 'Scales the blur radius of every glow layer, keeping their proportions.' },
		{ name: 'hueRange', type: 'number', default: '30', description: 'Degrees of hue drift over a cycle on the rotate types. line caps it at 13; the pulse types always rotate the full circle.' },
		{ name: 'staticColors', type: 'boolean', default: 'false', description: 'Turns the hue drift off. mono is always static.' },
		{ name: 'css', type: 'string', description: 'Extra CSS appended to the generated sheet. {id} is replaced with the beam’s id, the value of its data-beam attribute.' }
	];

	/* the wrapper, and the end of a fade, as each framework reaches them */
	const reach: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'ref', type: 'HTMLDivElement | null', description: 'The wrapper element. Bindable with bind:ref.' },
			{ name: 'onActivate', type: '() => void', description: 'Called when the fade-in finishes.' },
			{ name: 'onDeactivate', type: '() => void', description: 'Called when the fade-out finishes.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and any other attribute are forwarded to the wrapper.' }
		],
		react: [
			{ name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Reaches the wrapper element.' },
			{ name: 'onActivate', type: '() => void', description: 'Called when the fade-in finishes.' },
			{ name: 'onDeactivate', type: '() => void', description: 'Called when the fade-out finishes.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'className, style (an object) and any other attribute are forwarded to the wrapper.' }
		],
		vue: [
			{ name: '@activate', type: 'event', description: 'Emitted when the fade-in finishes.' },
			{ name: '@deactivate', type: 'event', description: 'Emitted when the fade-out finishes.' },
			{ name: 'template ref', type: '{ element }', description: 'A ref on the component gives the wrapper as element.' },
			{ name: 'attributes', type: 'fallthrough', description: 'class, style, @click and other attributes fall through to the wrapper.' }
		],
		elements: [
			{ name: 'activate', type: 'event', description: 'Fired on the tag when the fade-in finishes. It does not bubble.' },
			{ name: 'deactivate', type: 'event', description: 'Fired on the tag when the fade-out finishes. It does not bubble.' },
			{ name: 'properties', type: 'camelCase', description: 'Every option is also a property: colorVariant in JavaScript is color-variant in HTML. A boolean attribute is on when it is there and off as active="false".' },
			{ name: 'style', type: 'attribute', description: 'The tag is the wrapper, a block element: its own class and style are where the CSS variables go.' }
		],
		vanilla: [
			{ name: 'hooks', type: '{ onActivate?, onDeactivate? }', description: 'The third argument of attachBorderBeam: called when the fade-in and the fade-out finish.' },
			{ name: 'returns', type: '{ update, destroy }', description: 'update(options) replaces the whole set of options, so pass every one each time; destroy() stops the beam and takes its layers and attributes off the wrapper.' },
			{ name: 'mountBorderBeam', type: '(parent, options)', description: 'Makes the wrapper too, inside parent, round options.content (a node). Also takes class, onActivate and onDeactivate, and returns { element, update, destroy }; its update keeps the options it is not given, and its destroy removes the wrapper.' }
		]
	};

	/* the wrapper in a sentence, and the style that makes it hug its content */
	const wrapperIs: Record<Framework, string> = {
		svelte: 'The beam is drawn on the wrapper, which is a block element.',
		react: 'The beam is drawn on the wrapper, which is a block element.',
		vue: 'The beam is drawn on the wrapper, which is a block element.',
		elements: 'The tag is the wrapper, and a block element.',
		vanilla: 'The beam is drawn on the wrapper, which is an element of the page’s own.'
	};
	const fitContent: Record<Framework, string> = {
		svelte: 'style="width: fit-content"',
		react: "style={{ width: 'fit-content' }}",
		vue: 'style="width: fit-content"',
		elements: 'style="width: fit-content"',
		vanilla: 'width: fit-content'
	};

	const cssHooks: PropRow[] = [
		{ name: '--beam-hue-base', type: '<angle>', default: '0deg', description: 'Rotates the whole palette.' },
		{ name: '--beam-stroke-opacity', type: '<number>', default: '1', description: 'Multiplier on the 1px beam stroke.' },
		{ name: '--beam-inner-opacity', type: '<number>', default: '1', description: 'Multiplier on the soft light inside the border.' },
		{ name: '--beam-bloom-opacity', type: '<number>', default: '1', description: 'Multiplier on the outer halo.' },
		{ name: '--beam-spike-mul', type: '<number>', default: '1', description: 'Line type only: how tall the travelling spikes rise.' },
		{ name: '--pulse-glow-sx', type: '<number>', default: '1', description: 'Pulse types: horizontal spread of the glow. pulse-outside sets it from the element size.' },
		{ name: '--pulse-glow-sy', type: '<number>', default: '1', description: 'Pulse types: vertical spread of the glow.' },
		{ name: '--pulse-glow-boost', type: '<number>', default: '1', description: 'Pulse types: scales the glow on both axes.' }
	];
</script>

<DocsShell>
	<header>
		<LibIcon slug="border-beam" />
		<h1>Border beam</h1>
		<p class="lead">A soft glow that rides the border of any card, button or input.</p>
	</header>

	<div class="examples">
		<div class="cell wide">
			<BorderBeam size="md">
				<Subject kind="chat" />
			</BorderBeam>
		</div>
		<div class="cell">
			<BorderBeam size="sm">
				<Subject kind="button" />
			</BorderBeam>
		</div>
		<div class="cell grow">
			<BorderBeam size="line" borderRadius={20}>
				<Subject kind="search" />
			</BorderBeam>
		</div>
		<div class="cell half">
			<BorderBeam size="pulse-inner">
				<Subject kind="tasks" />
			</BorderBeam>
		</div>
		<div class="cell half">
			<BorderBeam size="pulse-outside">
				<Subject kind="card" />
			</BorderBeam>
		</div>
	</div>

	<section id="playground">
		<h2>Playground</h2>
		<Playground />
	</section>

	<section id="install">
		<h2>Install</h2>
		<div class="stack">
			<InstallTabs registry="border-beam" />
			<CodeBlock code={importOnly} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			{#if framework.id === 'elements'}
				Put the element that should glow inside the tag. The tag is the wrapper, with no shadow
				root, and it adds three decorative layers that ignore pointer events, so your element keeps
				its markup and its styles.
			{:else if framework.id === 'vanilla'}
				Call <code class="icode">attachBorderBeam</code> on a wrapper round the element that should
				glow. It adds three decorative layers that ignore pointer events, so your element keeps its
				markup. <code class="icode">mountBorderBeam</code> makes the wrapper as well.
			{:else}
				Wrap the element that should glow. The component adds one wrapper and three decorative
				layers that ignore pointer events, so your element keeps its markup.
			{/if}
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			<code class="icode">active</code> fades the beam in and out, and tells you when each fade has
			finished.
		</p>
		<CodeBlock code={playPause} />
		<p class="text">
			CSS variables tune single layers, and <code class="icode">css</code> appends your own rules to
			the generated sheet.
		</p>
		<CodeBlock code={hooks} />
	</section>

	<section id="props">
		<h2>Props</h2>
		<PropsTable rows={[...content[framework.id], ...options, ...reach[framework.id]]} />
	</section>

	<section id="css">
		<h2>CSS variables</h2>
		<PropsTable rows={cssHooks} nameLabel="Variable" />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>
				<code class="icode">pulse-outside</code> draws its halo behind the element. Give the wrapped
				element an opaque background and its own 1px border, and leave unclipped space around it.
			</li>
			<li>
				{wrapperIs[framework.id]} If the wrapped element is narrower than its container, give the
				wrapper <code class="icode">{fitContent[framework.id]}</code> so the two stay the same size.
			</li>
			<li>
				Beams pause while offscreen. The pulse types stop under
				<code class="icode">prefers-reduced-motion</code>.
			</li>
			<li>
				Works in Chrome 85, Safari 15.4 and Firefox 128 or newer. Without
				<code class="icode">@property</code> the travelling beam steps instead of gliding.
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
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 10px;
	}
	.cell {
		display: grid;
		place-items: center;
		height: 240px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
		/* Room for the halo: the stage clips, so the element sits well inside it. */
		overflow: hidden;
		grid-column: span 2;
		padding: 0 16px;
	}
	.cell.wide {
		grid-column: 1 / -1;
		height: 290px;
	}
	.cell.grow {
		grid-column: span 4;
	}
	.cell.half {
		grid-column: span 3;
		height: 290px;
	}
	.cell :global(.tasks),
	.cell :global(.card) {
		width: 250px;
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
	.notes {
		margin: 0;
		padding-left: 18px;
		display: grid;
		gap: 8px;
		max-width: 68ch;
		color: var(--fg-2);
	}

	@media (max-width: 620px) {
		.cell,
		.cell.grow,
		.cell.half {
			grid-column: 1 / -1;
		}
	}
</style>
