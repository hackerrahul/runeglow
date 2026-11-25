import type { VoiceBeamColorVariant } from 'runeglow/voice-glow';

/* the same walk through the palettes on every page */
export const PALETTES: VoiceBeamColorVariant[] = ['colorful', 'ocean', 'sunset', 'forest', 'candy', 'ice', 'gold', 'mono'];

/* a stand-in for a voice: syllables of uneven length and loudness with short gaps, 0–1 */
export function voice(): number {
  const t = performance.now() / 1000;
  const syllable = Math.max(0, Math.sin(t * 7.3) * 0.6 + Math.sin(t * 2.9 + 1) * 0.5);
  const phrase = Math.max(0, Math.sin(t * 0.9)) ** 0.5;
  return Math.min(1, syllable * phrase);
}

/* what the beams wrap, styled here so the four pages show the same thing */
const CSS = `
  .vg-box { width: 340px; height: 96px; padding: 16px 18px; box-sizing: border-box; border-radius: 20px; background: #1d1d1d; color: #888; font-size: 15px; }
  .vg-pill { width: 150px; height: 44px; display: grid; place-items: center; border-radius: 22px; background: #1d1d1d; color: #aaa; font-size: 13px; }
  .vg-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
`;
export function styles() {
  if (document.querySelector('style[data-vg]')) return;
  const style = document.createElement('style');
  style.dataset.vg = '';
  style.textContent = CSS;
  document.head.appendChild(style);
}

export const summary = (palette: string, active: boolean, mic: string) => `${palette} / ${active ? 'active' : 'inactive'} / mic ${mic}`;
