<!-- A framework's own mark, small, beside its name. -->
<script lang="ts">
	import type { Framework } from '#lib/code.ts';

	let { id, size = 16 }: { id: Framework; size?: number } = $props();
</script>

{#if id === 'svelte'}
	<svg width={size} height={size} viewBox="0 0 98.1 118" aria-hidden="true">
		<path fill="#ff3e00" d="M91.8 15.6C80.9-.1 59.2-4.7 43.6 5.2L16.1 22.8C8.6 27.5 3.4 35.2 1.9 43.9c-1.3 7.3-.2 14.8 3.3 21.3-2.4 3.6-4 7.6-4.7 11.8-1.6 8.9.5 18.1 5.7 25.4 11 15.7 32.6 20.3 48.2 10.4l27.5-17.5c7.5-4.7 12.7-12.4 14.2-21.1 1.3-7.3.2-14.8-3.3-21.3 2.4-3.6 4-7.6 4.7-11.8 1.7-9-.4-18.2-5.7-25.5" />
		<path fill="#fff" d="M40.9 103.9c-8.9 2.3-18.2-1.2-23.4-8.7-3.2-4.4-4.4-9.9-3.5-15.3.2-.9.4-1.7.6-2.6l.5-1.6 1.4 1c3.3 2.4 6.9 4.2 10.8 5.4l1 .3-.1 1c-.1 1.4.3 2.9 1.1 4.1 1.6 2.3 4.4 3.4 7.1 2.7.6-.2 1.2-.4 1.7-.7L65.5 72c1.4-.9 2.3-2.2 2.6-3.8.3-1.6-.1-3.3-1-4.6-1.6-2.3-4.4-3.3-7.1-2.6-.6.2-1.2.4-1.7.7l-10.5 6.7c-1.7 1.1-3.6 1.9-5.6 2.4-8.9 2.3-18.2-1.2-23.4-8.7-3.1-4.4-4.4-9.9-3.4-15.3.9-5.2 4.1-9.9 8.6-12.7l27.5-17.5c1.7-1.1 3.6-1.9 5.6-2.5 8.9-2.3 18.2 1.2 23.4 8.7 3.2 4.4 4.4 9.9 3.5 15.3-.2.9-.4 1.7-.7 2.6l-.5 1.6-1.4-1c-3.3-2.4-6.9-4.2-10.8-5.4l-1-.3.1-1c.1-1.4-.3-2.9-1.1-4.1-1.6-2.3-4.4-3.3-7.1-2.6-.6.2-1.2.4-1.7.7L32.4 46.1c-1.4.9-2.3 2.2-2.6 3.8s.1 3.3 1 4.6c1.6 2.3 4.4 3.3 7.1 2.6.6-.2 1.2-.4 1.7-.7l10.5-6.7c1.7-1.1 3.6-1.9 5.6-2.5 8.9-2.3 18.2 1.2 23.4 8.7 3.2 4.4 4.4 9.9 3.5 15.3-.9 5.2-4.1 9.9-8.6 12.7l-27.5 17.5c-1.7 1.1-3.6 1.9-5.6 2.5" />
	</svg>
{:else if id === 'react'}
	<svg width={size} height={size} viewBox="-11.5 -10.2 23 20.4" aria-hidden="true">
		<circle r="2.05" fill="#61dafb" />
		<g stroke="#61dafb" stroke-width="1" fill="none">
			<ellipse rx="11" ry="4.2" />
			<ellipse rx="11" ry="4.2" transform="rotate(60)" />
			<ellipse rx="11" ry="4.2" transform="rotate(120)" />
		</g>
	</svg>
{:else if id === 'vue'}
	<svg width={size} height={size} viewBox="0 0 256 221" aria-hidden="true">
		<path fill="#41b883" d="M204.8 0H256L128 220.8 0 0h97.92L128 51.2 157.44 0h47.36Z" />
		<path fill="#41b883" d="m0 0 128 220.8L256 0h-51.2L128 132.48 50.56 0H0Z" />
		<path fill="#35495e" d="M50.56 0 128 133.12 204.8 0h-47.36L128 51.2 97.92 0H50.56Z" />
	</svg>
{:else if id === 'elements'}
	<svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
		<path fill="#e34f26" d="M71 460 30 0h451l-41 460-185 52" />
		<path fill="#ef652a" d="m256 472 149-41 35-394H256" />
		<path fill="#ebebeb" d="M256 208h-75l-5-58h80V94H114l15 171h127zm-1 147-63-17-4-45h-56l7 89 116 32z" />
		<path fill="#fff" d="M255 208v57h70l-7 73-63 17v59l116-32 16-174zm0-114v56h137l5-56z" />
	</svg>
{:else}
	<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
		<rect width="32" height="32" rx="3" fill="#f7df1e" />
		<text x="29" y="28" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="700" fill="#1a1a1a">JS</text>
	</svg>
{/if}

<style>
	svg {
		flex: none;
		display: block;
	}
</style>
