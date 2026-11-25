<script lang="ts">
	import { framework } from '#lib/framework.svelte.ts';
	import { LIBRARIES, SITE } from '#lib/site.ts';
	import Logo from './Logo.svelte';
</script>

<footer>
	<div class="wrap grid">
		<div class="about">
			<a class="brand" href="/"><Logo size={18} /><span>{SITE.name}</span></a>
			<p>UI effects for Svelte, React, Vue and plain HTML.</p>
			<p class="made">
				Made by <a href={SITE.author.x} rel="noreferrer">{SITE.author.name}</a>.
			</p>
			<p class="credit">
				Built on the effect engines of
				<a href={SITE.upstream.url} rel="noreferrer">{SITE.upstream.name}</a>, created by
				{SITE.upstream.author}. MIT licensed.
			</p>
		</div>
		<div>
			<p class="label">Libraries</p>
			<ul>
				{#each LIBRARIES as lib (lib.slug)}
					<li>
						{#if lib.status === 'ready'}
							<a href="/{lib.slug}">{lib.name}</a>
						{:else}
							<span>{lib.name}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
		<div>
			<p class="label">Project</p>
			<ul>
				<li><a href="/">Home</a></li>
				<li><a href="/install">Installation</a></li>
				<li><a href="/#how">How to use</a></li>
				<li><a href="/#faq">FAQs</a></li>
				{#if SITE.repo}<li><a href={SITE.repo} rel="noreferrer">GitHub</a></li>{/if}
				<li><a href="https://www.npmjs.com/package/{framework.info.pkg}" rel="noreferrer">npm</a></li>
				<li><a href={SITE.author.x} rel="noreferrer">{SITE.author.handle} on X</a></li>
				<li><a href={SITE.upstream.repo} rel="noreferrer">Original source</a></li>
			</ul>
		</div>
		<div>
			<p class="label">Other projects</p>
			<ul>
				<!-- No rel="noreferrer": these are the author's own sites, and they may
				     as well see that the visit came from here. -->
				{#each SITE.projects as project (project.url)}
					<li><a href={project.url}>{project.name}</a></li>
				{/each}
			</ul>
		</div>
	</div>
</footer>

<style>
	footer {
		margin-top: 110px;
		padding-bottom: 56px;
		font-size: 13px;
	}
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto auto;
		gap: 40px 64px;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.about p {
		margin-top: 8px;
		color: var(--fg-2);
	}
	.about .made {
		margin-top: 20px;
		font-size: 13.5px;
		color: var(--fg);
	}
	.made a {
		font-weight: 550;
		color: #fff;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: rgba(255, 255, 255, 0.3);
	}
	.about .credit {
		margin-top: 6px;
		max-width: 40ch;
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.credit a {
		color: var(--fg-2);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: rgba(255, 255, 255, 0.25);
	}
	.label {
		color: var(--fg-3);
	}
	ul {
		list-style: none;
		margin: 10px 0 0;
		padding: 0;
		display: grid;
		gap: 7px;
		color: var(--fg-2);
	}
	ul span {
		color: var(--fg-3);
	}
	a:hover {
		color: #fff;
	}
	@media (max-width: 640px) {
		.grid {
			grid-template-columns: 1fr 1fr;
		}
		.about {
			grid-column: 1 / -1;
		}
	}
</style>
