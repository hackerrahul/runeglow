/* The Gooey page's code, in each framework.

   A liquid group and its pieces are written differently in kind from one
   framework to the next, so these texts are composed here and not by
   `example()`: Svelte and React wrap each piece in `Liquid.Item`, Vue in
   `LiquidItem`, HTML in `<runeglow-liquid-item>`, and with no framework
   there is no wrapper at all: `mountLiquid` takes the page's own element
   and its `item()` takes each piece as it stands. State follows the same
   split: a rune, a hook, a ref, or a script that sets a property. */

import { attrs, expr, importLine, options, perFramework, type Framework, type FrameworkCode, type PropValue, type Props } from '#lib/code.ts';

const LIB = 'liquid-gooey';

type Markup = Exclude<Framework, 'vanilla'>;

/* what the group and one piece are called, where they are tags */
const TAGS: Record<Markup, [group: string, item: string]> = {
	svelte: ['Liquid', 'Liquid.Item'],
	react: ['Liquid', 'Liquid.Item'],
	vue: ['Liquid', 'LiquidItem'],
	elements: ['runeglow-liquid', 'runeglow-liquid-item']
};

/** The group and a piece as a sentence names them, per framework. */
export const NAMES: Record<Framework, { group: string; item: string }> = {
	svelte: { group: 'Liquid', item: 'Liquid.Item' },
	react: { group: 'Liquid', item: 'Liquid.Item' },
	vue: { group: 'Liquid', item: 'LiquidItem' },
	elements: { group: '<runeglow-liquid>', item: '<runeglow-liquid-item>' },
	vanilla: { group: 'mountLiquid', item: 'item' }
};

/** An option as a sentence writes it in this framework: an attribute, or a key of the options. */
export const effectIs = (fw: Framework, name: string) => (fw === 'vanilla' ? `effect: "${name}"` : `effect="${name}"`);

const pad = (text: string, by = '  ') =>
	text
		.split('\n')
		.map((line) => (line ? by + line : line))
		.join('\n');

/* A tag round some markup, its attributes on the one line: these examples
   read as a list of pieces, one to a line. */
const wrap = (fw: Markup, which: 0 | 1, props: Props, inner: string) => {
	const name = TAGS[fw][which];
	const list = attrs(fw, props);
	return `<${name}${list.length ? ` ${list.join(' ')}` : ''}>\n${pad(inner)}\n</${name}>`;
};
const group = (fw: Markup, props: Props, inner: string) => wrap(fw, 0, props, inner);
const item = (fw: Markup, props: Props, inner: string) => wrap(fw, 1, props, inner);

const cls = (fw: Markup) => (fw === 'react' ? 'className' : 'class');
const note = (fw: Markup, text: string) => (fw === 'react' ? `{/* ${text} */}` : `<!-- ${text} -->`);

/* ── a whole file round the markup ──────────────────────────────────── */

const svelteFile = (state: string, markup: string) =>
	`<script>\n  ${importLine('svelte', LIB, ['Liquid'])}${state ? `\n\n  ${state}` : ''}\n<\/script>\n\n${markup}`;

const reactFile = (o: { hook?: string; name: string; params?: string; state?: string }, markup: string) =>
	`${o.hook ? `import { ${o.hook} } from 'react';\n` : ''}${importLine('react', LIB, ['Liquid'])}\n\n` +
	`export function ${o.name}(${o.params ?? ''}) {\n${o.state ? `  ${o.state}\n` : ''}  return (\n${pad(markup, '    ')}\n  );\n}`;

const vueFile = (o: { hook?: string; state?: string }, markup: string) =>
	`<script setup>\n${o.hook ? `import { ${o.hook} } from 'vue';\n` : ''}${importLine('vue', LIB, ['Liquid', 'LiquidItem'])}` +
	`${o.state ? `\n\n${o.state}` : ''}\n<\/script>\n\n<template>\n${pad(markup)}\n</template>`;

const elementsFile = (script: string, markup: string) =>
	`<script type="module">\n  ${importLine('elements', LIB, [])}${script ? `\n\n${pad(script)}` : ''}\n<\/script>\n\n${markup}`;

/* with no framework the page's own markup comes first: the script works on it */
const vanillaFile = (html: string, script: string) =>
	`${html}\n\n<script type="module">\n  ${importLine('vanilla', LIB, ['mountLiquid'])}\n\n${pad(script)}\n<\/script>`;

/* `mountLiquid(…)` on the element a selector finds, with the group's options */
const mount = (variable: string, selector: string, props: Props) => {
	const o = options(props);
	return `const ${variable} = mountLiquid(document.querySelector('${selector}')${o ? `, ${o}` : ''});`;
};

/* ── the page's examples ────────────────────────────────────────────── */

export const importOnly = perFramework((fw) =>
	importLine(fw, LIB, fw === 'vanilla' ? ['mountLiquid'] : fw === 'vue' ? ['Liquid', 'LiquidItem'] : ['Liquid'])
);

const ROUND_CSS = `/* The liquid is the surface: keep your own elements transparent. */\n  .round { background: transparent; border: 0; border-radius: 50%; }`;

export const quickStart = perFramework((fw) => {
	const style = `<style>\n  ${ROUND_CSS}\n</style>`;
	if (fw === 'vanilla') {
		return `${vanillaFile(
			`<div id="menu">\n  <button class="round">A</button>\n  <button class="round">B</button>\n</div>`,
			`// The group is your own element, and each piece an element inside it.\n` +
				`${mount('menu', '#menu', { fill: '#202020' })}\n` +
				`for (const button of menu.element.querySelectorAll('.round')) menu.item(button);`
		)}\n\n${style}`;
	}
	const piece = (label: string) => `<${TAGS[fw][1]}><button ${cls(fw)}="round">${label}</button></${TAGS[fw][1]}>`;
	const markup = group(fw, { fill: '#202020' }, `${piece('A')}\n${piece('B')}`);
	if (fw === 'svelte') return `${svelteFile('', markup)}\n\n${style}`;
	if (fw === 'vue') return `${vueFile({}, markup)}\n\n${style}`;
	if (fw === 'elements') return `${elementsFile('', markup)}\n\n${style}`;
	return (
		`${reactFile({ name: 'Example' }, markup)}\n\n` +
		`// In your CSS. The liquid is the surface: keep your own elements transparent.\n` +
		`// .round { background: transparent; border: 0; border-radius: 50%; }`
	);
});

const MOVES_TOGETHER = 'The library moves the element and its liquid together.';

export const driven = perFramework((fw) => {
	if (fw === 'vanilla') {
		return vanillaFile(
			`<div id="menu">\n  <button id="more" class="round">…</button>\n  <button id="plus" class="round">+</button>\n</div>`,
			`${mount('menu', '#menu', { fill: '#202020' })}\n` +
				`const more = menu.item(document.querySelector('#more'), { transition: 'bouncy' });\n` +
				`const plus = menu.item(document.querySelector('#plus'));\n\n` +
				`let open = false;\n` +
				`plus.element.addEventListener('click', () => {\n` +
				`  open = !open;\n` +
				`  // ${MOVES_TOGETHER}\n` +
				`  more.update({ y: open ? -64 : 0 });\n` +
				`});`
		);
	}
	if (fw === 'elements') {
		return elementsFile(
			`const more = document.querySelector('#more');\n` +
				`let open = false;\n` +
				`document.querySelector('#plus').addEventListener('click', () => {\n` +
				`  open = !open;\n` +
				`  // ${MOVES_TOGETHER}\n` +
				`  more.y = open ? -64 : 0;\n` +
				`});`,
			group(
				fw,
				{ fill: '#202020' },
				`${item(fw, { id: 'more', transition: 'bouncy' }, `<button class="round">…</button>`)}\n` +
					item(fw, {}, `<button id="plus" class="round">+</button>`)
			)
		);
	}
	const click = { svelte: 'onclick={() => (open = !open)}', react: 'onClick={() => setOpen(!open)}', vue: '@click="open = !open"' }[fw];
	const markup = group(
		fw,
		{ fill: '#202020' },
		`${note(fw, MOVES_TOGETHER)}\n` +
			`${item(fw, { y: expr('open ? -64 : 0'), transition: 'bouncy' }, `<button ${cls(fw)}="round">…</button>`)}\n` +
			item(fw, {}, `<button ${cls(fw)}="round" ${click}>+</button>`)
	);
	if (fw === 'svelte') return svelteFile('let open = $state(false);', markup);
	if (fw === 'react') return reactFile({ hook: 'useState', name: 'Menu', state: 'const [open, setOpen] = useState(false);' }, markup);
	return vueFile({ hook: 'ref', state: 'const open = ref(false);' }, markup);
});

const FOLLOWS = 'Or move the element yourself; the liquid follows what it measures.';

/* the thumb of a slider, moved by the page: `x` is the page's own */
const thumb = (fw: Markup) =>
	({
		svelte: `<div class="thumb" style:transform="translateX({x}px)"></div>`,
		react: '<div className="thumb" style={{ transform: `translateX(${x}px)` }} />',
		vue: '<div class="thumb" :style="{ transform: `translateX(${x}px)` }"></div>',
		elements: `<div class="thumb" style="transform: translateX(84px)"></div>`
	})[fw];

/* the line that moves it, where no framework writes the style */
const SLIDE = 'thumb.style.transform = `translateX(${x}px)`;';

export const observed = perFramework((fw) => {
	const tuning = { stretch: 0.6, trail: 0.35 };
	if (fw === 'vanilla') {
		return (
			`// ${FOLLOWS}\n` +
			`${mount('track', '.track', { fill: '#525252' })}\n` +
			`const thumb = track.element.querySelector('.thumb');\n` +
			`track.item(thumb, ${options({ effect: 'move', move: tuning })});\n\n` +
			`// wherever x changes\n${SLIDE}`
		);
	}
	const markup = `${note(fw, FOLLOWS)}\n${group(fw, { fill: '#525252' }, item(fw, { effect: 'move', move: tuning }, thumb(fw)))}`;
	if (fw !== 'elements') return markup;
	return `${markup}\n\n<script type="module">\n  const thumb = document.querySelector('.thumb');\n  // wherever x changes\n  ${SLIDE}\n<\/script>`;
});

/* how else a piece is reached, which is a different thing in each framework */
export const named = perFramework((fw, info) => {
	const from = `'${info.pkg}/${LIB}'`;
	switch (fw) {
		case 'svelte':
		case 'react':
			return `// Liquid.Item is also exported on its own.\nimport { Liquid, LiquidItem } from ${from};`;
		case 'vue':
			return `// LiquidItem is the same component as Liquid.Item, which a <script setup> template can also write.\nimport { Liquid, LiquidItem } from ${from};`;
		case 'elements':
			return `// The one import registers both tags, and exports the classes behind them.\nimport { LiquidElement, LiquidItemElement } from ${from};`;
		case 'vanilla':
			return (
				`// menu.item(element, options) is also exported on its own: it takes the group first.\n` +
				`import { mountLiquid, mountLiquidItem } from ${from};\n\n` +
				`const menu = mountLiquid(document.querySelector('#menu'), { fill: '#202020' });\n` +
				`mountLiquidItem(menu.group, document.querySelector('#more'), { transition: 'bouncy' });`
			);
	}
});

/* ── the playground ─────────────────────────────────────────────────── */

/** An option that is a record: `{ stretch: 0.6, trail: 0.35 }`. */
export type Tuning = { [key: string]: PropValue };

export type DemoCode =
	| { kind: 'morph'; transition: { duration: number; ease: string }; sx: number; sy: number; ty: number; stagger: number }
	| { kind: 'shape'; morph: Tuning }
	| { kind: 'dissolve'; dissolve: Tuning; morph: Tuning }
	| { kind: 'move'; move: Tuning }
	| { kind: 'bend'; bend: Tuning }
	| { kind: 'melt'; melt: Tuning };

/* an option that is a record, left out when nothing in it was changed */
const filled = (record: Tuning) => (Object.keys(record).length ? record : undefined);

/**
 * What is on the playground's stage, as code. `g` is the group's options,
 * already cut down to what differs from the library's defaults.
 */
export function playgroundCode(g: Props, demo: DemoCode): FrameworkCode {
	switch (demo.kind) {
		case 'morph':
			return morphCode(g, demo);
		case 'shape':
			return shapeCode(g, demo.morph);
		case 'dissolve':
			return dissolveCode(g, demo.dissolve, demo.morph);
		case 'move':
			return moveCode(g, filled(demo.move));
		case 'bend':
			return bendCode(g, filled(demo.bend));
		case 'melt':
			return meltCode(filled(demo.melt));
	}
}

/* A menu: three pieces fly out of the plus when it is pressed. */
function morphCode(g: Props, k: Extract<DemoCode, { kind: 'morph' }>): FrameworkCode {
	const spots = [
		{ x: -k.sx, y: -k.sy },
		{ x: 0, y: -k.ty },
		{ x: k.sx, y: -k.sy }
	];
	const delay = (i: number) => (i && k.stagger ? i * k.stagger : undefined);
	const where = `[${spots.map((s) => `{ x: ${s.x}, y: ${s.y} }`).join(', ')}]`;
	return perFramework((fw) => {
		if (fw === 'vanilla') {
			return vanillaFile(
				`<div id="menu">\n${`  <button class="round more">…</button>\n`.repeat(3)}  <button id="plus" class="round">+</button>\n</div>`,
				`${mount('menu', '#menu', g)}\n` +
					`// Each piece is the element itself: the library moves it and its liquid together.\n` +
					`const transition = ${options(k.transition)};\n` +
					`const pieces = [...menu.element.querySelectorAll('.more')].map((button${k.stagger ? ', i' : ''}) =>\n` +
					`  menu.item(button, { transition${k.stagger ? `, delay: i * ${k.stagger}` : ''} }),\n` +
					`);\n` +
					`const plus = menu.item(document.querySelector('#plus'));\n\n` +
					`// where each piece goes when the menu opens\n` +
					`const OPEN = ${where};\n` +
					`let open = false;\n` +
					`plus.element.addEventListener('click', () => {\n` +
					`  open = !open;\n` +
					`  pieces.forEach((piece, i) => piece.update(open ? OPEN[i] : { x: 0, y: 0 }));\n` +
					`});`
			);
		}
		if (fw === 'elements') {
			return elementsFile(
				`// where each piece goes when the menu opens\n` +
					`const OPEN = ${where};\n` +
					`const pieces = document.querySelectorAll('runeglow-liquid-item.more');\n` +
					`let open = false;\n` +
					`document.querySelector('#plus').addEventListener('click', () => {\n` +
					`  open = !open;\n` +
					`  // x and y are properties: the library moves each element and its liquid together\n` +
					`  pieces.forEach((piece, i) => {\n` +
					`    piece.x = open ? OPEN[i].x : 0;\n` +
					`    piece.y = open ? OPEN[i].y : 0;\n` +
					`  });\n` +
					`});`,
				group(
					fw,
					g,
					`${spots.map((_, i) => item(fw, { class: 'more', transition: k.transition, delay: delay(i) }, `<button class="round">…</button>`)).join('\n')}\n` +
						item(fw, {}, `<button id="plus" class="round">+</button>`)
				)
			);
		}
		const click = { svelte: 'onclick={() => (open = !open)}', react: 'onClick={() => setOpen(!open)}', vue: '@click="open = !open"' }[fw];
		const markup = group(
			fw,
			g,
			`${spots
				.map((s, i) =>
					item(
						fw,
						{ x: s.x ? expr(`open ? ${s.x} : 0`) : undefined, y: expr(`open ? ${s.y} : 0`), transition: k.transition, delay: delay(i) },
						`<button ${cls(fw)}="round">…</button>`
					)
				)
				.join('\n')}\n` + item(fw, {}, `<button ${cls(fw)}="round" ${click}>+</button>`)
		);
		if (fw === 'svelte') return svelteFile('let open = $state(false);', markup);
		if (fw === 'react') return reactFile({ hook: 'useState', name: 'Menu', state: 'const [open, setOpen] = useState(false);' }, markup);
		return vueFile({ hook: 'ref', state: 'const open = ref(false);' }, markup);
	});
}

const RESIZE = 'Resize the element however you like; the liquid springs after it.';

/* A panel that snaps between two sizes, with the liquid springing after it. */
function shapeCode(g: Props, morph: Tuning): FrameworkCode {
	return perFramework((fw) => {
		const toggle = `panel.addEventListener('click', () => panel.classList.toggle('open'));`;
		if (fw === 'vanilla') {
			return vanillaFile(
				`<div id="group">\n  <button class="panel">…</button>\n</div>`,
				`${mount('group', '#group', g)}\n` +
					`const panel = group.element.querySelector('.panel');\n` +
					`// ${RESIZE}\n` +
					`group.item(panel, ${options({ morph })});\n` +
					toggle
			);
		}
		if (fw === 'elements') {
			return elementsFile(
				`const panel = document.querySelector('.panel');\n${toggle}`,
				group(fw, g, `${note(fw, RESIZE)}\n${item(fw, { morph }, `<button class="panel">…</button>`)}`)
			);
		}
		const button = {
			svelte: `<button class={['panel', open && 'open']} onclick={() => (open = !open)}>…</button>`,
			react: `<button className={open ? 'panel open' : 'panel'} onClick={() => setOpen(!open)}>…</button>`,
			vue: `<button :class="['panel', { open }]" @click="open = !open">…</button>`
		}[fw];
		const markup = group(fw, g, `${note(fw, RESIZE)}\n${item(fw, { morph }, button)}`);
		if (fw === 'svelte') return svelteFile('let open = $state(false);', markup);
		if (fw === 'react') return reactFile({ hook: 'useState', name: 'Panel', state: 'const [open, setOpen] = useState(false);' }, markup);
		return vueFile({ hook: 'ref', state: 'const open = ref(false);' }, markup);
	});
}

/* where the playground's two pictures start, for the texts that have no data to read them from */
const APART = [-62, 62];
const MOVE_IT = 'Move a picture by writing its transform, from a drag for instance: the liquid follows what it measures.';

/* Two pictures that melt into each other where they touch. */
function dissolveCode(g: Props, dissolve: Tuning, morph: Tuning): FrameworkCode {
	return perFramework((fw) => {
		const still = (i: number) =>
			`<div class="photo" style="transform: translate(${APART[i]}px, 0px)">\n  <img src="${'ab'[i]}.jpg" alt="" />\n</div>`;
		if (fw === 'vanilla') {
			return vanillaFile(
				`<div id="photos">\n${pad(`${still(0)}\n${still(1)}`)}\n</div>`,
				`${mount('photos', '#photos', g)}\n` +
					`// Each picture is a piece as it stands. Move one by writing its transform,\n` +
					`// from a drag for instance: the liquid follows what it measures.\n` +
					`for (const photo of photos.element.querySelectorAll('.photo')) {\n` +
					`  photos.item(photo, ${options({ dissolve, morph }, '  ')});\n` +
					`}`
			);
		}
		if (fw === 'elements') {
			return elementsFile('', group(fw, g, `${note(fw, MOVE_IT)}\n${[0, 1].map((i) => item(fw, { dissolve, morph }, still(i))).join('\n')}`));
		}
		const photo = (n: string) =>
			({
				svelte: `<div class="photo" style:transform="translate({${n}.x}px, {${n}.y}px)">\n  <img src={${n}.src} alt="" />\n</div>`,
				react: `<div className="photo" style={{ transform: \`translate(\${${n}.x}px, \${${n}.y}px)\` }}>\n  <img src={${n}.src} alt="" />\n</div>`,
				vue: `<div class="photo" :style="{ transform: \`translate(\${${n}.x}px, \${${n}.y}px)\` }">\n  <img :src="${n}.src" alt="" />\n</div>`
			})[fw];
		const markup = group(fw, g, ['a', 'b'].map((n) => item(fw, { dissolve, morph }, photo(n))).join('\n'));
		if (fw === 'svelte') return svelteFile('', markup);
		if (fw === 'react') return reactFile({ name: 'Photos', params: '{ a, b }' }, markup);
		return vueFile({ state: `defineProps(['a', 'b']);` }, markup);
	});
}

/* A slider's thumb, which the page moves and the liquid trails. */
function moveCode(g: Props, move: Tuning | undefined): FrameworkCode {
	return perFramework((fw) => {
		const tuning = { effect: 'move', move };
		if (fw === 'vanilla') {
			return vanillaFile(
				`<div class="track">\n  ${thumb('elements')}\n</div>`,
				`${mount('track', '.track', g)}\n` +
					`const thumb = track.element.querySelector('.thumb');\n` +
					`track.item(thumb, ${options(tuning)});\n\n` +
					`// wherever the thumb is dragged to: the liquid follows what it measures\n` +
					`let x = 84;\n${SLIDE}`
			);
		}
		if (fw === 'elements') {
			return elementsFile(
				`const thumb = document.querySelector('.thumb');\n` + `// wherever the thumb is dragged to: the liquid follows what it measures\n` + `let x = 84;\n${SLIDE}`,
				group(fw, g, item(fw, tuning, thumb(fw)))
			);
		}
		const markup = group(fw, g, item(fw, tuning, thumb(fw)));
		if (fw === 'svelte') return svelteFile('let x = $state(84);', markup);
		if (fw === 'react') return reactFile({ hook: 'useState', name: 'Slider', state: 'const [x, setX] = useState(84);' }, markup);
		return vueFile({ hook: 'ref', state: 'const x = ref(84);' }, markup);
	});
}

const BEND_VARS = ['The live bend is published as --lg-bend-x, --lg-bend-y (px) and', '--lg-bend-xn, --lg-bend-yn (unitless), for content that leans with it.'];

/* A card that bows as it is dragged. */
function bendCode(g: Props, bend: Tuning | undefined): FrameworkCode {
	return perFramework((fw) => {
		const tuning = { effect: 'bend', bend };
		const still = `<div class="card" style="transform: translate(0px, 0px)">…</div>`;
		if (fw === 'vanilla') {
			return vanillaFile(
				`<div id="group">\n  ${still}\n</div>`,
				`${mount('group', '#group', g)}\n` +
					`// Move the card by writing its transform, from a drag for instance.\n` +
					`// ${BEND_VARS[0]}\n// ${BEND_VARS[1]}\n` +
					`group.item(group.element.querySelector('.card'), ${options(tuning)});`
			);
		}
		/* the second line sits under the first one's text */
		const vars = fw === 'react' ? `{/* ${BEND_VARS[0]}\n    ${BEND_VARS[1]} */}` : `<!-- ${BEND_VARS[0]}\n     ${BEND_VARS[1]} -->`;
		if (fw === 'elements') {
			return elementsFile('', group(fw, g, `<!-- Move the card by writing its transform, from a drag for instance. -->\n${item(fw, tuning, `${vars}\n${still}`)}`));
		}
		const card = {
			svelte: `<div class="card" style:transform="translate({x}px, {y}px)">…</div>`,
			react: '<div className="card" style={{ transform: `translate(${x}px, ${y}px)` }}>…</div>',
			vue: '<div class="card" :style="{ transform: `translate(${x}px, ${y}px)` }">…</div>'
		}[fw];
		const markup = group(fw, g, item(fw, tuning, `${vars}\n${card}`));
		if (fw === 'svelte') return svelteFile('', markup);
		if (fw === 'react') return reactFile({ name: 'Card', params: '{ x, y }' }, markup);
		return vueFile({ state: `defineProps(['x', 'y']);` }, markup);
	});
}

/* where the two melting pictures start, as above */
const SIDE_BY_SIDE = [40, 144];

/* Two pictures that run molten into each other. The group is given no look: the pictures are the liquid. */
function meltCode(melt: Tuning | undefined): FrameworkCode {
	return perFramework((fw) => {
		const tuning = { effect: 'melt', melt };
		const still = (i: number) => `<div class="card" style="left: ${SIDE_BY_SIDE[i]}px; top: 58px">\n  <img src="${'ab'[i]}.jpg" alt="" />\n</div>`;
		if (fw === 'vanilla') {
			return vanillaFile(
				`<div class="stage">\n${pad(`${still(0)}\n${still(1)}`)}\n</div>`,
				`${mount('stage', '.stage', {})}\n` +
					`// Move a picture by writing its left and top, from a drag for instance.\n` +
					`for (const card of stage.element.querySelectorAll('.card')) {\n` +
					`  stage.item(card, ${options(tuning, '  ')});\n` +
					`}`
			);
		}
		if (fw === 'elements') {
			return elementsFile(
				'',
				group(fw, { class: 'stage' }, `<!-- Move a picture by writing its left and top, from a drag for instance. -->\n${[0, 1].map((i) => item(fw, tuning, still(i))).join('\n')}`)
			);
		}
		const card = (n: string) =>
			({
				svelte: `<div class="card" style:left="{${n}.x}px" style:top="{${n}.y}px">\n  <img src={${n}.src} alt="" />\n</div>`,
				react: `<div className="card" style={{ left: ${n}.x, top: ${n}.y }}>\n  <img src={${n}.src} alt="" />\n</div>`,
				vue: `<div class="card" :style="{ left: ${n}.x + 'px', top: ${n}.y + 'px' }">\n  <img :src="${n}.src" alt="" />\n</div>`
			})[fw];
		const markup = group(fw, { class: 'stage' }, ['a', 'b'].map((n) => item(fw, tuning, card(n))).join('\n'));
		if (fw === 'svelte') return svelteFile('', markup);
		if (fw === 'react') return reactFile({ name: 'Pictures', params: '{ a, b }' }, markup);
		return vueFile({ state: `defineProps(['a', 'b']);` }, markup);
	});
}

/* ── the prompt ─────────────────────────────────────────────────────── */

/** For a prompt: the step that imports the library. */
export function importStep(fw: Framework): string {
	const line = importOnly[fw];
	if (fw === 'elements') return `Import the elements once, which registers the <runeglow-liquid> and <runeglow-liquid-item> tags: ${line}`;
	if (fw === 'vanilla') return `Import the function: ${line}`;
	return `Import ${fw === 'vue' ? 'the components' : 'the component'}: ${line}`;
}

/** For a prompt: how the pieces are put in a group. Lines after the first are indented to sit under a numbered step. */
export function wrapStep(fw: Framework): string {
	switch (fw) {
		case 'elements':
			return (
				`Wrap the pieces that should behave as one liquid in <runeglow-liquid>, and each piece in\n` +
				`   <runeglow-liquid-item>: its first child element is the piece. The group draws one merged\n` +
				`   surface behind them; your elements stay crisp on top, so give them a transparent\n` +
				`   background and let the group's fill show.`
			);
		case 'vanilla':
			return (
				`Call mountLiquid on the element that holds the pieces that should behave as one liquid,\n` +
				`   and item() on what it returns for each piece. The elements are used as they stand, with\n` +
				`   no wrappers. The group draws one merged surface behind them; your elements stay crisp\n` +
				`   on top, so give them a transparent background and let the group's fill show.`
			);
		default:
			return (
				`Wrap the pieces that should behave as one liquid in <Liquid>, and each piece in\n` +
				`   <${NAMES[fw].item}>. The group draws one merged surface behind them; your elements stay\n` +
				`   crisp on top, so give them a transparent background and let the group's fill show.`
			);
	}
}

/** For a prompt: what the two lists of parameters are headed with. */
export const vocabulary: Record<Framework, { group: string; item: string }> = {
	svelte: { group: '<Liquid> (the group)', item: '<Liquid.Item>' },
	react: { group: '<Liquid> (the group)', item: '<Liquid.Item>' },
	vue: { group: '<Liquid> (the group; in a template, filterPadding is written filter-padding)', item: '<LiquidItem>' },
	elements: {
		group: '<runeglow-liquid> (the group; as attributes, camelCase names are kebab-case: filterPadding is filter-padding)',
		item: '<runeglow-liquid-item> (an object is written as JSON in an attribute, or set as a property)'
	},
	vanilla: { group: 'mountLiquid(element, options) (the group)', item: 'group.item(element, options) (one piece)' }
};

/** For a prompt: what holds in this framework and not in the others. */
export function promptNotes(fw: Framework): string[] {
	switch (fw) {
		case 'react':
			return ['- className and style on <Liquid.Item> go on its wrapper; a ref on <Liquid> reaches the group element.'];
		case 'vue':
			return ['- class and style on <LiquidItem> go on its wrapper; a template ref on <Liquid> gives { element, group }.'];
		case 'elements':
			return [
				'- Every option is an attribute and a property, except blur on <runeglow-liquid>: every element\n  already has a blur() method, so change it with setAttribute("blur", …).',
				'- transition takes a preset name as plain text (transition="bouncy"); dissolve with no value\n  means true.'
			];
		case 'vanilla':
			return [
				'- mountLiquid returns { element, group, update, item, destroy } and item() returns\n  { element, update, destroy }. update(options) changes some options and keeps the rest.',
				'- The library moves a piece given x, y or scale through its inline transform.'
			];
		default:
			return [];
	}
}
