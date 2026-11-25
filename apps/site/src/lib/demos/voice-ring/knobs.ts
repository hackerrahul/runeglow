import type { VoiceOrbType } from '@runeglow/svelte/voice-ring';

/* What the playground calls each type: the two rings by VoiceRing's names,
   the five ink orbs by VoiceOrb's. */
export type Pick = 'ring' | 'mono' | 'orbit' | 'sash' | 'signal' | 'swell' | 'pixel';

export const ORB_TYPE: Record<Pick, VoiceOrbType> = {
	ring: 'aura',
	mono: 'aura-mono',
	orbit: 'orbit',
	sash: 'sash',
	signal: 'signal',
	swell: 'swell',
	pixel: 'pixel'
};

/* Each type's own knobs: the `opts` keys its frame reads. `def` is the
   engine's fallback, so a slider at rest writes nothing. */
export interface Knob {
	key: string;
	label: string;
	def: number;
	min: number;
	max: number;
	step: number;
	unit?: 'x' | 'deg';
}

export interface KnobGroup {
	title: string;
	items: Knob[];
}

const k = (key: string, label: string, def: number, min: number, max: number, step: number, unit?: Knob['unit']): Knob => ({
	key,
	label,
	def,
	min,
	max,
	step,
	unit
});

export const KNOBS: Record<Pick, KnobGroup[]> = {
	ring: [
		{
			title: 'Ring',
			items: [
				k('rings', 'Rings', 6, 1, 12, 1),
				k('lean', 'Lean', 0.91, 0, 1.5, 0.01),
				k('ringGap', 'Ring gap', 0.02, 0, 0.2, 0.005),
				k('deform', 'Deform', 1.45, 0, 3, 0.05, 'x'),
				k('halo', 'Halo', 0.5, 0, 1.5, 0.05),
				k('radius', 'Radius', 0.56, 0.3, 0.8, 0.01),
				k('zoom', 'Voice zoom', 0.17, 0, 0.5, 0.01),
				k('lineW', 'Stroke', 1.85, 0.5, 6, 0.05)
			]
		},
		{
			title: 'Light',
			items: [
				k('brightness', 'Brightness', 0.78, 0.2, 1.6, 0.02),
				k('highlight', 'Highlight', 1.4, 0, 3, 0.05),
				k('highlightSize', 'Highlight size', 1, 0.3, 2, 0.05, 'x'),
				k('fringe', 'Colour fringe', 1, 0, 3, 0.05, 'x'),
				k('bloom', 'Bloom', 0.55, 0, 1.5, 0.05),
				k('bloomSize', 'Bloom size', 1.4, 0.5, 3, 0.05, 'x'),
				k('softness', 'Softness', 3.7, 0, 8, 0.1),
				k('colorDrift', 'Colour drift', 1, 0, 3, 0.05, 'x'),
				k('colorTurn', 'Colour turn', 0, -180, 180, 5, 'deg')
			]
		}
	],
	mono: [
		{
			title: 'Mono',
			items: [
				k('rings', 'Loops', 2, 1, 4, 1),
				k('ringGap', 'Loop spacing', 0.035, 0, 0.2, 0.005),
				k('tilt', 'Lean (waiting)', 0.22, 0, 1, 0.01),
				k('open', 'Globe opening', 0.75, 0, 1.5, 0.01),
				k('twist', 'Twist', 1.69, 0, 2.5, 0.01),
				k('wobble', 'Wobble', 0.31, 0, 3, 0.01),
				k('deform', 'Deform', 1.85, 0, 3, 0.05, 'x'),
				k('radius', 'Radius', 0.44, 0.3, 0.7, 0.01),
				k('lineW', 'Stroke', 1.7, 0.5, 16, 0.1)
			]
		},
		{
			title: 'Tube',
			items: [
				k('shine', 'Shine', 1, 0, 2, 0.05),
				k('contrast', 'Shading', 0, 0, 1.5, 0.05),
				k('pace', 'Turning pace', 2.1, 0.5, 4, 0.05, 'x'),
				k('restBend', 'Bend at rest', 0.12, 0, 1, 0.01),
				k('idleSway', 'Idle sway', 0.18, 0, 1, 0.01),
				k('zoom', 'Voice zoom', 0.08, 0, 0.4, 0.01),
				k('colorSaturation', 'Emotion strength', 2, 0, 2, 0.05),
				k('colorGradient', 'Emotion fade', 0.69, 0, 1, 0.01)
			]
		}
	],
	orbit: [
		{
			title: 'Orbit',
			items: [
				k('orbitN', 'Orbits', 12, 3, 24, 1),
				k('particles', 'Particles', 6, 1, 14, 1),
				k('swell', 'Voice zoom', 0.49, 0, 1, 0.01),
				k('persp', 'Perspective', 0.25, 0, 0.6, 0.01),
				k('radius', 'Radius', 0.56, 0.3, 0.8, 0.01)
			]
		}
	],
	sash: [
		{
			title: 'Sash',
			items: [
				k('lanes', 'Lanes', 10, 2, 20, 1),
				k('segs', 'Dots per lane', 56, 16, 110, 1),
				k('ghostN', 'Ghost dots', 60, 0, 160, 1),
				k('laneGap', 'Lane gap', 0.062, 0.02, 0.15, 0.002),
				k('wave', 'Wave', 1, 0, 3, 0.05, 'x'),
				k('deform', 'Deform', 1, 0, 3, 0.05, 'x'),
				k('zoom', 'Voice zoom', 0.21, 0, 0.6, 0.01),
				k('radius', 'Radius', 0.66, 0.4, 0.85, 0.01)
			]
		}
	],
	signal: [
		{
			title: 'Signal',
			items: [
				k('circles', 'Circles', 8, 2, 16, 1),
				k('limbs', 'Limbs', 2, 0, 6, 1),
				k('lineW', 'Stroke', 0.6, 0.3, 3, 0.05),
				k('deform', 'Deform', 1, 0, 3, 0.05, 'x'),
				k('yaw', 'Yaw', 0.42, 0, 1.5, 0.01),
				k('tilt', 'Tilt', 0.32, 0, 1.2, 0.01),
				k('zoom', 'Voice zoom', 0.06, 0, 0.4, 0.01),
				k('radius', 'Radius', 0.6, 0.3, 0.8, 0.01)
			]
		}
	],
	swell: [
		{
			title: 'Swell',
			items: [
				k('dotN', 'Dots', 900, 100, 1600, 20),
				k('cloudFreq', 'Cloud detail', 2.3, 0.5, 6, 0.1),
				k('deform', 'Deform', 1, 0, 3, 0.05, 'x'),
				k('zoom', 'Voice zoom', 0.1, 0, 0.5, 0.01),
				k('radius', 'Radius', 0.6, 0.3, 0.8, 0.01)
			]
		}
	],
	pixel: [
		{
			title: 'Pixel',
			items: [
				k('cells', 'Cells', 17, 6, 30, 1),
				k('gap', 'Gap', 0.24, 0, 0.6, 0.01),
				k('turn', 'Spin', 0.12, 0, 1, 0.01),
				k('shade', 'Shading', 0.7, 0, 1.5, 0.05),
				k('texture', 'Texture', 0.35, 0, 1, 0.05),
				k('strength', 'Ring light', 1.38, 0, 3, 0.02),
				k('fade', 'Light fade', 1.3, 0, 3, 0.05),
				k('deform', 'Deform', 1.7, 0, 3, 0.05, 'x'),
				k('zoom', 'Voice zoom', 0.3, 0, 0.6, 0.01),
				k('radius', 'Radius', 0.72, 0.4, 0.9, 0.01)
			]
		}
	]
};

/* The lean toward a voice: each amount's prop, the shared default (a type
   may carry its own) and how far its slider goes. */
export const LEAN_KEYS = [
	{ key: 'move', prop: 'directionMove', label: 'Drift', def: 2, max: 3 },
	{ key: 'pull', prop: 'directionPull', label: 'Pull', def: 0.7, max: 2 },
	{ key: 'deform', prop: 'directionDeform', label: 'Bulge', def: 0.1, max: 1 },
	{ key: 'squash', prop: 'directionSquash', label: 'Squash at edge', def: 0.5, max: 1 },
	{ key: 'lens', prop: 'directionLens', label: 'Edge lens', def: 0.67, max: 2 },
	{ key: 'stretch', prop: 'directionStretch', label: 'Lens stretch', def: 1, max: 2 },
	{ key: 'split', prop: 'directionSplit', label: 'Lens colour split', def: 1, max: 2 },
	{ key: 'blur', prop: 'directionBlur', label: 'Lens blur', def: 1, max: 2 },
	{ key: 'bounce', prop: 'directionBounce', label: 'Edge bounce', def: 1, max: 2 }
] as const;
