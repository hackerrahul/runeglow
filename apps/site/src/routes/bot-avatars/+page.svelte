<script lang="ts">
	import { page } from '$app/state';
	import { BotAvatar, RobotHead } from 'runeglow/bot-avatars';
	import DocsShell from '#lib/components/DocsShell.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import RobotDocs from '#lib/demos/bot-avatars/RobotDocs.svelte';
	import SoftDocs from '#lib/demos/bot-avatars/SoftDocs.svelte';
	import { FAMILIES, isFamily, type Family } from '#lib/demos/bot-avatars/families.ts';
	import '#lib/demos/bot-avatars/docs.css';

	/* The family on show. It follows the address (/bot-avatars#robot), so a
	   family can be linked to; any other hash, a section's, leaves it be. */
	let family = $state<Family>('fabric');
	$effect(() => {
		const hash = page.url.hash.slice(1);
		if (isFamily(hash)) family = hash;
	});
	const info = $derived(FAMILIES.find((f) => f.id === family) ?? FAMILIES[0]);
</script>

<DocsShell>
	<!-- What a family's address points at: the top of the page. -->
	{#each FAMILIES as f (f.id)}<span id={f.id}></span>{/each}
	<header>
		<LibIcon slug="bot-avatars" />
		<h1>Bot avatars</h1>
		<p class="lead">
			Animated faces for AI agents, in four families: plush fabric, glossy plastic, flat vector, and
			robots with LED faces.
		</p>
	</header>

	<!-- Links, not buttons: each family has its own address. -->
	<nav class="families" aria-label="Families">
		{#each FAMILIES as f (f.id)}
			<a
				href="#{f.id}"
				class:on={f.id === family}
				aria-current={f.id === family ? 'true' : undefined}
				data-sveltekit-replacestate
				data-sveltekit-reset="false"
				onclick={() => (family = f.id)}
			>
				<span class="face" aria-hidden="true">
					{#if f.id === 'fabric'}
						<BotAvatar type="clover" size={38} seed={0.2} jumpEvery={0} interactive={false} />
					{:else if f.id === 'plastic'}
						<BotAvatar type="ghost" shading="plastic" size={38} seed={0.45} jumpEvery={0} interactive={false} />
					{:else if f.id === 'flat'}
						<BotAvatar type="hexagon" shading="crisp" size={38} seed={0.7} jumpEvery={0} interactive={false} />
					{:else}
						<RobotHead size={44} antenna={false} floorShadow={false} seed={0.9} interactive={false} />
					{/if}
				</span>
				<span class="words">
					<span class="name">{f.name}</span>
					<span class="blurb">{f.blurb}</span>
				</span>
			</a>
		{/each}
	</nav>

	<div class="ba-docs">
		<p class="about">
			{info.lead}
			<span><code class="icode">{`<${info.component}${family === 'plastic' ? ' shading="plastic"' : family === 'flat' ? ' shading="crisp"' : ''} />`}</code></span>
		</p>
		{#if family === 'robot'}
			<RobotDocs />
		{:else}
			{#key family}
				<SoftDocs {family} />
			{/key}
		{/if}
	</div>
</DocsShell>

<style>
	header {
		margin-bottom: 22px;
	}
	h1 {
		margin-top: 14px;
		font-size: 30px;
		font-weight: 600;
		letter-spacing: -0.03em;
	}
	.lead {
		margin-top: 8px;
		max-width: 60ch;
		color: var(--fg-2);
	}

	.families {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}
	.families a {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		padding: 10px 12px 10px 10px;
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.03);
		box-shadow: inset 0 0 0 1px var(--line);
		transition:
			background 0.15s,
			box-shadow 0.15s;
	}
	.families a:hover {
		background: rgba(255, 255, 255, 0.055);
	}
	.families a.on {
		background: rgba(255, 255, 255, 0.08);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
	}
	.face {
		display: grid;
		place-items: center;
		flex: none;
		width: 52px;
		height: 52px;
		border-radius: 12px;
		background: var(--stage);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	.words {
		min-width: 0;
	}
	.name,
	.blurb {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.name {
		font-size: 14px;
		font-weight: 550;
	}
	.blurb {
		font-size: 12.5px;
		color: var(--fg-3);
	}
	.families a.on .blurb {
		color: var(--fg-2);
	}

	.about {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 6px 16px;
		margin: 18px 2px 12px;
		color: var(--fg-2);
	}

	@media (max-width: 760px) {
		.families {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
