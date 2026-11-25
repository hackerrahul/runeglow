import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The site reads the library straight from its source, so a change to a
// component shows up here without a package build in between.
const lib = fileURLToPath(new URL('../../packages/svelte/src/lib', import.meta.url));
// The Svelte components sit on the framework-free core, read from source too.
const core = fileURLToPath(new URL('../../packages/runeglow/src', import.meta.url));

export default defineConfig({
	resolve: {
		alias: [
			{ find: /^@runeglow\/svelte\/(.+)$/, replacement: `${lib}/$1/index.ts` },
			{ find: /^runeglow\/(.+)$/, replacement: `${core}/$1/index.ts` }
		]
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: '404.html' })
		})
	]
});
