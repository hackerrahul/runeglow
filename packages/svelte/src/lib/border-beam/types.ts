import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { BorderBeamOptions } from 'runeglow/border-beam';

/**
 * Props for the BorderBeam component: the beam's own options (see
 * `BorderBeamOptions`), and any attribute of a `<div>`, which goes on the
 * wrapper.
 */
export interface BorderBeamProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>, BorderBeamOptions {
  /** Content to wrap with the border beam effect */
  children?: Snippet;

  /**
   * The wrapper element. Bindable: `bind:ref={el}`.
   */
  ref?: HTMLDivElement | null;

  /**
   * Callback when fade-in animation completes
   */
  onActivate?: () => void;

  /**
   * Callback when fade-out animation completes
   */
  onDeactivate?: () => void;
}
