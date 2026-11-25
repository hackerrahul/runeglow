import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { WaveOptions } from 'runeglow/distortion-waves';

/* The functions a `<DistortionWave>` exposes: bind the component with
   `bind:this` and call them on it. They are the core's, the same in every
   framework. */
export type { DistortionWaveHandle } from 'runeglow/distortion-waves';

export interface DistortionWaveProps
  extends WaveOptions,
    Omit<HTMLAttributes<HTMLDivElement>, keyof WaveOptions | 'children' | 'style'> {
  /** What the wave passes over: the view that shows first. Give it an
      opaque background, or one behind the whole element. */
  children?: Snippet;
  /** The view the wave leaves behind it. Without one the wave passes over
      `children` and leaves them as they were. */
  revealedContent?: Snippet;
  /** What stays above the wave, as it is: the button that starts it, a
      close control. The wave neither bends nor colours it, and it shows over
      both views. Its own children take clicks; the rest of it lets them
      through to the view below. */
  overlay?: Snippet;
  /** Inline styles for the element, after the component's own. */
  style?: string;
  /** The wave's element. Bindable: `bind:ref={el}`. */
  ref?: HTMLDivElement | null;
}
