/* The melt SVG for one pair, drawn into the group. A pure function of the
   two geometries, sources and tuning; ids are namespaced per instance.

   It is made by hand rather than by a framework: nothing of it exists
   until two melt items are on the page, so no server ever renders it, and
   every adapter gets the same picture from the one place. The structure is
   built once and only the attributes that change are written afterwards —
   rebuilding the patterns and filters each frame of a drag would have the
   browser decode and rasterise the pictures again every time. */

import type { CardGeom, ImageMeltOptions } from './imageMelt'

export interface MeltPairState {
  a: CardGeom
  b: CardGeom
  srcA: string
  srcB: string
  opts: Required<ImageMeltOptions>
  width: number
  height: number
}

export interface MeltPair {
  /** The melt's svg. */
  element: SVGSVGElement
  update(state: MeltPairState): void
  destroy(): void
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/* Exponential chase toward the target — the eased proximity that keeps the
   melt growing in over ~200ms instead of popping at the goo threshold. */
const RATE = 14

function proximity({ a, b, opts }: MeltPairState): number {
  const gap = Math.max(
    0,
    Math.hypot(
      Math.max(Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) - (a.w + b.w) / 2, 0),
      Math.max(Math.abs(a.y + a.h / 2 - (b.y + b.h / 2)) - (a.h + b.h) / 2, 0),
    ),
  )
  const near = Math.max(0, Math.min(1, 1 - gap / Math.max(8, opts.blur * 2.6)))
  return near * near * (3 - 2 * near)
}

/* every number and string the svg is made of, for one state and one eased proximity */
function derive({ a, b, opts }: MeltPairState, prox: number) {
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
  const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const intercept = Math.round((0.5 - opts.contrast * (5 / 12)) * 100) / 100
  const rA = (Math.hypot(a.w, a.h) / 2) * opts.reach * prox
  const rB = (Math.hypot(b.w, b.h) / 2) * opts.reach * prox
  const seam = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 }
  const dxc = cb.x - ca.x
  const dyc = cb.y - ca.y
  const dc = Math.max(1e-3, Math.hypot(dxc, dyc))
  const tx = -dyc / dc
  const ty = dxc / dc
  const ovx = Math.max(0, (a.w + b.w) / 2 - Math.abs(dxc))
  const ovy = Math.max(0, (a.h + b.h) / 2 - Math.abs(dyc))
  const tanHalf = 0.5 * (ovx * Math.abs(tx) + ovy * Math.abs(ty)) * prox
  const seamDeg = Math.round((Math.atan2(ty, tx) * 180) / Math.PI)
  const blurEff = Math.round((2 + (opts.blur - 2) * prox) * 10) / 10
  return {
    rA,
    rB,
    seam,
    tanHalf,
    mixAmt: Math.round(opts.mix * prox * 100) / 100,
    blurEff,
    warpEff: Math.round(opts.warp * prox * 10) / 10,
    colorBlur: Math.round(blurEff * 2.5 * 10) / 10,
    edgeSoft: Math.round((0.4 + (2 + opts.blur * 0.8) * prox) * 10) / 10,
    gooMatrix: `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${opts.contrast} ${intercept}`,
    waveFreq: (2 + opts.waviness * 1.2) / 1000,
    seamRotate: `rotate(${seamDeg}, ${seam.x}, ${seam.y})`,
    gA: `translate(${a.x}, ${a.y})`,
    gB: `translate(${b.x}, ${b.y})`,
  }
}

let pairs = 0

type Value = string | number
type Attrs = Record<string, Value | (() => Value)>

/** Draw a melting pair as the last thing inside `parent`, and keep it in step with `update`. */
export function drawMeltPair(parent: Element, initial: MeltPairState): MeltPair {
  const uid = `lgm-${++pairs}`
  let s = initial
  let v = derive(s, proximity(s))

  /* an attribute given as a function is one that changes: it is written again whenever its value has */
  const live: { el: Element; name: string; read: () => Value; last: string | null }[] = []
  const n = <T extends SVGElement = SVGElement>(tag: string, attrs: Attrs = {}, children: Node[] = []): T => {
    const el = document.createElementNS(SVG_NS, tag) as T
    for (const name in attrs) {
      const value = attrs[name]
      if (typeof value === 'function') live.push({ el, name, read: value, last: null })
      else el.setAttribute(name, String(value))
    }
    for (const child of children) el.appendChild(child)
    return el
  }
  const sync = () => {
    for (const l of live) {
      const value = String(l.read())
      if (value !== l.last) {
        l.el.setAttribute(l.name, value)
        l.last = value
      }
    }
  }

  const url = (name: string) => `url(#${uid}-${name})`
  /* one card, in place; `fill` paints it: its picture, or white where it is a mask */
  const cardA = (fill: string) =>
    n('g', { transform: () => v.gA }, [n('rect', { width: () => s.a.w, height: () => s.a.h, rx: () => s.a.r, fill })])
  const cardB = (fill: string) =>
    n('g', { transform: () => v.gB }, [n('rect', { width: () => s.b.w, height: () => s.b.h, rx: () => s.b.r, fill })])
  const fe = (tag: string, attrs: Attrs) => n(tag, attrs)

  // Marbling: nested large-scale displacements fold the molten colours
  // into streaks, clipped to the goo silhouette.
  const marbleFilter = n('filter', { id: `${uid}-marble`, x: '-25%', y: '-25%', width: '150%', height: '150%', 'color-interpolation-filters': 'sRGB' }, [
    fe('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: () => s.opts.mixBlur, result: 'c' }),
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.011', numOctaves: '2', seed: '5', result: 'n1' }),
    fe('feDisplacementMap', { in: 'c', in2: 'n1', scale: () => v.mixAmt * 90, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd1' }),
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.019', numOctaves: '2', seed: '11', result: 'n2' }),
    fe('feDisplacementMap', { in: 'd1', in2: 'n2', scale: () => v.mixAmt * 50, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd2' }),
    fe('feComposite', { in: 'd2', in2: 'd2', operator: 'over', result: 'm1' }),
    fe('feComposite', { in: 'm1', in2: 'm1', operator: 'over', result: 'm2' }),
    fe('feGaussianBlur', { in: 'm2', stdDeviation: '0.6', result: 'marble' }),
    fe('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: () => v.blurEff, result: 'mb' }),
    fe('feColorMatrix', { in: 'mb', type: 'matrix', values: () => v.gooMatrix, result: 'mg' }),
    fe('feTurbulence', { type: 'fractalNoise', baseFrequency: () => v.waveFreq, numOctaves: '2', seed: '4', result: 'mwn' }),
    fe('feDisplacementMap', { in: 'mg', in2: 'mwn', scale: () => v.warpEff, xChannelSelector: 'R', yChannelSelector: 'G', result: 'mshape' }),
    fe('feComposite', { in: 'marble', in2: 'mshape', operator: 'in' }),
  ])
  const marbleMask = n('mask', { id: `${uid}-marblemask`, maskUnits: 'userSpaceOnUse', x: '0', y: '0', width: () => s.width, height: () => s.height }, [
    n('g', { filter: url('soft') }, [
      n('ellipse', {
        cx: () => v.seam.x,
        cy: () => v.seam.y,
        rx: () => (v.rA + v.rB) / 2 + v.tanHalf,
        ry: () => ((v.rA + v.rB) / 2) * s.opts.gravity,
        transform: () => v.seamRotate,
        fill: '#fff',
      }),
    ]),
  ])
  const edgeFilter = n('filter', { id: `${uid}-edge`, x: '-40%', y: '-40%', width: '180%', height: '180%' }, [
    fe('feGaussianBlur', { stdDeviation: () => v.edgeSoft }),
  ])

  const defs = n('defs', {}, [
    // No x/y: the rects referencing these patterns already sit inside a
    // translated <g>, and userSpaceOnUse resolves in that transformed
    // space — an origin here shifted the tile a second time, so the
    // image repeated instead of filling the card once.
    n('pattern', { id: `${uid}-pa`, patternUnits: 'userSpaceOnUse', width: () => s.a.w, height: () => s.a.h }, [
      n('image', { href: () => s.srcA, width: () => s.a.w, height: () => s.a.h, preserveAspectRatio: 'xMidYMid slice' }),
    ]),
    n('pattern', { id: `${uid}-pb`, patternUnits: 'userSpaceOnUse', width: () => s.b.w, height: () => s.b.h }, [
      n('image', { href: () => s.srcB, width: () => s.b.w, height: () => s.b.h, preserveAspectRatio: 'xMidYMid slice' }),
    ]),
    // Goo on colour: blur mixes both images, contrast re-solidifies only
    // alpha; colours come from a wider blur clipped into that shape, so
    // internal edges average away while the boundary stays liquid.
    n('filter', { id: `${uid}-goo`, x: '-15%', y: '-15%', width: '130%', height: '130%', 'color-interpolation-filters': 'sRGB' }, [
      fe('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: () => v.blurEff, result: 'b' }),
      fe('feColorMatrix', { in: 'b', type: 'matrix', values: () => v.gooMatrix, result: 'goo' }),
      fe('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: () => v.colorBlur, result: 'bc' }),
      fe('feComposite', { in: 'bc', in2: 'goo', operator: 'in', result: 'mix' }),
      fe('feTurbulence', { type: 'fractalNoise', baseFrequency: () => v.waveFreq, numOctaves: '2', seed: '4', result: 'wn' }),
      fe('feDisplacementMap', { in: 'mix', in2: 'wn', scale: () => v.warpEff, xChannelSelector: 'R', yChannelSelector: 'G', result: 'warped' }),
      // Solidify by self-compositing (premultiplied-safe), then restore
      // the anti-aliased edge with a sub-pixel blur.
      fe('feComposite', { in: 'warped', in2: 'warped', operator: 'over', result: 's1' }),
      fe('feComposite', { in: 's1', in2: 's1', operator: 'over', result: 's2' }),
      fe('feComposite', { in: 's2', in2: 's2', operator: 'over', result: 'solid' }),
      fe('feGaussianBlur', { in: 'solid', stdDeviation: '0.6' }),
    ]),
    n('filter', { id: `${uid}-soft`, x: '-60%', y: '-60%', width: '220%', height: '220%' }, [
      fe('feGaussianBlur', { stdDeviation: () => s.opts.fade }),
    ]),
    edgeFilter,
    // Crisp faces: each is its plain card minus a blurred seam-spanning
    // erase ellipse — apart, a card is exactly a card.
    n('mask', { id: `${uid}-ma`, maskUnits: 'userSpaceOnUse', x: '0', y: '0', width: () => s.width, height: () => s.height }, [
      n('g', { filter: url('edge') }, [cardA('#fff')]),
      n('g', { filter: url('soft') }, [
        n('ellipse', { cx: () => v.seam.x, cy: () => v.seam.y, rx: () => v.rB + v.tanHalf, ry: () => v.rB, transform: () => v.seamRotate, fill: '#000' }),
      ]),
    ]),
    n('mask', { id: `${uid}-mb`, maskUnits: 'userSpaceOnUse', x: '0', y: '0', width: () => s.width, height: () => s.height }, [
      n('g', { filter: url('edge') }, [cardB('#fff')]),
      n('g', { filter: url('soft') }, [
        n('ellipse', { cx: () => v.seam.x, cy: () => v.seam.y, rx: () => v.rA + v.tanHalf, ry: () => v.rA, transform: () => v.seamRotate, fill: '#000' }),
      ]),
    ]),
  ])

  // MARBLE layer
  const marbleLayer = n('g', { mask: url('marblemask') }, [n('g', { filter: url('marble') }, [cardA(url('pa')), cardB(url('pb'))])])
  // CRISP layer
  const crispA = n('g', { mask: url('ma') }, [cardA(url('pa'))])
  const crispB = n('g', { mask: url('mb') }, [cardB(url('pb'))])

  const element = n<SVGSVGElement>(
    'svg',
    {
      'aria-hidden': 'true',
      focusable: 'false',
      'data-gooey-imagemelt': '',
      width: () => s.width,
      height: () => s.height,
      viewBox: () => `0 0 ${s.width} ${s.height}`,
      style: 'position: absolute; inset: 0; overflow: visible; pointer-events: none;',
    },
    [
      defs,
      // MOLTEN layer
      n('g', { filter: url('goo') }, [cardA(url('pa')), cardB(url('pb'))]),
      crispA,
      crispB,
    ],
  )

  /* the marble pass is only in the svg while there is something to marble */
  let marbled = false
  const render = () => {
    sync()
    const wanted = v.mixAmt > 0.01
    if (wanted === marbled) return
    marbled = wanted
    if (wanted) {
      defs.insertBefore(marbleFilter, edgeFilter)
      defs.insertBefore(marbleMask, edgeFilter)
      element.insertBefore(marbleLayer, crispA)
    } else {
      marbleFilter.remove()
      marbleMask.remove()
      marbleLayer.remove()
    }
  }

  const chase = { value: proximity(s), target: proximity(s), raf: 0, last: 0 }
  const follow = () => {
    if (chase.raf) return
    chase.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - chase.last) / 1000)
      chase.last = now
      const k = 1 - Math.exp(-RATE * dt)
      chase.value += (chase.target - chase.value) * k
      if (Math.abs(chase.value - chase.target) < 0.004) chase.value = chase.target
      v = derive(s, chase.value)
      render()
      chase.raf = chase.value === chase.target ? 0 : requestAnimationFrame(tick)
    }
    chase.raf = requestAnimationFrame(tick)
  }

  render()
  parent.appendChild(element)
  follow()

  return {
    element,
    update(next) {
      s = next
      v = derive(s, chase.value)
      render()
      const target = proximity(s)
      if (target === chase.target) return
      chase.target = target
      follow()
    },
    destroy() {
      if (chase.raf) cancelAnimationFrame(chase.raf)
      chase.raf = 0
      element.remove()
    },
  }
}
