import { getContext, setContext } from 'svelte'
import type { ImageMeltRegistry } from './imageMelt'
import type { ObserveEngine } from './observer'

export interface GooeyContextValue {
  /** The filtered group in the silhouette svg; items append their blobs to it. */
  readonly portal: SVGGElement | null
  /** Target inside the melt-overlay svg (above the content layer). */
  readonly meltPortal: SVGGElement | null
  /** The group's liquid fill — default colour of the intruding mix liquid. */
  readonly fill: string
  getGroup: () => HTMLDivElement | null
  engine: ObserveEngine
  /** Pairwise image-melt items (effect="melt") register here. */
  imageMelt: ImageMeltRegistry
}

const KEY = Symbol('runeglow.liquid-gooey')

export function setGooeyContext(value: GooeyContextValue): void {
  setContext(KEY, value)
}

export function getGooeyContext(): GooeyContextValue {
  const ctx = getContext<GooeyContextValue | undefined>(KEY)
  if (!ctx) throw new Error('<Liquid.Item> must be rendered inside a <Liquid> group.')
  return ctx
}
