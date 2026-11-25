import type { WaveType } from 'runeglow/distortion-waves';

/* the same walk through the wave's shapes on every page */
export const TYPES: WaveType[] = ['vertical', 'center', 'horizontal'];

/* Two cards on every page. The first has two views and a button over them
   that sends the wave from one to the other, by setting `revealed`. The
   second has one view, and its button calls `play()`. */
export const CSS = `
  .dw-card { width: 280px; border-radius: 24px; overflow: hidden; background: #1c1c1f; }
  .dw-view { display: grid; align-content: start; gap: 6px; height: 190px; box-sizing: border-box; padding: 26px 24px; background: #1c1c1f; color: #eee; }
  .dw-view.done { background: #14261b; }
  .dw-view b { font-size: 22px; }
  .dw-view span { color: #9a9aa2; }
  .dw-go { position: absolute; left: 24px; right: 24px; bottom: 22px; height: 40px; background: #f1f1f1; color: #111; }
`;

export const status = (type: string, revealed: boolean, finished: number, last: boolean | null) =>
  `${type} / ${revealed ? 'second view' : 'first view'} / finished ${finished}${last === null ? '' : ` (${last ? 'on the second' : 'on the first'})`}`;
