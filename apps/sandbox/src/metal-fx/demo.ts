import type { MetalFxPreset } from 'runeglow/metal-fx';

/* the same walk through the looks on every page: the rings' colour, the
   word in metal, and the badge's size */
export const LOOKS: { preset: MetalFxPreset; word: string; scale: number }[] = [
  { preset: 'chromatic', word: 'Pro', scale: 1 },
  { preset: 'gold', word: 'Max', scale: 1.4 },
  { preset: 'silver', word: 'Pro', scale: 1 },
];
export const say = (step: number, shown: boolean) => {
  const look = LOOKS[step % LOOKS.length];
  return shown ? `${look.preset} / ${look.word} / ×${look.scale}` : 'removed';
};

export const FONT = "500 24px/1.2 Inter, 'Geist', system-ui, sans-serif";

/* what the rings wrap and what catches their light, the same on every page */
const CSS = `
.mfx-row { gap: 22px; }
.mfx-chip { display: inline-flex; align-items: center; height: 36px; padding: 0 14px; border-radius: 50px; background: rgba(255, 255, 255, 0.04); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04); font-size: 13px; color: #caccd2; }
button.mfx-send { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 16px; }
button.mfx-pill { height: 40px; padding: 0 22px; border-radius: 20px; background: transparent; font: 500 14px/1 system-ui, sans-serif; color: inherit; white-space: nowrap; }
.mfx-line { display: inline-flex; align-items: center; gap: 8px; font: ${FONT}; color: #6f6f6f; }
`;
export function demoStyles() {
  if (document.getElementById('mfx-sandbox')) return;
  const style = document.createElement('style');
  style.id = 'mfx-sandbox';
  style.textContent = CSS;
  document.head.appendChild(style);
}
