<!-- The robot family: RobotHead, a TV-headed bot with an LED face. -->
<script lang="ts">
	import {
		RobotHead,
		robotHeadColorwayNames,
		robotHeadColorways,
		robotHeadFinishes,
		robotHeadShapes,
		robotHeadStates,
		type RobotHeadColorwayName
	} from '@runeglow/svelte/bot-avatars';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import { example, expr, fragment, importLine, perFramework, type Framework } from '#lib/code.ts';
	import { framework } from '#lib/framework.svelte.ts';
	import RobotPlayground from './RobotPlayground.svelte';

	/* a different colourway per shape, so the row is not six blue heads */
	const SHAPE_WAYS: RobotHeadColorwayName[] = ['cobalt', 'graphite', 'snow', 'cream', 'tangerine', 'cherry'];

	const quickStart = example({ component: 'RobotHead' });

	const status = example({
		component: 'RobotHead',
		// 'idle' | 'thinking' | 'searching' | 'working' | 'waiting' | 'success' | 'error' ...
		props: { state: expr('status'), size: 120 },
		input: 'status'
	});

	const looks = fragment(
		[
			{ component: 'RobotHead', props: { shape: 'circle', colorway: 'tangerine' } },
			{ component: 'RobotHead', props: { shape: 'hexagon', colorway: 'graphite', finish: 'matte', pixels: 'round' } },
			{ component: 'RobotHead', props: { color: '#0f766e', trimColor: '#c9a25a', screenColor: '#fde68a', finish: 'metal' } }
		],
		{ comment: 'The last one names its own colours: the shell, the ears and collar, the LEDs.' }
	);

	const small = fragment([{ component: 'RobotHead', props: { size: 32, antenna: false, floorShadow: false, state: 'speaking' } }], {
		comment: 'In a message list: no antenna, so the head fills the box, and no shadow.'
	});

	const held = fragment([{ component: 'RobotHead', props: { pose: { yaw: 2.6, pitch: 0.15 } } }], {
		comment: 'Turned by hand: the back has vents, a panel line and four screws.'
	});

	const importOnly = perFramework((fw) => importLine(fw, 'bot-avatars', [fw === 'vanilla' ? 'mountRobotHead' : 'RobotHead']));

	/* how the element itself is reached, which each framework does its own way */
	const reach: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'ref', type: 'HTMLCanvasElement | null', description: 'The canvas inside the element. Bindable with bind:ref.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLSpanElement>', description: 'class, style, aria-label, onclick and other attributes go on the element, the size by size box.' }
		],
		react: [
			{ name: 'ref', type: 'Ref<HTMLCanvasElement>', description: 'Reaches the canvas inside the element.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLSpanElement>', description: 'className, style, aria-label, onClick and other attributes go on the element, the size by size box.' }
		],
		vue: [
			{ name: 'template ref', type: '{ element, canvas, poke() }', description: 'A ref on the component gives the box as element, its canvas, and poke(), which does what a click does.' },
			{ name: 'attributes', type: 'fallthrough', description: 'class, style, aria-label, @click and other attributes fall through to the element, the size by size box.' }
		],
		elements: [
			{ name: 'label', type: 'string', description: 'The accessible name, in place of “Robot, ” and the state.' },
			{ name: 'poke()', type: 'method', description: 'Does what a click does: a hop, a spin and a smile.' },
			{ name: 'properties', type: 'camelCase', description: 'Every option is also a property: floorShadow in JavaScript is floor-shadow in HTML.' }
		],
		vanilla: [
			{ name: 'class', type: 'string', description: 'A class for the box element.' },
			{ name: 'label', type: 'string', description: 'The accessible name, in place of “Robot, ” and the state.' },
			{ name: 'returns', type: '{ element, canvas, update, poke, destroy }', description: 'The box and its canvas; update(options) changes some options and keeps the rest; destroy() stops it and removes the elements.' }
		]
	};

	const main: PropRow[] = [
		{ name: 'shape', type: "'rectangle' | 'square' | 'circle' | 'hexagon' | 'capsule' | 'octagon'", default: "'rectangle'", description: 'The head’s outline. Every shape has the same screen, ears, antenna, screws and back panel.' },
		{ name: 'state', type: 'RobotHeadState', default: "'idle'", description: 'What it is doing, one of eleven. Each has its own face, motion and antenna light.' },
		{ name: 'size', type: 'number', default: '160', description: 'The box the robot rests in, in px. Hops, the glow and the shadow draw past it.' },
		{ name: 'colorway', type: 'RobotHeadColorwayName', default: "'cobalt'", description: 'A named set of colours for the shell, the trim and the LEDs, one of ten.' },
		{ name: 'color', type: 'string', default: "colourway's", description: 'Colour of the shell.' },
		{ name: 'trimColor', type: 'string', default: "colourway's", description: 'Colour of the ears and the antenna’s collar.' },
		{ name: 'screenColor', type: 'string', default: "colourway's", description: 'Colour of the LEDs. Error and success use red and green whatever this is.' },
		{ name: 'finish', type: "'gloss' | 'matte' | 'metal'", default: "'gloss'", description: 'What the shell is made of: clear-coated plastic, soft-touch, or brushed anodised metal.' },
		{ name: 'pixels', type: "'square' | 'round'", default: "'square'", description: 'The shape of each LED.' },
		{ name: 'antenna', type: 'boolean', default: 'true', description: 'The antenna’s stem and light. Off, the knob stays and the head grows to fill the box.' },
		{ name: 'floorShadow', type: 'boolean', default: 'true', description: 'The soft shadow under the head.' },
		{ name: 'speed', type: 'number', default: '1', description: 'Multiplier on every animation.' },
		{ name: 'paused', type: 'boolean', default: 'false', description: 'Freezes on the current frame.' },
		{ name: 'seed', type: 'number', default: 'per instance', description: '0 to 1. Offsets blinks and glances. Give two heads the same seed to move them in step.' },
		{ name: 'interactive', type: 'boolean', default: 'true', description: 'Head and eyes follow a nearby pointer, and a click makes it hop, spin and smile.' },
		{ name: 'pose', type: '{ yaw?, pitch?, roll? }', description: 'Holds the head at an orientation, in radians. The screen and the antenna keep going.' },
	];

	/* what each state shows, and how it moves */
	const states: Array<[name: string, screen: string, motion: string]> = [
		['idle', 'Block eyes that blink and glance', 'Looks around, hops now and then. White light.'],
		['thinking', 'Heavy-lidded eyes looking up, three pulsing dots', 'Head tilted up, switching sides. Amber light pulses.'],
		['searching', 'Darting eyes, a beam sweeping the screen', 'Head sweeps side to side. Cyan beacon.'],
		['listening', 'Alert eyes over a live equaliser', 'Head cocked, small nods. Steady green light.'],
		['speaking', 'A mouth that moves with the words', 'Bobs as it talks. Light flickers with the voice.'],
		['working', 'Focused eyes looking down, a progress bar', 'Busy bobbing, a hop with a spin now and then. Blue light blinks.'],
		['waiting', 'Eyes beside a bobbing question mark', 'Head cocked to one side, then the other: it needs you. Violet light, two flashes and a rest.'],
		['success', 'A tick drawn on in green', 'One glad hop, then nods. Green light.'],
		['happy', '^ ^ eyes and a smile', 'Bouncy hops. Pink light.'],
		['error', 'Red X X eyes', 'Shakes its head. Red light blinks.'],
		['sleeping', 'Closed eyes and rising z’s', 'Head drooped, slow breathing. Light off.']
	];
</script>

<div class="ba-cell ba-hero">
	<RobotHead size={150} state="thinking" seed={0.15} />
	<RobotHead size={150} shape="circle" colorway="tangerine" state="speaking" seed={0.5} />
	<RobotHead size={150} shape="hexagon" colorway="graphite" finish="matte" state="success" seed={0.8} />
</div>

<div class="ba-cell ba-block">
	<p class="ba-cap"><strong>Shapes</strong> <span>shape</span></p>
	<div class="ba-grid">
		{#each robotHeadShapes as shape, i (shape)}
			<div class="ba-item">
				<RobotHead {shape} colorway={SHAPE_WAYS[i]} size={96} seed={(i * 0.171) % 1} />
				<p>{shape}</p>
			</div>
		{/each}
	</div>
</div>

<div class="ba-cell ba-block">
	<p class="ba-cap"><strong>States</strong> <span>state</span></p>
	<div class="ba-grid">
		{#each robotHeadStates as state, i (state)}
			<div class="ba-item">
				<RobotHead {state} size={96} seed={(i * 0.093) % 1} />
				<p>{state}</p>
			</div>
		{/each}
	</div>
</div>

<div class="ba-cell ba-block">
	<p class="ba-cap"><strong>Finishes</strong> <span>finish</span></p>
	<div class="ba-grid" style:--cols="3">
		{#each robotHeadFinishes as finish, i (finish)}
			<div class="ba-item">
				<RobotHead {finish} shape="square" colorway="grape" size={128} seed={0.2 + i * 0.3} />
				<p>{finish}</p>
			</div>
		{/each}
	</div>
</div>

<div class="ba-cell ba-block">
	<p class="ba-cap"><strong>Colourways</strong> <span>colorway</span></p>
	<div class="ba-grid" style:--cols="5">
		{#each robotHeadColorwayNames as colorway, i (colorway)}
			<div class="ba-item">
				<RobotHead {colorway} shape={i % 2 ? 'circle' : 'square'} pixels={i % 2 ? 'round' : 'square'} size={88} seed={(i * 0.119) % 1} />
				<p>{robotHeadColorways[colorway].label.toLowerCase()}</p>
			</div>
		{/each}
	</div>
</div>

<section id="playground">
	<h2>Playground</h2>
	<RobotPlayground />
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
		One element, a <code class="icode">size</code> by <code class="icode">size</code> box with the robot at rest
		centred in it. It lines up like an icon; its hops, glow and shadow draw past the box without taking room.
	</p>
	<CodeBlock code={quickStart} />
	<p class="ba-text">Drive <code class="icode">state</code> from what the agent is really doing. Switching plays a short glitch on the screen and the head eases into its new pose.</p>
	<CodeBlock code={status} />
	<p class="ba-text">Pick a shape, a colourway, a finish and the shape of the LEDs, or name the colours yourself.</p>
	<CodeBlock code={looks} />
	<p class="ba-text">At avatar sizes, drop the antenna so the head fills the box.</p>
	<CodeBlock code={small} />
	<p class="ba-text">The head is real geometry, so it can be held at any angle.</p>
	<CodeBlock code={held} />
</section>

<section id="props">
	<h2>Props</h2>
	<PropsTable rows={[...main, ...reach[framework.id]]} />
</section>

<section id="states">
	<h2>States</h2>
	<div class="states" role="table">
		<div class="srow head" role="row">
			<span role="columnheader">State</span>
			<span role="columnheader">Screen</span>
			<span role="columnheader">Motion and light</span>
		</div>
		{#each states as [name, screen, motion] (name)}
			<div class="srow" role="row">
				<span role="cell"><code>{name}</code></span>
				<span role="cell">{screen}</span>
				<span role="cell" class="dim">{motion}</span>
			</div>
		{/each}
	</div>
</section>

<section id="notes">
	<h2>Notes</h2>
	<ul class="ba-notes">
		<li>
			The robot is a Svelte port of
			<a href="https://github.com/fayazara/robot-heads" target="_blank" rel="noreferrer">robot-heads</a>
			by Fayaz Ahmed (MIT). The geometry, lighting, faces and motion are his; the component is new.
		</li>
		<li>
			Runeglow adds the <code class="icode">capsule</code> and <code class="icode">octagon</code> shapes, the
			<code class="icode">waiting</code> and <code class="icode">success</code> states,
			<code class="icode">finish</code>, <code class="icode">pixels</code>,
			<code class="icode">colorway</code> and <code class="icode">pose</code>, the screen’s light spilling onto
			its bezel, and contact shading under the ears.
		</li>
		<li>
			It is drawn on a 2D canvas, with no WebGL. Small heads are drawn with fewer polygons than large ones, and
			a head does not draw, or build its textures, until it is scrolled near.
		</li>
		<li>
			A parent with <code class="icode">overflow: hidden</code> right round the head cuts off its hops, so
			leave it some room.
		</li>
		<li>
			Each head labels itself, for example “Robot, thinking”. Pass
			<code class="icode">aria-label</code> to change the wording.
		</li>
		<li>
			Heads stop animating while offscreen or in a hidden tab, and show the state’s still pose under
			<code class="icode">prefers-reduced-motion</code>.
		</li>
	</ul>
</section>

<style>
	/* the same rules as the props table, in three columns */
	.states {
		font-size: 13px;
	}
	.srow {
		display: grid;
		grid-template-columns: minmax(90px, 0.5fr) minmax(0, 1.3fr) minmax(0, 1.7fr);
		gap: 16px;
		padding: 11px 0;
		border-top: 1px solid var(--line);
		align-items: baseline;
		color: var(--fg-2);
	}
	.srow.head {
		border-top: 0;
		padding-top: 0;
		color: var(--fg-3);
	}
	.srow code {
		font-size: 12px;
		color: #fff;
	}
	.dim {
		color: var(--fg-3);
	}
	@media (max-width: 760px) {
		.srow.head {
			display: none;
		}
		.srow {
			grid-template-columns: minmax(0, 1fr);
			gap: 3px;
		}
		.srow:nth-child(2) {
			border-top: 0;
		}
	}
</style>
