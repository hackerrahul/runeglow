<script lang="ts">
	import { LIBRARIES } from '#lib/site.ts';

	let { slug }: { slug: string } = $props();
	const uid = $props.id();
	const colors = $derived(LIBRARIES.find((l) => l.slug === slug)?.colors ?? ['#fff', '#aaa']);
	const paint = $derived(`url(#${uid}-g)`);
</script>

<span class="tile" aria-hidden="true">
	<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke={paint} stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
		<defs>
			<linearGradient id="{uid}-g" x1="3" y1="3" x2="17" y2="17" gradientUnits="userSpaceOnUse">
				<stop stop-color={colors[0]} />
				<stop offset="1" stop-color={colors[1]} />
			</linearGradient>
		</defs>
		{#if slug === 'border-beam'}
			<rect x="3.5" y="3.5" width="13" height="13" rx="4" stroke-width="2.2" />
		{:else if slug === 'thinking-orbs'}
			<circle cx="10" cy="10" r="6.5" stroke-dasharray="0.1 3.3" stroke-width="2" />
		{:else if slug === 'bot-avatars'}
			<rect x="3.5" y="4.5" width="13" height="11" rx="5" />
			<path d="M8 9.5v1.2M12 9.5v1.2" />
		{:else if slug === 'liquid-gooey'}
			<circle cx="7" cy="10" r="3.2" fill={paint} stroke="none" />
			<circle cx="13.2" cy="10" r="3.2" fill={paint} stroke="none" />
			<rect x="7" y="8.6" width="6" height="2.8" fill={paint} stroke="none" />
		{:else if slug === 'voice-glow'}
			<rect x="7.5" y="3" width="5" height="9" rx="2.5" />
			<path d="M4.8 10a5.2 5.2 0 0 0 10.4 0M10 15.2V17" />
		{:else if slug === 'voice-ring'}
			<circle cx="10" cy="10" r="5.5" stroke-width="2.4" />
		{:else if slug === 'metal-fx'}
			<rect x="3.5" y="3.5" width="13" height="13" rx="4" />
			<rect x="7" y="7" width="6" height="6" rx="1.8" />
		{:else if slug === 'img-fx'}
			<rect x="3.5" y="3.5" width="5" height="5" rx="1.2" />
			<rect x="11.5" y="3.5" width="5" height="5" rx="1.2" />
			<rect x="3.5" y="11.5" width="5" height="5" rx="1.2" />
			<rect x="11.5" y="11.5" width="5" height="5" rx="1.2" />
		{:else}
			<path d="M3.5 13a6.5 6.5 0 0 1 13 0" />
			<path d="M7 13a3 3 0 0 1 6 0" />
		{/if}
	</svg>
</span>

<style>
	.tile {
		display: grid;
		place-items: center;
		flex: none;
		width: 38px;
		height: 38px;
		border-radius: 11px;
		background: rgba(255, 255, 255, 0.04);
		box-shadow: inset 0 0 0 1px var(--line);
	}
</style>
