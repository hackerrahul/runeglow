import GooeyRoot from './Gooey.svelte'
import LiquidItem from './LiquidItem.svelte'

/** The liquid group: renders the merged silhouette (goo + real shadows) behind
 *  your crisp content. Put `Liquid.Item`s inside. */
export const Liquid = Object.assign(GooeyRoot, { Item: LiquidItem })

/** The same component as `Liquid.Item`, for those who prefer a plain import. */
export { LiquidItem }

export type { GooeyProps as LiquidProps, LiquidItemProps } from './types'

/* The option types, the defaults, the springs and the functions that run a
   group with no framework are the core's, the same in every framework. */
export * from 'runeglow/liquid-gooey'
