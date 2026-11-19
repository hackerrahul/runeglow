<script lang="ts">
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import { LIBRARIES, SITE } from '#lib/site.ts';

	const use = `<script>
  import { BorderBeam } from '${SITE.pkg}/border-beam';
<\/script>

<BorderBeam>
  <div class="card">Your content here</div>
</BorderBeam>`;

	const three = `pnpm add ${SITE.pkg} three`;

	const init = `npx shadcn-svelte@latest init`;
	const add = `npx shadcn-svelte@latest add ${SITE.url}/r/border-beam.json`;
	const addNoTailwind = `npx shadcn-svelte@latest add ${SITE.url}/r/border-beam.json --skip-preflight`;
	const componentsJson = `{
  "$schema": "https://shadcn-svelte.com/schema.json",
  "tailwind": { "css": "src/app.css", "baseColor": "slate" },
  "aliases": {
    "components": "$lib/components",
    "utils": "$lib/utils",
    "ui": "$lib/components/ui",
    "hooks": "$lib/hooks",
    "lib": "$lib"
  },
  "typescript": true,
  "registry": "https://shadcn-svelte.com/registry"
}`;
	const update = `npx shadcn-svelte@latest add ${SITE.url}/r/border-beam.json --overwrite`;

	const useCopied = `<script>
  import { BorderBeam } from '$lib/runeglow/border-beam';
<\/script>

<BorderBeam>
  <div class="card">Your content here</div>
</BorderBeam>`;

	/* Voice ring's files import from two of the others. */
	const NEEDS: Record<string, string> = {
		'voice-ring': 'Also copies Voice and Thinking orbs.',
		'img-fx': 'Also adds three to your dependencies.'
	};
</script>

<DocsShell>
	<header>
		<h1>Installation</h1>
		<p class="lead">
			There are two ways to get {SITE.name} into a Svelte 5 project. Most people want the first.
		</p>
	</header>

	<div class="choose">
		<a href="#package">
			<span class="k">1. Install the package</span>
			<span class="v">One dependency, updates with your package manager. Works in any Svelte 5 project.</span>
		</a>
		<a href="#copy">
			<span class="k">2. Copy the source</span>
			<span class="v">One library’s files, in your own project, yours to edit. For projects that use shadcn-svelte.</span>
		</a>
	</div>

	<section id="requirements">
		<h2>What you need</h2>
		<ul class="notes">
			<li>Svelte 5. The components are written with runes.</li>
			<li>
				Any setup that builds Svelte: SvelteKit, or Vite with the Svelte plugin. The components render
				on the server and start animating once the page loads.
			</li>
			<li>
				One library, Image generation, also needs <code class="icode">three</code>. The others need
				nothing else.
			</li>
		</ul>
	</section>

	<section id="package">
		<h2>1. Install the package</h2>
		<p class="text">Add it with your package manager.</p>
		<InstallTabs />
		<p class="text">
			Import a library from its own path and use it. Each path is separate, so your app only bundles
			the libraries you import, however many the package contains.
		</p>
		<CodeBlock code={use} />

		<h3>Import paths</h3>
		<div class="table">
			<table>
				<thead>
					<tr><th>Library</th><th>Import from</th></tr>
				</thead>
				<tbody>
					{#each LIBRARIES as lib (lib.slug)}
						<tr>
							<td><a href="/{lib.slug}">{lib.name}</a></td>
							<td><code>{SITE.pkg}/{lib.slug}</code></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<h3>Image generation needs three</h3>
		<p class="text">
			Install <code class="icode">three</code> next to the package if you use
			<code class="icode">{SITE.pkg}/img-fx</code>. If you don’t use it, skip this.
		</p>
		<CodeBlock code={three} copyLabel="Copy command" />

		<h3>Updating</h3>
		<p class="text">
			Update it like any other dependency, for example
			<code class="icode">pnpm update {SITE.pkg}</code>. Types are included, so there is nothing else
			to install for TypeScript.
		</p>
	</section>

	<section id="copy">
		<h2>2. Copy the source</h2>
		<p class="text">
			Each library is also published as a <a href="https://shadcn-svelte.com" rel="noreferrer">shadcn-svelte</a>
			registry item. Instead of depending on the package, the shadcn-svelte CLI copies that one library’s
			source files into your project, where you can read and change them.
		</p>

		<h3>Before you start</h3>
		<p class="text">
			The CLI needs a project it has been set up in: a SvelteKit project with a
			<code class="icode">components.json</code> file. If you already use shadcn-svelte, you have one. If
			not, create it first:
		</p>
		<CodeBlock code={init} copyLabel="Copy command" />

		<h3>Add a library</h3>
		<p class="text">Run the command for the library you want. This one adds Border beam:</p>
		<CodeBlock code={add} copyLabel="Copy command" />
		<p class="text">
			The files are written to <code class="icode">src/lib/runeglow/border-beam/</code>. Import from
			there:
		</p>
		<CodeBlock code={useCopied} />

		<h3>Commands for each library</h3>
		<div class="table">
			<table>
				<thead>
					<tr><th>Library</th><th>Command</th></tr>
				</thead>
				<tbody>
					{#each LIBRARIES as lib (lib.slug)}
						<tr>
							<td>
								<a href="/{lib.slug}">{lib.name}</a>
								{#if NEEDS[lib.slug]}<span class="needs">{NEEDS[lib.slug]}</span>{/if}
							</td>
							<td><code>npx shadcn-svelte@latest add {SITE.url}/r/{lib.slug}.json</code></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<h3>Without Tailwind</h3>
		<p class="text">
			The CLI checks for Tailwind CSS and stops if it is missing. {SITE.name} doesn’t use Tailwind, so
			you can tell the CLI to carry on:
		</p>
		<CodeBlock code={addNoTailwind} copyLabel="Copy command" />
		<p class="text">
			It still needs a <code class="icode">components.json</code> in the project root. Without Tailwind,
			create the file yourself with this in it:
		</p>
		<CodeBlock code={componentsJson} copyLabel="Copy file" />
		<p class="text">
			If this is all you want shadcn-svelte for, installing the package is the simpler route.
		</p>

		<h3>Updating</h3>
		<p class="text">
			Copied files don’t update themselves. Run the command again with
			<code class="icode">--overwrite</code> to pull the current version. That replaces the files, so
			any changes you made to them are lost.
		</p>
		<CodeBlock code={update} copyLabel="Copy command" />
	</section>

	<section id="which">
		<h2>Which one should I use?</h2>
		<div class="table">
			<table>
				<thead>
					<tr><th></th><th>Install the package</th><th>Copy the source</th></tr>
				</thead>
				<tbody>
					<tr><td>Works without shadcn-svelte</td><td>Yes</td><td>No</td></tr>
					<tr><td>Updates</td><td>With your package manager</td><td>Run the command again</td></tr>
					<tr><td>Editing the code</td><td>No</td><td>Yes, it is in your project</td></tr>
					<tr><td>What your app bundles</td><td>Only what you import</td><td>Only what you copied</td></tr>
					<tr><td>On your disk</td><td>All nine libraries, about 2 MB</td><td>Only the ones you add</td></tr>
				</tbody>
			</table>
		</div>
		<p class="text">
			Both ship the same code: the registry is generated from the package’s source.
		</p>
	</section>

	<section id="next">
		<h2>Next</h2>
		<p class="text">
			Open any library’s page for its playground. Tune the options there, then copy the code, or a
			prompt for your coding agent.
		</p>
		<a class="chip solid" href="/border-beam#playground">Open the playground</a>
	</section>

	<section id="trouble">
		<h2>If something goes wrong</h2>
		<ul class="notes">
			<li>
				<strong>“Cannot find module three”.</strong> You are using Image generation without
				<code class="icode">three</code> installed. Add it as shown above.
			</li>
			<li>
				<strong>Nothing is drawn.</strong> Liquid metal, Image generation and Distortion waves need
				WebGL 2. Where the browser lacks it, they show your own element without the effect.
			</li>
			<li>
				<strong>The CLI says it needs Tailwind.</strong> Add
				<code class="icode">--skip-preflight</code>, as shown above.
			</li>
			<li>
				<strong>An effect is wider than the element it wraps.</strong> Border beam and Voice render a
				block wrapper. Give the wrapper <code class="icode">style="width: fit-content"</code>.
			</li>
		</ul>
	</section>
</DocsShell>

<style>
	header {
		margin-bottom: 22px;
	}
	h1 {
		font-size: 30px;
		font-weight: 600;
		letter-spacing: -0.03em;
	}
	.lead {
		margin-top: 8px;
		max-width: 60ch;
		color: var(--fg-2);
	}

	.choose {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.choose a {
		display: grid;
		gap: 4px;
		padding: 16px 18px;
		border-radius: 16px;
		background: var(--card);
		box-shadow: inset 0 0 0 1px var(--line);
		transition: background 0.15s;
	}
	.choose a:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.k {
		font-weight: 600;
		color: #fff;
	}
	.v {
		font-size: 13px;
		line-height: 1.5;
		color: var(--fg-2);
	}

	section {
		margin-top: 56px;
	}
	h2 {
		margin-bottom: 14px;
		font-size: 19px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	h3 {
		margin: 30px 0 10px;
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.text {
		max-width: 64ch;
		margin: 14px 0 10px;
		color: var(--fg-2);
	}
	h2 + .text,
	h3 + .text {
		margin-top: 0;
	}
	.text a,
	td a {
		color: var(--fg);
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-color: rgba(255, 255, 255, 0.25);
	}
	.notes {
		margin: 0;
		padding-left: 18px;
		display: grid;
		gap: 8px;
		max-width: 68ch;
		color: var(--fg-2);
	}
	.notes strong {
		font-weight: 550;
		color: var(--fg);
	}

	.table {
		overflow-x: auto;
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--line);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13.5px;
	}
	th,
	td {
		padding: 10px 14px;
		text-align: left;
		vertical-align: top;
	}
	th {
		font-weight: 500;
		color: var(--fg-3);
	}
	tbody tr {
		border-top: 1px solid var(--line);
	}
	td:first-child {
		white-space: nowrap;
		color: var(--fg);
	}
	td {
		color: var(--fg-2);
	}
	td code {
		font-size: 12.5px;
		color: #e3e3e3;
		white-space: nowrap;
	}
	.needs {
		display: block;
		margin-top: 2px;
		font-size: 12px;
		white-space: normal;
		color: var(--fg-3);
	}

	@media (max-width: 640px) {
		.choose {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
