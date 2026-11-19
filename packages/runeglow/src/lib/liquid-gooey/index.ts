import GooeyRoot from './Gooey.svelte'
import LiquidItem from './LiquidItem.svelte'

/** The liquid group: renders the merged silhouette (goo + real shadows) behind
 *  your crisp content. Put `Liquid.Item`s inside. */
export const Liquid = Object.assign(GooeyRoot, { Item: LiquidItem })

/** The same component as `Liquid.Item`, for those who prefer a plain import. */
export { LiquidItem }

export type {
  BendTuning,
  DissolveOptions,
  GooeyProps as LiquidProps,
  LiquidEffect,
  LiquidItemProps,
  MorphTuning,
  MoveTuning,
} from './types'
export { IMAGE_MELT_DEFAULTS } from './imageMelt'
export type { ImageMeltOptions } from './imageMelt'

// ---- advanced escape hatch (raw engine options + defaults) ----
export { EVOLVE_DEFAULTS, MOVE_DEFAULTS } from './observer'
export type { EvolveOptions, MoveOptions } from './observer'
export { easingFunction, presets } from './spring'
export type { SpringConfig, Transition, TransitionPreset } from './spring'
export type { CornerRadii } from './geometry'
