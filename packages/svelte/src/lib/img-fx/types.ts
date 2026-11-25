import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { ImageGenerationOptions } from 'runeglow/img-fx';

/**
 * The card's own options (see `ImageGenerationOptions`), and any attribute
 * of the wrapper element: `class`, `style`, `onclick` and the rest are
 * forwarded to it.
 */
export interface ImageGenerationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style' | 'class'>, ImageGenerationOptions {
  /** The wrapper element. Bindable: `bind:ref={el}`. */
  ref?: HTMLDivElement | null;

  /**
   * Single host element to wrap. The wrapper sizes itself to the child; the
   * shader paints inside the wrapper at full size, clipped to the child's
   * border-radius.
   */
  children?: Snippet;

  /** Forwarded class name for the wrapper element. */
  class?: string;

  /** Forwarded inline styles for the wrapper element. */
  style?: string;
}
