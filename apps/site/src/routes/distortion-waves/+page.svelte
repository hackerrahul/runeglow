<script lang="ts">
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import Playground from '#lib/demos/distortion-waves/Playground.svelte';
	import Scene from '#lib/demos/distortion-waves/Scene.svelte';
	import { SITE } from '#lib/site.ts';

	const quickStart = `<script>
  import { DistortionWave } from '${SITE.pkg}/distortion-waves';

  let sent = $state(false);
<\/script>

<DistortionWave revealed={sent} style="width: 320px; border-radius: 28px; overflow: hidden;">
  <Review />

  {#snippet revealedContent()}
    <Receipt />
  {/snippet}

  {#snippet overlay()}
    <button onclick={() => (sent = true)}>Confirm</button>
  {/snippet}
</DistortionWave>`;

	const ring = `<script>
  import { DistortionWave } from '${SITE.pkg}/distortion-waves';

  let token = $state(null);
  let bought = $state(false);
<\/script>

<DistortionWave type="center" palette="ocean" revealed={bought} source={token} waveStyle={{ travel: 2.8 }}>
  <Credits bind:token onbuy={() => (bought = true)} />

  {#snippet revealedContent()}
    <Credits added />
  {/snippet}
</DistortionWave>`;

	const imperative = `<script>
  import { DistortionWave } from '${SITE.pkg}/distortion-waves';

  let wave; // the component
<\/script>

<!-- No second view: the wave passes over the content and leaves it as it was. -->
<DistortionWave bind:this={wave} type="horizontal" palette="mono">
  <Article />
</DistortionWave>

<button onclick={(e) => wave.play({ source: e.currentTarget })}>Refresh</button>`;

	const props: PropRow[] = [
		{ name: 'children', type: 'Snippet', description: 'The view that shows first. Give it an opaque background.' },
		{ name: 'revealedContent', type: 'Snippet', description: 'The view the wave leaves behind. Without one the wave passes over the first view and leaves it as it was.' },
		{ name: 'overlay', type: 'Snippet', description: 'Stays above the wave, unbent and uncoloured, over both views: the button that starts it, a spinner, a video.' },
		{ name: 'revealed', type: 'boolean', description: 'Which view shows. Changing it runs the wave. Leave it out to drive the wave with play().' },
		{ name: 'type', type: "'vertical' | 'horizontal' | 'center'", default: "'vertical'", description: 'Up from a button at the bottom, across from a source at the left, or a ring out from an icon.' },
		{ name: 'source', type: 'Element | { x, y, w, h }', default: 'the control last pressed', description: 'Where the wave starts.' },
		{ name: 'focus', type: '{ x, y } | null', default: 'the last press', description: 'The point the front leans toward, in the element’s CSS pixels.' },
		{ name: 'palette', type: "'colorful' | 'green' | 'ocean' | 'sunset' | 'mono' | '#RRGGBB' | Palette", default: 'the type’s own', description: 'The colours.' },
		{ name: 'waveStyle', type: 'Partial<WaveStyle>', default: 'the type’s own', description: 'Any of the wave’s numbers: travel, swell, blur, aberration, edge, particles.' },
		{ name: 'scale', type: "number | 'auto'", default: "'auto'", description: 'CSS pixels per point. auto sizes the wave to the element.' },
		{ name: 'cornerRadius', type: 'number', default: 'the element’s', description: 'The radius the edge colour follows.' },
		{ name: 'scrub', type: 'number | null', description: 'Holds the wave at this point of its run, 0 to 1, instead of playing.' },
		{ name: 'capture', type: 'boolean | CaptureFunction', default: 'true', description: 'How the element is pictured. false draws the colour alone.' },
		{ name: 'live', type: "boolean | 'animations'", default: 'true', description: 'Whether the picture follows the element while the wave is out.' },
		{ name: 'prewarm', type: 'boolean', default: 'true', description: 'Takes the first picture when the browser is idle after mounting.' },
		{ name: 'resolution', type: 'number', default: 'the display’s', description: 'Canvas pixels per CSS pixel.' },
		{ name: 'reducedMotion', type: "'system' | 'always' | 'never'", default: "'system'", description: 'When to crossfade instead.' },
		{ name: 'onFinish', type: '(revealed: boolean) => void', description: 'Called when a wave ends.' },
		{ name: 'ref', type: 'HTMLDivElement | null', description: 'The wave’s element. Bindable with bind:ref.' },
		{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and other attributes go to the element.' }
	];

	const fns: PropRow[] = [
		{ name: 'play(options?)', type: '{ source?, focus? }', description: 'Runs the wave from the start.' },
		{ name: 'reverse()', type: '', description: 'Runs it back to the first view.' },
		{ name: 'reset()', type: '', description: 'Straight back to the first view, with no wave.' },
		{ name: 'prepare()', type: '() => Promise<void>', description: 'Pictures the element now, so the next wave starts with its lens.' },
		{ name: 'getController()', type: '() => WaveController | null', description: 'The engine behind it.' }
	];
</script>

<DocsShell>
	<header>
		<LibIcon slug="distortion-waves" />
		<h1>Distortion waves</h1>
		<p class="lead">A coloured wave that leaves a button, an edge or an icon and carries one view into another, bending the page as it passes.</p>
	</header>

	<div class="examples">
		<div class="cell tall">
			<Scene kind="transfer" autoplay />
			<span class="tag">Vertical</span>
		</div>
		<div class="cell">
			<Scene kind="credits" autoplay />
			<span class="tag">Center</span>
		</div>
		<div class="cell">
			<Scene kind="toast" autoplay />
			<span class="tag">Horizontal</span>
		</div>
	</div>
	<p class="caption">These run on a timer. Press a card’s button to run its wave yourself.</p>

	<section id="playground">
		<h2>Playground</h2>
		<Playground />
	</section>

	<section id="install">
		<h2>Install</h2>
		<div class="stack">
			<InstallTabs registry="distortion-waves" />
			<CodeBlock code={`import { DistortionWave } from '${SITE.pkg}/distortion-waves';`} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			Put the first view in the component and the second in
			<code class="icode">revealedContent</code>. Both are your own markup, laid on top of each other;
			the element takes the size of the larger. Changing <code class="icode">revealed</code> runs the
			wave, and setting it back collapses the wave into its source.
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			A center wave rings out from an element you name with <code class="icode">source</code>.
			<code class="icode">waveStyle</code> changes any of its numbers.
		</p>
		<CodeBlock code={ring} />
		<p class="text">
			Without a second view the wave passes over the content and leaves it as it was. Bind the
			component to run it yourself.
		</p>
		<CodeBlock code={imperative} />
	</section>

	<section id="props">
		<h2>Props</h2>
		<PropsTable rows={props} />
	</section>

	<section id="functions">
		<h2>Functions</h2>
		<p class="text">Bind the component with <code class="icode">bind:this</code> and call these on it.</p>
		<PropsTable rows={fns} nameLabel="Function" />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>
				The wave bends a picture of your markup, taken ahead of the run. What animates inside a view
				stands still while the wave passes; anything that must stay live goes in
				<code class="icode">overlay</code>.
			</li>
			<li>
				The picture can hold text, same-origin or CORS images, SVG, gradients, shadows and web fonts.
				It cannot see cross-origin images or fonts without CORS, closed shadow roots or iframes. Add
				<code class="icode">data-dw-skip</code> to leave an element out.
			</li>
			<li>
				A <code class="icode">&lt;canvas data-dw-live&gt;</code> inside a view is read every frame, so
				the wave bends it as it animates. Keep these small.
			</li>
			<li>It needs WebGL 2. Without it, or when the visitor asks for reduced motion, it crossfades.</li>
			<li>
				<code class="icode">WaveController</code> is the same wave without a component, for any
				element. The model and the renderer are exported too.
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
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
		grid-template-rows: auto auto;
		gap: 10px;
	}
	.cell {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 26px 16px 34px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.cell.tall {
		grid-row: 1 / -1;
	}
	.tag {
		position: absolute;
		left: 14px;
		bottom: 10px;
		font-size: 12px;
		color: var(--fg-3);
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
	.notes {
		margin: 0;
		padding-left: 18px;
		display: grid;
		gap: 8px;
		max-width: 68ch;
		color: var(--fg-2);
	}

	@media (max-width: 760px) {
		.examples {
			grid-template-columns: minmax(0, 1fr);
		}
		.cell.tall {
			grid-row: auto;
		}
	}
</style>
