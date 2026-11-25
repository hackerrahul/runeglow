/* Which framework the docs are showing code for. One choice for the whole
   site: every code block, install command and playground follows it, and
   it is remembered per browser. */

import { FRAMEWORKS, type Framework } from './code.ts';

const KEY = 'runeglow:framework';

let current = $state<Framework>('svelte');
let restored = false;

export const framework = {
	/** The framework on show. Svelte until `restore` has run, as on the server. */
	get id(): Framework {
		return current;
	},
	get info() {
		return FRAMEWORKS[current];
	},
	set(next: Framework) {
		current = next;
		// Remembered per browser; it is a convenience, so a blocked store is fine.
		try {
			localStorage.setItem(KEY, next);
		} catch {
			/* private mode or blocked storage */
		}
	},
	/** Take up the remembered choice. Called from an effect, after hydration, by whatever shows tabs. */
	restore() {
		if (restored) return;
		restored = true;
		try {
			const saved = localStorage.getItem(KEY);
			if (saved && saved in FRAMEWORKS) current = saved as Framework;
		} catch {
			/* see above */
		}
	}
};
