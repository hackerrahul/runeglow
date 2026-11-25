import type { VoiceOrbEmotion, VoiceOrbState } from 'runeglow/voice-ring';

/* the same walk through the states and the feelings on every page */
export const STATES: VoiceOrbState[] = ['listening', 'speaking', 'processing', 'idle'];
export const EMOTIONS: (VoiceOrbEmotion | null)[] = [null, 'positive', 'negative', 'calm'];

/* a stand-in for a voice: syllables of uneven length and loudness with short gaps, 0–1 */
export function voice(): number {
  const t = performance.now() / 1000;
  const syllable = Math.max(0, Math.sin(t * 7.3) * 0.6 + Math.sin(t * 2.9 + 1) * 0.5);
  const phrase = Math.max(0, Math.sin(t * 0.9)) ** 0.5;
  return Math.min(1, syllable * phrase);
}

export const summary = (state: string, emotion: string | null, mic: string) => `${state} / ${emotion ?? 'no emotion'} / mic ${mic}`;
