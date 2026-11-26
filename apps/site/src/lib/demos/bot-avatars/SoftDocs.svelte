<!-- The fabric, plastic and flat families: one component, BotAvatar, in the
     family's material. The page remounts this when the family changes. -->
<script lang="ts">
	import { BotAvatar, botAvatarPresets, botAvatarTypes, type BotAvatarShading } from '@runeglow/svelte/bot-avatars';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import { example, expr, fragment, importLine, perFramework, type Framework } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';
	import Playground from './Playground.svelte';
	import type { SoftFamily } from './families.ts';

	let { family }: { family: SoftFamily } = $props();

	/* the material the family's galleries are shown in */
	const shading = $derived<BotAvatarShading>(family === 'flat' ? 'crisp' : family);
	/* fabric is the component's default, so its examples leave the prop out */
	const own = $derived(family === 'fabric' ? {} : { shading });

	const quickStart = $derived(example({ component: 'BotAvatar', props: { type: 'clover', ...own } }));

	const status = $derived(
		example({
			component: 'BotAvatar',
			props: { type: 'cat', ...own, state: expr("busy ? 'working' : 'default'"), size: 40 },
			input: 'busy'
		})
	);

	const dressed = $derived(
		fragment([{ component: 'BotAvatar', props: { type: 'ghost', ...own, hat: 'party', glasses: 'round', accessoryColor: '#c8323c' } }])
	);

	const lighting = fragment(
		(['crisp', 'smooth', 'flat'] as const).map((look) => ({ component: 'BotAvatar' as const, props: { type: 'hexagon', shading: look } })),
		{ comment: 'crisp: a lit rim with a clean edge. smooth: a soft gradient. flat: no lighting.' }
	);

	const row = $derived(
		fragment(
			[
				{ component: 'BotAvatar', props: { type: 'star', ...own, seed: 0.3 } },
				{ component: 'BotAvatar', props: { type: 'drop', ...own, seed: 0.3 } }
			],
			{ comment: 'The same seed keeps a row blinking in step; leave it out and each goes its own way.' }
		)
	);

	const trio = $derived(
		fragment(
			[0.1, 0.4, 0.7].map((seed) => ({ component: 'BotAvatar' as const, props: { type: 'dot', ...own, state: 'working', size: 22, seed } })),
			{ comment: 'A typing indicator: three bare dots, each on its own beat.', wrap: 'span.typing' }
		)
	);

	const importOnly = perFramework((fw) => importLine(fw, 'bot-avatars', [fw === 'vanilla' ? 'mountBotAvatar' : 'BotAvatar']));

	/* how the element itself is reached, which each framework does its own way */
	const reach: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'ref', type: 'HTMLCanvasElement | null', description: 'The canvas element. Bindable with bind:ref.' },
			{ name: '...rest', type: 'HTMLCanvasAttributes', description: 'class, style, aria-label, onclick and other attributes are forwarded to the canvas.' }
		],
		react: [
			{ name: 'ref', type: 'Ref<HTMLCanvasElement>', description: 'Reaches the canvas element.' },
			{ name: '...rest', type: 'CanvasHTMLAttributes', description: 'className, style, aria-label, onClick and other attributes are forwarded to the canvas.' }
		],
		vue: [
			{ name: 'template ref', type: '{ element, poke() }', description: 'A ref on the component gives the canvas as element, and poke(), which does what a click does.' },
			{ name: 'attributes', type: 'fallthrough', description: 'class, style, aria-label, @click and other attributes fall through to the canvas.' }
		],
		elements: [
			{ name: 'label', type: 'string', description: 'The accessible name, in place of the one the avatar gives itself.' },
			{ name: 'poke()', type: 'method', description: 'Does what a click does: a hop and a turn.' },
			{ name: 'properties', type: 'camelCase', description: 'Every option is also a property: accessoryColor in JavaScript is accessory-color in HTML.' }
		],
		vanilla: [
			{ name: 'class', type: 'string', description: 'A class for the canvas.' },
			{ name: 'label', type: 'string', description: 'The accessible name, in place of the one the avatar gives itself.' },
			{ name: 'returns', type: '{ element, update, poke, destroy }', description: 'The canvas; update(options) changes some options and keeps the rest; destroy() stops it and removes the canvas.' }
		]
	};

	const main: PropRow[] = [
		{ name: 'type', type: 'BotAvatarType', default: "'clover'", description: 'The body shape, one of twenty-one. Each has its own colour and face position.' },
		{ name: 'state', type: "'default' | 'working' | 'sleeping'", default: "'default'", description: 'What the bot is doing: idle, hopping and spinning, or asleep.' },
		{ name: 'face', type: "'eyes' | 'mouth' | 'none'", default: "type's own", description: 'Eyes alone, eyes with a small mouth that changes with the state, or no face at all.' },
		{ name: 'size', type: 'number | string', default: '64', description: 'Rendered size in px, or any CSS length.' },
		{ name: 'color', type: 'string', default: "type's own", description: 'Body colour.' },
		{ name: 'ink', type: 'string', default: 'auto', description: 'Face colour. Dark by default, light on a dark body.' },
		{ name: 'brightness', type: 'number', default: '1', description: 'Lightness of the body colour, 0.5 to 1.5.' },
		{ name: 'saturation', type: 'number', default: '1.5', description: 'Saturation of the body colour, 0.5 to 2.5.' },
		{ name: 'shading', type: "'fabric' | 'plastic' | 'crisp' | 'smooth' | 'flat'", default: "'fabric'", description: 'The material, and so the family: plush fur, glossy plastic, or one of the three flat looks (a clean lit rim, a soft gradient, no lighting).' },
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
	];

	const light: PropRow[] = [
		{ name: 'shadow', type: 'number', default: '0.35 (1.15 fabric)', description: 'Strength of the shadow side, 0 to 2.' },
		{ name: 'highlight', type: 'number', default: '1.3 (1.45 fabric)', description: 'Strength of the lit side, 0 to 2.' },
		{ name: 'light', type: 'number', default: '300 (295 fabric)', description: 'Where the light comes from, in degrees clockwise from the top.' },
		{ name: 'rim', type: 'number', default: '0.5 (0.6 fabric)', description: 'The lit rim in crisp, the Fresnel rim in plastic, the back light in fabric. 0 to 2.' },
		{ name: 'spread', type: 'number', default: '1.55 (1.6 fabric)', description: 'How far the light wraps round, 0.4 to 2.5.' },
		{ name: 'depth', type: 'number', default: '0.65', description: 'Thickness of the body, 0.2 to 2. Shows when it turns or flips.' },
		{ name: 'roundness', type: 'number', default: '1', description: 'Plastic and fabric: 1 is inflated like a cushion, 0 is a slab with soft edges.' }
	];
	const fur: PropRow[] = [
		{ name: 'lightFront', type: 'number', default: '32', description: 'How far round to the front the key light sits, 0 to 85 degrees.' },
		{ name: 'backLight', type: 'number', default: 'auto', description: 'Where the back light comes from, in degrees.' },
		{ name: 'backSoftness', type: 'number', default: '1', description: '0 is a small hard back light, 1 a large soft one.' },
		{ name: 'shine', type: 'number', default: '0', description: 'Highlights along single fibres, 0 to 2.' },
		{ name: 'sheen', type: 'number', default: '0', description: 'A smooth satin sheen over the edge, 0 to 2.' },
		{ name: 'furLength', type: 'number', default: '1', description: 'Length of the pile, 0.3 to 2.5.' },
		{ name: 'furDensity', type: 'number', default: '1.6', description: 'How many fibres, 0.3 to 2.' },
		{ name: 'furFuzz', type: 'number', default: '0.9', description: 'Softness of the silhouette, 0 to 1.' },
		{ name: 'furClumps', type: 'number', default: '0.4', description: 'How much the fibres gather into tufts, 0 to 1.' },
		{ name: 'furCurl', type: 'number', default: '0.7', description: 'How wavy the fibres are, 0 to 1.' },
		{ name: 'furGravity', type: 'number', default: '0.9', description: 'How much the pile hangs down, 0 to 1.' }
	];
	/* fabric's own light and pile only where the family uses them */
	const material = $derived(family === 'fabric' ? [...light, ...fur] : light);

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

<div class="ba-cell ba-hero">
	{#if family === 'fabric'}
		<BotAvatar type="clover" size={112} seed={0.15} />
		<BotAvatar type="cat" size={112} state="working" headphones seed={0.5} />
		<BotAvatar type="ghost" size={112} state="sleeping" seed={0.8} />
	{:else if family === 'plastic'}
		<BotAvatar type="blob" shading="plastic" size={112} seed={0.15} />
		<BotAvatar type="planet" shading="plastic" size={112} state="working" seed={0.5} />
		<BotAvatar type="star" shading="plastic" size={112} state="sleeping" seed={0.8} />
	{:else}
		<BotAvatar type="circle" shading="crisp" size={112} seed={0.15} />
		<BotAvatar type="hexagon" shading="smooth" size={112} state="working" seed={0.5} />
		<BotAvatar type="square" shading="flat" size={112} state="sleeping" seed={0.8} />
	{/if}
</div>

<div class="ba-cell ba-block">
	<p class="ba-cap"><strong>Shapes</strong> <span>type</span></p>
	<div class="ba-grid">
		{#each botAvatarTypes as type, i (type)}
			<div class="ba-item">
				<BotAvatar {type} {shading} size={52} seed={(i * 0.137) % 1} jumpEvery={0} />
				<p>{botAvatarPresets[type].label}</p>
			</div>
		{/each}
	</div>
</div>

{#if family === 'fabric'}
	<div class="ba-cell ba-block">
		<p class="ba-cap"><strong>Dressed</strong> <span>hat · glasses · headphones · bowTie</span></p>
		<div class="ba-grid" style:--cols="4" style:--cols-narrow="2">
			<div class="ba-item"><BotAvatar type="blob" hat="beret" accessoryColor="#c8323c" size={64} seed={0.1} jumpEvery={0} /><p>beret</p></div>
			<div class="ba-item"><BotAvatar type="cat" hat="beanie" accessoryColor="#2f5fd0" size={64} seed={0.25} jumpEvery={0} /><p>beanie</p></div>
			<div class="ba-item"><BotAvatar type="ghost" hat="party" accessoryColor="#e9a93b" size={64} seed={0.4} jumpEvery={0} /><p>party</p></div>
			<div class="ba-item"><BotAvatar type="circle" hat="crown" accessoryColor="#e9a93b" size={64} seed={0.55} jumpEvery={0} /><p>crown</p></div>
			<div class="ba-item"><BotAvatar type="clover" glasses="round" size={64} seed={0.7} jumpEvery={0} /><p>round glasses</p></div>
			<div class="ba-item"><BotAvatar type="pill" glasses="shades" size={64} seed={0.85} jumpEvery={0} /><p>shades</p></div>
			<div class="ba-item"><BotAvatar type="droid" headphones size={64} seed={0.3} jumpEvery={0} /><p>headphones</p></div>
			<div class="ba-item"><BotAvatar type="pebble" bowTie accessoryColor="#c8323c" size={64} seed={0.6} jumpEvery={0} /><p>bow tie</p></div>
		</div>
	</div>
{:else if family === 'plastic'}
	<div class="ba-cell ba-block">
		<p class="ba-cap"><strong>Minimal</strong> <span>no face, or barely one</span></p>
		<div class="ba-grid" style:--cols="4" style:--cols-narrow="2">
			<div class="ba-item"><BotAvatar type="dot" shading="plastic" size={64} seed={0.2} /><p>dot</p></div>
			<div class="ba-item">
				<span class="ba-trio">
					<BotAvatar type="dot" shading="plastic" state="working" size={22} seed={0.1} />
					<BotAvatar type="dot" shading="plastic" state="working" size={22} seed={0.4} />
					<BotAvatar type="dot" shading="plastic" state="working" size={22} seed={0.7} />
				</span>
				<p>three dots, working</p>
			</div>
			<div class="ba-item"><BotAvatar type="planet" shading="plastic" size={64} seed={0.7} /><p>planet</p></div>
			<div class="ba-item"><BotAvatar type="spark" shading="plastic" size={64} seed={0.9} /><p>spark</p></div>
		</div>
	</div>
{:else}
	<div class="ba-cell ba-block">
		<p class="ba-cap"><strong>Three ways to light it</strong> <span>shading</span></p>
		<div class="ba-grid" style:--cols="4" style:--cols-narrow="2">
			<div class="ba-item"><BotAvatar type="hexagon" shading="crisp" size={64} seed={0.4} jumpEvery={0} /><p>crisp</p></div>
			<div class="ba-item"><BotAvatar type="hexagon" shading="smooth" size={64} seed={0.4} jumpEvery={0} /><p>smooth</p></div>
			<div class="ba-item"><BotAvatar type="hexagon" shading="flat" size={64} seed={0.4} jumpEvery={0} /><p>flat</p></div>
			<div class="ba-item">
				<span class="ba-trio">
					<BotAvatar type="dot" shading="flat" color="#ffffff" state="working" size={22} seed={0.1} />
					<BotAvatar type="dot" shading="flat" color="#ffffff" state="working" size={22} seed={0.4} />
					<BotAvatar type="dot" shading="flat" color="#ffffff" state="working" size={22} seed={0.7} />
				</span>
				<p>flat dots, working</p>
			</div>
		</div>
	</div>
{/if}

<section id="playground">
	<h2>Playground</h2>
	<Playground {family} />
</section>

<section id="install">
	<h2>Install</h2>
	<div class="ba-stack">
		<InstallTabs registry="bot-avatars" />
		<CodeBlock code={importOnly} copyLabel="Copy import" />
	</div>
</section>

<section id="usage">
	<h2>Usage</h2>
	<p class="ba-text">
		One element. It lays out at its <code class="icode">size</code> and keeps room around itself to hop and flip.
		{#if family !== 'fabric'}<code class="icode">shading</code> picks the material; fabric is the default.{/if}
	</p>
	<CodeBlock code={quickStart} />
	{#if family === 'flat'}
		<p class="ba-text">Flat is three looks. All of them draw without baking a material, so they are the cheapest to show in numbers.</p>
		<CodeBlock code={lighting} />
	{/if}
	<p class="ba-text">Drive <code class="icode">state</code> from what the agent is really doing.</p>
	<CodeBlock code={status} />
	<p class="ba-text">Dress it up.</p>
	<CodeBlock code={dressed} />
	<p class="ba-text">Avatars in a row each keep their own timing unless you give them the same seed.</p>
	<CodeBlock code={row} />
	<p class="ba-text">
		<code class="icode">dot</code> has no face, so it works as a plain orb, or three in a row as a
		typing indicator.
	</p>
	<CodeBlock code={trio} />
</section>

<section id="props">
	<h2>Props</h2>
	<PropsTable rows={[...main, ...reach[framework.id]]} />
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
	<ul class="ba-notes">
		<li>
			Fabric, plastic and flat are one component: <code class="icode">shading</code> switches between
			them, and every other prop carries over.
		</li>
		<li>
			<code class="icode">dot</code>, <code class="icode">planet</code>,
			<code class="icode">spark</code> and
			<code class="icode">face="none"</code> are Runeglow additions; the React library does not have
			them.
		</li>
		{#if family !== 'flat'}
			<li>
				Fabric's fur is drawn by the GPU, with WebGL2 (and on the canvas alone where there is none);
				plastic builds its material in the background on idle time. An avatar fades in once its
				material is ready, and one far off screen does not build until it is scrolled near.
			</li>
		{/if}
		<li>
			Each avatar labels itself, for example “Clover bot, working”. Pass
			<code class="icode">aria-label</code> to change the wording.
		</li>
		<li>
			Avatars stop animating while offscreen or in a hidden tab, and show the state’s still pose
			under <code class="icode">prefers-reduced-motion</code>.
		</li>
		<li>Every avatar on a page shares one animation loop, robots included.</li>
	</ul>
</section>
