import type { HTMLAttributes, HTMLCanvasAttributes } from 'svelte/elements';
import type { BotAvatarOptions, RobotHeadOptions } from 'runeglow/bot-avatars';

/**
 * The avatar's own options (see `BotAvatarOptions`), and any attribute of a
 * canvas: `class`, `aria-label`, `onclick` and the rest are forwarded to it.
 */
export interface BotAvatarProps extends Omit<HTMLCanvasAttributes, 'color' | 'style'>, BotAvatarOptions {
  /** The canvas element. Bindable: `bind:ref={el}`. */
  ref?: HTMLCanvasElement | null;
  /** Extra inline CSS, appended after the canvas's own sizing and margins. */
  style?: string;
}

/**
 * The head's own options (see `RobotHeadOptions`), and any attribute of the
 * element: `class`, `aria-label`, `onclick` and the rest go on the `size` ×
 * `size` box the robot rests in.
 */
export interface RobotHeadProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'style'>, RobotHeadOptions {
  /** The canvas inside the element. Bindable: `bind:ref={el}`. */
  ref?: HTMLCanvasElement | null;
  /** Extra inline CSS, appended after the element's own sizing. */
  style?: string;
}
