<script lang="ts">
	import { BorderBeam } from 'runeglow/border-beam';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import Playground from '#lib/demos/border-beam/Playground.svelte';
	import Subject from '#lib/demos/border-beam/Subject.svelte';
	import { SITE } from '#lib/site.ts';

	const quickStart = `<script>
  import { BorderBeam } from '${SITE.pkg}/border-beam';
<\/script>

<BorderBeam>
  <div class="card">Your content here</div>
</BorderBeam>`;

	const playPause = `<script>
  import { BorderBeam } from '${SITE.pkg}/border-beam';

  let thinking = $state(false);
<\/script>

<BorderBeam
  size="pulse-inner"
  active={thinking}
  onDeactivate={() => console.log('faded out')}
>
  <textarea placeholder="Ask anything…"></textarea>
</BorderBeam>`;

	const hooks = `<BorderBeam
  size="line"
  style="--beam-hue-base: 40deg; --beam-spike-mul: 1.4"
  css={\`
    [data-beam="{id}"] [data-beam-bloom] { mix-blend-mode: screen; }
  \`}
>
  <SearchBar />
</BorderBeam>`;

	const props: PropRow[] = [
		{ name: 'children', type: 'Snippet', description: 'The element to wrap. Its border radius is detected automatically.' },
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
		{ name: 'css', type: 'string', description: 'Extra CSS appended to the generated sheet. {id} is replaced with the instance id.' },
		{ name: 'ref', type: 'HTMLDivElement | null', description: 'The wrapper element. Bindable with bind:ref.' },
		{ name: 'onActivate', type: '() => void', description: 'Called when the fade-in finishes.' },
		{ name: 'onDeactivate', type: '() => void', description: 'Called when the fade-out finishes.' },
		{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and any other attribute are forwarded to the wrapper.' }
	];

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
			<CodeBlock code={`import { BorderBeam } from '${SITE.pkg}/border-beam';`} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			Wrap the element that should glow. The component adds one wrapper and three decorative
			layers that ignore pointer events, so your element keeps its markup.
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
		<PropsTable rows={props} />
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
				The beam is drawn on the wrapper, which is a block element. If the wrapped element is
				narrower than its container, give the wrapper
				<code class="icode">style="width: fit-content"</code> so the two stay the same size.
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
