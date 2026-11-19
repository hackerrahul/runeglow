export type GooeyTheme = 'dark' | 'light';
export type DemoKind = 'morph' | 'shape' | 'dissolve' | 'move' | 'bend' | 'melt';

/** What every demo's `Liquid` group is given. `fill` is already resolved. */
export interface GroupTuning {
	blur: number;
	contrast: number;
	fill: string;
	waviness: number;
	wavinessFreq: number;
	shadow: boolean;
	filterPadding: number;
}

/* The surface each demo sits on by default: a dark panel for the menus and
   cards, a lighter grey for the slider thumb so it reads against its track. */
export const FILLS: Record<GooeyTheme, Record<DemoKind, string>> = {
	dark: { morph: '#202020', shape: '#202020', dissolve: '#202020', move: '#525252', bend: '#202020', melt: '#ffffff' },
	light: { morph: '#ffffff', shape: '#ffffff', dissolve: '#ffffff', move: '#ffffff', bend: '#ffffff', melt: '#ffffff' }
};

/* box-shadow syntax, drawn on the merged liquid: two inset hairlines, a
   ring, and two soft drops. */
export const LIQUID_SHADOW: Record<GooeyTheme, string> = {
	dark:
		'0 0 0 1px rgba(255, 255, 255, 0.04) inset, 0 1px 0 0 rgba(255, 255, 255, 0.03) inset, ' +
		'0 0 0 1px rgba(0, 0, 0, 0.06), 0 2px 6px 0 rgba(0, 0, 0, 0.05), 0 4px 42px 0 rgba(0, 0, 0, 0.24)',
	light: '0 0 0 1px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.05), 0 4px 42px rgba(0, 0, 0, 0.06)'
};

export const EASES = {
	Bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
	Smooth: 'cubic-bezier(0.3, 1.05, 0.4, 1)',
	Snappy: 'cubic-bezier(0.22, 1, 0.36, 1)'
} as const;
export type EaseName = keyof typeof EASES;

/** Content ink flips with the liquid's luminance so icons stay legible. */
export function inkFor(fill: string): string {
	const m = fill.match(/^#([0-9a-f]{6})$/i);
	if (!m) return '#fbfbfb';
	const n = parseInt(m[1], 16);
	const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
	return lum > 140 ? '#17181c' : '#fbfbfb';
}

export const groupProps = (group: GroupTuning, theme: GooeyTheme) => ({
	blur: group.blur,
	contrast: group.contrast,
	fill: group.fill,
	waviness: group.waviness,
	wavinessFreq: group.wavinessFreq,
	filterPadding: group.filterPadding,
	shadow: group.shadow ? LIQUID_SHADOW[theme] : undefined
});

export const DEFAULT_GROUP = (kind: DemoKind, theme: GooeyTheme = 'dark'): GroupTuning => ({
	blur: 6,
	contrast: 18,
	fill: FILLS[theme][kind],
	waviness: 0,
	wavinessFreq: 0.018,
	shadow: true,
	filterPadding: 24
});

export interface MorphKnobs {
	openDur: number;
	closeDur: number;
	openEase: EaseName;
	openStagger: number;
	closeStagger: number;
	spread: number;
	anticipDist: number;
	anticipDur: number;
	iconDur: number;
	iconDelay: number;
}
export const MORPH_DEFAULTS: MorphKnobs = {
	openDur: 550,
	closeDur: 250,
	openEase: 'Bouncy',
	openStagger: 40,
	closeStagger: 0,
	spread: 1,
	anticipDist: 5,
	anticipDur: 700,
	iconDur: 180,
	iconDelay: 120
};

export interface ShapeKnobs {
	speed: number;
	bounce: number;
	contentBlur: number;
}
export const SHAPE_DEFAULTS: ShapeKnobs = { speed: 1, bounce: 0.5, contentBlur: 7 };

export interface DissolveKnobs {
	strength: number;
	warp: number;
	mix: number;
	gravity: number;
	zone: number;
	range: number;
	blobInset: number;
	bridgeGrow: number;
}
export const DISSOLVE_DEFAULTS: DissolveKnobs = {
	strength: 1,
	warp: 26,
	mix: 0.7,
	gravity: 60,
	zone: 26,
	range: 44,
	blobInset: 2,
	bridgeGrow: 10
};

export interface MoveKnobs {
	springiness: number;
	wobble: number;
	stretch: number;
	trail: number;
}
export const MOVE_DEFAULTS: MoveKnobs = { springiness: 0.5, wobble: 0.5, stretch: 0.6, trail: 0.35 };

export interface BendKnobs {
	vertical: number;
	horizontal: number;
	content: number;
}
export const BEND_DEFAULTS: BendKnobs = { vertical: 0.6, horizontal: 0.35, content: 0.3 };

export interface MeltKnobs {
	blur: number;
	contrast: number;
	reach: number;
	fade: number;
	warp: number;
	mix: number;
	mixBlur: number;
	gravity: number;
	waviness: number;
}
export const MELT_DEFAULTS: MeltKnobs = {
	blur: 7,
	contrast: 40,
	reach: 0.8,
	fade: 17,
	warp: 0,
	mix: 1,
	mixBlur: 8,
	gravity: 1.9,
	waviness: 12
};
