<script lang="ts">
	import { BorderBeam } from 'runeglow/border-beam';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import InstallTabs from '#lib/components/InstallTabs.svelte';
	import LibIcon from '#lib/components/LibIcon.svelte';
	import Subject from '#lib/demos/border-beam/Subject.svelte';
	import OrbPill from '#lib/demos/thinking-orbs/OrbPill.svelte';
	import { BotAvatar, RobotHead, type RobotHeadState } from 'runeglow/bot-avatars';
	import { FAMILIES } from '#lib/demos/bot-avatars/families.ts';
	import MorphDemo from '#lib/demos/liquid-gooey/MorphDemo.svelte';
	import { DEFAULT_GROUP } from '#lib/demos/liquid-gooey/shared.ts';
	import { VoiceBeam } from 'runeglow/voice-glow';
	import { VoiceRing } from 'runeglow/voice-ring';
	import { MetalFx } from 'runeglow/metal-fx';
	import { ImageGeneration } from 'runeglow/img-fx';
	import WaveScene from '#lib/demos/distortion-waves/Scene.svelte';
	import { IMAGE_POOL } from '#lib/demos/img-fx/images.ts';
	import '#lib/demos/metal-fx/demo.css';
	import RecordingPill from '#lib/demos/voice-glow/RecordingPill.svelte';
	import { demoGetter } from '#lib/demos/voice-glow/voice.ts';
	import { LIBRARIES, SITE } from '#lib/site.ts';

	const ready = LIBRARIES.filter((l) => l.status === 'ready').length;

	const install = `pnpm add ${SITE.pkg}`;

	const usage = `<script>
  import { BorderBeam } from '${SITE.pkg}/border-beam';
<\/script>

<BorderBeam>
  <Card />
</BorderBeam>`;

	/* The robot in the families band plays through an agent's run, so its
	   screen is seen changing without anyone touching it. */
	const RUN: RobotHeadState[] = ['thinking', 'searching', 'working', 'success', 'idle'];
	let step = $state(0);
	$effect(() => {
		const id = setInterval(() => (step = (step + 1) % RUN.length), 2600);
		return () => clearInterval(id);
	});

	const faqs = [
		{
			q: 'Is it free?',
			a: 'Yes. Runeglow is MIT licensed, like the project it is ported from. Use it anywhere, commercial work included.'
		},
		{
			q: 'What do I need to use it?',
			a: 'Svelte 5. The package has no runtime dependencies. One library, Image generation, also needs three installed.'
		},
		{
			q: 'Why one package instead of nine?',
			a: 'One install and one version to keep up with. Each library has its own import path, so your bundle only carries the one you import.'
		},
		{
			q: 'Does it work with SvelteKit and server rendering?',
			a: 'Yes. The components render on the server and start animating once they hydrate.'
		},
		{
			q: 'How is it related to Libraries.dev?',
			a: 'It is a Svelte port of it. The effect engines are Jakub Antalik’s original code; the Svelte components around them and this site are new. The two ML-model libraries are not included.'
		}
	];
</script>

<section class="wrap hero">
	<div class="copy">
		<!-- Leans toward the cursor as it comes near. -->
		<div class="mark" aria-hidden="true">
			<VoiceRing size={152} state="processing" hoverBend={0.7} theme="dark" />
		</div>
		<h1>Light up your Svelte interface</h1>
		<p class="lead">
			Nine animated effects for AI and product interfaces, as Svelte 5 components in one package:
			beams, orbs, avatars, voices, liquid metal and more.
		</p>
		<div class="actions">
			<a class="chip solid" href="/border-beam">Open playground</a>
			<BorderBeam size="sm" borderRadius={18}>
				<div class="cmd">
					<code>{install}</code>
					<CopyButton text={install} label="Copy install command" />
				</div>
			</BorderBeam>
		</div>
		<p class="facts">
			{ready === LIBRARIES.length ? `${ready} libraries` : `${ready} of ${LIBRARIES.length} libraries ready`} · MIT · one package
		</p>
	</div>

</section>

<section id="libraries" class="wrap grid" aria-label="Libraries">
	{#each LIBRARIES as lib (lib.slug)}
		{#if lib.status === 'ready'}
			<a class="card" href="/{lib.slug}">
				<div class="stage">
					{#if lib.slug === 'border-beam'}
						<div class="mini">
							<BorderBeam size="md">
								<Subject kind="chat" />
							</BorderBeam>
							<div class="second">
								<BorderBeam size="line" borderRadius={20}>
									<Subject kind="search" />
								</BorderBeam>
							</div>
						</div>
					{:else if lib.slug === 'thinking-orbs'}
						<div class="orbs">
							<OrbPill state="solving" size={32} />
							<OrbPill state="composing" size={32} label="Thinking…" color="#b9aeff" />
						</div>
					{:else if lib.slug === 'bot-avatars'}
						<div class="bots">
							<BotAvatar type="clover" size={60} seed={0.1} />
							<RobotHead size={84} state="thinking" seed={0.5} />
							<BotAvatar type="ghost" shading="plastic" size={60} state="sleeping" seed={0.8} />
						</div>
					{:else if lib.slug === 'liquid-gooey'}
						<div class="goo">
							<MorphDemo group={DEFAULT_GROUP('morph')} />
						</div>
					{:else if lib.slug === 'voice-glow'}
						<VoiceBeam type="pill" level={demoGetter}>
							<RecordingPill />
						</VoiceBeam>
					{:else if lib.slug === 'voice-ring'}
						<VoiceRing size={132} level={demoGetter} theme="dark" />
					{:else if lib.slug === 'distortion-waves'}
						<div class="wave">
							<WaveScene kind="toast" autoplay />
						</div>
					{:else if lib.slug === 'img-fx'}
						<ImageGeneration theme="dark" cardBg="#1b1b1b" images={IMAGE_POOL} autoReveal revealInitialDelay={1.5}>
							<span class="gen"></span>
						</ImageGeneration>
					{:else if lib.slug === 'metal-fx'}
						<div class="metal">
							<MetalFx theme="dark" strength={0.63}>
								<span class="mfx-pill">Upgrade to Pro</span>
							</MetalFx>
							<MetalFx variant="circle" theme="dark" strength={0.81} innerShadow>
								<span class="mfx-send">
									<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
								</span>
							</MetalFx>
						</div>
					{/if}
				</div>
				<div class="meta">
					<LibIcon slug={lib.slug} />
					<span>
						<span class="name">{lib.name}</span>
						<span class="blurb">{lib.blurb}</span>
					</span>
				</div>
			</a>
		{:else}
			<div class="card soon" style:--c1={lib.colors[0]} style:--c2={lib.colors[1]}>
				<div class="stage">
					<span class="blob"></span>
					<span class="pill">Soon</span>
				</div>
				<div class="meta">
					<LibIcon slug={lib.slug} />
					<span>
						<span class="name">{lib.name}</span>
						<span class="blurb">{lib.blurb}</span>
					</span>
				</div>
			</div>
		{/if}
	{/each}
</section>

<section id="families" class="wrap fam">
	<p class="new">New in Bot avatars</p>
	<h2>Four families, one import</h2>
	<p class="sub">
		Plush, plastic and flat bodies, and now robots with an LED face that shows what your agent is
		doing.
	</p>
	<div class="fam-grid">
		{#each FAMILIES as f (f.id)}
			<a class="card" class:wide={f.id === 'robot'} href="/bot-avatars#{f.id}">
				<div class="stage">
					{#if f.id === 'fabric'}
						<BotAvatar type="cat" size={84} headphones seed={0.3} />
					{:else if f.id === 'plastic'}
						<BotAvatar type="planet" shading="plastic" size={84} seed={0.55} />
					{:else if f.id === 'flat'}
						<BotAvatar type="hexagon" shading="crisp" size={84} seed={0.75} />
					{:else}
						<div class="robots">
							<RobotHead size={92} shape="circle" colorway="tangerine" state="speaking" seed={0.2} />
							<RobotHead size={112} state={RUN[step]} seed={0.5} />
							<RobotHead size={92} shape="hexagon" colorway="graphite" finish="matte" state="waiting" seed={0.8} />
						</div>
						<span class="state" aria-hidden="true">state="{RUN[step]}"</span>
					{/if}
				</div>
				<div class="meta">
					<span>
						<span class="name">{f.name}</span>
						<span class="blurb">{f.blurb}</span>
					</span>
				</div>
			</a>
		{/each}
	</div>
</section>

<section id="how" class="wrap how">
	<h2>How to use</h2>
	<p class="sub">Three steps, no setup.</p>
	<ol>
		<li>
			<span class="n">1</span>
			<h3>Install the package</h3>
			<p>One dependency covers every library. Or <a class="inline" href="/install#copy">copy one library’s source</a> in.</p>
			<InstallTabs />
			<a class="more" href="/install">Full installation guide</a>
		</li>
		<li>
			<span class="n">2</span>
			<h3>Import what you need</h3>
			<p>Each library has its own path, so only that one is bundled.</p>
			<CodeBlock code={usage} />
		</li>
		<li>
			<span class="n">3</span>
			<h3>Make it yours</h3>
			<p>Tune every option in the playground, then copy the code or a prompt for your agent.</p>
			<a class="chip" href="/border-beam#playground">Open the playground</a>
		</li>
	</ol>
</section>

<section id="faq" class="wrap faq">
	<h2>FAQs</h2>
	<div class="list">
		{#each faqs as item (item.q)}
			<details>
				<summary>
					{item.q}
					<svg viewBox="0 0 12 12" width="11" height="11" fill="none" aria-hidden="true">
						<path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</summary>
				<p>{item.a}</p>
			</details>
		{/each}
	</div>
</section>

<style>
	/* Words only: the nine live cards directly below are the demonstration. */
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		justify-items: center;
		padding-top: 28px;
		padding-bottom: 56px;
		text-align: center;
	}
	.mark {
		margin-bottom: 4px;
	}
	.copy {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		justify-items: center;
	}
	h1 {
		font-size: 50px;
		font-weight: 600;
		letter-spacing: -0.04em;
		line-height: 1.05;
	}
	.lead {
		margin-top: 18px;
		max-width: 44ch;
		font-size: 16px;
		line-height: 1.55;
		color: var(--fg-2);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin-top: 26px;
	}
	.actions .chip {
		height: 36px;
		padding: 0 16px;
		font-size: 13.5px;
	}
	.cmd {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 4px 0 14px;
		border-radius: 999px;
		background: #1c1c1c;
	}
	.cmd code {
		font-size: 12.5px;
		color: #e3e3e3;
	}
	.facts {
		margin-top: 22px;
		font-size: 13px;
		color: var(--fg-3);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}
	.card {
		display: block;
		padding: 8px;
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.03);
		box-shadow: inset 0 0 0 1px var(--line);
		transition:
			background 0.2s,
			transform 0.2s;
	}
	a.card:hover {
		background: rgba(255, 255, 255, 0.055);
		transform: translateY(-2px);
	}
	.stage {
		position: relative;
		display: grid;
		place-items: center;
		height: 204px;
		border-radius: 16px;
		background: #0e0e0e;
		box-shadow: inset 0 0 0 1px var(--line);
		overflow: hidden;
	}
	.mini {
		zoom: 0.58;
		pointer-events: none;
	}
	.mini :global(.chat) {
		width: 330px;
	}
	.mini :global(.search) {
		width: 250px;
	}
	.second {
		margin: 20px 0 0 100px;
	}
	.orbs {
		display: grid;
		gap: 12px;
		pointer-events: none;
	}
	.orbs :global(.pill:last-child) {
		margin-left: 46px;
	}
	.bots {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.fam-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 18px;
		margin-top: 32px;
		text-align: left;
	}
	.fam-grid .wide {
		grid-column: span 2;
	}
	.fam-grid .stage {
		height: 190px;
	}
	.fam-grid .meta {
		padding-left: 10px;
	}
	.robots {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 14px;
	}
	.state {
		position: absolute;
		bottom: 10px;
		left: 50%;
		transform: translateX(-50%);
		padding: 2px 9px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: var(--fg-2);
		white-space: nowrap;
	}
	.new {
		display: inline-block;
		margin-bottom: 12px;
		padding: 3px 11px;
		border-radius: 999px;
		background: rgba(255, 184, 107, 0.12);
		font-size: 12.5px;
		font-weight: 500;
		color: var(--amber);
	}
	.fam .sub {
		max-width: 52ch;
		margin-inline: auto;
	}
	.goo {
		margin-top: 30px;
	}
	.wave {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		justify-items: center;
		width: 100%;
		padding: 0 14px;
	}
	.gen {
		display: block;
		width: 132px;
		height: 132px;
		border-radius: 16px;
	}
	.metal {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.blob {
		width: 120px;
		height: 64px;
		border-radius: 50%;
		background: linear-gradient(110deg, var(--c1), var(--c2));
		filter: blur(26px);
		opacity: 0.28;
		transition: opacity 0.3s;
	}
	.soon:hover .blob {
		opacity: 0.45;
	}
	.pill {
		position: absolute;
		padding: 3px 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.07);
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 6px 6px;
		min-width: 0;
	}
	.meta > span:last-child {
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
		font-weight: 500;
	}
	.blurb {
		font-size: 13px;
		color: var(--fg-3);
	}

	.fam,
	.how,
	.faq {
		margin-top: 120px;
		text-align: center;
	}
	h2 {
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.03em;
	}
	.sub {
		margin-top: 8px;
		color: var(--fg-2);
	}
	.inline,
	.more {
		color: var(--fg);
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-color: rgba(255, 255, 255, 0.25);
	}
	.more {
		display: inline-block;
		margin-top: 10px;
		font-size: 13px;
	}
	ol {
		list-style: none;
		margin: 32px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
		text-align: left;
	}
	li {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-content: start;
		justify-items: start;
		gap: 6px;
		padding: 20px;
		border-radius: 24px;
		background: rgba(255, 255, 255, 0.03);
		box-shadow: inset 0 0 0 1px var(--line);
	}
	li > :global(*:last-child) {
		margin-top: 12px;
	}
	li > :global(.install),
	li > :global(.code) {
		width: 100%;
	}
	li :global(pre) {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.n {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		margin-bottom: 8px;
		border-radius: 50%;
		background: var(--glow);
		font-size: 12.5px;
		font-weight: 600;
		color: #16110f;
	}
	h3 {
		font-size: 15px;
		font-weight: 550;
		letter-spacing: -0.01em;
	}
	li p {
		color: var(--fg-2);
	}

	.list {
		max-width: 620px;
		margin: 28px auto 0;
		text-align: left;
	}
	details {
		border-bottom: 1px solid var(--line-2);
	}
	details:first-child {
		border-top: 1px solid var(--line-2);
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 15px 2px;
		font-size: 14.5px;
		font-weight: 500;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary svg {
		flex: none;
		color: var(--fg-3);
		transition: transform 0.2s;
	}
	details[open] summary svg {
		transform: rotate(180deg);
	}
	details p {
		padding: 0 2px 16px;
		max-width: 60ch;
		color: var(--fg-2);
	}

	@media (max-width: 900px) {
		.hero {
			padding-top: 20px;
			padding-bottom: 44px;
		}
		.grid,
		ol {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.fam-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.fam-grid .wide {
			grid-column: 1 / -1;
			order: -1;
		}
	}
	@media (max-width: 640px) {
		.grid,
		ol {
			grid-template-columns: minmax(0, 1fr);
		}
		h1 {
			font-size: 38px;
		}
		.fam-grid {
			gap: 10px;
		}
		.robots {
			zoom: 0.82;
		}
		.fam,
		.how,
		.faq {
			margin-top: 84px;
		}
	}
</style>
