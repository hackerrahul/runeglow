<script lang="ts">
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import type { Framework } from '#lib/code.ts';
	import Playground from '#lib/demos/distortion-waves/Playground.svelte';
	import Scene from '#lib/demos/distortion-waves/Scene.svelte';
	import { attached, imperative, importOnly, quickStart, ring } from '#lib/demos/distortion-waves/code.ts';
	import { framework } from '#lib/framework.svelte.ts';

	const fw = $derived(framework.id);

	const FIRST = 'The view that shows first. Give it an opaque background.';
	const SECOND = 'The view the wave leaves behind. Without one the wave passes over the first view and leaves it as it was.';
	const OVER = 'Stays above the wave, unbent and uncoloured, over both views: the button that starts it, a spinner, a video.';

	/* how the two views and the overlay are handed over, which is different in kind in each framework */
	const views: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'children', type: 'Snippet', description: FIRST },
			{ name: 'revealedContent', type: 'Snippet', description: SECOND },
			{ name: 'overlay', type: 'Snippet', description: OVER }
		],
		react: [
			{ name: 'children', type: 'ReactNode', description: FIRST },
			{ name: 'revealedContent', type: 'ReactNode', description: SECOND },
			{ name: 'overlay', type: 'ReactNode', description: OVER }
		],
		vue: [
			{ name: 'default slot', type: 'slot', description: FIRST },
			{ name: '#revealedContent', type: 'slot', description: SECOND },
			{ name: '#overlay', type: 'slot', description: OVER }
		],
		elements: [
			{ name: 'first child', type: 'element', description: `${FIRST} It is the first child element with no slot attribute, used as it stands.` },
			{ name: 'slot="revealed"', type: 'element', description: `${SECOND} It is the child with this attribute.` },
			{ name: 'slot="overlay"', type: 'element', description: `${OVER} It is the child with this attribute; what is inside it takes clicks.` }
		],
		vanilla: [
			{ name: 'content', type: 'Node', description: `${FIRST} It is moved into the wave’s element when that is made.` },
			{ name: 'revealedContent', type: 'Node', description: SECOND },
			{ name: 'overlay', type: 'Node', description: OVER }
		]
	};

	/* where a wave starts, which a ref or a selector can also say */
	const source: Record<Framework, PropRow> = {
		svelte: { name: 'source', type: 'Element | { x, y, w, h }', default: 'the control last pressed', description: 'Where the wave starts.' },
		react: { name: 'source', type: 'Element | RefObject<Element> | { x, y, w, h }', default: 'the control last pressed', description: 'Where the wave starts.' },
		vue: { name: 'source', type: 'Element | { x, y, w, h }', default: 'the control last pressed', description: 'Where the wave starts.' },
		elements: {
			name: 'source',
			type: 'selector | { x, y, w, h } as JSON',
			default: 'the control last pressed',
			description: 'Where the wave starts. The attribute is a selector for an element inside the wave, or a rectangle as JSON; the property also takes an element.'
		},
		vanilla: { name: 'source', type: 'Element | { x, y, w, h }', default: 'the control last pressed', description: 'Where the wave starts.' }
	};

	const options = $derived<PropRow[]>([
		{
			name: 'revealed',
			type: 'boolean',
			description:
				fw === 'elements'
					? 'Which view shows. Changing it runs the wave: set the property, or write revealed="false" to go back, since taking the attribute away changes nothing. Leave it out to drive the wave with play().'
					: 'Which view shows. Changing it runs the wave. Leave it out to drive the wave with play().'
		},
		{ name: 'type', type: "'vertical' | 'horizontal' | 'center'", default: "'vertical'", description: 'Up from a button at the bottom, across from a source at the left, or a ring out from an icon.' },
		source[fw],
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
		{ name: 'reducedMotion', type: "'system' | 'always' | 'never'", default: "'system'", description: 'When to crossfade instead.' }
	]);

	/* how the end of a wave is told and how the element is reached, each framework its own way */
	const reach: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'onFinish', type: '(revealed: boolean) => void', description: 'Called when a wave ends.' },
			{ name: 'ref', type: 'HTMLDivElement | null', description: 'The wave’s element. Bindable with bind:ref.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and other attributes go to the element.' }
		],
		react: [
			{ name: 'onFinish', type: '(revealed: boolean) => void', description: 'Called when a wave ends.' },
			{ name: 'ref', type: 'Ref<DistortionWaveRef>', description: 'The functions below, and element, the wave’s element.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'className, style and other attributes go to the element.' }
		],
		vue: [
			{ name: '@finish', type: '(revealed: boolean) => void', description: 'Emitted when a wave ends.' },
			{ name: 'template ref', type: '{ play, reverse, reset, prepare, getController, element }', description: 'A ref on the component gives the functions below, and element, the wave’s element.' },
			{ name: 'attributes', type: 'fallthrough', description: 'class, style and other attributes fall through to the element.' }
		],
		elements: [
			{ name: 'finish', type: 'CustomEvent<{ revealed }>', description: 'Fired on the element when a wave ends. event.detail.revealed is the view now showing.' },
			{
				name: 'attributes',
				type: 'kebab-case',
				description: 'Every option is an attribute: waveStyle in JavaScript is wave-style in HTML. A record is written as JSON, a palette of your own included, and false as ="false".'
			},
			{
				name: 'properties',
				type: 'camelCase',
				description: 'Every option is also a property, under its own name except focus, which is focusPoint because every element has a focus() already. A capture function can only be a property.'
			}
		],
		vanilla: [
			{ name: 'onFinish', type: '(revealed: boolean) => void', description: 'Called when a wave ends.' },
			{ name: 'class', type: 'string', description: 'A class for the wave’s element.' },
			{ name: 'style', type: 'string', description: 'Inline styles for the wave’s element, after its own. Read when the element is made.' },
			{ name: 'returns', type: '{ element, update, destroy, … }', description: 'The wave’s element, made inside the parent you passed, and the functions below.' }
		]
	};

	const fns: PropRow[] = [
		{ name: 'play(options?)', type: '{ source?, focus? }', description: 'Runs the wave from the start.' },
		{ name: 'reverse()', type: '', description: 'Runs it back to the first view.' },
		{ name: 'reset()', type: '', description: 'Straight back to the first view, with no wave.' },
		{ name: 'prepare()', type: '() => Promise<void>', description: 'Pictures the element now, so the next wave starts with its lens.' },
		{ name: 'getController()', type: '() => WaveController | null', description: 'The engine behind it.' }
	];

	/* what else is beside the functions, where they are not on the component itself */
	const ELEMENT: PropRow = { name: 'element', type: 'HTMLDivElement | null', description: 'The wave’s element.' };
	const moreFns: Record<Framework, PropRow[]> = {
		svelte: [],
		react: [ELEMENT],
		vue: [ELEMENT],
		elements: [],
		vanilla: [
			{ name: 'element', type: 'HTMLDivElement', description: 'The wave’s element. From mountDistortionWave only.' },
			{ name: 'update(options)', type: '', description: 'From mountDistortionWave it changes some options and keeps the rest; from attachDistortionWave it takes the whole set each time.' },
			{
				name: 'destroy()',
				type: '',
				description: 'Stops the wave. mountDistortionWave’s also takes its element, with the views in it, out of the page; attachDistortionWave’s leaves the page’s elements as it found them.'
			}
		]
	};
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
			<CodeBlock code={importOnly} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			{#if fw === 'svelte'}
				Put the first view in the component and the second in
				<code class="icode">revealedContent</code>.
			{:else if fw === 'react'}
				Put the first view in the component and pass the second as
				<code class="icode">revealedContent</code>.
			{:else if fw === 'vue'}
				Put the first view in the component and the second in the
				<code class="icode">#revealedContent</code> slot.
			{:else if fw === 'elements'}
				Each view is one child of the element: the first child is the first view, and the child with
				<code class="icode">slot="revealed"</code> is the second.
			{:else}
				<code class="icode">mountDistortionWave</code> makes the wave’s element inside a parent. Hand it the
				first view as <code class="icode">content</code> and the second as
				<code class="icode">revealedContent</code>.
			{/if}
			Both are your own markup, laid on top of each other; the element takes the size of the larger.
			{#if fw === 'elements'}
				Setting <code class="icode">revealed</code> runs the wave, and setting it to false collapses the
				wave into its source.
			{:else if fw === 'vanilla'}
				Updating <code class="icode">revealed</code> runs the wave, and setting it back collapses the wave
				into its source.
			{:else}
				Changing <code class="icode">revealed</code> runs the wave, and setting it back collapses the wave
				into its source.
			{/if}
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			A center wave rings out from an element you name with <code class="icode">source</code>.
			<code class="icode">{fw === 'elements' ? 'wave-style' : 'waveStyle'}</code> changes any of its numbers.
		</p>
		<CodeBlock code={ring} />
		<p class="text">
			Without a second view the wave passes over the content and leaves it as it was.
			{#if fw === 'svelte'}
				Bind the component to run it yourself.
			{:else if fw === 'react'}
				Put a ref on the component to run it yourself.
			{:else if fw === 'vue'}
				Put a template ref on the component to run it yourself.
			{:else if fw === 'elements'}
				Call the element’s <code class="icode">play()</code> to run it yourself.
			{:else}
				Call <code class="icode">play()</code> on what the function returns to run it yourself.
			{/if}
		</p>
		<CodeBlock code={imperative} />
		{#if fw === 'vanilla'}
			<p class="text">
				<code class="icode">attachDistortionWave</code> runs the wave on markup the page already has,
				without moving anything: an element, and its children as the layers.
			</p>
			<CodeBlock code={attached} />
		{/if}
	</section>

	<section id="props">
		<h2>{fw === 'elements' ? 'Attributes' : fw === 'vanilla' ? 'Options' : 'Props'}</h2>
		<PropsTable rows={[...views[fw], ...options, ...reach[fw]]} nameLabel={fw === 'vanilla' ? 'Option' : fw === 'elements' ? 'Attribute' : 'Prop'} />
	</section>

	<section id="functions">
		<h2>Functions</h2>
		<p class="text">
			{#if fw === 'svelte'}
				Bind the component with <code class="icode">bind:this</code> and call these on it.
			{:else if fw === 'react'}
				Put a <code class="icode">ref</code> on the component and call these on its
				<code class="icode">current</code>.
			{:else if fw === 'vue'}
				Put a template <code class="icode">ref</code> on the component and call these on it.
			{:else if fw === 'elements'}
				These are methods of the element.
			{:else}
				These are on what <code class="icode">mountDistortionWave</code> and
				<code class="icode">attachDistortionWave</code> return.
			{/if}
		</p>
		<PropsTable rows={[...fns, ...moreFns[fw]]} nameLabel="Function" />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>
				The wave bends a picture of your markup, taken ahead of the run. What animates inside a view
				stands still while the wave passes; anything that must stay live goes in
				<code class="icode">{fw === 'vue' ? '#overlay' : fw === 'elements' ? 'slot="overlay"' : 'overlay'}</code>.
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
