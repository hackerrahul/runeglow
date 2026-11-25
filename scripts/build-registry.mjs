// Writes apps/site/registry.json: one shadcn-svelte registry item per library,
// listing that library's Svelte source files as they are in @runeglow/svelte.
// A library built on the framework-free core gets the core, the `runeglow` npm
// package, as a dependency: its engine is installed, its components copied.
//
//   node scripts/build-registry.mjs
//
// `pnpm --filter site registry:build` then turns it into static/r/<name>.json,
// which is what `shadcn-svelte add <url>` reads. One source, two ways to
// install: the npm package and these copies always carry the same code.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'packages/svelte/src/lib');
const site = join(root, 'apps/site');

const INFO = {
  'border-beam': ['Border beam', 'An animated glowing border for cards, buttons and inputs.'],
  'thinking-orbs': ['Thinking orbs', 'Dotted loading indicators for AI interfaces, in nine states.'],
  'bot-avatars': ['Bot avatars', 'Animated faces for AI agents: plush, plastic and flat bodies, and robot heads with LED faces.'],
  'liquid-gooey': ['Gooey', 'Elements that merge and split like liquid.'],
  'voice-glow': ['Voice', 'A glow that rises with a voice from the bottom of an input or screen.'],
  'voice-ring': ['Voice ring', 'A ring of light that bends with a voice.'],
  'metal-fx': ['Liquid metal', 'A liquid metal ring for buttons, metal text and a metal badge.'],
  'img-fx': ['Image generation', 'A WebGL mosaic loader that resolves into an image.'],
  'distortion-waves': ['Distortion waves', 'A coloured wave that carries one view into another.']
};
/** npm packages a library needs beyond Svelte. */
const DEPENDENCIES = { 'img-fx': ['three'] };
const DEV_DEPENDENCIES = { 'img-fx': ['@types/three'] };

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const items = Object.entries(INFO).map(([name, [title, description]]) => {
  const dir = join(lib, name);
  const files = walk(dir).sort();
  // A library that imports from a sibling folder needs that library too.
  const needs = new Set();
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/from\s+['"]\.\.\/([a-z-]+)\//g)) {
      if (m[1] !== name && m[1] in INFO && relative(dir, join(dirname(file), '..', m[1])).startsWith('..')) needs.add(m[1]);
    }
  }
  // A library whose components sit on the core needs the core installed.
  const core = files.some((file) => /from\s+['"]runeglow\//.test(readFileSync(file, 'utf8')));
  return {
    name,
    type: 'registry:file',
    title,
    description,
    // The registry build wants both lists present, empty or not.
    dependencies: [...(core ? ['runeglow'] : []), ...(DEPENDENCIES[name] ?? [])],
    devDependencies: DEV_DEPENDENCIES[name] ?? [],
    registryDependencies: [...needs].sort().map((n) => `local:${n}`),
    files: files.map((file) => ({
      path: relative(site, file),
      type: 'registry:file',
      // The folders keep their names, so the relative imports between files,
      // and between libraries, still resolve.
      target: `~/src/lib/runeglow/${name}/${relative(dir, file)}`
    }))
  };
});

const registry = {
  $schema: 'https://shadcn-svelte.com/schema/registry.json',
  name: 'runeglow',
  homepage: 'https://runeglow.dev',
  items
};
writeFileSync(join(site, 'registry.json'), JSON.stringify(registry, null, '\t') + '\n');
for (const item of items) {
  console.log(`${item.name.padEnd(18)} ${String(item.files.length).padStart(3)} files${item.registryDependencies.length ? '  needs ' + item.registryDependencies.join(', ') : ''}${item.dependencies.length ? '  npm ' + item.dependencies.join(', ') : ''}`);
}
