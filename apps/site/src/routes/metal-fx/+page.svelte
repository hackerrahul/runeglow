<script lang="ts">
	import { MetalBadge, MetalFx, MetalText, useMetalTextReflection } from 'runeglow/metal-fx';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import Composer from '#lib/demos/metal-fx/Composer.svelte';
	import Playground from '#lib/demos/metal-fx/Playground.svelte';
	import '#lib/demos/metal-fx/demo.css';
	import { SITE } from '#lib/site.ts';

	let plan = $state<HTMLSpanElement | null>(null);
	useMetalTextReflection(() => plan);

	const quickStart = `<script>
  import { MetalFx } from '${SITE.pkg}/metal-fx';
<\/script>

<MetalFx>
  <button class="upgrade">Upgrade to Pro</button>
</MetalFx>

<MetalFx variant="circle" preset="gold">
  <button aria-label="Send"><ArrowUp /></button>
</MetalFx>`;

	const reflect = `<script>
  import { MetalFx, useMetalBend } from '${SITE.pkg}/metal-fx';

  let ring = $state(null);
  let chip = $state(null);
  useMetalBend(() => ring); // the ring dents under the cursor
<\/script>

<button bind:this={chip}>Tools</button>

<MetalFx bind:ref={ring} variant="circle" innerShadow reflectionTargets={[chip]}>
  <button aria-label="Send"><ArrowUp /></button>
</MetalFx>`;

	const text = `<script>
  import { MetalText, MetalBadge, useMetalTextReflection } from '${SITE.pkg}/metal-fx';

  let plan = $state(null);
  useMetalTextReflection(() => plan); // "Plan" catches the metal on its letters
<\/script>

<span bind:this={plan}>Plan</span>
<MetalText
  text="Pro"
  font="500 24px/1.2 Inter, sans-serif"
  color="#e2e2e2"
  reflectionTargets={[{ el: plan, strength: 0.64 }]}
/>

<MetalBadge text="New" />`;

	const tune = `<script>
  import { setGlowConfig, setBendConfig, setSharedPresetMode, PRESETS } from '${SITE.pkg}/metal-fx';

  setGlowConfig({ haloOpMul: 1.2 });          // a calmer halo
  setBendConfig({ strength: 1.2, reach: 48 }); // a deeper dent
  setSharedPresetMode({ ...PRESETS.silver.modes.dark, repetition: 3, distortion: 0.2 });
<\/script>`;

	const props: PropRow[] = [
		{ name: 'variant', type: "'button' | 'circle'", default: "'button'", description: 'A pill ring 1px wide, or a compact circle with a 2px ring.' },
		{ name: 'preset', type: "'chromatic' | 'silver' | 'gold'", default: "'chromatic'", description: 'The palette. Shared by every instance on the page.' },
		{ name: 'theme', type: "'auto' | 'dark' | 'light'", default: "'auto'", description: 'auto follows the system setting, live.' },
		{ name: 'strength', type: 'number', default: '1', description: 'Opacity of the metal and its glow, 0 to 1. The shader keeps animating at any value.' },
		{ name: 'glowGain', type: 'number', default: '1', description: 'Multiplier on the glow only, on top of strength.' },
		{ name: 'paused', type: 'boolean', default: 'false', description: 'Freezes this instance on its current frame.' },
		{ name: 'disableGlow', type: 'boolean', default: 'false', description: 'Leaves the wandering halo out. The ring still renders.' },
		{ name: 'innerShadow', type: 'boolean | { offsetY?, blur?, alpha?, color? }', description: 'A hairline of light along the top inside edge of the ring.' },
		{ name: 'reflectionTargets', type: 'Array<HTMLElement | { el, strength? }>', description: 'Neighbouring elements that catch a reflection of the ring. Dark theme only.' },
		{ name: 'borderRadius', type: 'number', default: 'auto', description: 'Corner radius in px. Omit it to read the wrapped element’s.' },
		{ name: 'shaderScale', type: 'number', default: '1.6 / 1.3', description: 'Zoom of the metal’s pattern.' },
		{ name: 'ringCssPx', type: 'number', default: '1 / 2', description: 'Ring thickness in px.' },
		{ name: 'scale', type: 'number', default: '1', description: 'Multiplies every pixel constant, for an interface drawn larger than 1×.' },
		{ name: 'normalizeHostStyles', type: 'boolean', default: 'true', description: 'Clears the wrapped element’s own border, outline and shadow so they don’t fight the ring.' },
		{ name: 'mask', type: '(ctx, width, height, dpr) => void', description: 'Paint your own alpha mask: the metal shows only where it paints. MetalText and MetalBadge are built on it.' },
		{ name: 'glowMode', type: "'mask' | 'ring'", default: "'mask'", description: 'With a mask, whether the glow sits inside the mask or along the element’s edge.' },
		{ name: 'ref', type: 'HTMLDivElement | null', description: 'The wrapper element. Bindable with bind:ref.' },
		{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and other attributes are forwarded to the wrapper.' }
	];

	const textProps: PropRow[] = [
		{ name: 'text', type: 'string', description: 'The text. It is drawn into the metal’s mask as well as the page.' },
		{ name: 'font', type: 'string', description: 'CSS font shorthand, such as 500 24px/1.2 Inter, sans-serif.' },
		{ name: 'color', type: 'string', description: 'The base text colour. The metal composites over it.' },
		{ name: 'metalOpacity', type: 'number', default: '0.62', description: 'How much metal shows over the base colour.' },
		{ name: 'shaderScale', type: 'number', default: '2.8', description: 'Zoom of the metal inside the letters.' },
		{ name: 'innerShadow', type: '{ offsetY, blur, alpha } | null', default: '{ 1, 0.5, 0.9 }', description: 'Light along the top inside edge of each letter. null turns it off.' },
		{ name: 'glow, glowGain', type: 'boolean, number', default: 'false, 2.5', description: 'A halo clipped to the letters.' },
		{ name: 'strength, theme, paused, reflectionTargets, ref', type: '', description: 'As on MetalFx.' }
	];

	const badgeProps: PropRow[] = [
		{ name: 'text', type: 'string', default: "'New'", description: 'The label.' },
		{ name: 'scale', type: 'number', default: '1', description: 'Size multiplier on the 45 by 25 px design.' },
		{ name: 'metalOpacity', type: 'number', default: '0.8', description: 'How much metal shows over the white fill.' },
		{ name: 'core', type: '{ r, blur, a, size }', description: 'The clean white core under the label: solid radius, ramp width, opacity, ellipse size.' },
		{ name: 'gradient, glow', type: 'number', default: '0, 0.41', description: 'A top-to-bottom white wash, and the soft inner glow.' },
		{ name: 'textColor', type: 'string', default: "'#323232'", description: 'Colour of the label.' },
		{ name: 'strength, theme, shaderScale, paused, reflectionTargets, ref', type: '', description: 'As on MetalFx.' }
	];

	const fns: PropRow[] = [
		{ name: 'useMetalBend(() => el, getConfig?)', type: '', description: 'The ring dents like liquid under the cursor. Call it while a component is set up, with a function returning the MetalFx element.' },
		{ name: 'useMetalTextReflection(() => el)', type: '', description: 'A text element that is a reflection target catches the light on its letters only.' },
		{ name: 'attachMetalBend(el), attachMetalTextReflection(el)', type: '', description: 'The same two as plain functions that return a cleanup, for use outside a component.' },
		{ name: 'setGlowConfig, resetGlowConfig', type: '', description: 'Tune the halo: intensity, fades, sizes.' },
		{ name: 'setBendConfig, resetBendConfig', type: '', description: 'Tune the cursor bend: strength, reach, the largest dent, the springs.' },
		{ name: 'setCursorSprite, setCursorLightConfig', type: '', description: 'Let the metal light the pointer. It needs an image of the pointer to draw in its place.' },
		{ name: 'setSharedPreset, setSharedPresetMode', type: '', description: 'Set the material directly: stripes, softness, dispersion, distortion, angle, speed.' },
		{ name: 'isMetalFxSupported()', type: '', description: 'Whether this browser has WebGL2.' }
	];
</script>

<DocsShell>
	<header>
		<LibIcon slug="metal-fx" />
		<h1>Liquid metal</h1>
		<p class="lead">A ring of flowing metal around a button, in its text or on a badge, that lights whatever sits next to it.</p>
	</header>

	<div class="examples">
		<div class="cell wide">
			<Composer />
		</div>
		<div class="cell">
			<MetalFx theme="dark" strength={0.63}>
				<button type="button" class="mfx-pill">Upgrade to Pro</button>
			</MetalFx>
		</div>
		<div class="cell">
			<div class="mfx-line plan">
				<span class="mfx-plan" bind:this={plan} style="font: 500 24px/1.2 Inter, 'Geist', sans-serif;">Plan</span>
				<MetalText
					text="Pro"
					font="500 24px/1.2 Inter, 'Geist', sans-serif"
					color="#e2e2e2"
					theme="dark"
					strength={0.9}
					reflectionTargets={[{ el: plan, strength: 0.64 }]}
				/>
			</div>
		</div>
		<div class="cell">
			<div class="mfx-line">
				<span class="mfx-live">Live mode</span>
				<MetalBadge text="New" theme="dark" strength={0.9} />
			</div>
		</div>
	</div>
	<p class="caption">Move the cursor across the send button: the ring dents, and the chip beside it catches its light.</p>

	<section id="playground">
		<h2>Playground</h2>
		<Playground />
	</section>

	<section id="install">
		<h2>Install</h2>
		<div class="stack">
			<InstallTabs registry="metal-fx" />
			<CodeBlock code={`import { MetalFx, MetalText, MetalBadge } from '${SITE.pkg}/metal-fx';`} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			Wrap one element. The ring is drawn on top of it, and the element stays fully interactive. The
			wrapper is <code class="icode">inline-flex</code> and sizes itself to the element.
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			Hand it neighbouring elements and they catch a reflection of the ring.
			<code class="icode">useMetalBend</code> makes the ring dent under the cursor.
		</p>
		<CodeBlock code={reflect} />
		<p class="text">Metal can fill text, or dress a badge.</p>
		<CodeBlock code={text} />
		<p class="text">
			The glow, the bend and the material are tuned for the whole page, since one renderer draws
			every instance.
		</p>
		<CodeBlock code={tune} />
	</section>

	<section id="props">
		<h2>MetalFx</h2>
		<PropsTable rows={props} />
	</section>

	<section id="text">
		<h2>MetalText</h2>
		<PropsTable rows={textProps} />
	</section>

	<section id="badge">
		<h2>MetalBadge</h2>
		<PropsTable rows={badgeProps} />
	</section>

	<section id="functions">
		<h2>Functions</h2>
		<PropsTable rows={fns} nameLabel="Function" />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>
				It needs WebGL2. Where that is missing, the wrapped element renders as it is, and the wrapper
				carries <code class="icode">data-metal-fx-unsupported</code>.
			</li>
			<li>
				One WebGL context and one animation loop are shared by every instance on the page. That is
				why the preset, the theme and the material are shared too: the last one set wins.
			</li>
			<li>Reflections are skipped in the light theme.</li>
			<li>Instances pause while offscreen.</li>
			<li>
				The material is Paper Shaders’ <code class="icode">liquidMetal</code> shader, used unmodified
				under the Apache 2.0 licence. The package’s NOTICE file carries the attribution.
			</li>
			<li>
				The cursor reflection redraws the pointer as an image while it is lit. This site uses its own
				arrow for that; supply the one that matches your users’ pointer.
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
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.cell {
		display: grid;
		/* a real track, so a wide demo shrinks to the cell instead of widening the page */
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		min-height: 150px;
		padding: 24px 16px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.cell.wide {
		grid-column: 1 / -1;
		min-height: 220px;
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
	}
</style>
