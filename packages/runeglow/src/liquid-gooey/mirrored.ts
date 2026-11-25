/* Mirrored mode: the library moves the wrapper and its blob together, from
   one clock. Used when an item needs no measurement engine. */

import { Effects } from '../internal/effects'
import { reducedMotion } from '../internal/view'
import {
  measureRadius,
  normalizeRadius,
  offsetTo,
  roundedRectPath,
  type BlobBox,
  type CornerRadii,
} from './geometry'
import type { LiquidGroup } from './group'
import { easingFunction, resolveTransition, type ResolvedTransition } from './spring'
import type { GooeyItemOptions } from './types'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** One of the three ways a piece is driven, as the item that owns it sees it. */
export interface ItemDriver<Options> {
  /** New options, replacing the last set whole. */
  update(options: Options): void
  /** Something outside the options changed (the group came or went, the content was swapped): look again. */
  flush(): void
  /** Write the inline styles this driver owns again, after something rewrote the element's style whole. */
  restyle(): void
  destroy(): void
}

function sameBox(a: BlobBox | null, b: BlobBox): boolean {
  return (
    !!a &&
    a.x === b.x &&
    a.y === b.y &&
    a.w === b.w &&
    a.h === b.h &&
    a.r.every((v, i) => v === b.r[i])
  )
}

const transformOf = (px: number, py: number, ps: number) =>
  `translate(${px}px, ${py}px)` + (ps !== 1 ? ` scale(${ps})` : '')

/**
 * Drive a piece in mirrored mode. `wrap` is the element that is moved and
 * measured; `content` gives the element whose border radius the blob takes
 * (the wrapper's child, or the element itself where there is no wrapper).
 */
export function mirroredItem(
  group: LiquidGroup,
  wrap: HTMLElement,
  content: () => Element,
  options: GooeyItemOptions,
): ItemDriver<GooeyItemOptions> {
  let o = options
  const fx = new Effects()

  let blob: SVGGraphicsElement | null = null
  let box: BlobBox | null = null

  // Compared by content, so an inline `{ duration, ease }` literal does not
  // restart anything each time the parent updates.
  let tKey: string | null = null
  let reduced = false
  let resolved!: ResolvedTransition
  let radiusKey = ''
  const derive = () => {
    const transition = o.transition ?? 'smooth'
    const key = typeof transition === 'string' ? transition : JSON.stringify(transition ?? null)
    const still = reducedMotion()
    if (key !== tKey || still !== reduced) {
      tKey = key
      reduced = still
      resolved = resolveTransition(transition, still)
    }
    radiusKey = o.radius == null ? '' : JSON.stringify(o.radius)
  }
  derive()

  fx.add(
    () => [radiusKey, group.element],
    () => {
      const el = wrap
      const g = group.element
      if (!g) return
      const fixed = o.radius
      const measure = () => {
        const base = offsetTo(el, g)
        const w = el.offsetWidth
        const h = el.offsetHeight
        const r: CornerRadii = fixed != null ? normalizeRadius(fixed) : measureRadius(content(), w, h)
        const next: BlobBox = { x: base.x, y: base.y, w, h, r }
        if (!sameBox(box, next)) {
          box = next
          /* the blob below is rebuilt for the new box */
          fx.touch()
        }
      }
      measure()
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      ro.observe(g)
      return () => ro.disconnect()
    },
  )

  // Content and blob are animated by ONE JS clock — no CSS transition on the
  // wrapper. A compositor transition keeps playing through a main-thread
  // stall while the blob (always written from JS) freezes; under Safari's
  // SVG-filter load that read as icons and photos sailing away from their own
  // liquid. With both written in the same rAF tick from the same easing
  // curve, they can only ever move together: a stall holds the whole
  // ensemble, which reads as a hitch, never a tear. The curve is identical to
  // the CSS one (same duration/easing via easingFunction), so browsers that
  // never stall render exactly what they did before.
  let cur: { x: number; y: number; s: number } | null = null
  const writeTransform = (px: number, py: number, ps: number) => {
    const t = transformOf(px, py, ps)
    wrap.style.transform = t
    if (blob) blob.style.transform = t
  }

  // The blob lives in the group's filtered layer, not in the item's own
  // markup, so it is made by hand and appended there. It is rebuilt whenever
  // the measured box changes and caught up to the currently rendered value.
  fx.add(
    () => [group.portal, box],
    () => {
      const portal = group.portal
      const b = box
      if (!portal || !b) return
      const [tl, tr, br, bl] = b.r
      const uniform = tl === tr && tr === br && br === bl
      let el: SVGGraphicsElement
      if (uniform) {
        // Clamp to min(w,h)/2: SVG clamps rx and ry independently, so a large
        // radius on a wide short box (the `border-radius: 999px` pill idiom)
        // would degenerate into an ellipse instead of a pill.
        const rx = Math.max(0, Math.min(tl, Math.min(b.w, b.h) / 2))
        el = document.createElementNS(SVG_NS, 'rect')
        el.setAttribute('x', String(b.x))
        el.setAttribute('y', String(b.y))
        el.setAttribute('width', String(b.w))
        el.setAttribute('height', String(b.h))
        el.setAttribute('rx', String(rx))
      } else {
        el = document.createElementNS(SVG_NS, 'path')
        el.setAttribute('d', roundedRectPath(b.x, b.y, b.w, b.h, b.r))
      }
      el.style.transformBox = 'fill-box'
      el.style.transformOrigin = 'center'
      el.style.willChange = 'transform'
      const c = cur ?? { x: o.x ?? 0, y: o.y ?? 0, s: o.scale ?? 1 }
      el.style.transform = transformOf(c.x, c.y, c.s)
      portal.appendChild(el)
      blob = el
      return () => {
        el.remove()
        if (blob === el) blob = null
      }
    },
  )

  fx.add(
    () => [resolved, o.x ?? 0, o.y ?? 0, o.scale ?? 1, o.delay ?? 0],
    () => {
      const { duration, easing } = resolved
      const tx = o.x ?? 0
      const ty = o.y ?? 0
      const ts = o.scale ?? 1
      const wait = o.delay ?? 0
      const from = cur
      if (!from || duration <= 0 || (from.x === tx && from.y === ty && from.s === ts)) {
        cur = { x: tx, y: ty, s: ts }
        writeTransform(tx, ty, ts)
        return
      }
      // Retarget like a CSS transition: from the currently rendered value, full
      // duration. `delay` holds at the start value first (stagger).
      const f = { ...from }
      const ease = easingFunction(easing)
      const start = performance.now() + wait
      let raf = 0
      const tick = (now: number) => {
        const p = Math.min(1, Math.max(0, (now - start) / duration))
        const e = ease(p)
        const cx = f.x + (tx - f.x) * e
        const cy = f.y + (ty - f.y) * e
        const cs = f.s + (ts - f.s) * e
        cur = { x: cx, y: cy, s: cs }
        writeTransform(cx, cy, cs)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    },
  )

  fx.flush()

  return {
    update(next) {
      o = next
      derive()
      fx.flush()
    },
    flush: () => fx.flush(),
    // `transform` is owned by the clock above. A framework that rewrites the
    // whole style attribute when the user's style changes drops it, so it is
    // put back.
    restyle() {
      if (cur) writeTransform(cur.x, cur.y, cur.s)
    },
    destroy() {
      fx.destroy()
      /* the element may live on: as part of another kind of item, or attached again */
      wrap.style.removeProperty('transform')
    },
  }
}
