import type { WaveStyle } from '@runeglow/svelte/distortion-waves';

/* The wave's numbers, grouped as they act. Lengths are in points, which grow
   with `scale`. */
export type KnobKey = Exclude<keyof WaveStyle, 'type' | 'palette' | 'cornerRadius' | 'easeX1' | 'easeY1' | 'easeX2' | 'easeY2'>;

export interface Knob {
	key: KnobKey;
	label: string;
	min: number;
	max: number;
	step: number;
	unit: 's' | 'pt' | 'pct' | 'x' | 'n';
}

const k = (key: KnobKey, label: string, min: number, max: number, step: number, unit: Knob['unit']): Knob => ({ key, label, min, max, step, unit });

export const KNOB_GROUPS: { title: string; items: Knob[] }[] = [
	{
		title: 'Timing',
		items: [
			k('anticipation', 'Anticipation', 0, 1.5, 0.01, 's'),
			k('travel', 'Travel', 0.3, 6, 0.01, 's'),
			k('launchGap', 'Start gap', 0, 200, 1, 'pt'),
			k('returnSpeed', 'Return speed', 0.5, 3, 0.05, 'x')
		]
	},
	{
		title: 'Gather',
		items: [
			k('pull', 'Pull', 0, 60, 0.5, 'pt'),
			k('inhale', 'Colour ring', 0, 140, 1, 'pt'),
			k('gatherGlow', 'Ring opacity', 0, 2, 0.01, 'pct'),
			k('gatherDots', 'Gather dots', 0, 1, 0.01, 'pct')
		]
	},
	{
		title: 'Swell',
		items: [
			k('amplitude', 'Swell', 0, 80, 0.5, 'pt'),
			k('lensWidth', 'Swell width', 40, 300, 1, 'pt'),
			k('swell', 'Bend', 0, 60, 0.5, 'pt'),
			k('aberration', 'Chromatic', 0, 1, 0.01, 'pct'),
			k('blur', 'Blur', 0, 60, 0.5, 'pt'),
			k('blurAhead', 'Blur ahead', 20, 300, 1, 'pt'),
			k('blurBehind', 'Blur behind', 40, 500, 1, 'pt')
		]
	},
	{
		title: 'Front colour',
		items: [
			k('strength', 'Opacity', 0, 1.5, 0.01, 'pct'),
			k('lead', 'Colour ahead', 30, 300, 1, 'pt'),
			k('tail', 'Colour behind', 60, 500, 1, 'pt')
		]
	},
	{
		title: 'Edges',
		items: [
			k('rimStrength', 'Opacity', 0, 1.5, 0.01, 'pct'),
			k('rimWidth', 'Width', 4, 120, 0.5, 'pt'),
			k('rimUnevenness', 'Unevenness', 0, 2, 0.01, 'pct'),
			k('rimPulse', 'Pulse', 0, 1, 0.01, 'pct'),
			k('rimSoftness', 'Fade softness', 40, 400, 1, 'pt'),
			k('linger', 'Fade starts', -1.5, 3, 0.01, 's'),
			k('rimFade', 'Fade out', 0.3, 6, 0.01, 's'),
			k('hairlineWidth', 'Hairline', 0, 4, 0.1, 'pt'),
			k('hairlineOpacity', 'Line opacity', 0, 1, 0.01, 'pct'),
			k('hairlineWhite', 'Line white', 0, 1, 0.01, 'pct'),
			k('hairlineLinger', 'Line holds', 0, 6, 0.01, 's'),
			k('hairlineFade', 'Line fades', 0.3, 6, 0.01, 's')
		]
	},
	{
		title: 'Particles',
		items: [
			k('particleCount', 'Count', 0, 300, 1, 'n'),
			k('particleSize', 'Size', 0.5, 4, 0.1, 'pt'),
			k('particleReach', 'Born within', 40, 400, 1, 'pt'),
			k('particleFlight', 'Hop', 4, 120, 1, 'pt'),
			k('particleGap', 'Gap', 0, 120, 1, 'pt'),
			k('particleLife', 'Life', 0.2, 4, 0.01, 's'),
			k('particleSpread', 'Spread', 0.1, 1, 0.01, 'pct')
		]
	},
	{
		title: 'Touch',
		items: [k('orientation', 'Lean toward the press', 0, 1, 0.01, 'pct')]
	}
];

/* The front's travel curve, as CSS cubic-bezier(). */
export const CURVES = {
	default: [0.22, 1, 0.36, 1],
	'out-cubic': [0.33, 1, 0.68, 1],
	'in-out': [0.65, 0, 0.35, 1],
	linear: [0, 0, 1, 1],
	overshoot: [0.34, 1.35, 0.64, 1]
} as const;
export type CurveKey = keyof typeof CURVES;
export const CURVE_OPTIONS: { value: CurveKey; label: string }[] = [
	{ value: 'default', label: 'Default' },
	{ value: 'out-cubic', label: 'Out cubic' },
	{ value: 'in-out', label: 'In-out' },
	{ value: 'linear', label: 'Linear' },
	{ value: 'overshoot', label: 'Overshoot' }
];
