/* A stand-in for live speech-to-text, for the demos: the words of a fixed
   sentence arrive one by one while the voice is up, and clear after a
   pause. It is paced by the level VoiceBeam reports through `onLevel`, so
   the text and the glow always agree. */

const SENTENCE = 'Remind me to call the studio at nine and book a table for four';

export function createTranscript(sentence: string = SENTENCE) {
	const all = sentence.split(' ');
	let words = $state<string[]>([]);
	let index = 0;
	let lastWordAt = 0;
	let silentSince = performance.now();
	let silent = true;

	return {
		get words() {
			return words;
		},
		/** Pass this to VoiceBeam's `onLevel`. */
		onLevel(level: number) {
			const now = performance.now();
			if (level < 0.05) {
				if (!silent) silentSince = now;
				silent = true;
				// A real pause: the sentence is done, so the prompt comes back.
				if (index > 0 && now - silentSince > 2500) {
					index = 0;
					words = [];
				}
			} else if (level > 0.2) {
				silent = false;
			}
			if (level > 0.22 && now - lastWordAt > 320 && index < all.length) {
				index += 1;
				lastWordAt = now;
				words = all.slice(0, index);
			}
		},
		reset() {
			index = 0;
			words = [];
			silent = true;
			silentSince = performance.now();
		}
	};
}
