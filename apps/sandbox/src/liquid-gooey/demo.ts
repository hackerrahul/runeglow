/* What the four pages share: the same three small demos, their numbers and
   their styles. A menu whose pieces merge (the library moves them), a thumb
   the liquid trails (the page moves it) and two pictures that melt. */

/* where each satellite of the menu goes when it opens */
export const SATELLITES = [
  { label: 'One', x: -52, y: -34 },
  { label: 'Two', x: 0, y: -62 },
  { label: 'Three', x: 52, y: -34 },
];

/* the group option the "Goo blur" button walks through */
export const BLURS = [6, 12, 2];

export const FILL = '#2c2c2c';
export const SHADOW = '0 0 0 1px rgba(255, 255, 255, 0.06) inset, 0 4px 24px rgba(0, 0, 0, 0.35)';

/* how far the thumb slides, and where the two cards sit apart and touching */
export const SLIDE = 150;
export const APART = [18, 138];
export const TOUCHING = [42, 114];

/* two pictures, made here so the demo needs no files */
const picture = (a: string, b: string, c: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="168">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
      `<rect width="168" height="168" fill="url(#g)"/><circle cx="110" cy="62" r="34" fill="${c}"/><circle cx="48" cy="122" r="20" fill="${c}" opacity="0.6"/></svg>`,
  )}`;
export const PICTURES = [picture('#ff5e3a', '#ffb347', '#fff3c4'), picture('#1fb6ff', '#7a5cff', '#c4f5ff')];

const CSS = `
.lg { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.lg-panel { padding: 22px; border-radius: 16px; background: #171717; }
.lg-menu { width: 220px; height: 150px; }
.lg-slot { position: absolute; left: 88px; top: 96px; }
.lg-btn { display: block; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #f4f4f4; font: 600 15px/1 system-ui, sans-serif; cursor: pointer; }
.lg-sat { color: transparent; transition: color 0.2s; }
.open .lg-sat { color: #f4f4f4; }
.lg-track { width: 220px; height: 150px; }
.lg-thumb { position: absolute; left: 12px; top: 58px; width: 46px; height: 30px; border-radius: 15px; transition: transform 0.6s cubic-bezier(0.3, 1.05, 0.4, 1); }
.lg-stage { width: 240px; height: 150px; }
.lg-card { position: absolute; top: 33px; width: 84px; height: 84px; border-radius: 22px; overflow: hidden; transition: left 0.7s ease; }
.lg-card img { display: block; width: 100%; height: 100%; object-fit: cover; }
`;

/** Put the demo's styles in the page, once. */
export function styles() {
  if (document.querySelector('style[data-lg]')) return;
  const style = document.createElement('style');
  style.dataset.lg = '';
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** The line under the demo that says what state it is in. */
export const summary = (open: boolean, blur: number, slid: boolean, touching: boolean) =>
  `${open ? 'open' : 'closed'} / blur ${blur} / ${slid ? 'slid' : 'home'} / ${touching ? 'touching' : 'apart'}`;

/** The four buttons every page has, as HTML. */
export const BUTTONS =
  '<button id="toggle" type="button">Open menu</button> <button id="blur" type="button">Goo blur</button> ' +
  '<button id="slide" type="button">Slide</button> <button id="touch" type="button">Touch</button>';
