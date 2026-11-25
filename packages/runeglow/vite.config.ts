import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// One entry per library: every folder under src with an index.ts, except the
// shared internals. Each is built to a file a browser can load as it is,
// with what the entries share in chunks beside them.
const src = fileURLToPath(new URL('./src', import.meta.url));
const entry = Object.fromEntries(
	readdirSync(src)
		.filter((name) => name !== 'internal' && statSync(`${src}/${name}`).isDirectory())
		.map((name) => [`${name}/index`, `${src}/${name}/index.ts`])
);
// The one entry inside a library: the thinking orbs' engine, on its own.
if (existsSync(`${src}/thinking-orbs/engine/index.ts`)) entry['thinking-orbs/engine/index'] = `${src}/thinking-orbs/engine/index.ts`;

export default defineConfig({
	build: {
		lib: { entry, formats: ['es'] },
		// three is the app's to install (an optional peer, for image generation): never bundled in
		rollupOptions: { external: ['three', /^three\//] },
		target: 'es2022',
		minify: false,
		emptyOutDir: true
	}
});
