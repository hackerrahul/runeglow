/* What the two voice libraries' examples have in common in each framework:
   the microphone helper, and the file that goes round a script and some
   markup. The voice ring's pages use these too. */

import type { Framework } from '#lib/code.ts';

/** True where there are components: Svelte, React and Vue. */
export const hasComponents = (fw: Framework) => fw === 'svelte' || fw === 'react' || fw === 'vue';

/** The microphone helper: a hook or composable in a framework, the core's own object outside one. */
export const micName = (fw: Framework) => (hasComponents(fw) ? 'useMicrophone' : 'createMicrophone');

export const pad = (text: string, by: string) =>
	text
		.split('\n')
		.map((line) => (line ? by + line : line))
		.join('\n');

/** Groups of lines as one text, a blank line between groups; an empty group is left out. */
export const sections = (...parts: string[][]) =>
	parts
		.filter((part) => part.length)
		.map((part) => part.join('\n'))
		.join('\n\n');

/** A tag's opening, or the whole of a self-closing one: on one line up to `inline` attributes, then one per line. */
export function openTag(name: string, list: string[], selfClosing = false, inline = 2): string {
	const multi = list.length > inline;
	const end = selfClosing ? (multi ? '/>' : ' />') : '>';
	if (!list.length) return `<${name}${end}`;
	return multi ? `<${name}\n  ${list.join('\n  ')}\n${end}` : `<${name} ${list.join(' ')}${end}`;
}

/** A Svelte component: the script, then the markup. */
export const svelteFile = (script: string, markup: string) => `<script>\n${pad(script, '  ')}\n<\/script>\n\n${markup}`;

/** A Vue single-file component. */
export const vueFile = (script: string, markup: string) => `<script setup>\n${script}\n<\/script>\n\n<template>\n${pad(markup, '  ')}\n</template>`;

/** A page: a module script, then the tags. Modules run after the page is read, so the script finds them. */
export const htmlFile = (script: string, markup: string) => `<script type="module">\n${pad(script, '  ')}\n<\/script>\n\n${markup}`;

export interface ReactFile {
	/** The import, and whatever else sits outside the component. */
	top: string;
	/** A comment right above the component. */
	note?: string;
	name?: string;
	/** The props it takes: `level`, `turn, player`. */
	params?: string;
	/** Lines inside the component, before it returns: hooks. */
	body?: string;
	/** What it returns. Several elements side by side are put in a fragment. */
	markup: string | string[];
}

/** A React component in a file of its own. */
export function reactFile({ top, note, name = 'Example', params, body, markup }: ReactFile): string {
	const jsx = typeof markup === 'string' ? markup : `<>\n${pad(markup.join('\n'), '  ')}\n</>`;
	const returns = jsx.includes('\n') ? `return (\n${pad(jsx, '    ')}\n  );` : `return ${jsx};`;
	return `${top}\n\n${note ? `${note}\n` : ''}export function ${name}(${params ? `{ ${params} }` : ''}) {\n${body ? `${pad(body, '  ')}\n\n` : ''}  ${returns}\n}`;
}
