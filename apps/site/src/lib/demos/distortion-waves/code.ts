/* The Distortion waves page's code, in each framework.

   A wave takes two views and an overlay, and every framework hands those
   over in its own way: snippets in Svelte, nodes as props in React, named
   slots in Vue, children marked with `slot` on the custom element, and
   elements passed to a function where there is no framework. So do the
   end of a wave (a callback, an event) and its functions (on the bound
   component, a ref, the element, or what the function returns). The texts
   are written out here for that reason, and not composed by `example()`. */

import { attrs, expr, importLine, importStep, options, perFramework, type Framework, type FrameworkCode, type Props } from '#lib/code.ts';

const LIB = 'distortion-waves';

const pad = (text: string, by = '  ') =>
	text
		.split('\n')
		.map((line) => (line ? by + line : line))
		.join('\n');

const line = (fw: Framework, name = 'DistortionWave') => importLine(fw, LIB, [name]);

/* ── a whole file round the markup ──────────────────────────────────── */

const svelteFile = (state: string[], markup: string) => `<script>\n  ${line('svelte')}\n\n${pad(state.join('\n'))}\n<\/script>\n\n${markup}`;

const reactFile = (o: { hooks: string[]; name: string; state: string[] }, markup: string) =>
	`import { ${o.hooks.join(', ')} } from 'react';\n${line('react')}\n\nexport function ${o.name}() {\n${pad(o.state.join('\n'))}\n  return (\n${pad(markup, '    ')}\n  );\n}`;

const vueFile = (state: string[], markup: string) =>
	`<script setup>\nimport { ref } from 'vue';\n${line('vue')}\n\n${state.join('\n')}\n<\/script>\n\n<template>\n${pad(markup)}\n</template>`;

const elementsFile = (script: string, markup: string) => `<script type="module">\n  ${line('elements')}\n\n${pad(script)}\n<\/script>\n\n${markup}`;

/* the size and the corners the examples give the wave's element */
const css = (width: number) => `width: ${width}px; border-radius: 28px; overflow: hidden;`;
const reactStyle = (width: number) => `style={{ width: ${width}, borderRadius: 28, overflow: 'hidden' }}`;

/* ── the page's examples ────────────────────────────────────────────── */

export const importOnly = perFramework((fw) => line(fw, fw === 'vanilla' ? 'mountDistortionWave' : 'DistortionWave'));

/* Two views and the button that sends the wave from one to the other. */
export const quickStart = perFramework((fw) => {
	switch (fw) {
		case 'svelte':
			return svelteFile(
				['let sent = $state(false);'],
				`<DistortionWave revealed={sent} style="${css(320)}">\n` +
					`  <Review />\n\n` +
					`  {#snippet revealedContent()}\n    <Receipt />\n  {/snippet}\n\n` +
					`  {#snippet overlay()}\n    <button onclick={() => (sent = true)}>Confirm</button>\n  {/snippet}\n` +
					`</DistortionWave>`
			);
		case 'react':
			return reactFile(
				{ hooks: ['useState'], name: 'Transfer', state: ['const [sent, setSent] = useState(false);'] },
				`<DistortionWave\n` +
					`  revealed={sent}\n` +
					`  revealedContent={<Receipt />}\n` +
					`  overlay={<button onClick={() => setSent(true)}>Confirm</button>}\n` +
					`  ${reactStyle(320)}\n` +
					`>\n  <Review />\n</DistortionWave>`
			);
		case 'vue':
			return vueFile(
				['const sent = ref(false);'],
				`<DistortionWave :revealed="sent" style="${css(320)}">\n` +
					`  <Review />\n\n` +
					`  <template #revealedContent>\n    <Receipt />\n  </template>\n\n` +
					`  <template #overlay>\n    <button @click="sent = true">Confirm</button>\n  </template>\n` +
					`</DistortionWave>`
			);
		case 'elements':
			return elementsFile(
				`const wave = document.querySelector('runeglow-distortion-wave');\n` +
					`document.querySelector('#confirm').addEventListener('click', () => (wave.revealed = true));`,
				`<runeglow-distortion-wave style="${css(320)}">\n` +
					`  <!-- Each view is one child: the first shows first, slot="revealed" is the second. -->\n` +
					`  <div id="review">…</div>\n` +
					`  <div slot="revealed" id="receipt">…</div>\n` +
					`  <div slot="overlay">\n    <button id="confirm">Confirm</button>\n  </div>\n` +
					`</runeglow-distortion-wave>`
			);
		case 'vanilla':
			return (
				`${line(fw, 'mountDistortionWave')}\n\n` +
				`// Your own elements: the two views, and the button that stays above the wave.\n` +
				`const review = document.querySelector('#review');\n` +
				`const receipt = document.querySelector('#receipt');\n` +
				`const button = document.querySelector('#confirm');\n\n` +
				`// Makes the wave's element inside #slot and moves the views into it.\n` +
				`const wave = mountDistortionWave(document.querySelector('#slot'), ${options({
					content: expr('review'),
					revealedContent: expr('receipt'),
					overlay: expr('button'),
					style: css(320)
				})});\n` +
				`button.addEventListener('click', () => wave.update({ revealed: true }));`
			);
	}
});

/* A ring out from an icon inside the first view. */
export const ring = perFramework((fw) => {
	switch (fw) {
		case 'svelte':
			return svelteFile(
				['let token = $state(null);', 'let bought = $state(false);'],
				`<DistortionWave type="center" palette="ocean" revealed={bought} source={token} waveStyle={{ travel: 2.8 }}>\n` +
					`  <Credits bind:token onbuy={() => (bought = true)} />\n\n` +
					`  {#snippet revealedContent()}\n    <Credits added />\n  {/snippet}\n` +
					`</DistortionWave>`
			);
		case 'react':
			return reactFile(
				{ hooks: ['useRef', 'useState'], name: 'BuyCredits', state: ['const token = useRef(null); // Credits puts it on its icon', 'const [bought, setBought] = useState(false);'] },
				`<DistortionWave\n` +
					`  type="center"\n  palette="ocean"\n  revealed={bought}\n  source={token}\n  waveStyle={{ travel: 2.8 }}\n` +
					`  revealedContent={<Credits added />}\n` +
					`>\n  <Credits tokenRef={token} onBuy={() => setBought(true)} />\n</DistortionWave>`
			);
		case 'vue':
			return vueFile(
				['const token = ref(null); // the icon’s element, which Credits hands up', 'const bought = ref(false);'],
				`<DistortionWave type="center" palette="ocean" :revealed="bought" :source="token" :wave-style="{ travel: 2.8 }">\n` +
					`  <Credits v-model:token="token" @buy="bought = true" />\n\n` +
					`  <template #revealedContent>\n    <Credits added />\n  </template>\n` +
					`</DistortionWave>`
			);
		case 'elements':
			return elementsFile(
				`const wave = document.querySelector('runeglow-distortion-wave');\n` + `document.querySelector('#buy').addEventListener('click', () => (wave.revealed = true));`,
				`<!-- source is a selector for an element inside the wave, or a rectangle as JSON. -->\n` +
					`<runeglow-distortion-wave type="center" palette="ocean" source=".token" wave-style='{"travel":2.8}'>\n` +
					`  <div id="credits">\n    <span class="token">…</span>\n    <button id="buy">Buy</button>\n  </div>\n` +
					`  <div slot="revealed" id="added">…</div>\n` +
					`</runeglow-distortion-wave>`
			);
		case 'vanilla':
			return (
				`${line(fw, 'mountDistortionWave')}\n\n` +
				`const credits = document.querySelector('#credits');\n` +
				`const wave = mountDistortionWave(document.querySelector('#slot'), ${options({
					content: expr('credits'),
					revealedContent: expr(`document.querySelector('#added')`),
					type: 'center',
					palette: 'ocean',
					source: expr(`credits.querySelector('.token')`),
					waveStyle: { travel: 2.8 }
				})});\n` +
				`credits.querySelector('button').addEventListener('click', () => wave.update({ revealed: true }));`
			);
	}
});

const PASSES = 'No second view: the wave passes over the content and leaves it as it was.';

/* One view, and the wave run by calling its function. */
export const imperative = perFramework((fw) => {
	switch (fw) {
		case 'svelte':
			return (
				`<script>\n  ${line(fw)}\n\n  let wave; // the component\n<\/script>\n\n` +
				`<!-- ${PASSES} -->\n` +
				`<DistortionWave bind:this={wave} type="horizontal" palette="mono">\n  <Article />\n</DistortionWave>\n\n` +
				`<button onclick={(e) => wave.play({ source: e.currentTarget })}>Refresh</button>`
			);
		case 'react':
			return reactFile(
				{ hooks: ['useRef'], name: 'Feed', state: ['const wave = useRef(null); // the wave’s functions, and its element'] },
				`<>\n` +
					`  {/* ${PASSES} */}\n` +
					`  <DistortionWave ref={wave} type="horizontal" palette="mono">\n    <Article />\n  </DistortionWave>\n\n` +
					`  <button onClick={(e) => wave.current?.play({ source: e.currentTarget })}>Refresh</button>\n` +
					`</>`
			);
		case 'vue':
			return vueFile(
				['const wave = ref(null); // the component', 'const refresh = (e) => wave.value?.play({ source: e.currentTarget });'],
				`<!-- ${PASSES} -->\n` +
					`<DistortionWave ref="wave" type="horizontal" palette="mono">\n  <Article />\n</DistortionWave>\n\n` +
					`<button @click="refresh">Refresh</button>`
			);
		case 'elements':
			return elementsFile(
				`const wave = document.querySelector('runeglow-distortion-wave');\n` +
					`document.querySelector('#refresh').addEventListener('click', (e) => wave.play({ source: e.currentTarget }));`,
				`<!-- ${PASSES} -->\n` +
					`<runeglow-distortion-wave type="horizontal" palette="mono">\n  <article>…</article>\n</runeglow-distortion-wave>\n\n` +
					`<button id="refresh">Refresh</button>`
			);
		case 'vanilla':
			return (
				`${line(fw, 'mountDistortionWave')}\n\n` +
				`// ${PASSES}\n` +
				`const wave = mountDistortionWave(document.querySelector('#slot'), ${options({
					content: expr(`document.querySelector('article')`),
					type: 'horizontal',
					palette: 'mono'
				})});\n\n` +
				`document.querySelector('#refresh').addEventListener('click', (e) => wave.play({ source: e.currentTarget }));`
			);
	}
});

/** With no framework only: the wave on markup the page already has. */
export const attached =
	`<div id="card">\n` +
	`  <div id="review">…</div>\n` +
	`  <div id="receipt">…</div>\n` +
	`  <div><button id="confirm">Confirm</button></div>\n` +
	`</div>\n\n` +
	`<script type="module">\n` +
	`  ${line('vanilla', 'attachDistortionWave')}\n\n` +
	`  // The layers are the card's own children: the two views, and what stays above the wave.\n` +
	`  const card = document.querySelector('#card');\n` +
	`  const [content, revealed, overlay] = card.children;\n` +
	`  const wave = attachDistortionWave(card, { content, revealed, overlay }, { type: 'vertical' }, {\n` +
	`    onFinish: (revealed) => console.log(revealed ? 'on the second view' : 'back on the first'),\n` +
	`  });\n\n` +
	`  // This update takes the whole set of options each time.\n` +
	`  document.querySelector('#confirm').addEventListener('click', () => {\n` +
	`    wave.update({ type: 'vertical', revealed: true });\n` +
	`  });\n` +
	`<\/script>`;

/* ── the playground ─────────────────────────────────────────────────── */

/* The playground's three scenes: what each view is called as a component,
   and as an element with an id where there are no components. */
const SCENES = {
	vertical: { views: ['<Review />', '<Receipt />'], ids: ['review', 'receipt'], label: 'Confirm' },
	center: { views: ['<Credits />', '<Credits added />'], ids: ['credits', 'added'], label: 'Buy' },
	horizontal: { views: ['<Toast />', '<Toast done />'], ids: ['toast', 'sent'], label: 'Send' }
} as const;

/**
 * What is on the playground's stage, as code. `props` is the wave's own
 * options, already cut down to what differs from the defaults; the views,
 * the button, `revealed` and the element's style are added here.
 */
export function playgroundCode(type: keyof typeof SCENES, props: Props): FrameworkCode {
	const scene = SCENES[type];
	const [first, second] = scene.views;
	const [firstId, secondId] = scene.ids;
	const tag = (name: string, list: string[]) => `<${name}\n  ${list.join('\n  ')}\n>`;
	return perFramework((fw) => {
		switch (fw) {
			case 'svelte':
				return svelteFile(
					['let done = $state(false);'],
					`${tag('DistortionWave', attrs(fw, { revealed: expr('done'), ...props, style: css(300) }))}\n` +
						`  ${first}\n\n` +
						`  {#snippet revealedContent()}\n    ${second}\n  {/snippet}\n\n` +
						`  {#snippet overlay()}\n    <button onclick={() => (done = !done)}>${scene.label}</button>\n  {/snippet}\n` +
						`</DistortionWave>`
				);
			case 'react':
				return reactFile(
					{ hooks: ['useState'], name: 'Example', state: ['const [done, setDone] = useState(false);'] },
					`${tag('DistortionWave', [
						...attrs(fw, { revealed: expr('done'), ...props }),
						reactStyle(300),
						`revealedContent={${second}}`,
						`overlay={<button onClick={() => setDone(!done)}>${scene.label}</button>}`
					])}\n  ${first}\n</DistortionWave>`
				);
			case 'vue':
				return vueFile(
					['const done = ref(false);'],
					`${tag('DistortionWave', attrs(fw, { revealed: expr('done'), ...props, style: css(300) }))}\n` +
						`  ${first}\n\n` +
						`  <template #revealedContent>\n    ${second}\n  </template>\n\n` +
						`  <template #overlay>\n    <button @click="done = !done">${scene.label}</button>\n  </template>\n` +
						`</DistortionWave>`
				);
			case 'elements':
				return elementsFile(
					`const wave = document.querySelector('runeglow-distortion-wave');\n` +
						`let done = false;\n` +
						`document.querySelector('#go').addEventListener('click', () => {\n` +
						`  done = !done;\n` +
						`  wave.revealed = done;\n` +
						`});`,
					`${tag('runeglow-distortion-wave', attrs(fw, { ...props, style: css(300) }))}\n` +
						`  <div id="${firstId}">…</div>\n` +
						`  <div slot="revealed" id="${secondId}">…</div>\n` +
						`  <div slot="overlay">\n    <button id="go">${scene.label}</button>\n  </div>\n` +
						`</runeglow-distortion-wave>`
				);
			case 'vanilla':
				return (
					`${line(fw, 'mountDistortionWave')}\n\n` +
					`// Your own elements: the two views, and the button that stays above the wave.\n` +
					`const first = document.querySelector('#${firstId}');\n` +
					`const second = document.querySelector('#${secondId}');\n` +
					`const button = document.querySelector('#go'); // <button id="go">${scene.label}</button>\n\n` +
					`// Makes the wave's element inside #slot and moves the views into it.\n` +
					`const wave = mountDistortionWave(document.querySelector('#slot'), ${options({
						content: expr('first'),
						revealedContent: expr('second'),
						overlay: expr('button'),
						...props,
						style: css(300)
					})});\n\n` +
					`let done = false;\n` +
					`button.addEventListener('click', () => {\n` +
					`  done = !done;\n` +
					`  wave.update({ revealed: done });\n` +
					`});`
				);
		}
	});
}

/* ── the prompt ─────────────────────────────────────────────────────── */

export const promptImport = (fw: Framework) => importStep(fw, 'DistortionWave');

/** For a prompt: where the two views and the button go. Lines after the first sit under a numbered step. */
export const viewsStep: Record<Framework, string> = {
	svelte:
		`Put the first view in its children and the second in the revealedContent snippet. Give\n` +
		`   both an opaque background. Put the button that starts it in the overlay snippet, which\n` +
		`   stays live above the wave.`,
	react:
		`Put the first view in its children and pass the second as the revealedContent prop. Give\n` +
		`   both an opaque background. Pass the button that starts it as the overlay prop, which\n` +
		`   stays live above the wave.`,
	vue:
		`Put the first view in the default slot and the second in the #revealedContent slot. Give\n` +
		`   both an opaque background. Put the button that starts it in the #overlay slot, which\n` +
		`   stays live above the wave.`,
	elements:
		`Each view is one child element: the first child is the first view and the child with\n` +
		`   slot="revealed" is the second. Give both an opaque background. Put the button that\n` +
		`   starts it inside a child with slot="overlay", which stays live above the wave.`,
	vanilla:
		`Hand it the first view as content and the second as revealedContent: elements of your\n` +
		`   own, which it moves into the element it makes inside the parent you give it. Give both\n` +
		`   an opaque background. Hand it the button that starts it as overlay, which stays live\n` +
		`   above the wave.`
};

/** For a prompt: what runs the wave. */
export const runStep: Record<Framework, string> = {
	svelte: `Changing revealed runs the wave: true forwards, false back into its source.`,
	react: `Changing revealed runs the wave: true forwards, false back into its source.`,
	vue: `Changing revealed runs the wave: true forwards, false back into its source.`,
	elements:
		`Setting the revealed property runs the wave: true forwards, false back into its source.\n` +
		`   As an attribute write revealed="false" to run it back: taking the attribute away\n` +
		`   leaves the wave where it is.`,
	vanilla: `update({ revealed }) runs the wave: true forwards, false back into its source.`
};

/** For a prompt: how `source` is written. */
export const sourceWord: Record<Framework, string> = {
	svelte: `an element or { x, y, w, h } in the element's CSS px`,
	react: `an element, a ref to one, or { x, y, w, h } in the element's CSS px`,
	vue: `an element or { x, y, w, h } in the element's CSS px`,
	elements: `a selector for an element inside the wave, or { x, y, w, h } as JSON in the element's\n  CSS px (as a property, an element too)`,
	vanilla: `an element or { x, y, w, h } in the element's CSS px`
};

/** For a prompt: where the wave's functions are. */
export const functionsLine: Record<Framework, string> = {
	svelte: `- The component's functions (bind:this): play({ source, focus }), reverse(), reset(), prepare().`,
	react: `- The component's functions (on a ref): play({ source, focus }), reverse(), reset(), prepare().\n  onFinish(revealed) is called when a wave ends.`,
	vue:
		`- The component's functions (on a template ref): play({ source, focus }), reverse(), reset(),\n  prepare(). @finish tells when a wave ends, with the view now showing.\n` +
		`- In a template, waveStyle is written wave-style.`,
	elements:
		`- The element's methods: play({ source, focus }), reverse(), reset(), prepare(). It fires a\n  finish event when a wave ends, with event.detail.revealed.\n` +
		`- As attributes, camelCase names are kebab-case (waveStyle is wave-style), an object is\n  written as JSON and false as ="false". Every option is also a property; focus is focusPoint.`,
	vanilla:
		`- What mountDistortionWave returns: element, update(options), play({ source, focus }),\n  reverse(), reset(), prepare(), destroy(). onFinish(revealed) is an option, called when a\n  wave ends.\n` +
		`- attachDistortionWave(root, { content, revealed, overlay }, options) runs the wave on\n  elements already in the page; its update() takes the whole set of options each time.`
};
