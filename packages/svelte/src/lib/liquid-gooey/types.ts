import type { Snippet } from 'svelte'
import type { HTMLAttributes } from 'svelte/elements'
import type { LiquidItemOptions, LiquidOptions } from 'runeglow/liquid-gooey'

/**
 * The group's own options (see `LiquidOptions`), and any attribute of a
 * div: `class`, `style` and the rest are forwarded to the group element.
 */
export interface GooeyProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>, LiquidOptions {
  /** The group's content: your elements, with `Liquid.Item`s among them. */
  children?: Snippet
  /** The group element. Bindable: `bind:ref={el}`. */
  ref?: HTMLDivElement | null
}

/** A piece's own options (see `LiquidItemOptions`), and what goes on its wrapper. */
export interface LiquidItemProps extends LiquidItemOptions {
  class?: string
  style?: string
  children?: Snippet
}
