/* The code the Liquid metal page shows, in each framework.

   Metal differs between frameworks in kind, not only in spelling, so the
   texts here are put together by hand rather than by `example`: an element
   is reached through `bind:this`, a ref, a template ref, a CSS selector or
   `querySelector`; the bend is a hook, an attribute (`bend`) or a plain
   function; and with no framework a ring is put round a button the page
   already has, while text and a badge are made inside an element. */

import { FRAMEWORKS, attrs, expr, js, kebab, options, perFramework, type Framework, type FrameworkCode, type PropValue, type Props } from '#lib/code.ts';
import { SITE } from '#lib/site.ts';

type Markup = Exclude<Framework, 'vanilla'>;

const pad = (text: string, by: string) =>
	text
		.split('\n')
		.map((line) => (line ? by + line : line))
		.join('\n');

/** The names a text takes from the library's package. The custom elements' package registers its tags by the same line. */
const importFrom = (fw: Framework, names: string[]) =>
	names.length ? `import { ${names.join(', ')} } from '${FRAMEWORKS[fw].pkg}/metal-fx';` : `import '${FRAMEWORKS[fw].pkg}/metal-fx';`;

interface Parts {
	/** Names imported from the library. */
	names: string[];
	/** Lines that belong to the component: its refs and hooks. With no framework, the whole of the code. */
	setup?: string[];
	/** Page-wide lines, which run once. */
	config?: string[];
	/** The markup, one item per element at the top level. */
	markup?: string[];
	/** What goes between two items of markup. */
	gap?: string;
}

/* A whole example as a file of that framework is laid out: a Svelte or Vue
   component, a React function, a page with a module script, or a script.
   With no markup it is the script alone, which is all page-wide tuning is. */
function assemble(fw: Framework, { names, setup = [], config = [], markup = [], gap = '\n' }: Parts): string {
	const blocks = (...groups: string[][]) =>
		groups
			.filter((g) => g.length)
			.map((g) => g.join('\n'))
			.join('\n\n');
	const body = markup.join(gap);
	switch (fw) {
		case 'svelte':
		case 'elements': {
			const open = fw === 'svelte' ? '<script>' : '<script type="module">';
			const script = `${open}\n${pad(blocks([importFrom(fw, names)], setup, config), '  ')}\n<\/script>`;
			return body ? `${script}\n\n${body}` : script;
		}
		case 'vue': {
			const own = setup.some((line) => line.includes('ref(')) ? ["import { ref } from 'vue';"] : [];
			const script = `<script setup>\n${blocks([...own, importFrom(fw, names)], setup, config)}\n<\/script>`;
			return body ? `${script}\n\n<template>\n${pad(body, '  ')}\n</template>` : script;
		}
		case 'react': {
			const own = setup.some((line) => line.includes('useRef(')) ? ["import { useRef } from 'react';"] : [];
			const top = blocks([...own, importFrom(fw, names)], config);
			if (!body) return top;
			/* a component returns one thing: several elements go in a fragment */
			const returned = markup.length > 1 ? `<>\n${pad(body, '  ')}\n</>` : body;
			const inside = blocks(setup, [`return (\n${pad(returned, '  ')}\n);`]);
			return `${top}\n\nexport function Example() {\n${pad(inside, '  ')}\n}`;
		}
		case 'vanilla':
			return blocks([importFrom(fw, names)], setup, config);
	}
}

/* ── the page's examples ────────────────────────────────────────────── */

/* an icon of the reader's own in a framework; a character where there are no components */
const ARROW: Record<Framework, string> = {
	svelte: '<ArrowUp />',
	react: '<ArrowUp />',
	vue: '<ArrowUp />',
	elements: '↑',
	vanilla: '↑'
};

export const importOnly: FrameworkCode = perFramework((fw) =>
	importFrom(fw, fw === 'elements' ? [] : fw === 'vanilla' ? ['mountMetalFx', 'mountMetalText', 'mountMetalBadge'] : ['MetalFx', 'MetalText', 'MetalBadge'])
);

export const quickStart: FrameworkCode = perFramework((fw) => {
	if (fw === 'vanilla') {
		return assemble(fw, {
			names: ['mountMetalFx'],
			setup: [
				'// The page has:',
				'//   <button id="upgrade">Upgrade to Pro</button>',
				'//   <button id="send" aria-label="Send">↑</button>',
				'',
				'// each ring wraps its button where the button stands',
				"mountMetalFx(document.querySelector('#upgrade'));",
				"mountMetalFx(document.querySelector('#send'), { variant: 'circle', preset: 'gold' });"
			]
		});
	}
	const tag = fw === 'elements' ? 'runeglow-metal-fx' : 'MetalFx';
	const cls = fw === 'react' ? 'className' : 'class';
	return assemble(fw, {
		names: fw === 'elements' ? [] : ['MetalFx'],
		gap: '\n\n',
		markup: [
			`<${tag}>\n  <button ${cls}="upgrade">Upgrade to Pro</button>\n</${tag}>`,
			`<${tag} variant="circle" preset="gold">\n  <button aria-label="Send">${ARROW[fw]}</button>\n</${tag}>`
		]
	});
});

export const reflect: FrameworkCode = perFramework((fw) => {
	const send = `<button aria-label="Send">${ARROW[fw]}</button>`;
	const bends = '// the ring dents under the cursor';
	switch (fw) {
		case 'svelte':
			return assemble(fw, {
				names: ['MetalFx', 'useMetalBend'],
				setup: ['let ring = $state(null);', 'let chip = $state(null);', `useMetalBend(() => ring); ${bends}`],
				gap: '\n\n',
				markup: [
					'<button bind:this={chip}>Tools</button>',
					`<MetalFx bind:ref={ring} variant="circle" innerShadow reflectionTargets={[chip]}>\n  ${send}\n</MetalFx>`
				]
			});
		case 'react':
			return assemble(fw, {
				names: ['MetalFx', 'useMetalBend'],
				setup: ['const ring = useRef(null);', 'const chip = useRef(null);', `useMetalBend(ring); ${bends}`],
				gap: '\n\n',
				markup: ['<button ref={chip}>Tools</button>', `<MetalFx ref={ring} variant="circle" innerShadow reflectionTargets={[chip]}>\n  ${send}\n</MetalFx>`]
			});
		case 'vue':
			return assemble(fw, {
				names: ['MetalFx', 'useMetalBend'],
				setup: ['const ring = ref(null);', 'const chip = ref(null);', `useMetalBend(ring); ${bends}`],
				gap: '\n\n',
				markup: [
					'<button ref="chip">Tools</button>',
					`<MetalFx ref="ring" variant="circle" inner-shadow :reflection-targets="[chip]">\n  ${send}\n</MetalFx>`
				]
			});
		case 'elements':
			return assemble(fw, {
				names: [],
				gap: '\n\n',
				markup: [
					'<button id="tools">Tools</button>',
					`<!-- bend: the ring dents under the cursor. reflection-targets is a CSS selector. -->\n<runeglow-metal-fx variant="circle" inner-shadow bend reflection-targets="#tools">\n  ${send}\n</runeglow-metal-fx>`
				]
			});
		case 'vanilla':
			return assemble(fw, {
				names: ['mountMetalFx', 'attachMetalBend'],
				setup: [
					'// The page has:',
					'//   <button id="tools">Tools</button>',
					'//   <button id="send" aria-label="Send">↑</button>',
					'',
					"const ring = mountMetalFx(document.querySelector('#send'), {",
					"  variant: 'circle',",
					'  innerShadow: true,',
					"  reflectionTargets: [document.querySelector('#tools')],",
					'});',
					`attachMetalBend(ring.element); ${bends}`
				]
			});
	}
});

export const text: FrameworkCode = perFramework((fw) => {
	const catches = '// "Plan" catches the metal on its letters';
	const font = '500 24px/1.2 Inter, sans-serif';
	switch (fw) {
		case 'svelte':
			return assemble(fw, {
				names: ['MetalText', 'MetalBadge', 'useMetalTextReflection'],
				setup: ['let plan = $state(null);', `useMetalTextReflection(() => plan); ${catches}`],
				markup: [
					'<span bind:this={plan}>Plan</span>',
					`<MetalText\n  text="Pro"\n  font="${font}"\n  color="#e2e2e2"\n  reflectionTargets={[{ el: plan, strength: 0.64 }]}\n/>`,
					'',
					'<MetalBadge text="New" />'
				]
			});
		case 'react':
			return assemble(fw, {
				names: ['MetalText', 'MetalBadge', 'useMetalTextReflection'],
				setup: ['const plan = useRef(null);', `useMetalTextReflection(plan); ${catches}`],
				markup: [
					'<span ref={plan}>Plan</span>',
					`<MetalText\n  text="Pro"\n  font="${font}"\n  color="#e2e2e2"\n  reflectionTargets={[{ el: plan, strength: 0.64 }]}\n/>`,
					'',
					'<MetalBadge text="New" />'
				]
			});
		case 'vue':
			return assemble(fw, {
				names: ['MetalText', 'MetalBadge', 'useMetalTextReflection'],
				setup: ['const plan = ref(null);', `useMetalTextReflection(plan); ${catches}`],
				markup: [
					'<span ref="plan">Plan</span>',
					`<MetalText\n  text="Pro"\n  font="${font}"\n  color="#e2e2e2"\n  :reflection-targets="[{ el: plan, strength: 0.64 }]"\n/>`,
					'',
					'<MetalBadge text="New" />'
				]
			});
		case 'elements':
			return assemble(fw, {
				names: ['attachMetalTextReflection'],
				setup: [`attachMetalTextReflection(document.querySelector('#plan')); ${catches}`],
				markup: [
					'<!-- the selector names the target; the target says how much of the light it takes -->',
					'<span id="plan" data-metal-fx-strength="0.64">Plan</span>',
					`<runeglow-metal-text\n  text="Pro"\n  font="${font}"\n  color="#e2e2e2"\n  reflection-targets="#plan"\n></runeglow-metal-text>`,
					'',
					'<runeglow-metal-badge text="New"></runeglow-metal-badge>'
				]
			});
		case 'vanilla':
			return assemble(fw, {
				names: ['mountMetalText', 'mountMetalBadge', 'attachMetalTextReflection'],
				setup: [
					'// The page has:',
					'//   <span id="plan">Plan</span> <span id="pro"></span>',
					'//   <span id="badge"></span>',
					'',
					"const plan = document.querySelector('#plan');",
					`attachMetalTextReflection(plan); ${catches}`,
					'',
					'// these two make their element inside the one they are given',
					"mountMetalText(document.querySelector('#pro'), {",
					"  text: 'Pro',",
					`  font: '${font}',`,
					"  color: '#e2e2e2',",
					'  reflectionTargets: [{ el: plan, strength: 0.64 }],',
					'});',
					'',
					"mountMetalBadge(document.querySelector('#badge'), { text: 'New' });"
				]
			});
	}
});

/* the page-wide tuning is the core's, the same calls whatever draws the rings */
export const tune: FrameworkCode = perFramework((fw) =>
	assemble(fw, {
		names: ['setGlowConfig', 'setBendConfig', 'setSharedPresetMode', 'PRESETS'],
		config: [
			'setGlowConfig({ haloOpMul: 1.2 });          // a calmer halo',
			'setBendConfig({ strength: 1.2, reach: 48 }); // a deeper dent',
			'setSharedPresetMode({ ...PRESETS.silver.modes.dark, repetition: 3, distortion: 0.2 });'
		]
	})
);

/* ── the playground ─────────────────────────────────────────────────── */

/** For metal text's `innerShadow`: `null` turns the shadow off, which no plain value says. */
export const OFF = expr('null');

export interface MetalSetup {
	kind: 'circle' | 'button' | 'text' | 'badge';
	/**
	 * The component's props that differ from its defaults, in the order they
	 * are written. Not the ones that are about other elements (the wrapper's
	 * ref, the reflection targets): `bend` and `reflection` say those.
	 */
	props: Props;
	/** A ring that dents under the cursor. */
	bend: boolean;
	/** How much of the metal's light the neighbour catches; `null` for no reflection. */
	reflection: number | null;
	/** Page-wide tuning: the lines, and the names they use from the library. */
	config: string[];
	configNames: string[];
}

/* a tag with its attributes: up to three on its line, more one per line */
function element(name: string, list: string[], child: string, selfClosing: boolean): string {
	const shown = list.filter(Boolean);
	const short = shown.length <= 3;
	const open = short ? `<${name}${shown.length ? ' ' + shown.join(' ') : ''}` : `<${name}\n  ${shown.join('\n  ')}\n`;
	if (child) return `${open}>\n  ${child}\n</${name}>`;
	return selfClosing ? `${open}${short ? ' ' : ''}/>` : `${open}></${name}>`;
}

/* an element's attributes; `null` has to be written out, as JSON, where `attrs` leaves code out */
const elementAttrs = (props: Props) =>
	Object.entries(props).flatMap(([key, value]) => (value === OFF ? [`${kebab(key)}="null"`] : attrs('elements', { [key]: value })));

const COMPONENT = { circle: 'MetalFx', button: 'MetalFx', text: 'MetalText', badge: 'MetalBadge' } as const;

/** What is on the playground's stage, as code in every framework. */
export function metalSnippet(setup: MetalSetup): FrameworkCode {
	const { kind, props, bend, reflection, config, configNames } = setup;
	const ring = kind === 'circle' || kind === 'button';
	const name = COMPONENT[kind];
	const reflects = reflection != null;
	/* the neighbour that catches the light: a search field beside a ring, the word before metal text */
	const near = ring ? 'search' : 'plan';
	/* a ring's neighbour takes all of the light unless told otherwise; the word is always told */
	const targets = (el: string): PropValue => (ring && reflection === 1 ? [expr(el)] : [{ el: expr(el), strength: reflection ?? 1 }]);
	const bends = '// the ring dents under the cursor';
	const catches = '// "Plan" catches the metal on its letters';
	const neighbour = '// a neighbour that catches the reflection';

	return perFramework((fw) => {
		const child = !ring ? '' : kind === 'circle' ? `<button aria-label="Send">${ARROW[fw]}</button>` : '<button>Upgrade to Pro</button>';

		if (fw === 'vanilla') {
			const html = ring
				? [
						...(reflects ? ['//   <label id="search">…</label>'] : []),
						kind === 'circle' ? '//   <button id="send" aria-label="Send">↑</button>' : '//   <button id="upgrade">Upgrade to Pro</button>'
					]
				: kind === 'text'
					? [`//   ${reflects ? '<span id="plan">Plan</span> ' : ''}<span id="pro"></span>`]
					: ['//   <span id="badge"></span>'];
			const given = options({ ...props, ...(reflects ? { reflectionTargets: targets(near) } : {}) });
			const lines = ['// The page has:', ...html, ''];
			if (ring) {
				if (reflects) lines.push(`const search = document.querySelector('#search'); ${neighbour}`, '');
				lines.push('// the ring wraps the button where the button stands');
				lines.push(`const ring = mountMetalFx(document.querySelector('#${kind === 'circle' ? 'send' : 'upgrade'}')${given ? `, ${given}` : ''});`);
				if (bend) lines.push(`attachMetalBend(ring.element); ${bends}`);
			} else if (kind === 'text') {
				if (reflects) lines.push("const plan = document.querySelector('#plan');", `attachMetalTextReflection(plan); ${catches}`, '');
				lines.push('// makes its element inside #pro', `const pro = mountMetalText(document.querySelector('#pro'), ${given});`);
			} else {
				lines.push('// makes its element inside #badge', `const badge = mountMetalBadge(document.querySelector('#badge')${given ? `, ${given}` : ''});`);
			}
			const names = ring ? ['mountMetalFx', ...(bend ? ['attachMetalBend'] : [])] : kind === 'text' ? ['mountMetalText', ...(reflects ? ['attachMetalTextReflection'] : [])] : ['mountMetalBadge'];
			return assemble(fw, { names: [...names, ...configNames], setup: lines, config });
		}

		if (fw === 'elements') {
			const tag = { MetalFx: 'runeglow-metal-fx', MetalText: 'runeglow-metal-text', MetalBadge: 'runeglow-metal-badge' }[name];
			/* the target is named by a selector, and says itself how much of the light it takes */
			const share = reflects && !(ring && reflection === 1) ? ` data-metal-fx-strength="${reflection}"` : '';
			const list = [...elementAttrs(props), ring && bend ? 'bend' : '', reflects ? `reflection-targets="#${near}"` : ''];
			const before = !reflects ? [] : ring ? [`<label id="search"${share}>…</label>`] : [`<span id="plan"${share}>Plan</span>`];
			const letters = kind === 'text' && reflects;
			return assemble(fw, {
				names: [...(letters ? ['attachMetalTextReflection'] : []), ...configNames],
				setup: letters ? [`attachMetalTextReflection(document.querySelector('#plan')); ${catches}`] : [],
				config,
				markup: [...before, element(tag, list, child, false)]
			});
		}

		const list = attrs(fw as Markup, { ...props, ...(reflects ? { reflectionTargets: targets(near) } : {}) });
		const hook = ring ? 'useMetalBend' : 'useMetalTextReflection';
		const hooked = ring ? bend : reflects;
		const names = [name, ...(hooked ? [hook] : []), ...configNames];
		const lines: string[] = [];
		let own = '';
		let before: string[] = [];
		if (fw === 'svelte') {
			if (ring && bend) lines.push('let ring = $state(null);', `useMetalBend(() => ring); ${bends}`);
			if (ring && reflects) lines.push(`let search = $state(null); ${neighbour}`);
			if (!ring && reflects) lines.push('let plan = $state(null);', `useMetalTextReflection(() => plan); ${catches}`);
			own = ring && bend ? 'bind:ref={ring}' : '';
			before = !reflects ? [] : ring ? ['<label bind:this={search}>…</label>'] : ['<span bind:this={plan}>Plan</span>'];
		} else {
			const make = fw === 'react' ? 'useRef(null)' : 'ref(null)';
			if (ring && bend) lines.push(`const ring = ${make};`, `useMetalBend(ring); ${bends}`);
			if (ring && reflects) lines.push(`const search = ${make}; ${neighbour}`);
			if (!ring && reflects) lines.push(`const plan = ${make};`, `useMetalTextReflection(plan); ${catches}`);
			const at = (el: string) => (fw === 'react' ? `ref={${el}}` : `ref="${el}"`);
			own = ring && bend ? at('ring') : '';
			before = !reflects ? [] : ring ? [`<label ${at('search')}>…</label>`] : [`<span ${at('plan')}>Plan</span>`];
		}
		return assemble(fw, { names, setup: lines, config, markup: [...before, element(name, [own, ...list], child, true)] });
	});
}

/** The same as a prompt for a coding agent, written for each framework. */
export function metalPrompt(snippet: FrameworkCode): FrameworkCode {
	return perFramework((fw, info) => {
		const from = `'${info.pkg}/metal-fx'`;
		const bring =
			fw === 'elements'
				? `Import the elements once, which registers the <runeglow-metal-fx>, <runeglow-metal-text>
   and <runeglow-metal-badge> tags: import ${from}`
				: fw === 'vanilla'
					? `Import the functions: import { mountMetalFx, mountMetalText, mountMetalBadge, attachMetalBend } from ${from}`
					: `Import it: import { MetalFx, MetalText, MetalBadge, useMetalBend } from ${from}`;
		const wraps =
			fw === 'elements'
				? `<runeglow-metal-fx> wraps the one element put inside it (a button, a link, a div) and
   draws the ring on top of it. The tag is display: inline-flex and sizes itself to that element.`
				: fw === 'vanilla'
					? `mountMetalFx(element, options) wraps an element the page already has (a button, a link,
   a div) where it stands, and draws the ring on top of it. The wrapper, which it returns as
   .element, is display: inline-flex and sizes itself to that element. mountMetalText and
   mountMetalBadge make their element inside the one they are given.`
					: `MetalFx wraps one element (a button, a link, a div) and draws the ring on top of it.
   The wrapper is display: inline-flex and sizes itself to that element.`;
		const targets = {
			svelte: `- reflectionTargets: neighbouring elements that catch a reflection (dark theme only).
  Pass the element from bind:this, or { el, strength }.`,
			react: `- reflectionTargets: neighbouring elements that catch a reflection (dark theme only).
  Pass a ref to the element or the element itself, or { el, strength }.`,
			vue: `- reflectionTargets: neighbouring elements that catch a reflection (dark theme only).
  Pass the element a template ref holds, or { el, strength }.`,
			elements: `- reflection-targets: a CSS selector for the neighbouring elements that catch a reflection
  (dark theme only). A target with data-metal-fx-strength="0.5" catches that share of it.`,
			vanilla: `- reflectionTargets: neighbouring elements that catch a reflection (dark theme only).
  Pass the elements, or { el, strength }.`
		}[fw];
		const extras = {
			svelte: `- useMetalBend(() => el): the ring dents under the cursor. useMetalTextReflection(() => el):
  a text element catches the reflection on its letters only.`,
			react: `- useMetalBend(ref), with the ref that is on the MetalFx: the ring dents under the cursor.
  useMetalTextReflection(ref): a text element catches the reflection on its letters only.`,
			vue: `- useMetalBend(ref), with the template ref that is on the MetalFx: the ring dents under the
  cursor. useMetalTextReflection(ref): a text element catches the reflection on its letters only.`,
			elements: `- bend, an attribute of <runeglow-metal-fx>: the ring dents under the cursor.
  attachMetalTextReflection(el), a function from the same package: a text element catches the
  reflection on its letters only.`,
			vanilla: `- attachMetalBend(ring.element): the ring dents under the cursor.
  attachMetalTextReflection(el): a text element catches the reflection on its letters only.
  Each returns a function that undoes it.
- Each mount… function returns { element, update(options), destroy() }: update changes some
  options and keeps the rest.`
		}[fw];
		const [textName, badgeName] =
			fw === 'elements' ? ['<runeglow-metal-text>', '<runeglow-metal-badge>'] : fw === 'vanilla' ? ['mountMetalText', 'mountMetalBadge'] : ['MetalText', 'MetalBadge'];
		const spelling =
			fw === 'elements'
				? ` (as attributes, camelCase names become kebab-case: shaderScale is
shader-scale; an object is written as JSON, and an option turned off as normalize-host-styles="false")`
				: '';
		const settings =
			fw === 'elements'
				? `- Page-wide settings, functions from the same package: setGlowConfig, setBendConfig,
  setCursorLightConfig, setCursorSprite, setSharedPresetMode. One renderer draws every
  instance, so the preset and theme are shared.`
				: `- Page-wide settings: setGlowConfig, setBendConfig, setCursorLightConfig, setCursorSprite,
  setSharedPresetMode. One renderer draws every instance, so the preset and theme are shared.`;
		return `Add Liquid metal from ${SITE.name} to this ${info.app}: an animated WebGL metal ring around
a button, metal-filled text, or a metal badge.

1. Install the package with the project's package manager, for example: pnpm add ${info.pkg}
2. ${bring}
3. ${wraps}
4. Start from this configuration:

${snippet[fw]}

Parameter vocabulary, for later changes${spelling}:
- variant: button (pill) or circle. preset: chromatic, silver or gold. theme: auto, dark, light.
- strength 0 to 1, glowGain, shaderScale (zoom of the metal), ringCssPx (ring thickness),
  scale (multiplies every pixel constant), borderRadius, innerShadow, disableGlow, paused.
${targets}
${extras}
- ${textName}: text, font (CSS shorthand), color, metalOpacity, innerShadow, glow.
- ${badgeName}: text, scale, metalOpacity, core, gradient, glow, textColor.
${settings}

Notes:
- Needs WebGL2. Without it the wrapped element renders as it is.
- Reflections are skipped in the light theme.`;
	});
}
