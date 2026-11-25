const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SVELTE =
	/(<!--[\s\S]*?-->|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?)([A-Za-z][\w.-]*)|\b(import|from|const|let|export|default|function|return|new|await|async|if|else|for|of|true|false|null|undefined)\b|(-?\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w-]*)(?==)|([{}>]|\/>)/g;

/** A small tokenizer for the snippets the docs print: Svelte, and near enough for JSX, Vue, HTML and plain JavaScript. */
export function highlightSvelte(code: string): string {
	let out = '';
	let last = 0;
	for (const m of code.matchAll(SVELTE)) {
		const i = m.index ?? 0;
		out += esc(code.slice(last, i));
		last = i + m[0].length;
		if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
		else if (m[2]) out += `<span class="t-str">${esc(m[2])}</span>`;
		else if (m[4]) {
			const cls = /^[A-Z]/.test(m[4]) ? 't-cmp' : 't-tag';
			out += `<span class="t-pun">${esc(m[3])}</span><span class="${cls}">${esc(m[4])}</span>`;
		} else if (m[5]) out += `<span class="t-key">${m[5]}</span>`;
		else if (m[6]) out += `<span class="t-num">${m[6]}</span>`;
		else if (m[7]) out += `<span class="t-att">${esc(m[7])}</span>`;
		else out += `<span class="t-pun">${esc(m[0])}</span>`;
	}
	return out + esc(code.slice(last));
}

export function highlightShell(code: string): string {
	return esc(code).replace(/^(\S+)/gm, '<span class="t-cmp">$1</span>');
}
