<script lang="ts">
	import { ImageGeneration } from '@runeglow/svelte/img-fx';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import { IMAGE_POOL } from '#lib/demos/img-fx/images.ts';
	import Playground from '#lib/demos/img-fx/Playground.svelte';
	import { importOnly, manual, quickStart } from '#lib/demos/img-fx/code.ts';
	import type { Framework } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';

	/* The three example cards share one pool. Each reports what it is showing,
	   so no two of them show the same image at once. */
	const showing: (string | null)[] = [null, null, null];
	const others = (i: number) => () => showing.filter((src, j): src is string => j !== i && src != null);
	const track = (i: number) => (e: { phase: string; src?: string | null }) => {
		if (e.phase === 'reveal' && e.src) showing[i] = e.src;
		else if (e.phase === 'idle') showing[i] = null;
	};

	const props: PropRow[] = [
		{ name: 'preset', type: "'pixels-organic' | 'pixels-mechanic' | 'sweep-gradient'", default: "'pixels-organic'", description: 'A flowing mosaic, a mechanical one, or a gradient sweeping corner to corner with cells flickering along it.' },
		{ name: 'images', type: 'string | string[]', description: 'The pool of image URLs a reveal picks from. Same-origin, or served with CORS headers.' },
		{ name: 'autoReveal', type: 'boolean', default: 'false', description: 'Reveals an image from the pool on a loop.' },
		{ name: 'revealDelayRange', type: '[number, number]', default: '[2, 4]', description: 'Seconds between auto reveals, picked at random in this range.' },
		{ name: 'revealInitialDelay', type: 'number | [number, number]', description: 'Seconds before the first auto reveal. Use it to stagger several cards.' },
		{ name: 'revealHoldMs', type: 'number | [number, number]', default: '2000', description: 'How long an auto-revealed image stays.' },
		{ name: 'revealFadeOutMs', type: 'number', default: '300', description: 'The cross-fade back to the effect.' },
		{ name: 'theme', type: "'auto' | 'dark' | 'light'", default: "'auto'", description: 'auto reads data-theme or a dark/light class on <html>, then the system setting.' },
		{ name: 'strength', type: 'number', default: '1', description: 'Intensity, 0 to 2.' },
		{ name: 'speed', type: 'number', default: '1', description: 'Multiplier on the animation clock.' },
		{ name: 'pixelScale', type: 'number', default: '1', description: 'Size of the mosaic’s cells.' },
		{ name: 'cardBg', type: 'string', default: 'per preset', description: 'The card surface the effect sits on and reasons against.' },
		{ name: 'colors', type: '(string | null)[]', description: 'Seven palette slots. null keeps the preset’s colour for that slot.' },
		{ name: 'borderRadius', type: 'number', default: 'auto', description: 'Corner radius in px. Omit it to read the wrapped element’s.' },
		{ name: 'paused', type: 'boolean', default: 'false', description: 'Freezes the effect and the reveal schedule.' }
	];

	/* how a phase of the reveal cycle is heard, which each framework does its own way */
	const phases = 'Called on each phase change: idle, reveal, visible, hide.';
	const cycle: Record<Framework, PropRow> = {
		svelte: { name: 'onCycle', type: '(event) => void', description: phases },
		react: { name: 'onCycle', type: '(event) => void', description: phases },
		vue: { name: 'onCycle', type: '(event) => void', description: `${phases} In a template, @cycle.` },
		elements: { name: 'onCycle', type: '(event) => void', description: `${phases} A property only. Each phase is also a cycle event, with the phase and the image’s address in event.detail.` },
		vanilla: { name: 'onCycle', type: '(event) => void', description: phases }
	};

	const advanced = $derived<PropRow[]>([
		{
			name: 'excludeSrcs',
			type: '() => string[] | Set<string>',
			description: `Images to avoid on the next pick, so cards sharing a pool don’t show the same one.${framework.id === 'elements' ? ' A property only.' : ''}`
		},
		{ name: 'fragmentShader', type: 'string', description: 'A replacement fragment shader. It applies page-wide while set.' }
	]);

	/* how the wrapper and the reveal functions are reached, which each framework does its own way */
	const reach: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'ref', type: 'HTMLDivElement | null', description: 'The wrapper element. Bindable with bind:ref.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and other attributes are forwarded to the wrapper.' }
		],
		react: [
			{ name: 'ref', type: 'Ref<ImageGenerationRef>', description: 'The functions below, and the wrapper element as element.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'className, style and other attributes are forwarded to the wrapper.' }
		],
		vue: [
			{ name: 'template ref', type: '{ element, …functions }', description: 'A ref on the component gives the wrapper as element, and the functions below.' },
			{ name: 'attributes', type: 'fallthrough', description: 'class, style, @click and other attributes fall through to the wrapper.' }
		],
		elements: [
			{ name: 'properties', type: 'camelCase', description: 'Every option is an attribute and a property: pixelScale in JavaScript is pixel-scale in HTML. A list is written as JSON in an attribute; images may also be one address as it stands.' },
			{ name: '::part(wrapper)', type: 'CSS', description: 'The wrapper is in the element’s shadow root. Style it from the page as runeglow-image-generation::part(wrapper).' }
		],
		vanilla: [
			{ name: 'returns', type: '{ element, update, destroy, …functions }', description: 'The wrapper, which is the element it was given; update(options) changes some options and keeps the rest; destroy() stops the card and puts the element back as it was found; and the functions below.' }
		]
	};

	/* where the reveal functions are found */
	const HOLD: Record<Framework, string> = {
		svelte: 'bind the component',
		react: 'put a ref on the component',
		vue: 'put a template ref on the component',
		elements: 'take hold of the element',
		vanilla: 'keep what the call returns'
	};

	const fns: PropRow[] = [
		{ name: 'triggerReveal(opts?)', type: "{ hold?: 'auto' | 'manual' }", description: 'Reveals an image now. With hold: manual it stays until triggerHide().' },
		{ name: 'triggerHide()', type: '', description: 'Fades the revealed image back to the effect.' },
		{ name: 'triggerRegenerate(opts?)', type: '{ durationMs?, tintFromImage?, autoReveal? }', description: 'Breaks the revealed image into cells, churns, and resolves the next image from the pool.' },
		{ name: 'isImageActive()', type: '() => boolean', description: 'Whether an image is showing over the effect.' }
	];
</script>

<DocsShell>
	<header>
		<LibIcon slug="img-fx" />
		<h1>Image generation</h1>
		<p class="lead">A loader for image cards: a living mosaic that resolves into the picture once it is ready.</p>
	</header>

	<div class="examples">
		<div class="cell big">
			<ImageGeneration preset="pixels-organic" theme="dark" cardBg="#1b1b1b" images={IMAGE_POOL} autoReveal revealInitialDelay={1} excludeSrcs={others(0)} onCycle={track(0)} style="max-width: 100%;">
				<div class="card"></div>
			</ImageGeneration>
		</div>
		<div class="cell">
			<ImageGeneration preset="pixels-mechanic" theme="dark" cardBg="#1b1b1b" images={IMAGE_POOL} autoReveal revealInitialDelay={[2, 3]} excludeSrcs={others(1)} onCycle={track(1)} style="max-width: 100%;">
				<div class="card sm"></div>
			</ImageGeneration>
			<span class="tag">Mechanic</span>
		</div>
		<div class="cell">
			<ImageGeneration preset="sweep-gradient" theme="dark" cardBg="#1b1b1b" images={IMAGE_POOL} autoReveal revealInitialDelay={[3, 4.5]} excludeSrcs={others(2)} onCycle={track(2)} style="max-width: 100%;">
				<div class="card sm"></div>
			</ImageGeneration>
			<span class="tag">Gradient sweep</span>
		</div>
	</div>
	<p class="caption">Each card reveals an image from a shared pool every few seconds, then returns to generating.</p>

	<section id="playground">
		<h2>Playground</h2>
		<Playground />
	</section>

	<section id="install">
		<h2>Install</h2>
		<div class="stack">
			<InstallTabs extra="three" registry="img-fx" />
			<CodeBlock code={importOnly} copyLabel="Copy import" />
		</div>
		<p class="text after">
			This one needs <code class="icode">three</code> alongside the package. The other libraries don’t.
		</p>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			{#if framework.id === 'vanilla'}
				Put the card inside an element and hand that element over. It becomes the wrapper: it sizes
				itself to the card and reads its corner radius.
			{:else if framework.id === 'elements'}
				Put the card inside the tag. The tag sizes itself to it and reads its corner radius.
			{:else}
				Wrap the card. The wrapper sizes itself to it and reads its corner radius.
			{/if}
			With <code class="icode">{framework.id === 'elements' ? 'auto-reveal' : 'autoReveal'}</code> it shows an
			image from the pool on a loop.
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			For a real generation flow, {HOLD[framework.id]} and call its functions: reveal when the image
			arrives, and regenerate to break it up and resolve the next.
		</p>
		<CodeBlock code={manual} />
	</section>

	<section id="props">
		<h2>Props</h2>
		<PropsTable rows={[...props, cycle[framework.id], ...advanced, ...reach[framework.id]]} />
	</section>

	<section id="functions">
		<h2>Functions</h2>
		<p class="text">
			{#if framework.id === 'svelte'}
				Bind the component with <code class="icode">bind:this</code> and call these on it.
			{:else if framework.id === 'react'}
				Put a <code class="icode">ref</code> on the component and call these on
				<code class="icode">ref.current</code>.
			{:else if framework.id === 'vue'}
				Put a template ref on the component and call these on it.
			{:else if framework.id === 'elements'}
				These are methods of the element.
			{:else}
				These are on what <code class="icode">mountImageGeneration</code> returns.
				<code class="icode">attachImageGeneration</code> returns them too, with an
				<code class="icode">update</code> that takes the whole set of options each time.
			{/if}
		</p>
		<PropsTable rows={fns} nameLabel="Function" />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>One WebGL context is shared by every card on the page, and cards pause while offscreen.</li>
			<li>
				The effect runs at 10 frames a second by default, which suits its slow drift.
				<code class="icode">setFrameRate</code> raises it.
			</li>
			<li>
				Cell size is in CSS pixels, so a larger card gets more cells, not bigger ones.
			</li>
			<li>
				Regenerate samples its colours from the image on screen. That needs same-origin images or
				CORS headers; without them it falls back to the preset’s palette.
			</li>
			<li>
				Regenerate always churns as a pixel mosaic. A gradient sweep card switches to one for the
				churn and back once the next image is shown.
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
		grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
		grid-template-rows: 1fr 1fr;
		gap: 10px;
	}
	.cell {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 22px 16px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.cell.big {
		grid-row: 1 / -1;
	}
	.card {
		width: 300px;
		max-width: 100%;
		aspect-ratio: 1 / 1;
		border-radius: 20px;
	}
	.card.sm {
		width: 150px;
		border-radius: 16px;
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
	.text.after {
		margin: 12px 0 0;
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

	@media (max-width: 700px) {
		.examples {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: none;
		}
		.cell.big {
			grid-row: auto;
		}
	}
</style>
