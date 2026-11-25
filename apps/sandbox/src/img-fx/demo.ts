import type { ImageGenerationPreset } from 'runeglow/img-fx';

/* the same walk through the presets on every page */
export const PRESET_NAMES: ImageGenerationPreset[] = ['pixels-organic', 'pixels-mechanic', 'sweep-gradient'];

/* The pictures the cards resolve into, drawn here so the pages need no
   files: a sky, a few soft suns. */
function picture(sky: [string, string], suns: string[]): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const wash = ctx.createLinearGradient(0, 0, 320, 320);
  wash.addColorStop(0, sky[0]);
  wash.addColorStop(1, sky[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 320, 320);
  suns.forEach((color, i) => {
    const x = 70 + i * 90, y = 230 - i * 70, r = 90 - i * 18;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 320, 320);
  });
  return canvas.toDataURL('image/png');
}

export const IMAGES = [
  picture(['#1d2b64', '#f8cdda'], ['#ffd27a', '#ff8a5c', '#ffffff']),
  picture(['#0b3d2e', '#b5e48c'], ['#fff3b0', '#52b788', '#d8f3dc']),
  picture(['#3a0ca3', '#f72585'], ['#4cc9f0', '#ffd6ff', '#ffbe0b'])
];

/* the card each page wraps: the wrapper takes its size and its corners */
export const CARD = 'width: 240px; height: 240px; border-radius: 24px;';
export const SMALL_CARD = 'width: 140px; height: 140px; border-radius: 40px;';

export const CONTROLS = `
  <p>
    <button id="reveal" type="button">Reveal or hide</button>
    <button id="regen" type="button">Regenerate</button>
    <button id="next" type="button">Next preset</button>
    <button id="pause" type="button">Pause</button>
    <output id="state"></output>
  </p>`;
