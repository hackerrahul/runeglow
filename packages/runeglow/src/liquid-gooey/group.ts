/* The liquid group outside any framework.

   A group is an element with two SVG layers in it: the silhouette, behind
   the content, where every piece draws its blob through the goo filter, and
   the melt overlay, above it. `liquidView` says what those layers look like
   for a set of options — pure, so a server can render them. `attachLiquid`
   brings a group that an adapter rendered to life; `mountLiquid` adds the
   layers to an element itself, for a page with no framework.

   The pieces do not find their group through the DOM. They are handed a
   `LiquidGroup`: an object that exists before the group's element does, so
   a piece may be attached first and its group afterwards, in either order
   and more than once. That is what a framework's context was for; each
   adapter now passes the object down its own way. */

import { applyStyle, styleText, type Style } from '../internal/view'
import { gooFilterPrimitives } from './filter'
import { createImageMeltRegistry, type ImageMeltRegistry } from './imageMelt'
import { mountLiquidItem, type MountedLiquidItem } from './item'
import { imageMeltLayer } from './meltLayer'
import { ObserveEngine } from './observer'
import { parseShadow } from './shadow'
import type { LiquidItemOptions, LiquidOptions } from './types'

/** What a liquid group's element and its two layers look like. */
export interface LiquidView {
  /** Inline style of the group element. The user's own style goes after it. */
  style: Style
  /** Inline style of the silhouette layer, with the blurred outer shadows in it. */
  surfaceStyle: Style
  /** Inline style of the melt overlay. */
  overlayStyle: Style
  /** The id of the goo filter. */
  filterId: string
  /** The id of the filtered group the pieces draw their blobs in. */
  silhouetteId: string
  /** The id of the mask that keeps the melt inside the liquid. */
  maskId: string
  /** The filter's primitives, as SVG markup: the content of the `<filter>`. */
  primitives: string
  /** The fill of the liquid surface. */
  fill: string
  /** How far the filter and the mask reach beyond the group's box, in px.
   *  Their `x`, `y`, `width` and `height` come from the measured box, so
   *  `attachLiquid` writes those; nothing renders them. */
  pad: number
}

const LAYER = 'position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none;'

/* a style attribute's text as a record, in the order written */
const record = (text: string): Style => {
  const out: Style = {}
  for (const part of text.split(';')) {
    const at = part.indexOf(':')
    if (at > 0) out[part.slice(0, at).trim()] = part.slice(at + 1).trim()
  }
  return out
}

/**
 * The layers of a liquid group for these options. `id` names the filter and
 * what refers to it, so it has to be unique in the page and the same on a
 * server as in the browser: a framework's own id is the one to pass.
 */
export function liquidView(options: LiquidOptions, id: string): LiquidView {
  const { blur = 6, contrast = 18, fill = '#fff', filterPadding = 24, waviness = 0, wavinessFreq = 0.018 } = options
  const shadows = parseShadow(options.shadow)

  // The filter raster is the whole performance story on WebKit, which runs
  // SVG filters on the CPU at full device scale — measured at 9fps for a
  // drag on an iPhone-class 3x screen. The heavy layers are the BLURRED
  // outer shadows: a 42px-blur pass re-rasterises the entire padded region
  // every animated frame. CSS drop-shadow() is mathematically the same
  // operation (blur-radius = 2σ, exactly box-shadow's convention, exactly
  // the stdDeviation = blur/2 the SVG pass used) — but a CSS filter list on
  // the element runs on the COMPOSITOR, GPU-accelerated in both WebKit and
  // Chromium. So the stack is split:
  //   - blurred/offset outer shadows  -> drop-shadow() on the svg element
  //   - spread rings and inset layers -> SVG passes (not expressible in
  //     CSS, but they are morphology/offset ops with no big blurs — cheap)
  //   - the goo chain itself          -> SVG, as before
  // One spec'd difference: chained drop-shadows each see the previous
  // result, so a later shadow also shadows an earlier one's pixels — at the
  // 5-25% alphas shadows use, that cross-term is under 1% alpha, invisible.
  // The filter pad also shrinks to what the REMAINING svg layers reach,
  // which cuts the rasterised area again.
  const svgShadows = shadows.filter(s => s.inset || s.spread !== 0)
  const cssShadowFilter = shadows
    .filter(s => !s.inset && s.spread === 0)
    // box-shadow lists paint the FIRST layer on top; drop-shadow chains
    // paint later filters behind earlier output, so document order already
    // matches.
    .map(s => `drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${s.color})`)
    .join(' ')
  const shadowExtent = svgShadows.reduce(
    (m, s) => Math.max(m, Math.max(Math.abs(s.x), Math.abs(s.y)) + s.blur * 1.5 + Math.max(0, s.spread)),
    0,
  )

  const filterId = `gooey-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
  /* z-index -1 inside the isolated group: the liquid paints above the
     group's own background but below every child, positioned or not.
     The filter is the GPU half of the shadow stack (see above); will-change
     promotes the filtered layer, as WebKit otherwise repaints the goo a
     frame or two behind the plain-DOM content. */
  const surfaceStyle = record(`${LAYER} z-index: -1; will-change: filter, transform;`)
  if (cssShadowFilter) surfaceStyle.filter = cssShadowFilter
  return {
    style: { position: 'relative', isolation: 'isolate' },
    surfaceStyle,
    /* Melt overlay: warped-image copies render here, ABOVE the content
       layer. SVG content so displacement/blur filters work in WebKit. The
       z-index is high enough that an app's own stacking (e.g. a dragged item
       raised over its neighbours) can't slip in front and hide the melt.
       Scoped: the group is an isolated stacking context, so this can't
       escape it. */
    overlayStyle: record(`${LAYER} z-index: 9999;`),
    filterId,
    silhouetteId: `${filterId}-sil`,
    maskId: `${filterId}-meltmask`,
    primitives:
      options.filter ?? gooFilterPrimitives({ blur, contrast, shadows: svgShadows, waviness, wavinessFreq }),
    fill,
    pad: Math.ceil(blur * 3 + shadowExtent + filterPadding),
  }
}

const esc = (v: string): string => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * The two layers as HTML, the way every adapter renders them: the first
 * things inside the group element, before its content. For a server that
 * writes a page with no framework, and what `mountLiquid` itself inserts.
 */
export function liquidMarkup(view: LiquidView): string {
  return (
    `<svg aria-hidden="true" focusable="false" data-gooey-svg="" style="${esc(styleText(view.surfaceStyle))}">` +
    `<defs><filter id="${view.filterId}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">${view.primitives}</filter></defs>` +
    `<g id="${view.silhouetteId}" filter="url(#${view.filterId})" style="${esc(styleText({ fill: view.fill }))}"></g>` +
    `</svg>` +
    `<svg aria-hidden="true" focusable="false" data-gooey-overlay="" style="${esc(styleText(view.overlayStyle))}">` +
    /* The melt may only paint where LIQUID exists: the mask re-renders
       the goo-filtered silhouette (same document, <use> across the two
       svgs), so the warped copies are clipped to the merged surface. */
    `<defs><mask id="${view.maskId}" maskUnits="userSpaceOnUse"><use href="#${view.silhouetteId}"></use></mask></defs>` +
    `<g mask="url(#${view.maskId})"><g></g></g>` +
    `</svg>`
  )
}

/* the group's own layers, wherever its content has put other svgs */
function layersOf(element: Element) {
  let surface: SVGSVGElement | null = null
  let overlay: SVGSVGElement | null = null
  for (const child of element.children) {
    if (!surface && child.matches('svg[data-gooey-svg]')) surface = child as SVGSVGElement
    else if (!overlay && child.matches('svg[data-gooey-overlay]')) overlay = child as SVGSVGElement
  }
  return {
    surface,
    overlay,
    filter: surface?.querySelector('filter') ?? null,
    portal: (surface?.querySelector(':scope > g') ?? null) as SVGGElement | null,
    mask: overlay?.querySelector('mask') ?? null,
    meltPortal: (overlay?.querySelector(':scope > g > g') ?? null) as SVGGElement | null,
  }
}

export interface LiquidHandle {
  /** The group the pieces are attached to. */
  group: LiquidGroup
  /** Give the group new options. Each call replaces the last set whole. */
  update(options: LiquidOptions): void
  /** Let go of the element. Pieces still attached wait for the group to be attached again. */
  destroy(): void
}

const sameOptions = (a: LiquidOptions, b: LiquidOptions): boolean => {
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof LiquidOptions>) {
    if (!Object.is(a[k], b[k])) return false
  }
  return true
}

/**
 * What the pieces of a group share, and how they reach it. Make one before
 * the group's element exists and hand it to every piece; `attachLiquid`
 * gives it the element later, and takes it away again when it is destroyed.
 * A piece attached while the group has no element simply waits.
 */
export class LiquidGroup {
  /** The measurement engine: pieces that follow their element register with it. */
  readonly engine: ObserveEngine = new ObserveEngine(() => this.el)
  /** Pairwise image-melt items (effect="melt") register here. */
  readonly imageMelt: ImageMeltRegistry = createImageMeltRegistry()

  private el: HTMLElement | null = null
  private sil: SVGGElement | null = null
  private melt: SVGGElement | null = null
  private color = '#fff'
  private current: LiquidHandle | null = null
  private listeners = new Set<() => void>()

  /** The group element, while the group is attached to one. */
  get element(): HTMLElement | null {
    return this.el
  }
  /** The filtered group in the silhouette svg; items append their blobs to it. */
  get portal(): SVGGElement | null {
    return this.sil
  }
  /** Target inside the melt-overlay svg (above the content layer). */
  get meltPortal(): SVGGElement | null {
    return this.melt
  }
  /** The group's liquid fill — default colour of the intruding mix liquid. */
  get fill(): string {
    return this.color
  }

  /** Be told when the group gets its element or loses it. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /** One piece of this group, on a page with no framework: see `mountLiquidItem`. */
  item(element: HTMLElement, options: LiquidItemOptions = {}): MountedLiquidItem {
    return mountLiquidItem(this, element, options)
  }

  /** See `attachLiquid`. */
  attach(element: HTMLElement, options: LiquidOptions = {}): LiquidHandle {
    /* one element at a time: a second attach takes over from the first */
    this.current?.destroy()

    const { filter, portal, mask, meltPortal } = layersOf(element)
    if (!filter || !portal || !mask || !meltPortal) {
      throw new Error(
        '[runeglow/liquid-gooey] attachLiquid needs the two layers of the group inside its element, ' +
          'as liquidView describes them. On a page with no framework, mountLiquid makes them.',
      )
    }

    let o = options
    let pad = liquidView(o, '').pad
    let w = -1
    let h = -1
    /* the region the filter rasterises and the mask covers: the group's box and `pad` round it */
    const region = () => {
      for (const el of [filter, mask]) {
        el.setAttribute('x', String(-pad))
        el.setAttribute('y', String(-pad))
        el.setAttribute('width', String(w + pad * 2))
        el.setAttribute('height', String(h + pad * 2))
      }
    }
    const measure = () => {
      if (w === element.offsetWidth && h === element.offsetHeight) return
      w = element.offsetWidth
      h = element.offsetHeight
      region()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(element)

    this.color = o.fill ?? '#fff'
    this.engine.gooBlur = o.blur ?? 6
    this.el = element
    this.sil = portal
    this.melt = meltPortal
    const stopMelt = imageMeltLayer(element, this.imageMelt)
    /* every piece that was attached before its group draws itself now */
    this.tell()

    const handle: LiquidHandle = {
      group: this,
      update: next => {
        if (this.current !== handle || sameOptions(o, next)) return
        o = next
        this.color = o.fill ?? '#fff'
        this.engine.gooBlur = o.blur ?? 6
        const nextPad = liquidView(o, '').pad
        if (nextPad !== pad) {
          pad = nextPad
          region()
        }
      },
      destroy: () => {
        if (this.current !== handle) return
        this.current = null
        ro.disconnect()
        stopMelt()
        this.el = null
        this.sil = null
        this.melt = null
        /* the pieces take their blobs out and leave the engine before it stops */
        this.tell()
        this.engine.dispose()
      },
    }
    this.current = handle
    return handle
  }

  private tell() {
    for (const fn of [...this.listeners]) fn()
  }
}

/* the group of an element that was asked for before the element was attached */
const groups = new WeakMap<Element, LiquidGroup>()

/**
 * The group that belongs to an element, made the first time it is asked
 * for — before the element is a liquid group at all, if need be. A custom
 * element's children find their group this way, whichever is upgraded
 * first, and so can any code that holds the group's element and nothing else.
 */
export function liquidGroupOf(element: Element): LiquidGroup {
  let group = groups.get(element)
  if (!group) {
    group = new LiquidGroup()
    groups.set(element, group)
  }
  return group
}

/**
 * Bring a liquid group to life on an element that already holds the two
 * layers `liquidView` describes: it measures the group, keeps the filter's
 * region round it, runs the measurement engine and draws a melting pair.
 * `group` is the object the pieces were (or will be) attached to; left out,
 * it is the element's own, `liquidGroupOf(element)`.
 */
export function attachLiquid(
  element: HTMLElement,
  options: LiquidOptions = {},
  group: LiquidGroup = liquidGroupOf(element),
): LiquidHandle {
  return group.attach(element, options)
}

/** What `mountLiquid` takes on top of the group's own options. */
export interface LiquidMountOptions extends LiquidOptions {
  /** A name for the filter, unique in the page. Default: one is made. Read once. */
  id?: string
}

export interface MountedLiquid {
  /** The group element: the one that was passed in. */
  element: HTMLElement
  /** The group the pieces are attached to. */
  group: LiquidGroup
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: LiquidMountOptions): void
  /** Make an element inside the group one of its pieces. */
  item(element: HTMLElement, options?: LiquidItemOptions): MountedLiquidItem
  /** Stop the group and take its layers out of the element again. */
  destroy(): void
}

let mounted = 0

/**
 * Make an element a liquid group, with no framework: the two layers are
 * put in front of its content (or taken over, where a server already wrote
 * them with `liquidMarkup`), kept in step with the options, and removed by
 * `destroy`. The element becomes `position: relative` and an isolated
 * stacking context unless its own inline style says otherwise.
 *
 *   const menu = mountLiquid(document.querySelector('#menu'), { fill: '#202020' });
 *   const more = menu.item(document.querySelector('#more'), { transition: 'bouncy' });
 *   more.update({ y: -64 });
 */
export function mountLiquid(element: HTMLElement, options: LiquidMountOptions = {}): MountedLiquid {
  let o = { ...options }
  const id = o.id ?? `rg${++mounted}`
  let view = liquidView(o, id)

  let layers = layersOf(element)
  const made = !layers.filter || !layers.portal || !layers.mask || !layers.meltPortal
  if (made) {
    layers.surface?.remove()
    layers.overlay?.remove()
    element.insertAdjacentHTML('afterbegin', liquidMarkup(view))
    layers = layersOf(element)
  }
  const { surface, overlay, filter, portal } = layers as { [K in keyof typeof layers]: NonNullable<(typeof layers)[K]> }

  /* the element's own inline style wins, as a user's `style` does on the components */
  const own: Style = {}
  for (const key in view.style) {
    if (!element.style.getPropertyValue(key)) own[key] = view.style[key]
  }
  applyStyle(element, own)

  let last: LiquidView | null = made ? view : null
  const render = () => {
    applyStyle(surface as unknown as HTMLElement, view.surfaceStyle, last?.surfaceStyle)
    applyStyle(overlay as unknown as HTMLElement, view.overlayStyle, last?.overlayStyle)
    if (last?.primitives !== view.primitives) filter.innerHTML = view.primitives
    if (last?.fill !== view.fill) portal.style.setProperty('fill', view.fill)
    last = view
  }
  render()

  const group = liquidGroupOf(element)
  const handle = group.attach(element, o)
  return {
    element,
    group,
    update(next) {
      o = { ...o, ...next }
      view = liquidView(o, id)
      render()
      handle.update(o)
    },
    item: (el, itemOptions) => group.item(el, itemOptions),
    destroy() {
      handle.destroy()
      if (made) {
        surface.remove()
        overlay.remove()
      }
      for (const key in own) element.style.removeProperty(key)
    },
  }
}
