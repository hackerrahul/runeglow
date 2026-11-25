/* The code the docs show, in each framework. Runeglow is one core with a
   package per framework, so most examples are the same component with the
   same props, written five ways: `example` and `tag` do that writing, and
   the pages hand-write only what differs in kind (state, slots, methods). */

export type Framework = 'svelte' | 'react' | 'vue' | 'elements' | 'vanilla';

export interface FrameworkInfo {
	id: Framework;
	/** On a tab. */
	label: string;
	/** The npm package to install and import from. */
	pkg: string;
	/** In a sentence: "Add this to my …". */
	app: string;
}

export const FRAMEWORKS: Record<Framework, FrameworkInfo> = {
	svelte: { id: 'svelte', label: 'Svelte', pkg: '@runeglow/svelte', app: 'Svelte 5 app' },
	react: { id: 'react', label: 'React', pkg: '@runeglow/react', app: 'React app' },
	vue: { id: 'vue', label: 'Vue', pkg: '@runeglow/vue', app: 'Vue 3 app' },
	elements: { id: 'elements', label: 'HTML', pkg: '@runeglow/elements', app: 'page, using custom elements' },
	vanilla: { id: 'vanilla', label: 'JS', pkg: 'runeglow', app: 'page, in plain JavaScript with no framework' }
};
export const FRAMEWORK_IDS = Object.keys(FRAMEWORKS) as Framework[];

/** A piece of code in every framework. */
export type FrameworkCode = Record<Framework, string>;
/** What a code block takes: one text for all, or one per framework. */
export type Code = string | FrameworkCode;

export const codeFor = (code: Code, fw: Framework) => (typeof code === 'string' ? code : code[fw]);

/** The same thing built for each framework. */
export function perFramework(build: (fw: Framework, info: FrameworkInfo) => string): FrameworkCode {
	return Object.fromEntries(FRAMEWORK_IDS.map((fw) => [fw, build(fw, FRAMEWORKS[fw])])) as FrameworkCode;
}

/* ── components ─────────────────────────────────────────────────────── */

export interface ComponentInfo {
	/** The library's import path: `bot-avatars`. */
	lib: string;
	/** The component's name in Svelte, React and Vue. */
	name: string;
	/** Its custom element. */
	element: string;
	/** The core function for a page with no framework. */
	mount: string;
	/**
	 * What that function is given first: `parent` (it makes its own element
	 * inside one) or `element` (it works on an element the page already has).
	 * Which element that is differs by library: the border beam and the image
	 * card take the wrapper round the content, liquid metal takes the content
	 * and wraps it. So for an `element` component the no-framework text from
	 * `example` is only a starting point; pages write their own.
	 */
	onto: 'parent' | 'element';
}

export const COMPONENTS = {
	BorderBeam: { lib: 'border-beam', name: 'BorderBeam', element: 'runeglow-border-beam', mount: 'attachBorderBeam', onto: 'element' },
	ThinkingOrb: { lib: 'thinking-orbs', name: 'ThinkingOrb', element: 'runeglow-thinking-orb', mount: 'mountThinkingOrb', onto: 'parent' },
	BotAvatar: { lib: 'bot-avatars', name: 'BotAvatar', element: 'runeglow-bot-avatar', mount: 'mountBotAvatar', onto: 'parent' },
	RobotHead: { lib: 'bot-avatars', name: 'RobotHead', element: 'runeglow-robot-head', mount: 'mountRobotHead', onto: 'parent' },
	Liquid: { lib: 'liquid-gooey', name: 'Liquid', element: 'runeglow-liquid', mount: 'mountLiquid', onto: 'element' },
	LiquidItem: { lib: 'liquid-gooey', name: 'LiquidItem', element: 'runeglow-liquid-item', mount: 'mountLiquidItem', onto: 'element' },
	VoiceBeam: { lib: 'voice-glow', name: 'VoiceBeam', element: 'runeglow-voice-beam', mount: 'mountVoiceBeam', onto: 'element' },
	VoiceRing: { lib: 'voice-ring', name: 'VoiceRing', element: 'runeglow-voice-ring', mount: 'mountVoiceRing', onto: 'parent' },
	VoiceOrb: { lib: 'voice-ring', name: 'VoiceOrb', element: 'runeglow-voice-orb', mount: 'mountVoiceOrb', onto: 'parent' },
	MetalFx: { lib: 'metal-fx', name: 'MetalFx', element: 'runeglow-metal-fx', mount: 'mountMetalFx', onto: 'element' },
	MetalText: { lib: 'metal-fx', name: 'MetalText', element: 'runeglow-metal-text', mount: 'mountMetalText', onto: 'parent' },
	MetalBadge: { lib: 'metal-fx', name: 'MetalBadge', element: 'runeglow-metal-badge', mount: 'mountMetalBadge', onto: 'parent' },
	ImageGeneration: { lib: 'img-fx', name: 'ImageGeneration', element: 'runeglow-image-generation', mount: 'mountImageGeneration', onto: 'element' },
	DistortionWave: { lib: 'distortion-waves', name: 'DistortionWave', element: 'runeglow-distortion-wave', mount: 'mountDistortionWave', onto: 'parent' }
} as const satisfies Record<string, ComponentInfo>;
export type ComponentName = keyof typeof COMPONENTS;

/* ── values ─────────────────────────────────────────────────────────── */

/** A value that is code rather than data: a variable, a ternary, a call. */
export interface Expr {
	expr: string;
}
export const expr = (code: string): Expr => ({ expr: code });
const isExpr = (v: unknown): v is Expr => !!v && typeof v === 'object' && 'expr' in v && Object.keys(v).length === 1;

export type PropValue = string | number | boolean | Expr | readonly PropValue[] | { readonly [key: string]: PropValue };
export type Props = Record<string, PropValue | undefined | null>;

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** A value as JavaScript source: `{ yaw: 0.6, pitch: 0 }`, `'cat'`, `busy ? 1 : 0`. */
export function js(value: PropValue, quote = "'"): string {
	if (isExpr(value)) return value.expr;
	if (typeof value === 'string') return `${quote}${value.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`)}${quote}`;
	if (typeof value !== 'object') return String(value);
	if (Array.isArray(value)) return `[${value.map((v) => js(v, quote)).join(', ')}]`;
	const entries = Object.entries(value as Record<string, PropValue>);
	if (!entries.length) return '{}';
	return `{ ${entries.map(([k, v]) => `${IDENT.test(k) ? k : js(k, quote)}: ${js(v, quote)}`).join(', ')} }`;
}

/** `floorShadow` as HTML and Vue templates write it: `floor-shadow`. */
export const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/* true if anywhere in the value there is code, which an HTML attribute cannot hold */
const hasExpr = (v: PropValue): boolean =>
	isExpr(v) || (typeof v === 'object' && (Array.isArray(v) ? v.some(hasExpr) : Object.values(v as Record<string, PropValue>).some(hasExpr)));

const present = (props: Props) => Object.entries(props).filter((e): e is [string, PropValue] => e[1] !== undefined && e[1] !== null);

/** The attributes of a tag, one per array item, as the framework writes them. */
export function attrs(fw: Exclude<Framework, 'vanilla'>, props: Props): string[] {
	return present(props).flatMap(([key, value]) => {
		switch (fw) {
			case 'svelte':
			case 'react': {
				const name = fw === 'react' && key === 'class' ? 'className' : key;
				if (value === true) return [name];
				if (typeof value === 'string') return [`${name}="${value}"`];
				/* an object is one brace in a framework's braces: {{ a: 1 }} */
				return [`${name}={${js(value)}}`];
			}
			case 'vue': {
				const name = kebab(key);
				if (value === true) return [name];
				if (typeof value === 'string') return [`${name}="${value}"`];
				return [`:${name}="${js(value)}"`];
			}
			case 'elements': {
				const name = kebab(key);
				/* code has no place in an attribute: `properties` writes it as a script */
				if (hasExpr(value)) return [];
				if (value === true) return [name];
				if (typeof value === 'object') return [`${name}='${JSON.stringify(value)}'`];
				return [`${name}="${value}"`];
			}
		}
	});
}

/** For a custom element: the props that are code, as assignments to its properties. */
export function properties(variable: string, props: Props): string[] {
	return present(props)
		.filter(([, value]) => hasExpr(value))
		.map(([key, value]) => `${variable}.${key} = ${js(value)};`);
}

/** The options object of a core call: `{ type: 'cat', size: 96 }`, or `''` when there are none. */
export function options(props: Props, indent = ''): string {
	const entries = present(props);
	if (!entries.length) return '';
	const one = `{ ${entries.map(([k, v]) => `${k}: ${js(v)}`).join(', ')} }`;
	if (one.length <= 72 && entries.length <= 3) return one;
	return `{\n${entries.map(([k, v]) => `${indent}  ${k}: ${js(v)},`).join('\n')}\n${indent}}`;
}

/* ── tags and whole examples ────────────────────────────────────────── */

const pad = (text: string, by: string) =>
	text
		.split('\n')
		.map((line) => (line ? by + line : line))
		.join('\n');

/**
 * A component as a tag, in the framework's markup. Up to two attributes
 * sit on the tag's line; more go one per line. `children` is markup for
 * inside it, already in that framework's spelling.
 */
export function tag(fw: Exclude<Framework, 'vanilla'>, component: ComponentName, props: Props = {}, children?: string): string {
	const info = COMPONENTS[component];
	const name = fw === 'elements' ? info.element : info.name;
	const list = attrs(fw, props);
	const open = list.length === 0 ? `<${name}` : list.length <= 2 ? `<${name} ${list.join(' ')}` : `<${name}\n  ${list.join('\n  ')}\n`;
	const multi = list.length > 2;
	if (children !== undefined) return `${open}>\n${pad(children, '  ')}\n</${name}>`;
	/* a custom element is never self-closing */
	if (fw === 'elements') return `${open}></${name}>`;
	return `${open}${multi ? '' : ' '}/>`;
}

/** The line that imports from a library, in the framework's package. */
export function importLine(fw: Framework, lib: string, names: string[]): string {
	const from = `'${FRAMEWORKS[fw].pkg}/${lib}'`;
	return fw === 'elements' ? `import ${from};` : `import { ${names.join(', ')} } from ${from};`;
}

export interface ExampleSpec {
	component: ComponentName;
	props?: Props;
	/** Markup inside the component, per framework where it differs (`class` and `className`). */
	children?: string | Partial<Record<Exclude<Framework, 'vanilla'>, string>>;
	/** For the no-framework version: the selector of the element to mount into or attach to. Default `#agent`. */
	target?: string;
	/** For the no-framework version: what to call the result. Default: from the component's name. */
	variable?: string;
	/**
	 * The name of a value from the app that the `expr` props read (`busy`,
	 * `status`). The example then shows where it comes from: a prop of the
	 * surrounding component, or, outside a framework, a line to run when it
	 * changes.
	 */
	input?: string;
	/** With `input`: what the surrounding component is called in React. Default `Agent`. */
	wrapper?: string;
}

const split = (props: Props): [fixed: Props, live: Props] => {
	const fixed: Props = {}, live: Props = {};
	for (const [key, value] of present(props)) (hasExpr(value) ? live : fixed)[key] = value;
	return [fixed, live];
};

/**
 * One component with some props, as a complete example in every framework:
 * the import, and the tag (or, with no framework, the core call).
 */
export function example(spec: ExampleSpec): FrameworkCode {
	const info = COMPONENTS[spec.component];
	const props = spec.props ?? {};
	const variable = spec.variable ?? info.name[0].toLowerCase() + info.name.slice(1);
	const target = spec.target ?? (info.onto === 'parent' ? '#agent' : '.card');
	const input = spec.input;
	const inner = (fw: Exclude<Framework, 'vanilla'>) => (typeof spec.children === 'string' ? spec.children : spec.children?.[fw] ?? spec.children?.svelte);
	return perFramework((fw) => {
		if (fw === 'vanilla') {
			/* what is fixed goes in the call; what follows the app is an update */
			const [fixed, live] = input ? split(props) : [props, {}];
			const opts = options(fixed);
			/* what `element` means differs by library (the content, or a wrapper round it): a page says which */
			const what = info.onto === 'parent' ? `// makes its element inside ${target}` : `// works on an element the page already has`;
			const follow = input ? `\n\n// whenever ${input} changes\n${variable}.update(${options(live)});` : '';
			return `${importLine(fw, info.lib, [info.mount])}\n\n${what}\nconst ${variable} = ${info.mount}(document.querySelector('${target}')${opts ? `, ${opts}` : ''});${follow}`;
		}
		const markup = tag(fw, spec.component, props, inner(fw));
		if (fw === 'svelte') {
			const take = input ? `\n\n  let { ${input} } = $props();` : '';
			return `<script>\n  ${importLine(fw, info.lib, [info.name])}${take}\n<\/script>\n\n${markup}`;
		}
		if (fw === 'vue') {
			const take = input ? `\n\ndefineProps(['${input}']);` : '';
			return `<script setup>\n${importLine(fw, info.lib, [info.name])}${take}\n<\/script>\n\n<template>\n${pad(markup, '  ')}\n</template>`;
		}
		if (fw === 'react') {
			const body = markup.includes('\n') ? `(\n${pad(markup, '    ')}\n  )` : markup;
			const name = input ? (spec.wrapper ?? 'Agent') : 'Example';
			return `${importLine(fw, info.lib, [info.name])}\n\nexport function ${name}(${input ? `{ ${input} }` : ''}) {\n  return ${body};\n}`;
		}
		const set = properties(variable, props);
		const note = input && set.length ? `  // whenever ${input} changes\n` : '';
		const script = set.length ? `\n\n  const ${variable} = document.querySelector('${info.element}');\n${note}${pad(set.join('\n'), '  ')}` : '';
		return `<script type="module">\n  ${importLine(fw, info.lib, [])}${script}\n<\/script>\n\n${markup}`;
	});
}

export interface FragmentOptions {
	/** A line of explanation above the markup, written as that framework's comment. */
	comment?: string;
	/** An element round the lot: `span.typing` gives `<span class="typing">`. */
	wrap?: string;
	/** With no framework: the selector of the element they are mounted into. Default `#agents`. */
	target?: string;
}

/**
 * Several components side by side, as markup alone (no import): for the
 * second and later examples on a page. With no framework it is the core
 * calls that make the same thing.
 */
export function fragment(items: Array<Pick<ExampleSpec, 'component' | 'props'>>, opts: FragmentOptions = {}): FrameworkCode {
	const [wrapTag, wrapClass] = (opts.wrap ?? '').split('.');
	return perFramework((fw) => {
		if (fw === 'vanilla') {
			const target = opts.target ?? (wrapClass ? `.${wrapClass}` : '#agents');
			const lines = items.map((item) => {
				const o = options(item.props ?? {});
				return `${COMPONENTS[item.component].mount}(row${o ? `, ${o}` : ''});`;
			});
			return `${opts.comment ? `// ${opts.comment}\n` : ''}const row = document.querySelector('${target}');\n${lines.join('\n')}`;
		}
		let markup = items.map((item) => tag(fw, item.component, item.props ?? {})).join('\n');
		if (wrapTag) {
			const cls = wrapClass ? ` ${fw === 'react' ? 'className' : 'class'}="${wrapClass}"` : '';
			markup = `<${wrapTag}${cls}>\n${pad(markup, '  ')}\n</${wrapTag}>`;
		}
		if (!opts.comment) return markup;
		return `${fw === 'react' ? `{/* ${opts.comment} */}` : `<!-- ${opts.comment} -->`}\n${markup}`;
	});
}

/** For a prompt: the step that imports a component, in the framework's words. */
export function importStep(fw: Framework, component: ComponentName): string {
	const info = COMPONENTS[component];
	if (fw === 'elements') return `Import the elements once, which registers the <${info.element}> tag: ${importLine(fw, info.lib, [])}`;
	if (fw === 'vanilla') return `Import the function: ${importLine(fw, info.lib, [info.mount])}`;
	return `Import the component: ${importLine(fw, info.lib, [info.name])}`;
}

/** The option that sets the accessible name: an attribute of the element in a framework, `label` elsewhere. */
export const labelOption = (fw: Framework) => (fw === 'elements' || fw === 'vanilla' ? 'label' : 'aria-label');
