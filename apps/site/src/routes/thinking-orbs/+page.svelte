<script lang="ts">
	import { ThinkingOrb, type OrbState } from 'runeglow/thinking-orbs';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import OrbPill from '#lib/demos/thinking-orbs/OrbPill.svelte';
	import Playground from '#lib/demos/thinking-orbs/Playground.svelte';
	import { SITE } from '#lib/site.ts';

	const STATES: { state: OrbState; what: string }[] = [
		{ state: 'working', what: 'Particles on tilted orbits' },
		{ state: 'searching', what: 'A scan sweeps a dotted globe' },
		{ state: 'solving', what: 'Bands scramble, then click back' },
		{ state: 'listening', what: 'A waveform rolls through the rings' },
		{ state: 'connecting', what: 'A constellation wires itself' },
		{ state: 'weaving', what: 'Three strands plait around a sphere' },
		{ state: 'composing', what: 'An undulating multi-band sash' },
		{ state: 'breathing', what: 'A ring, slowly morphing' },
		{ state: 'shaping', what: 'Circle to triangle to square' }
	];

	const quickStart = `<script>
  import { ThinkingOrb } from '${SITE.pkg}/thinking-orbs';
<\/script>

<ThinkingOrb state="searching" />`;

	const inline = `<script>
  import { ThinkingOrb } from '${SITE.pkg}/thinking-orbs';

  let busy = $state(true);
<\/script>

{#if busy}
  <p class="status">
    <ThinkingOrb state="working" size={20} aria-hidden="true" />
    Working…
  </p>
{/if}`;

	const tuned = `<ThinkingOrb
  state="connecting"
  color="#7cd4ff"
  speed={1.4}
  dots={1.5}
  opts={{ thr: 0.9, signals: 8 }}
/>`;

	const engine = `import { resolvePreset, MODE_FRAMES } from '${SITE.pkg}/thinking-orbs/engine';

const { mode, speed, opts } = resolvePreset('searching', 64);
const { dots, lines } = MODE_FRAMES[mode](64, seconds * speed, opts);
// dots and lines are z-sorted and final: draw them in order.`;

	const props: PropRow[] = [
		{ name: 'state', type: "'working' | 'searching' | 'solving' | 'listening' | 'connecting' | 'weaving' | 'composing' | 'breathing' | 'shaping'", default: "'working'", description: 'Which animation to show.' },
		{ name: 'size', type: '64 | 32 | 20', default: '64', description: 'A tuned preset, not a scale factor. 64 is avatar scale, 20 sits inline with text, 32 is interpolated between them.' },
		{ name: 'theme', type: "'auto' | 'dark' | 'light'", default: "'auto'", description: 'auto follows a data-theme attribute or dark/light class on an ancestor, then prefers-color-scheme. dark draws light dots, light draws dark dots.' },
		{ name: 'speed', type: 'number', default: '1', description: 'Multiplier on top of the preset’s own speed.' },
		{ name: 'paused', type: 'boolean', default: 'false', description: 'Freezes the animation on the current frame.' },
		{ name: 'color', type: 'string', description: 'Ink tint as #rgb, #rrggbb or rgb(). The depth shading is kept. Omit for grayscale.' },
		{ name: 'dots', type: 'number', default: '1', description: 'Density multiplier: 0.5 halves the dots, 2 doubles them.' },
		{ name: 'dotSize', type: 'number', default: '1', description: 'Radius multiplier for every dot.' },
		{ name: 'opts', type: 'ModeOpts', description: 'Raw engine options merged over the preset. Which keys do something depends on the state; the playground lists them.' },
		{ name: 'frame', type: 'ModeFrame', description: 'Replaces the state’s geometry with your own function: (size, t, opts) => { dots, lines }.' },
		{ name: 'gravity', type: 'boolean | GravityOptions', description: 'Bends a drawn pointer toward the orb as it comes near. Needs a pointer raster as gravity.sprite.' },
		{ name: 'ref', type: 'HTMLCanvasElement | null', description: 'The canvas element. Bindable with bind:ref.' },
		{ name: '...rest', type: 'HTMLCanvasAttributes', description: 'class, style, aria-label and any other attribute are forwarded to the canvas.' }
	];

	const gravityOpts: PropRow[] = [
		{ name: 'sprite', type: 'CursorSprite', description: 'The pointer raster: { src, width, height, hotX, hotY }. Without one, gravity stays off.' },
		{ name: 'reach', type: 'number', default: '160', description: 'How far outside the orb the pull is felt, in px.' },
		{ name: 'strength', type: 'number', default: '11', description: 'Length of the tail the pointer trails toward the orb, in px.' },
		{ name: 'deform', type: 'number', default: '19', description: 'How far the pointer’s body bends toward the orb, in px. The tip stays put.' },
		{ name: 'taper', type: 'number', default: '1.95', description: '1 to 4. Higher keeps the tip firm and bends the far end hardest.' },
		{ name: 'curve', type: 'number', default: '2.8', description: '1 to 4. Higher keeps the pointer whole until it is close.' },
		{ name: 'falloff', type: 'number', default: '24', description: 'Width of the band across the pointer over which the tail fades, in px.' },
		{ name: 'smoothing', type: 'number', default: '0.3', description: '0 to 1. How much the bend lags the pointer.' },
		{ name: 'handover', type: 'number', default: '0.6', description: '0 to 1. How slowly the pull swings from one orb to the next.' },
		{ name: 'squash', type: 'number', default: '1.2', description: '0 to 3. Extra bend when the orb is off the tip’s side.' },
		{ name: 'blur', type: 'number', default: '1', description: 'Blur at the far end of the tail, in px.' },
		{ name: 'fadeMs', type: 'number', default: '180', description: 'Fade in and out as the pointer enters and leaves, in ms.' }
	];
</script>

<DocsShell>
	<header>
		<LibIcon slug="thinking-orbs" />
		<h1>Thinking orbs</h1>
		<p class="lead">Orbs that think while you wait: nine loading states for AI interfaces.</p>
	</header>

	<div class="hero-cell">
		<OrbPill state="solving" size={64} />
		<OrbPill state="composing" size={64} label="Thinking…" color="#b9aeff" />
	</div>

	<div class="states">
		{#each STATES as s (s.state)}
			<div class="state">
				<ThinkingOrb state={s.state} aria-hidden="true" />
				<p class="name">{s.state}</p>
				<p class="what">{s.what}</p>
			</div>
		{/each}
	</div>

	<section id="playground">
		<h2>Playground</h2>
		<Playground />
	</section>

	<section id="install">
		<h2>Install</h2>
		<div class="stack">
			<InstallTabs registry="thinking-orbs" />
			<CodeBlock code={`import { ThinkingOrb } from '${SITE.pkg}/thinking-orbs';`} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">One element, no wrapper. It draws on a plain 2D canvas, so there is no WebGL to set up.</p>
		<CodeBlock code={quickStart} />
		<p class="text">
			At <code class="icode">size={'{20}'}</code> it sits inline with text. When a visible label says
			the same thing, hide the orb from screen readers.
		</p>
		<CodeBlock code={inline} />
		<p class="text">
			Tint it, change its pace and density, or reach into the engine’s own options through
			<code class="icode">opts</code>.
		</p>
		<CodeBlock code={tuned} />
		<p class="text">
			The geometry is also available on its own, with no Svelte and no DOM, for drawing on a canvas
			of your own.
		</p>
		<CodeBlock code={engine} />
	</section>

	<section id="props">
		<h2>Props</h2>
		<PropsTable rows={props} />
	</section>

	<section id="gravity">
		<h2>Gravity options</h2>
		<PropsTable rows={gravityOpts} nameLabel="Option" />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>
				Each orb labels itself from its state (“Searching…”). Pass
				<code class="icode">aria-label</code> to change the wording.
			</li>
			<li>
				Orbs pause while offscreen or in a hidden tab, and show a single still frame under
				<code class="icode">prefers-reduced-motion</code>.
			</li>
			<li>
				Gravity hides the real pointer near an orb and draws a raster in its place, so the raster
				should match the platform’s pointer. It turns itself off on touch devices, zoomed pages and
				under reduced motion.
			</li>
			<li>All mounted orbs share one clock, so several on a page stay in phase.</li>
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

	.hero-cell {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 20px 28px;
		min-height: 250px;
		padding: 32px 20px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.states {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin-top: 10px;
	}
	.state {
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 26px 14px 20px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
		text-align: center;
	}
	.name {
		margin-top: 12px;
		font-size: 13.5px;
		font-weight: 500;
	}
	.what {
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

	@media (max-width: 620px) {
		.states {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
