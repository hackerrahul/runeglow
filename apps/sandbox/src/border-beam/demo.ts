import type { BorderBeamColorVariant } from 'runeglow/border-beam';

/* the same walk through the colours on every page */
export const COLORS: BorderBeamColorVariant[] = ['colorful', 'ocean', 'sunset', 'mono'];

/* what the beams are drawn round; the wrappers hug them, as the docs site has it */
export const CSS = `
  .bb-card { display: grid; place-items: center; width: 220px; height: 110px; border-radius: 18px; background: #1f1f1f; box-shadow: inset 0 0 0 1px #2c2c2c; color: #ccc; }
  .bb-pill { width: 150px; height: 44px; border-radius: 22px; }
  [data-beam] { width: fit-content; }
`;

export const status = (color: string, active: boolean, on: number, off: number) =>
  `${color} / ${active ? 'on' : 'off'} / faded in ${on}, out ${off}`;
