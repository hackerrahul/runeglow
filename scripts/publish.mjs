// Publishes every package whose version is not on npm yet, the core first.
//
//   node scripts/publish.mjs            publish what is new
//   node scripts/publish.mjs --dry-run  pack, check, and say what would go
//
// A release is a version bump in packages/*/package.json pushed to main:
// .github/workflows/publish.yml runs this after the checks and the build.
// A push that changes no version publishes nothing, so it is safe to run on
// every push, and to run again after one that stopped half way.
//
// Each package is packed with pnpm, which writes the `workspace:` ranges out
// as real versions, and the tarball is published with npm, which signs in
// to the registry as the workflow itself (npm's trusted publishing: no token
// is kept anywhere). Build the packages first: `pnpm build:lib`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** The core, then what is built on it. */
const ORDER = ['runeglow', 'svelte', 'react', 'vue', 'elements'];
const dry = process.argv.includes('--dry-run');

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }).trim();

/** Whether this exact version is on the registry already. Asked of the
    registry itself, with no sign-in: a wrong "no" would try to publish a
    version a second time, and fail the run. */
async function published(name, version) {
  const res = await fetch(`https://registry.npmjs.org/${name}/${version}`, { headers: { accept: 'application/json' } });
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  throw new Error(`The registry answered ${res.status} for ${name}@${version}.`);
}

const packages = ORDER.map((dir) => {
  const at = join(root, 'packages', dir);
  const { name, version } = JSON.parse(readFileSync(join(at, 'package.json'), 'utf8'));
  return { at, name, version };
});

/* one version for all of them: the adapters ask for the core at their own */
const versions = new Set(packages.map((p) => p.version));
if (versions.size > 1) {
  console.error(`The packages are not at one version: ${packages.map((p) => `${p.name}@${p.version}`).join(', ')}`);
  process.exit(1);
}

const todo = [];
for (const p of packages) if (!(await published(p.name, p.version))) todo.push(p);
if (!todo.length) {
  console.log(`Nothing to publish: ${[...versions][0]} is on npm for every package.`);
  process.exit(0);
}

if (!dry) {
  /* trusted publishing needs npm 11.5.1 or later */
  const [major, minor, patch] = run('npm', ['--version']).split('.').map(Number);
  if (major < 11 || (major === 11 && (minor < 5 || (minor === 5 && patch < 1)))) {
    console.error(`npm ${major}.${minor}.${patch} cannot sign in without a token: 11.5.1 or later is needed.`);
    process.exit(1);
  }
}

const out = mkdtempSync(join(tmpdir(), 'runeglow-pack-'));
for (const { at, name, version } of todo) {
  const packed = run('pnpm', ['pack', '--pack-destination', out], { cwd: at }).split('\n').filter((line) => line.endsWith('.tgz')).pop();
  if (!packed) {
    console.error(`${name}: pnpm pack named no tarball.`);
    process.exit(1);
  }
  /* what is in the tarball is what is published: check that, not the source */
  const manifest = JSON.parse(run('tar', ['-xOf', packed, 'package/package.json']));
  const loose = Object.entries({ ...manifest.dependencies, ...manifest.peerDependencies }).filter(([, range]) => String(range).startsWith('workspace:'));
  if (manifest.name !== name || manifest.version !== version || loose.length) {
    console.error(`${name}: the tarball is not publishable (${manifest.name}@${manifest.version}${loose.length ? `, ${loose.map(([dep]) => dep).join(', ')} still a workspace range` : ''}).`);
    process.exit(1);
  }
  if (dry) {
    console.log(`Would publish ${name}@${version}${manifest.dependencies?.runeglow ? `  (runeglow ${manifest.dependencies.runeglow})` : ''}`);
    continue;
  }
  console.log(`Publishing ${name}@${version}`);
  execFileSync('npm', ['publish', packed, '--access', 'public'], { stdio: 'inherit' });
}
