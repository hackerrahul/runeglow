<script lang="ts">
	import { BotAvatar, botAvatarPresets, botAvatarTypes } from 'runeglow/bot-avatars';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import Playground from '#lib/demos/bot-avatars/Playground.svelte';
	import { SITE } from '#lib/site.ts';

	const SHADINGS = ['fabric', 'plastic', 'crisp', 'smooth', 'flat'] as const;

	const quickStart = `<script>
  import { BotAvatar } from '${SITE.pkg}/bot-avatars';
<\/script>

<BotAvatar type="clover" />`;

	const status = `<script>
  import { BotAvatar } from '${SITE.pkg}/bot-avatars';

  let { busy } = $props();
<\/script>

<BotAvatar type="cat" state={busy ? 'working' : 'default'} size={40} />`;

	const dressed = `<BotAvatar
  type="ghost"
  shading="plastic"
  hat="party"
  glasses="round"
  accessoryColor="#c8323c"
/>`;

	const row = `<!-- The same seed keeps a row blinking in step; leave it out and each goes its own way. -->
<BotAvatar type="star" seed={0.3} />
<BotAvatar type="drop" seed={0.3} />`;

	const trio = `<!-- A typing indicator: three bare dots, each on its own beat. -->
<span class="typing">
  <BotAvatar type="dot" state="working" size={22} seed={0.1} />
  <BotAvatar type="dot" state="working" size={22} seed={0.4} />
  <BotAvatar type="dot" state="working" size={22} seed={0.7} />
</span>`;

	const props: PropRow[] = [
		{ name: 'type', type: 'BotAvatarType', default: "'clover'", description: 'The body shape, one of twenty-one. Each has its own colour and face position.' },
		{ name: 'state', type: "'default' | 'working' | 'sleeping'", default: "'default'", description: 'What the bot is doing: idle, hopping and spinning, or asleep.' },
		{ name: 'face', type: "'eyes' | 'mouth' | 'none'", default: "type's own", description: 'Eyes alone, eyes with a small mouth that changes with the state, or no face at all.' },
		{ name: 'size', type: 'number | string', default: '64', description: 'Rendered size in px, or any CSS length.' },
		{ name: 'color', type: 'string', default: "type's own", description: 'Body colour.' },
		{ name: 'ink', type: 'string', default: 'auto', description: 'Face colour. Dark by default, light on a dark body.' },
		{ name: 'brightness', type: 'number', default: '1', description: 'Lightness of the body colour, 0.5 to 1.5.' },
		{ name: 'saturation', type: 'number', default: '1.5', description: 'Saturation of the body colour, 0.5 to 2.5.' },
		{ name: 'shading', type: "'fabric' | 'plastic' | 'crisp' | 'smooth' | 'flat'", default: "'fabric'", description: 'How the body is lit: plush fur, glossy plastic, a clean lit rim, a soft gradient, or no lighting.' },
		{ name: 'hat', type: "'none' | 'beret' | 'beanie' | 'party' | 'crown'", default: "'none'", description: 'A hat that sits on the head and turns with it.' },
		{ name: 'glasses', type: "'none' | 'round' | 'square' | 'shades'", default: "'none'", description: 'Glasses over the eyes.' },
		{ name: 'headphones', type: 'boolean', default: 'false', description: 'Headphones, a cup on either side.' },
		{ name: 'bowTie', type: 'boolean', default: 'false', description: 'A bow tie under the face.' },
		{ name: 'accessoryColor', type: 'string', default: "'#27272b'", description: 'Colour of the hat, headphones and bow tie.' },
		{ name: 'speed', type: 'number', default: '1', description: 'Multiplier on every animation.' },
		{ name: 'paused', type: 'boolean', default: 'false', description: 'Freezes on the current frame.' },
		{ name: 'seed', type: 'number', default: 'per instance', description: '0 to 1. Offsets blink and glance timing. Give two avatars the same seed to move them in step.' },
		{ name: 'interactive', type: 'boolean', default: 'true', description: 'Eyes and head follow a nearby pointer, and a click makes the avatar hop and turn.' },
		{ name: 'turn', type: 'number', default: '1', description: 'How far the head turns from side to side while idle, 0 to 2.' },
		{ name: 'pose', type: '{ yaw?, pitch?, roll? }', description: 'Holds the body at an orientation, in radians, in place of its own motion.' },
		{ name: 'path', type: 'string', description: 'SVG path data in a 100 by 100 box. Replaces the type’s outline.' },
		{ name: 'theme', type: "'auto' | 'dark' | 'light'", default: "'auto'", description: 'The surface the avatar sits on. auto reads data-theme or a dark/light class on an ancestor, then the system.' },
		{ name: 'ref', type: 'HTMLCanvasElement | null', description: 'The canvas element. Bindable with bind:ref.' },
		{ name: '...rest', type: 'HTMLCanvasAttributes', description: 'class, style, aria-label, onclick and other attributes are forwarded to the canvas.' }
	];

	const material: PropRow[] = [
		{ name: 'shadow', type: 'number', default: '0.35 (1.15 fabric)', description: 'Strength of the shadow side, 0 to 2.' },
		{ name: 'highlight', type: 'number', default: '1.3 (1.45 fabric)', description: 'Strength of the lit side, 0 to 2.' },
		{ name: 'light', type: 'number', default: '300 (295 fabric)', description: 'Where the light comes from, in degrees clockwise from the top.' },
		{ name: 'rim', type: 'number', default: '0.5 (0.6 fabric)', description: 'The lit rim in crisp, the Fresnel rim in plastic, the back light in fabric. 0 to 2.' },
		{ name: 'spread', type: 'number', default: '1.55 (1.6 fabric)', description: 'How far the light wraps round, 0.4 to 2.5.' },
		{ name: 'depth', type: 'number', default: '0.65', description: 'Thickness of the body, 0.2 to 2. Shows when it turns or flips.' },
		{ name: 'roundness', type: 'number', default: '1', description: 'Plastic and fabric: 1 is inflated like a cushion, 0 is a slab with soft edges.' },
		{ name: 'lightFront', type: 'number', default: '32', description: 'Fabric: how far round to the front the key light sits, 0 to 85 degrees.' },
		{ name: 'backLight', type: 'number', default: 'auto', description: 'Fabric: where the back light comes from, in degrees.' },
		{ name: 'backSoftness', type: 'number', default: '1', description: 'Fabric: 0 is a small hard back light, 1 a large soft one.' },
		{ name: 'shine', type: 'number', default: '0', description: 'Fabric: highlights along single fibres, 0 to 2.' },
		{ name: 'sheen', type: 'number', default: '0', description: 'Fabric: a smooth satin sheen over the edge, 0 to 2.' },
		{ name: 'furLength', type: 'number', default: '1', description: 'Length of the pile, 0.3 to 2.5.' },
		{ name: 'furDensity', type: 'number', default: '1.6', description: 'How many fibres, 0.3 to 2.' },
		{ name: 'furFuzz', type: 'number', default: '0.9', description: 'Softness of the silhouette, 0 to 1.' },
		{ name: 'furClumps', type: 'number', default: '0.4', description: 'How much the fibres gather into tufts, 0 to 1.' },
		{ name: 'furCurl', type: 'number', default: '0.7', description: 'How wavy the fibres are, 0 to 1.' },
		{ name: 'furGravity', type: 'number', default: '0.9', description: 'How much the pile hangs down, 0 to 1.' }
	];

	const motion: PropRow[] = [
		{ name: 'jumpEvery', type: 'number', default: '8', description: 'Seconds between idle jumps, give or take 40%. 0 for none.' },
		{ name: 'jumpHeight', type: 'number', default: '26', description: 'How high, in body units (the body is 100 tall).' },
		{ name: 'jumpTime', type: 'number', default: '0.68', description: 'Seconds in the air.' },
		{ name: 'jumpStretch', type: 'number', default: '1', description: 'Stretch in the air, 0 to 2.' },
		{ name: 'jumpSpin', type: 'number', default: '1', description: 'Whole turns in the air, 0 to 2.' },
		{ name: 'jumpLean', type: 'number', default: '6', description: 'Degrees of lean into a jump.' },
		{ name: 'jumpSquash', type: 'number', default: '1.15', description: 'Squash on the ground, 0 to 2.' },
		{ name: 'jumpSquashTime', type: 'number', default: '0.37', description: 'Seconds the landing squash takes.' },
		{ name: 'jumpSquashEase', type: "'sharp' | 'pulse' | 'soft' | 'bouncy'", default: "'pulse'", description: 'How the landing squash plays out.' },
		{ name: 'jumpGroundTime', type: 'number', default: '0.11', description: 'Seconds held at the deepest squash.' },
		{ name: 'jumpGroundEase', type: "'sharp' | 'pulse' | 'soft' | 'bouncy'", default: "'pulse'", description: 'How the weight settles through that hold.' },
		{ name: 'jumpRiseTime', type: 'number', default: '0.33', description: 'Seconds to rise back to shape.' },
		{ name: 'jumpRiseEase', type: "'sharp' | 'pulse' | 'soft' | 'bouncy'", default: "'pulse'", description: 'How it rises.' },
		{ name: 'jumpClickSquashTime', type: 'number', default: '0.24', description: 'Seconds a click’s jump takes for its landing squash.' },
		{ name: 'jumpLand', type: 'number', default: '0', description: 'When the landing squash begins: seconds before (negative) or after touch-down.' },
		{ name: 'whirl', type: 'number', default: '0', description: 'A ring that trails round a spin. 0 is off, 1 on, up to 2.' },
		{ name: 'whirlSize', type: 'number', default: '1', description: 'Size of the ring, 0.6 to 1.6.' },
		{ name: 'whirlWidth', type: 'number', default: '1', description: 'Thickness of the trail, 0.4 to 2.' },
		{ name: 'whirlLength', type: 'number', default: '1', description: 'Length of the trail, 0.4 to 1.6.' },
		{ name: 'whirlTilt', type: 'number', default: '1', description: 'How open the ring is seen, 0.5 to 1.8.' }
	];
</script>

<DocsShell>
	<header>
		<LibIcon slug="bot-avatars" />
		<h1>Bot avatars</h1>
		<p class="lead">Animated faces for AI agents: twenty-one shapes, three states, five materials.</p>
	</header>

	<div class="hero-cell">
		<BotAvatar type="clover" size={112} seed={0.15} />
		<BotAvatar type="cat" size={112} state="working" headphones seed={0.5} />
		<BotAvatar type="ghost" size={112} state="sleeping" seed={0.8} />
	</div>

	<div class="types">
		{#each botAvatarTypes as type, i (type)}
			<div class="type">
				<BotAvatar {type} size={52} seed={(i * 0.137) % 1} jumpEvery={0} />
				<p>{botAvatarPresets[type].label}</p>
			</div>
		{/each}
	</div>

	<div class="shadings minimal">
		<div class="type">
			<BotAvatar type="dot" shading="plastic" size={64} seed={0.2} />
			<p>dot</p>
		</div>
		<div class="type">
			<BotAvatar type="dot" shading="flat" color="#ffffff" size={64} seed={0.6} turn={0} jumpSpin={0} />
			<p>dot, flat</p>
		</div>
		<div class="type">
			<span class="trio">
				<BotAvatar type="dot" shading="plastic" state="working" size={22} seed={0.1} />
				<BotAvatar type="dot" shading="plastic" state="working" size={22} seed={0.4} />
				<BotAvatar type="dot" shading="plastic" state="working" size={22} seed={0.7} />
			</span>
			<p>three dots, working</p>
		</div>
		<div class="type">
			<BotAvatar type="planet" shading="plastic" size={64} seed={0.7} />
			<p>planet</p>
		</div>
		<div class="type">
			<BotAvatar type="spark" size={64} seed={0.9} />
			<p>spark</p>
		</div>
	</div>

	<div class="shadings">
		{#each SHADINGS as shading (shading)}
			<div class="type">
				<BotAvatar type="circle" {shading} size={64} seed={0.4} jumpEvery={0} />
				<p>{shading}</p>
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
			<InstallTabs registry="bot-avatars" />
			<CodeBlock code={`import { BotAvatar } from '${SITE.pkg}/bot-avatars';`} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">One element. It lays out at its <code class="icode">size</code> and keeps room around itself to hop and flip.</p>
		<CodeBlock code={quickStart} />
		<p class="text">Drive <code class="icode">state</code> from what the agent is really doing.</p>
		<CodeBlock code={status} />
		<p class="text">Change the material and dress it up.</p>
		<CodeBlock code={dressed} />
		<p class="text">Avatars in a row each keep their own timing unless you give them the same seed.</p>
		<CodeBlock code={row} />
		<p class="text">
			<code class="icode">dot</code> has no face, so it works as a plain orb, or three in a row as a
			typing indicator.
		</p>
		<CodeBlock code={trio} />
	</section>

	<section id="props">
		<h2>Props</h2>
		<PropsTable rows={props} />
	</section>

	<section id="material">
		<h2>Lighting and material</h2>
		<PropsTable rows={material} />
	</section>

	<section id="motion">
		<h2>Jump and whirl</h2>
		<PropsTable rows={motion} />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>
				<code class="icode">dot</code>, <code class="icode">planet</code>,
				<code class="icode">spark</code> and
				<code class="icode">face="none"</code> are Runeglow additions; the React library does not have
				them.
			</li>
			<li>
				Fabric and plastic build their material in the background on idle time. An avatar fades in
				once its material is ready, so a page of them appears together.
			</li>
			<li>
				Each avatar labels itself, for example “Clover bot, working”. Pass
				<code class="icode">aria-label</code> to change the wording.
			</li>
			<li>
				Avatars stop animating while offscreen or in a hidden tab, and show the state’s still pose
				under <code class="icode">prefers-reduced-motion</code>.
			</li>
			<li>Every avatar on a page shares one animation loop.</li>
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

	.hero-cell,
	.types,
	.shadings {
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.hero-cell {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 28px 56px;
		min-height: 270px;
		padding: 40px 20px;
	}
	.types,
	.shadings {
		display: grid;
		gap: 26px 8px;
		margin-top: 10px;
		padding: 34px 16px 22px;
	}
	.types {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
	.shadings {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}
	.type {
		display: grid;
		justify-items: center;
		gap: 14px;
	}
	.trio {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 64px;
	}
	.type p {
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
		.types {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.shadings {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
