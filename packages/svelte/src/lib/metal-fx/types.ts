import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { MetalBadgeOptions, MetalFxOptions, MetalTextOptions } from 'runeglow/metal-fx';

/**
 * Props for the MetalFx component: the ring's own options (see
 * `MetalFxOptions`), and any attribute of the wrapper element.
 */
export interface MetalFxProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style' | 'class'>, MetalFxOptions {
  /**
   * The single host element to wrap with the metal effect. Must be a single
   * element (button, anchor, div, ...). MetalFx measures this element each
   * frame via `ResizeObserver` and paints its canvas + glow on top.
   */
  children?: Snippet;

  /** The wrapper element. Bindable: `bind:ref={el}`. */
  ref?: HTMLDivElement | null;

  /**
   * Forwarded class name for the wrapper element.
   */
  class?: string;

  /**
   * Forwarded inline styles for the wrapper element.
   */
  style?: string;
}

/** Props for MetalText. */
export interface MetalTextProps extends MetalTextOptions {
  /** Class for the text span. */
  class?: string;
  /** The wrapper element. Bindable: `bind:ref={el}`. */
  ref?: HTMLDivElement | null;
}

/** Props for MetalBadge. */
export interface MetalBadgeProps extends MetalBadgeOptions {
  /** The wrapper element. Bindable: `bind:ref={el}`. */
  ref?: HTMLDivElement | null;
}
