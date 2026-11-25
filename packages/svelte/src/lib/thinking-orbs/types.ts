import type { HTMLCanvasAttributes } from 'svelte/elements';
import type { ThinkingOrbOptions } from 'runeglow/thinking-orbs';

/**
 * Props for the ThinkingOrb Svelte component: the orb's own options (see
 * `ThinkingOrbOptions`), and any attribute of a canvas: `class`,
 * `aria-label`, `onclick` and the rest are forwarded to it.
 */
export interface ThinkingOrbProps extends Omit<HTMLCanvasAttributes, 'style' | 'color'>, ThinkingOrbOptions {
  /** The canvas element. Bindable: `bind:ref={el}`. */
  ref?: HTMLCanvasElement | null;

  /** Extra inline CSS, appended after the canvas's own width, height and display. */
  style?: string;
}
