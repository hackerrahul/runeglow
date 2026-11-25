/** Image melt (the v2 "melt lab" effect, engine-free): two image-filled
 *  cards whose surfaces run molten where they touch — colours averaged
 *  through the goo, the crisp faces dissolving at the seam, and a marbling
 *  pass folding the two palettes into streaks in the touch area.
 *
 *  Architecture: the participating items' DOM stays interactive but paints
 *  nothing (opacity 0); an SVG layer in the group re-renders their imagery
 *  as pattern-filled rounded rects through the melt's filter stack,
 *  following the live rects each frame. Pairwise by design — the first two
 *  melt items in a group form the pair; the seam maths is two-body. */

export interface ImageMeltOptions {
  /** Goo sigma: how far the bodies reach for each other AND how wide the
   *  colour averaging runs. Default 7. */
  blur?: number
  /** Alpha-contrast slope of the liquid boundary. Default 40. */
  contrast?: number
  /** How far each crisp face dissolves back before the neighbour, as a
   *  factor of the half-diagonal. Default 0.8. */
  reach?: number
  /** Softness of that dissolve (mask blur sigma). Default 17. */
  fade?: number
  /** Turbulence displacement of the molten layer, px. Default 0. */
  warp?: number
  /** 0..1 two-liquid marbling strength in the touch area. Default 1. */
  mix?: number
  /** Blur of the marble pass's source colours. Default 8. */
  mixBlur?: number
  /** How deep the marble zone reaches into each card. Default 1.9. */
  gravity?: number
  /** Wavelength control of the warp noise. Default 12. */
  waviness?: number
}

export const IMAGE_MELT_DEFAULTS: Required<ImageMeltOptions> = {
  blur: 7,
  contrast: 40,
  reach: 0.8,
  fade: 17,
  warp: 0,
  mix: 1,
  mixBlur: 8,
  gravity: 1.9,
  waviness: 12,
}

export interface ImageMeltEntry {
  el: HTMLElement
  src: string
  opts: Required<ImageMeltOptions>
}

/** Registry lives on the Liquid group via context. */
export interface ImageMeltRegistry {
  register(entry: ImageMeltEntry): () => void
  subscribe(fn: () => void): () => void
  entries(): ImageMeltEntry[]
}

export function createImageMeltRegistry(): ImageMeltRegistry {
  const set = new Set<ImageMeltEntry>()
  const subs = new Set<() => void>()
  const notify = () => subs.forEach(f => f())
  return {
    register(entry) {
      set.add(entry)
      notify()
      return () => {
        set.delete(entry)
        notify()
      }
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    entries: () => [...set],
  }
}

export interface CardGeom {
  x: number
  y: number
  w: number
  h: number
  r: number
}

export function readGeom(group: HTMLElement, el: HTMLElement): CardGeom {
  const gr = group.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  const rad = parseFloat(cs.borderTopLeftRadius) || 0
  return {
    x: r.left - gr.left,
    y: r.top - gr.top,
    w: r.width,
    h: r.height,
    r: Math.min(rad, r.width / 2, r.height / 2),
  }
}

export const geomKey = (g: CardGeom) =>
  `${Math.round(g.x * 2)},${Math.round(g.y * 2)},${Math.round(g.w)},${Math.round(g.h)},${Math.round(g.r)}`
