/* Run by the liquid group: watches the registered melt items and draws the
   pair. rAF-measured; updates only when a rect actually moves. */

import { geomKey, readGeom, type ImageMeltEntry, type ImageMeltRegistry } from './imageMelt'
import { drawMeltPair, type MeltPair, type MeltPairState } from './meltPair'

/**
 * Draw the first two melt items of a group, for as long as there are two.
 * The melt SVG is made here and kept as the last thing inside the group
 * element, above its content. Returns what stops it.
 */
export function imageMeltLayer(group: HTMLElement, registry: ImageMeltRegistry): () => void {
  let pair: ImageMeltEntry[] = []
  let drawn: MeltPair | null = null
  let state: MeltPairState | null = null
  let raf = 0

  const draw = (next: MeltPairState) => {
    state = next
    if (drawn) drawn.update(next)
    else drawn = drawMeltPair(group, next)
  }

  /* The registry calls this whenever an item registers or leaves; the two
     at the front are the pair. */
  const refresh = () => {
    pair = registry.entries().slice(0, 2)
    cancelAnimationFrame(raf)
    raf = 0
    if (pair.length < 2) {
      drawn?.destroy()
      drawn = null
      state = null
      return
    }
    const [first, second] = pair
    /* a pair already drawn takes its new pictures and tuning at once; its rects follow below */
    if (state) draw({ ...state, srcA: first.src, srcB: second.src, opts: first.opts })
    let key = ''
    const tick = () => {
      const a = readGeom(group, first.el)
      const b = readGeom(group, second.el)
      const next = `${geomKey(a)}|${geomKey(b)}|${group.offsetWidth}x${group.offsetHeight}`
      if (next !== key) {
        key = next
        draw({ a, b, srcA: first.src, srcB: second.src, opts: first.opts, width: group.offsetWidth, height: group.offsetHeight })
      }
      /* content added to the group since goes in after the melt: put the melt back on top of it */
      if (drawn && drawn.element.nextSibling) group.appendChild(drawn.element)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  const off = registry.subscribe(refresh)
  // Items may have registered before the group had its element, so the
  // first registrations arrived before anyone was listening. Read them
  // once now that we are.
  refresh()

  return () => {
    off()
    cancelAnimationFrame(raf)
    drawn?.destroy()
    drawn = null
  }
}
