/* One piece of a liquid group, outside any framework.

   A piece is driven in one of three ways, picked from its options:
   mirrored (the library animates x/y/scale and moves the element and its
   blob together), observed (you animate, the measurement engine makes the
   liquid follow), or melt (the group paints the piece's picture, molten).

   `liquidItemView` says which, and what the wrapper a framework renders
   round the user's content looks like. `attachLiquidItem` brings such a
   wrapper to life; `mountLiquidItem` takes the user's element as it is, with
   no wrapper, for a page with no framework. Both are given the group as an
   object, and neither minds whether the group has its element yet. */

import { applyStyle, type Style } from '../internal/view'
import type { LiquidGroup } from './group'
import { IMAGE_MELT_DEFAULTS } from './imageMelt'
import { mapBend, mapDissolve, mapMorphSprings, mapMove } from './mapping'
import { imageMeltItem, type ImageMeltItemOptions } from './meltItem'
import { mirroredItem, type ItemDriver } from './mirrored'
import { observedItem } from './observed'
import type { GooeyEffect, GooeyItemOptions, LiquidItemOptions } from './types'

/** How a piece is driven: by the library's own clock, by the measurement engine, or as half of a melting pair. */
export type LiquidItemKind = 'mirrored' | 'observed' | 'melt'

/** What the wrapper round a piece's content looks like. */
export interface LiquidItemView {
  kind: LiquidItemKind
  /** What a framework keys the wrapper on: when it changes the piece starts
   *  afresh, wrapper, content and all, as it does when `effect` changes. */
  key: string
  /** The wrapper's tag: a box of its own where the library moves it, nothing but a holder otherwise. */
  tag: 'div' | 'span'
  /** Inline style of the wrapper. The user's own style goes after it. */
  style: Style
  /** Inline style that goes after the user's own. */
  lastStyle: Style
  /** Whether the wrapper takes the user's class and style at all: a melting piece's does not. */
  styled: boolean
}

type Effect = 'morph' | 'move' | 'bend' | 'melt'
const effectOf = (o: LiquidItemOptions): Effect =>
  o.effect === 'melt' || o.effect === 'bend' || o.effect === 'move' ? o.effect : 'morph'
const wantsDissolve = (o: LiquidItemOptions) => o.dissolve !== undefined && o.dissolve !== false

/* The engine-level item picks mirrored mode or observe mode: anything
   beyond plain merge runs on the measurement engine. */
function needsEngine(o: GooeyItemOptions): boolean {
  const e = o.effect
  const list: GooeyEffect[] = Array.isArray(e) ? e : e ? [e] : []
  return !!o.observe || list.some(v => v !== 'morph')
}

type Plan =
  | ({ kind: 'melt'; key: string } & ImageMeltItemOptions)
  | { kind: 'mirrored' | 'observed'; key: string; gooey: GooeyItemOptions }

/* How the public, normalized options of a piece map onto one of the three drivers. */
function planOf(o: LiquidItemOptions): Plan {
  const effect = effectOf(o)
  /* The melt item is architecturally different: nothing registers with the
     engine — the group's image-melt layer paints the pair. */
  if (effect === 'melt') {
    const { src, ...tuning } = o.melt ?? {}
    return { kind: 'melt', key: 'melt', src, opts: { ...IMAGE_MELT_DEFAULTS, ...tuning } }
  }
  const rest = { x: o.x, y: o.y, scale: o.scale, transition: o.transition, delay: o.delay, radius: o.radius }
  if (effect === 'bend') {
    return { kind: 'observed', key: 'bend', gooey: { ...rest, observe: true, effect: 'move', move: mapBend(o.bend) } }
  }
  if (effect === 'move') {
    return { kind: 'observed', key: 'move', gooey: { ...rest, observe: true, effect: 'move', move: mapMove(o.move) } }
  }
  const shape = !!o.morph?.shape
  const dissolve = o.dissolve
  const contactBlur = wantsDissolve(o)
    ? typeof dissolve === 'object'
      ? { ...mapDissolve(true), ...dissolve }
      : mapDissolve(dissolve as boolean | number)
    : undefined
  const gooey: GooeyItemOptions = {
    ...rest,
    observe: o.observe || shape || !!contactBlur || undefined,
    effect: shape ? 'evolve' : undefined,
    evolve: shape ? { ...mapMorphSprings(o.morph), ...o.morph?.advanced?.evolve } : undefined,
    contactBlur,
    blobInset: o.morph?.advanced?.blobInset,
    bridgeGrow: o.morph?.advanced?.bridgeGrow,
  }
  return needsEngine(gooey) ? { kind: 'observed', key: 'morph-observed', gooey } : { kind: 'mirrored', key: 'morph', gooey }
}

/** The wrapper of a piece for these options. */
export function liquidItemView(options: LiquidItemOptions): LiquidItemView {
  const effect = effectOf(options)
  if (effect === 'melt') {
    return { kind: 'melt', key: 'melt', tag: 'span', style: { display: 'contents' }, lastStyle: {}, styled: false }
  }
  const observed = effect !== 'morph' || !!options.observe || !!options.morph?.shape || wantsDissolve(options)
  if (observed) {
    return {
      kind: 'observed',
      key: effect === 'morph' ? 'morph-observed' : effect,
      tag: 'span',
      style: { display: 'contents' },
      lastStyle: {},
      styled: true,
    }
  }
  return {
    kind: 'mirrored',
    key: 'morph',
    tag: 'div',
    style: { display: 'inline-block' },
    lastStyle: { 'will-change': 'transform' },
    styled: true,
  }
}

/* nested records are compared one level in: most callers write them inline, afresh each time */
function sameOptions(a: LiquidItemOptions, b: LiquidItemOptions): boolean {
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof LiquidItemOptions>) {
    const x = a[k], y = b[k]
    if (Object.is(x, y)) continue
    if (typeof x !== 'object' || typeof y !== 'object' || !x || !y) return false
    const xs = x as Record<string, unknown>, ys = y as Record<string, unknown>
    for (const j of new Set([...Object.keys(xs), ...Object.keys(ys)])) if (!Object.is(xs[j], ys[j])) return false
  }
  return true
}

/* what both ways of having a piece share: the driver for its kind, swapped when the kind changes */
function drive(
  group: LiquidGroup,
  wrap: HTMLElement,
  content: () => HTMLElement | null,
  options: LiquidItemOptions,
  onkind?: (kind: LiquidItemKind) => void,
) {
  let o = options
  let plan = planOf(o)

  const start = (p: Plan): ItemDriver<never> =>
    p.kind === 'melt'
      ? imageMeltItem(group, content, p)
      : p.kind === 'observed'
        ? observedItem(group, content, p.gooey)
        : mirroredItem(group, wrap, () => content() ?? wrap, p.gooey)

  // `dissolve` is positioned as orthogonal to `effect`, but the melt is drawn
  // from the element's MEASURED rect while move's liquid deliberately lags on
  // a spring — the melt would sit on the element with the surface trailing
  // behind it. Refuse loudly rather than ship the mismatch.
  let refused = false
  const check = () => {
    const refuse = effectOf(o) === 'move' && wantsDissolve(o)
    if (refuse && !refused) {
      console.warn(
        '[runeglow/liquid-gooey] `dissolve` is ignored with effect="move": the melt ' +
          'follows the element while the liquid lags on its spring, so the two ' +
          'would visibly disagree. Use it on a morph item.',
      )
    }
    refused = refuse
  }
  check()

  onkind?.(plan.kind)
  let driver = start(plan)
  /* the group got its element, or lost it: the piece draws itself, or takes its blob out */
  const off = group.subscribe(() => driver.flush())

  return {
    update(next: LiquidItemOptions) {
      if (sameOptions(o, next)) return
      o = next
      check()
      const p = planOf(o)
      if (p.kind === plan.kind) {
        plan = p
        driver.update((p.kind === 'melt' ? p : p.gooey) as never)
        return
      }
      plan = p
      driver.destroy()
      onkind?.(p.kind)
      driver = start(p)
    },
    flush: () => driver.flush(),
    restyle: () => driver.restyle(),
    destroy() {
      off()
      driver.destroy()
    },
  }
}

export interface LiquidItemHandle {
  /** Give the piece new options. Each call replaces the last set whole. */
  update(options: LiquidItemOptions): void
  /** Put the piece's position back on its wrapper, for a framework that has just rewritten the wrapper's style attribute whole. */
  restyle(): void
  /** Take the piece out of the liquid. */
  destroy(): void
}

/**
 * Bring a piece to life on the wrapper a framework rendered for it, as
 * `liquidItemView` says: the piece is the wrapper's first element child.
 * The group may get its element before or after this is called. A change
 * of options that changes the view's `key` wants a new wrapper, so attach
 * again on that one; the kind is still switched in place if you do not.
 */
export function attachLiquidItem(group: LiquidGroup, wrapper: HTMLElement, options: LiquidItemOptions = {}): LiquidItemHandle {
  const item = drive(group, wrapper, () => wrapper.firstElementChild as HTMLElement | null, options)
  /* the content may come after the wrapper does (a parser still at work), or be swapped for another */
  const children = new MutationObserver(() => item.flush())
  children.observe(wrapper, { childList: true })
  return {
    update: item.update,
    restyle: item.restyle,
    destroy() {
      children.disconnect()
      item.destroy()
    },
  }
}

export interface MountedLiquidItem {
  /** The piece: the element that was passed in. */
  element: HTMLElement
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: LiquidItemOptions): void
  /** Take the piece out of the liquid and leave its element as it was found. */
  destroy(): void
}

/**
 * Make an element a piece of a liquid group, with no framework and no
 * wrapper: the element itself is measured, followed and — when the piece
 * is given `x`, `y` or `scale` — moved, through its inline `transform`.
 * `group.item(element, options)` is the same call.
 */
export function mountLiquidItem(group: LiquidGroup, element: HTMLElement, options: LiquidItemOptions = {}): MountedLiquidItem {
  let o = { ...options }
  let style: Style = {}
  const item = drive(group, element, () => element, o, kind => {
    const next = kind === 'mirrored' ? liquidItemView({}).lastStyle : {}
    applyStyle(element, next, style)
    style = next
  })
  return {
    element,
    update(next) {
      o = { ...o, ...next }
      item.update(o)
    },
    destroy() {
      item.destroy()
      applyStyle(element, {}, style)
    },
  }
}
