import type { CursorSprite } from '@runeglow/svelte/thinking-orbs';

/* Gravity hides the real pointer near an orb and draws a raster in its
   place, so the raster should match the platform's own pointer. Those
   rasters are the platform vendors' artwork, so this site draws its own
   arrow instead: the effect works everywhere, at the cost of the pointer
   changing shape slightly as it enters an orb's reach. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="24" viewBox="0 0 18 24"><path d="M2.5 2.2v17.2l4.4-4 3 6.9 2.6-1.1-3-6.8h6z" fill="#000" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>`;

export const arrowCursor: CursorSprite = {
	src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
	width: 18,
	height: 24,
	hotX: 3,
	hotY: 3
};
