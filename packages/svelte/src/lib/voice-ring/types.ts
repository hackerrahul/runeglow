import type { HTMLCanvasAttributes } from 'svelte/elements';
import type { VoiceOrbOptions, VoiceRingType } from 'runeglow/voice-ring';

export type { OrbTheme, VoiceOrbState, VoiceRingType } from 'runeglow/voice-ring';

/**
 * Props for the VoiceOrb component: the orb's own options (see
 * `VoiceOrbOptions`), and any attribute of a canvas: `class`, `aria-label`,
 * `onclick` and the rest are forwarded to it.
 */
export interface VoiceOrbProps extends Omit<HTMLCanvasAttributes, 'style' | 'children' | keyof VoiceOrbOptions>, VoiceOrbOptions {
  /** Inline styles, appended after the component's own. */
  style?: string;

  /** The canvas element, for `bind:ref`. */
  ref?: HTMLCanvasElement | null;
}

export type VoiceRingProps = Omit<VoiceOrbProps, 'type' | 'frame'> & {
  /**
   * How the ring is drawn: `ring`, a glassy ribbon with a spectrum running
   * round it, or `mono`, two loops of grey tube that a voice opens into a
   * turning globe, an emotion colouring the tube. @default 'ring'
   */
  type?: VoiceRingType;
};
