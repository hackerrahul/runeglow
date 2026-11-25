import type { VoiceBeamMotion } from '@runeglow/svelte/voice-glow';

/* A synthetic speech envelope, so the effect can be judged without a
   microphone: syllables riding on words, in phrases with a pause between. */
export function demoLevel(t: number): number {
	const phrase = t % 9;
	if (phrase > 6.6) return 0;
	const syllable = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 3.1);
	const word = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.55 + 1);
	const rough = 0.86 + 0.14 * Math.sin(t * 23.7);
	const v = Math.pow(syllable, 1.6) * (0.5 + 0.5 * word) * rough;
	return Math.min(1, v * 1.05);
}

export const demoGetter = () => demoLevel(performance.now() / 1000);
/** The same voice half a phrase later, so two examples take turns speaking. */
export const demoGetterLate = () => demoLevel(performance.now() / 1000 + 4.5);

export const MIC_STATUS: Record<string, string> = {
	idle: 'Choose Microphone again to start listening.',
	requesting: 'Waiting for permission…',
	denied: 'Microphone blocked. Allow it in the browser’s site settings.',
	unsupported: 'This browser can’t capture audio.',
	error: 'Couldn’t open the microphone.'
};

export interface SweepTuning {
	/** Seconds for one pass from side to side. */
	duration: number;
	/** How lit the glow is held while sweeping, 0 to 1. */
	level: number;
	/** How far the beam travels to each side. */
	travel: number;
}
export const SWEEP_DEFAULTS: SweepTuning = { duration: 1.2, level: 0.5, travel: 1.4 };

/**
 * A simple driver for the `motion` prop: the glow gathers into one beam and
 * sweeps from side to side, for a "working on it" state. Call the returned
 * function every frame; VoiceBeam does when you pass it as `motion`.
 */
export function createSweep(read: () => { active: boolean; tuning: SweepTuning }): () => VoiceBeamMotion {
	let blend = 0;
	let clock = 0;
	let last: number | null = null;
	return () => {
		const { active, tuning } = read();
		const now = performance.now();
		const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
		last = now;
		// Ease in and out over about half a second, so listening and
		// sweeping hand over without a jump.
		blend += ((active ? 1 : 0) - blend) * (1 - Math.exp(-dt / 0.18));
		if (active) clock += dt;
		else if (blend < 0.001) clock = 0;
		const gather = blend * blend * (3 - 2 * blend);
		const swing = Math.sin((clock / Math.max(0.05, tuning.duration)) * Math.PI);
		return {
			gather,
			offset: gather * tuning.travel * swing,
			stretch: 1 - swing * swing,
			heldLevel: tuning.level,
			cornerFollow: 0.4
		};
	};
}
