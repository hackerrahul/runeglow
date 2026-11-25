<script lang="ts">
	import '@fontsource-variable/geist/wght.css';
	import '@fontsource-variable/geist-mono/wght.css';
	import '../app.css';
	import Footer from '#lib/components/Footer.svelte';
	import Nav from '#lib/components/Nav.svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { pageView } from '#lib/analytics.ts';
	import { FALLBACK, PAGES } from '#lib/seo.ts';
	import { SITE } from '#lib/site.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	/* Runs once when the site loads and again after each move between pages. */
	afterNavigate(({ to }) => {
		if (to) pageView(to.url);
	});

	/* Every page's head comes from here, so the title, the description and the
	   tags that link previews read can never disagree. */
	const path = $derived(page.url.pathname.replace(/\/$/, '') || '/');
	const meta = $derived(PAGES[path] ?? FALLBACK);
	const canonical = $derived(`${SITE.url}${path === '/' ? '/' : path}`);
	const image = `${SITE.url}/og.png`;

	/* What the project is, for search engines. */
	const structured = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'SoftwareSourceCode',
		name: SITE.name,
		description: PAGES['/'].description,
		url: SITE.url,
		codeRepository: SITE.repo,
		programmingLanguage: ['TypeScript', 'Svelte', 'React', 'Vue'],
		runtimePlatform: 'Web browsers',
		license: 'https://opensource.org/licenses/MIT',
		author: { '@type': 'Person', name: SITE.author.name, url: SITE.author.x, sameAs: [SITE.author.x, SITE.author.github] },
		isBasedOn: SITE.upstream.repo
	}).replace(/</g, '\\u003c');
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="canonical" href={canonical} />
	<meta name="author" content={SITE.author.name} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Runeglow: light up your interface" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content={image} />
	<meta name="twitter:creator" content={SITE.author.handle} />

	{@html `<script type="application/ld+json">${structured}</` + `script>`}
</svelte:head>

<a class="skip" href="#main">Skip to content</a>
<Nav />
<main id="main">
	{@render children()}
</main>
<Footer />

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 8px;
		z-index: 100;
		padding: 6px 12px;
		border-radius: 999px;
		background: #fff;
		color: #121212;
		font-size: 13px;
	}
	.skip:focus {
		left: 8px;
	}
</style>
