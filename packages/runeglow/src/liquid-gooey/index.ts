/* Gooey, with no framework: pieces that merge like goo and move like
   liquid, while your content stays crisp. `mountLiquid` makes an element a
   liquid group and its `item` makes an element inside it one of the pieces;
   the `attach…` and `…View` pairs are what the framework adapters are built
   on, and `LiquidGroup` is the object a group and its pieces share. */

export { LiquidGroup, attachLiquid, liquidGroupOf, liquidMarkup, liquidView, mountLiquid } from './group'
export type { LiquidHandle, LiquidMountOptions, LiquidView, MountedLiquid } from './group'

export { attachLiquidItem, liquidItemView, mountLiquidItem } from './item'
export type { LiquidItemHandle, LiquidItemKind, LiquidItemView, MountedLiquidItem } from './item'

export { liquidItemOptionKinds, liquidOptionKinds } from './types'
export type {
  BendTuning,
  DissolveOptions,
  LiquidEffect,
  LiquidItemOptions,
  LiquidOptions,
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
