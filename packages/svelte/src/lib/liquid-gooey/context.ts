import { getContext, setContext } from 'svelte'
import type { LiquidGroup } from 'runeglow/liquid-gooey'

/* The group and its pieces share one object from the core (the filtered
   layer the pieces draw in, the measurement engine, the melt registry).
   Svelte's part is only how a piece finds it: through context. */

const KEY = Symbol('runeglow.liquid-gooey')

export function setGooeyContext(group: LiquidGroup): void {
  setContext(KEY, group)
}

export function getGooeyContext(): LiquidGroup {
  const group = getContext<LiquidGroup | undefined>(KEY)
  if (!group) throw new Error('<Liquid.Item> must be rendered inside a <Liquid> group.')
  return group
}
