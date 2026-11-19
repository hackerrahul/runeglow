import type { PresetMode } from 'runeglow/img-fx';

/* The pool the demos reveal from. */
export const IMAGE_POOL = ['/images/gen-1.jpg', '/images/gen-2.jpg', '/images/gen-3.jpg', '/images/melt-a.jpg', '/images/melt-b.jpg'];

/* Palettes for the `colors` prop: seven slots.

   A palette re-hues the preset rather than replacing it. Each slot keeps its
   own lightness, and the slots that carry the card surface are passed as
   null, so the engine keeps the preset's. Replacing all seven with saturated
   colours fills every cell and flattens the grid: the effect's structure
   lives in the contrast between ink and background slots. */
export type PaletteKey = 'preset' | 'ocean' | 'ember' | 'violet' | 'mono';

export const PALETTES: { value: PaletteKey; label: string; paint?: string }[] = [
	{ value: 'preset', label: 'Preset' },
	{ value: 'ocean', label: 'Ocean', paint: '#4aa3df' },
	{ value: 'ember', label: 'Ember', paint: '#e8793a' },
	{ value: 'violet', label: 'Violet', paint: '#9180ff' },
	{ value: 'mono', label: 'Mono', paint: '#bdbdbd' }
];

/* Hue in degrees and saturation the ink slots are re-tinted to. */
const TINTS: Record<Exclude<PaletteKey, 'preset'>, { h: number; s: number }> = {
	ocean: { h: 205, s: 0.62 },
	ember: { h: 20, s: 0.72 },
	violet: { h: 252, s: 0.7 },
	mono: { h: 0, s: 0 }
};

function luminance(hex: string): number {
	const n = parseInt(hex.replace('#', ''), 16);
	return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/* HSL to #rrggbb. */
function hsl(h: number, s: number, l: number): string {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	const table: [number, number, number][] = [
		[c, x, 0],
		[x, c, 0],
		[0, c, x],
		[0, x, c],
		[x, 0, c],
		[c, 0, x]
	];
	const rgb = table[Math.floor(h / 60) % 6];
	return '#' + rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

export function paletteColors(mode: PresetMode, key: PaletteKey): (string | null)[] | undefined {
	if (key === 'preset') return undefined;
	const { h, s } = TINTS[key];
	const surface = luminance(mode.cardBg);
	return mode.colors.map((c) => {
		const l = luminance(c);
		// Slots sitting on the card surface are the background: keep them.
		if (Math.abs(l - surface) < 0.08) return null;
		return hsl(h, s, l);
	});
}
