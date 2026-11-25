import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { VoiceBeamOptions } from 'runeglow/voice-glow';

export type {
  VoiceBeamType,
  VoiceBeamTheme,
  VoiceBeamLook,
  VoiceBeamDotShape,
  VoiceBeamLinePattern,
  VoiceBeamColorVariant,
  VoiceBeamLevel,
  VoiceBeamMotion,
  VoiceThemeColors,
} from 'runeglow/voice-glow';

/**
 * Props for the VoiceBeam component: the beam's own options (see
 * `VoiceBeamOptions`), and any attribute of a div: `class`, `style`,
 * `onclick` and the rest go on the wrapper element.
 */
export interface VoiceBeamProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>, VoiceBeamOptions {
  /** The wrapper element. Bindable: `bind:ref={el}`. */
  ref?: HTMLDivElement | null;

  /** Content to wrap with the voice beam effect */
  children?: Snippet;
}
