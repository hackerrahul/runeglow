<script lang="ts">
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import PropsTable, { type PropRow } from '#lib/components/PropsTable.svelte';
	import type { Framework } from '#lib/code.ts';
	import BendDemo from '#lib/demos/liquid-gooey/BendDemo.svelte';
	import MorphDemo from '#lib/demos/liquid-gooey/MorphDemo.svelte';
	import MoveDemo from '#lib/demos/liquid-gooey/MoveDemo.svelte';
	import Playground from '#lib/demos/liquid-gooey/Playground.svelte';
	import { NAMES, driven, effectIs, importOnly, named, observed, quickStart } from '#lib/demos/liquid-gooey/code.ts';
	import { DEFAULT_GROUP } from '#lib/demos/liquid-gooey/shared.ts';
	import { framework } from '#lib/framework.svelte.ts';

	const fw = $derived(framework.id);
	const names = $derived(NAMES[fw]);

	/* what the two tables are headed with: props, attributes, or the options of a call */
	const HEADINGS: Record<Framework, [group: string, item: string]> = {
		svelte: ['Liquid props', 'Liquid.Item props'],
		react: ['Liquid props', 'Liquid.Item props'],
		vue: ['Liquid props', 'LiquidItem props'],
		elements: ['<runeglow-liquid> attributes', '<runeglow-liquid-item> attributes'],
		vanilla: ['mountLiquid options', 'item options']
	};

	const groupProps: PropRow[] = [
		{ name: 'blur', type: 'number', default: '6', description: 'Goo blur in px: how far apart pieces start bridging.' },
		{ name: 'contrast', type: 'number', default: '18', description: 'How sharp the liquid edge is.' },
		{ name: 'fill', type: 'string', default: "'#fff'", description: 'Colour of the liquid surface. Any CSS colour, var() included.' },
		{ name: 'shadow', type: 'string', description: 'box-shadow syntax, drawn on the merged surface. inset layers paint inside the liquid edge.' },
		{ name: 'waviness', type: 'number', default: '0', description: 'Max px the liquid edge undulates. 0 keeps it calm.' },
		{ name: 'wavinessFreq', type: 'number', default: '0.018', description: 'Noise frequency of the undulation. Lower is longer, lazier waves.' },
		{ name: 'filterPadding', type: 'number', default: '24', description: 'Extra room in px for pieces that travel outside the group box.' },
		{ name: 'filter', type: 'string', description: 'Raw SVG filter primitives that replace the goo chain.' }
	];

	/* how the group's element is reached and what else it takes, which each framework does its own way */
	const groupReach: Record<Framework, PropRow[]> = {
		svelte: [
			{ name: 'ref', type: 'HTMLDivElement | null', description: 'The group element. Bindable with bind:ref.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'class, style and other attributes go to the group element.' }
		],
		react: [
			{ name: 'ref', type: 'Ref<HTMLDivElement>', description: 'Reaches the group element.' },
			{ name: '...rest', type: 'HTMLAttributes<HTMLDivElement>', description: 'className, style and other attributes go to the group element.' }
		],
		vue: [
			{ name: 'template ref', type: '{ element, group }', description: 'A ref on the component gives the group element as element, and group, the object its pieces share.' },
			{ name: 'attributes', type: 'fallthrough', description: 'class, style and other attributes fall through to the group element.' }
		],
		elements: [
			{ name: 'attributes', type: 'kebab-case', description: 'The element is the group. Every option above is an attribute: filterPadding in JavaScript is filter-padding in HTML.' },
			{ name: 'properties', type: 'camelCase', description: 'Every option but blur is also a property. blur is an attribute only, because every element already has a blur() method: change it with setAttribute.' }
		],
		vanilla: [
			{ name: 'id', type: 'string', default: 'made for you', description: 'A name for the filter, unique in the page. Read once.' },
			{
				name: 'returns',
				type: '{ element, group, update, item, destroy }',
				description: 'The element you passed and the object its pieces share; update(options) changes some options and keeps the rest; item(element, options) makes an element inside the group one of its pieces; destroy() takes the liquid out again.'
			}
		]
	};

	const itemProps: PropRow[] = [
		{ name: 'effect', type: "'morph' | 'move' | 'bend' | 'melt'", default: "'morph'", description: 'morph merges pieces; move trails a moving element; bend bows the body with velocity; melt runs two images into each other.' },
		{ name: 'x, y, scale', type: 'number', description: 'Position set by the library, which animates the element and its liquid in step.' },
		{ name: 'transition', type: "'snappy' | 'smooth' | 'bouncy' | SpringConfig | { duration, ease }", default: "'smooth'", description: 'How x, y and scale animate.' },
		{ name: 'delay', type: 'number', default: '0', description: 'Transition delay in ms, for staggering.' },
		{ name: 'observe', type: 'boolean', description: 'You animate the element; the liquid follows its rendered box. Implied by morph.shape, dissolve, move and bend.' },
		{ name: 'morph', type: 'MorphTuning', description: '{ shape, speed, bounce, contentBlur, advanced }. shape makes the surface spring behind size changes.' },
		{ name: 'dissolve', type: 'boolean | number | DissolveOptions', description: 'Melts this item’s picture into a touching neighbour. true, a 0 to 1 strength, or full options.' },
		{ name: 'move', type: 'MoveTuning', description: '{ springiness, wobble, stretch, trail }, each 0 to 1.' },
		{ name: 'bend', type: 'BendTuning', description: '{ vertical, horizontal }, each 0 to 1.' },
		{ name: 'melt', type: 'ImageMeltOptions & { src? }', description: '{ blur, contrast, reach, fade, warp, mix, mixBlur, gravity, waviness }. The image is found from an <img> inside, or given as src.' },
		{ name: 'radius', type: 'number | [tl, tr, br, bl]', default: 'measured', description: 'Overrides the border radius read from the element.' }
	];

	/* what a piece takes besides its options: a wrapper's class in a framework, and no wrapper at all outside one */
	const itemReach: Record<Framework, PropRow[]> = {
		svelte: [{ name: 'class, style', type: 'string', description: 'Applied to the item’s wrapper.' }],
		react: [{ name: 'className, style', type: 'string, CSSProperties', description: 'Applied to the item’s wrapper.' }],
		vue: [
			{ name: 'class, style', type: 'fallthrough', description: 'Applied to the item’s wrapper.' },
			{ name: 'template ref', type: '{ element }', description: 'A ref on the component gives the item’s wrapper as element.' }
		],
		elements: [
			{ name: 'children', type: 'one element', description: 'The element’s first child element is the piece. The tag must be inside a <runeglow-liquid>.' },
			{
				name: 'attributes',
				type: 'JSON for a record',
				description: 'Every option is an attribute and a property. A record is JSON in an attribute: morph=\'{"shape":true}\'. transition also takes a preset’s name as it is, and dissolve with no value means true.'
			}
		],
		vanilla: [
			{
				name: 'returns',
				type: '{ element, update, destroy }',
				description: 'The element you passed, which is the piece itself: there is no wrapper, and x, y and scale move it through its inline transform. update(options) changes some options and keeps the rest; destroy() takes the piece out of the liquid.'
			}
		]
	};
</script>

<DocsShell>
	<header>
		<LibIcon slug="liquid-gooey" />
		<h1>Gooey</h1>
		<p class="lead">Pieces that merge like goo and move like liquid, while your content stays crisp.</p>
	</header>

	<div class="examples">
		<div class="cell wide">
			<MorphDemo group={DEFAULT_GROUP('morph')} />
			<span class="tag">Click the plus</span>
		</div>
		<div class="cell">
			<MoveDemo group={DEFAULT_GROUP('move')} />
			<span class="tag">Drag the thumb</span>
		</div>
		<div class="cell">
			<BendDemo group={DEFAULT_GROUP('bend')} />
			<span class="tag">Drag the pill</span>
		</div>
	</div>

	<section id="playground">
		<h2>Playground</h2>
		<Playground />
	</section>

	<section id="install">
		<h2>Install</h2>
		<div class="stack">
			<InstallTabs registry="liquid-gooey" />
			<CodeBlock code={importOnly} copyLabel="Copy import" />
		</div>
	</section>

	<section id="usage">
		<h2>Usage</h2>
		<p class="text">
			{#if fw === 'vanilla'}
				<code class="icode">mountLiquid</code> makes an element a liquid group, which draws one merged
				surface behind its children. The group’s <code class="icode">item</code> makes an element inside
				it one of the pieces, as it stands: there is no wrapper.
			{:else}
				A <code class="icode">{names.group}</code> group draws one merged surface behind its children. Wrap
				each piece in <code class="icode">{names.item}</code> and it joins that surface.
			{/if}
		</p>
		<CodeBlock code={quickStart} />
		<p class="text">Give an item a position and the library animates the element and its liquid together.</p>
		<CodeBlock code={driven} />
		<p class="text">
			For anything you move yourself, such as a drag or {fw === 'svelte' ? 'a Svelte spring' : 'a spring of your own'},
			pick an effect and the liquid follows the element’s real position.
		</p>
		<CodeBlock code={observed} />
		<CodeBlock code={named} lang="text" />
	</section>

	<section id="group">
		<h2>{HEADINGS[fw][0]}</h2>
		<PropsTable rows={[...groupProps, ...groupReach[fw]]} nameLabel={fw === 'vanilla' ? 'Option' : fw === 'elements' ? 'Attribute' : 'Prop'} />
	</section>

	<section id="item">
		<h2>{HEADINGS[fw][1]}</h2>
		<PropsTable rows={[...itemProps, ...itemReach[fw]]} nameLabel={fw === 'vanilla' ? 'Option' : fw === 'elements' ? 'Attribute' : 'Prop'} />
	</section>

	<section id="notes">
		<h2>Notes</h2>
		<ul class="notes">
			<li>
				The liquid is drawn behind your elements, so they should be transparent. Their shape comes
				from the group’s <code class="icode">fill</code> and <code class="icode">shadow</code>.
			</li>
			<li>
				Text and icons are never run through the goo filter, so they stay sharp while the surface
				merges.
			</li>
			<li>
				<code class="icode">{effectIs(fw, 'melt')}</code> works on the first two melt items in a group, and
				each needs an image.
			</li>
			<li>
				<code class="icode">{effectIs(fw, 'bend')}</code> publishes the live bend as
				<code class="icode">--lg-bend-x</code>, <code class="icode">--lg-bend-y</code> (px) and
				<code class="icode">--lg-bend-xn</code>, <code class="icode">--lg-bend-yn</code> (unitless) on
				the piece’s own element, so content can lean with the surface.
			</li>
			{#if fw === 'vanilla'}
				<li>
					<code class="icode">mountLiquid</code> makes the element
					<code class="icode">position: relative</code> and an isolated stacking context, unless its own
					inline style says otherwise, and puts two SVG layers in it ahead of your content.
				</li>
			{/if}
			<li>It runs on SVG filters and works in Chrome, Firefox and Safari.</li>
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
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.cell {
		position: relative;
		display: grid;
		place-items: center;
		min-height: 250px;
		padding: 20px 16px 36px;
		border-radius: 16px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.cell.wide {
		grid-column: 1 / -1;
		min-height: 280px;
	}
	.tag {
		position: absolute;
		left: 14px;
		bottom: 12px;
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
	#usage :global(.code + .code) {
		margin-top: 10px;
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
		.examples {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
