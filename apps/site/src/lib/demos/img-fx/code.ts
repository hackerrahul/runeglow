/* The code the Image generation page shows, in each framework.

   The card differs between frameworks in kind, so the texts are written by
   hand rather than by `example`: the reveal functions are on the component
   (`bind:this`), on a ref, on a template ref, on the element itself, or on
   what `mountImageGeneration` returns; lists are JSON in an attribute; and
   with no framework the function is given the wrapper, an element the page
   already has with the card inside it, not the card. */

import { FRAMEWORKS, kebab, perFramework, type Framework, type FrameworkCode } from '#lib/code.ts';
import { SITE } from '#lib/site.ts';

type Markup = Exclude<Framework, 'vanilla'>;

const pad = (text: string, by: string) =>
	text
		.split('\n')
		.map((line) => (line ? by + line : line))
		.join('\n');

const TAG = 'runeglow-image-generation';
/* with no framework: the one whose `update` takes only what changes, as every other library's does */
const MOUNT = 'mountImageGeneration';

const importLine = (fw: Framework) =>
	fw === 'elements' ? `import '${FRAMEWORKS[fw].pkg}/img-fx';` : `import { ${fw === 'vanilla' ? MOUNT : 'ImageGeneration'} } from '${FRAMEWORKS[fw].pkg}/img-fx';`;

/* ── the page's examples ────────────────────────────────────────────── */

export const importOnly: FrameworkCode = perFramework(importLine);

export const quickStart: FrameworkCode = perFramework((fw) => {
	const card = '<div class="card" style="width: 320px; height: 320px; border-radius: 20px;"></div>';
	switch (fw) {
		case 'svelte':
			return `<script>
  ${importLine(fw)}
<\/script>

<ImageGeneration preset="pixels-organic" images={['/img/a.jpg', '/img/b.jpg']} autoReveal>
  ${card}
</ImageGeneration>`;
		case 'react':
			return `${importLine(fw)}

export function Example() {
  return (
    <ImageGeneration preset="pixels-organic" images={['/img/a.jpg', '/img/b.jpg']} autoReveal>
      <div className="card" style={{ width: 320, height: 320, borderRadius: 20 }} />
    </ImageGeneration>
  );
}`;
		case 'vue':
			return `<script setup>
${importLine(fw)}
<\/script>

<template>
  <ImageGeneration preset="pixels-organic" :images="['/img/a.jpg', '/img/b.jpg']" auto-reveal>
    ${card}
  </ImageGeneration>
</template>`;
		case 'elements':
			return `<script type="module">
  ${importLine(fw)}
<\/script>

<!-- a list is written as JSON -->
<${TAG} preset="pixels-organic" images='["/img/a.jpg", "/img/b.jpg"]' auto-reveal>
  ${card}
</${TAG}>`;
		case 'vanilla':
			return `${importLine(fw)}

// The page has the wrapper, with the card inside it:
//   <div id="cover">
//     ${card}
//   </div>

const card = ${MOUNT}(document.querySelector('#cover'), {
  preset: 'pixels-organic',
  images: ['/img/a.jpg', '/img/b.jpg'],
  autoReveal: true,
});`;
	}
});

export const manual: FrameworkCode = perFramework((fw) => {
	const why = '// Show the effect while the image is being made, then reveal it.';
	switch (fw) {
		case 'svelte':
			return `<script>
  ${importLine(fw)}

  let card; // the component
  let { src, loading } = $props();

  ${why}
  $effect(() => {
    if (!loading && src) card?.triggerReveal({ hold: 'manual' });
  });
<\/script>

<ImageGeneration bind:this={card} images={src}>
  <div class="card"></div>
</ImageGeneration>

<button onclick={() => card.triggerRegenerate({ durationMs: 3000 })}>Regenerate</button>`;
		case 'react':
			return `import { useEffect, useRef } from 'react';
${importLine(fw)}

export function Card({ src, loading }) {
  const card = useRef(null); // the reveal functions, and the wrapper as card.current.element

  ${why}
  useEffect(() => {
    if (!loading && src) card.current?.triggerReveal({ hold: 'manual' });
  }, [loading, src]);

  return (
    <>
      <ImageGeneration ref={card} images={src}>
        <div className="card" />
      </ImageGeneration>

      <button onClick={() => card.current.triggerRegenerate({ durationMs: 3000 })}>Regenerate</button>
    </>
  );
}`;
		case 'vue':
			return `<script setup>
import { nextTick, ref, watch } from 'vue';
${importLine(fw)}

const props = defineProps(['src', 'loading']);
const card = ref(null); // the component: its reveal functions, and the wrapper as card.value.element

${why}
watch(
  () => !props.loading && props.src,
  async (ready) => {
    if (!ready) return;
    await nextTick(); // the card has been given the image by now
    card.value?.triggerReveal({ hold: 'manual' });
  },
  { immediate: true }
);
<\/script>

<template>
  <ImageGeneration ref="card" :images="src">
    <div class="card"></div>
  </ImageGeneration>

  <button @click="card.triggerRegenerate({ durationMs: 3000 })">Regenerate</button>
</template>`;
		case 'elements':
			return `<script type="module">
  ${importLine(fw)}

  const card = document.querySelector('${TAG}'); // the element has the reveal functions

  ${why}
  // Call this when the image arrives.
  function show(src) {
    card.images = src;
    card.triggerReveal({ hold: 'manual' });
  }

  document.querySelector('#regenerate').addEventListener('click', () => card.triggerRegenerate({ durationMs: 3000 }));
<\/script>

<${TAG}>
  <div class="card"></div>
</${TAG}>

<button id="regenerate">Regenerate</button>`;
		case 'vanilla':
			return `${importLine(fw)}

// The page has the wrapper, with the card inside it:
//   <div id="cover"><div class="card"></div></div>
//   <button id="regenerate">Regenerate</button>

const card = ${MOUNT}(document.querySelector('#cover')); // what it returns has the reveal functions

${why}
// Call this when the image arrives.
function show(src) {
  card.update({ images: src });
  card.triggerReveal({ hold: 'manual' });
}

document.querySelector('#regenerate').addEventListener('click', () => card.triggerRegenerate({ durationMs: 3000 }));`;
	}
});

/* ── the playground ─────────────────────────────────────────────────── */

/** A prop's value as the playground has it: text, a number, `true`, or a list whose `null`s keep the preset's own. */
export type CardValue = string | number | boolean | Array<string | number | null>;

export interface CardSetup {
	/** The props that are written, in the order they are written. */
	props: Array<[name: string, value: CardValue]>;
	/** The card's side and corner radius, in px. */
	size: number;
	radius: number;
	/** What the Regenerate button passes, already as source: `durationMs: 3000`. */
	regenerate: string;
}

/* a value as JavaScript source: a list as it is written in a script */
const source = (value: CardValue): string =>
	Array.isArray(value) ? `[${value.map((v) => (v === null ? 'null' : source(v))).join(', ')}]` : typeof value === 'string' ? `'${value}'` : String(value);

/* one prop as an attribute of the framework's markup */
function attribute(fw: Markup, name: string, value: CardValue): string {
	if (fw === 'svelte' || fw === 'react') {
		if (value === true) return name;
		return typeof value === 'string' ? `${name}="${value}"` : `${name}={${source(value)}}`;
	}
	const key = kebab(name);
	if (value === true) return key;
	if (typeof value === 'string') return `${key}="${value}"`;
	if (fw === 'vue') return `:${key}="${source(value)}"`;
	/* an attribute holds text: a list goes in as JSON, in single quotes round its double ones */
	return Array.isArray(value) ? `${key}='${JSON.stringify(value)}'` : `${key}="${value}"`;
}

/** What is on the playground's stage, as code in every framework. */
export function cardSnippet({ props, size, radius, regenerate }: CardSetup): FrameworkCode {
	const box = `width: ${size}px; height: ${size}px; border-radius: ${radius}px;`;
	const list = (fw: Markup, first: string) => [first, ...props.map(([name, value]) => attribute(fw, name, value))].filter(Boolean).join('\n  ');
	return perFramework((fw) => {
		switch (fw) {
			case 'svelte':
				return `<script>
  ${importLine(fw)}

  let card; // the component, for its reveal functions
<\/script>

<ImageGeneration
  ${list(fw, 'bind:this={card}')}
>
  <div style="${box}"></div>
</ImageGeneration>

<button onclick={() => (card.isImageActive() ? card.triggerHide() : card.triggerReveal({ hold: 'manual' }))}>
  Reveal or hide
</button>
<button onclick={() => card.triggerRegenerate({ ${regenerate} })}>Regenerate</button>`;
			case 'react':
				return `import { useRef } from 'react';
${importLine(fw)}

export function Example() {
  const card = useRef(null); // the reveal functions, and the wrapper as card.current.element

  return (
    <>
${pad(`<ImageGeneration\n  ${list(fw, 'ref={card}')}\n>`, '      ')}
        <div style={{ width: ${size}, height: ${size}, borderRadius: ${radius} }} />
      </ImageGeneration>

      <button onClick={() => (card.current.isImageActive() ? card.current.triggerHide() : card.current.triggerReveal({ hold: 'manual' }))}>
        Reveal or hide
      </button>
      <button onClick={() => card.current.triggerRegenerate({ ${regenerate} })}>Regenerate</button>
    </>
  );
}`;
			case 'vue':
				return `<script setup>
import { ref } from 'vue';
${importLine(fw)}

const card = ref(null); // the component, for its reveal functions
<\/script>

<template>
${pad(`<ImageGeneration\n  ${list(fw, 'ref="card"')}\n>`, '  ')}
    <div style="${box}"></div>
  </ImageGeneration>

  <button @click="card.isImageActive() ? card.triggerHide() : card.triggerReveal({ hold: 'manual' })">
    Reveal or hide
  </button>
  <button @click="card.triggerRegenerate({ ${regenerate} })">Regenerate</button>
</template>`;
			case 'elements':
				return `<script type="module">
  ${importLine(fw)}

  const card = document.querySelector('${TAG}'); // the element has the reveal functions

  document.querySelector('#reveal').addEventListener('click', () => {
    if (card.isImageActive()) card.triggerHide();
    else card.triggerReveal({ hold: 'manual' });
  });
  document.querySelector('#regenerate').addEventListener('click', () => card.triggerRegenerate({ ${regenerate} }));
<\/script>

<${TAG}
  ${list(fw, '')}
>
  <div style="${box}"></div>
</${TAG}>

<button id="reveal">Reveal or hide</button>
<button id="regenerate">Regenerate</button>`;
			case 'vanilla':
				return `${importLine(fw)}

// The page has the wrapper, with the card inside it:
//   <div id="cover">
//     <div style="${box}"></div>
//   </div>
//   <button id="reveal">Reveal or hide</button>
//   <button id="regenerate">Regenerate</button>

const card = ${MOUNT}(document.querySelector('#cover'), {
${props.map(([name, value]) => `  ${name}: ${source(value)},`).join('\n')}
});

document.querySelector('#reveal').addEventListener('click', () => {
  if (card.isImageActive()) card.triggerHide();
  else card.triggerReveal({ hold: 'manual' });
});
document.querySelector('#regenerate').addEventListener('click', () => card.triggerRegenerate({ ${regenerate} }));`;
		}
	});
}

/** The same as a prompt for a coding agent, written for each framework. */
export function cardPrompt(snippet: FrameworkCode): FrameworkCode {
	return perFramework((fw, info) => {
		const from = `'${info.pkg}/img-fx'`;
		const bring = {
			svelte: `Import it: import { ImageGeneration } from ${from}`,
			react: `Import it: import { ImageGeneration } from ${from}`,
			vue: `Import it: import { ImageGeneration } from ${from}`,
			elements: `Import the element once, which registers the <${TAG}> tag:\n   import ${from}`,
			vanilla: `Import the function: import { ${MOUNT} } from ${from}`
		}[fw];
		const wraps = {
			svelte: 'Wrap one element, the card. The wrapper sizes itself to it and reads its border-radius.',
			react: 'Wrap one element, the card. The wrapper sizes itself to it and reads its border-radius.',
			vue: 'Wrap one element, the card. The wrapper sizes itself to it and reads its border-radius.',
			elements: 'Put one element, the card, inside the tag. The tag sizes itself to it and reads its border-radius.',
			vanilla: `Give the function an element the page already has, with one element, the card, inside it.
   That element becomes the wrapper: it sizes itself to the card and reads its border-radius.`
		}[fw];
		const cycle = {
			svelte: 'onCycle reports idle, reveal, visible, hide.',
			react: 'onCycle reports idle, reveal, visible, hide.',
			vue: '@cycle (the onCycle prop) reports idle, reveal, visible, hide\n  as the event\'s phase.',
			elements: 'A cycle event reports idle, reveal, visible, hide as\n  event.detail.phase; so does a function set as the onCycle property.',
			vanilla: 'The onCycle option reports idle, reveal, visible, hide.'
		}[fw];
		const calls = `triggerReveal({ hold: 'manual' }), triggerHide(),
  triggerRegenerate({ durationMs, tintFromImage, autoReveal }), isImageActive().`;
		const functions = {
			svelte: `The component's functions (bind:this): ${calls}`,
			react: `The ref's functions, on ref.current, which also has the wrapper as element:\n  ${calls}`,
			vue: `The template ref's functions (it also has the wrapper as element):\n  ${calls}`,
			elements: `The element's methods: ${calls}`,
			vanilla: `What ${MOUNT} returns has update(options), which keeps the options it is not
  given, destroy(), and the functions: ${calls}`
		}[fw];
		const spelling = fw === 'elements' ? ' (as attributes, camelCase names become kebab-case: pixelScale is\npixel-scale; a list is written as JSON)' : '';
		return `Add the Image generation effect from ${SITE.name} to this ${info.app}: a WebGL mosaic
loader on a card that resolves into an image.

1. Install the packages with the project's package manager, for example:
   pnpm add ${info.pkg} three
2. ${bring}
3. ${wraps}
4. Give it a pool of images (same-origin, or served with CORS headers).
5. Start from this configuration:

${snippet[fw]}

Parameter vocabulary, for later changes${spelling}:
- preset: pixels-organic, pixels-mechanic or sweep-gradient. theme: auto, dark, light.
- strength 0 to 2, speed, pixelScale (cell size), cardBg (the surface the effect sits on),
  colors (seven palette slots; null keeps the preset's).
- autoReveal with revealDelayRange [min, max] seconds, revealInitialDelay, revealHoldMs,
  revealFadeOutMs. ${cycle}
- ${functions}
- paused freezes the effect and the reveal schedule.

Notes:
- three is a peer dependency. One WebGL context is shared by every card on the page.
- Cards pause while offscreen.`;
	});
}
