/* Observe mode: you move or resize the element however you like and the
   measurement engine makes the liquid follow its rendered rect. */

import { Effects } from '../internal/effects'
import { normalizeRadius } from './geometry'
import type { LiquidGroup } from './group'
import type { ItemDriver } from './mirrored'
import { EVOLVE_DEFAULTS, MOVE_DEFAULTS, type ItemDynamics } from './observer'
import type { DissolveOptions, GooeyEffect, GooeyItemOptions } from './types'

const SVG_NS = 'http://www.w3.org/2000/svg'

const blendOf = (contactBlur: boolean | DissolveOptions | undefined) => {
  const opts = typeof contactBlur === 'object' ? contactBlur : {}
  return {
    blur: opts.blur ?? 8,
    warp: opts.warp ?? 26,
    pull: opts.pull ?? 4,
    range: opts.range,
    zone: opts.zone,
    mix: opts.mix ?? 0,
    gravity: opts.gravity ?? 60,
    taper: opts.taper ?? 1,
    warpFreq: opts.warpFreq ?? 1.7,
    flowSpeed: opts.flowSpeed ?? 22,
    warpStyle: opts.warpStyle ?? ('fractalNoise' as const),
    detail: opts.detail ?? 2,
    active: opts.active !== false,
    releaseMs: opts.releaseMs ?? 240,
    fadeMs: opts.fadeMs,
    strength: opts.strength ?? 1,
    // Left undefined when unset so the engine owns the default in one place.
    sink: opts.sink,
    surface: opts.surface,
    seamBlur: opts.seamBlur,
  }
}

/**
 * Drive a piece in observe mode. `content` gives the element the liquid
 * follows: the wrapper's child, or the element itself where there is no
 * wrapper. It may not be there yet; the piece registers once it is.
 */
export function observedItem(
  group: LiquidGroup,
  content: () => HTMLElement | null,
  options: GooeyItemOptions,
): ItemDriver<GooeyItemOptions> {
  let o = options
  const fx = new Effects()

  let blobEl: SVGRectElement | null = null
  let meltEl: SVGGElement | null = null
  let live: {
    active?: boolean
    releaseMs?: number
    fadeMs?: number
    strength?: number
    sink?: number
    seamBlur?: number
  } | null = null

  let blend!: ReturnType<typeof blendOf>
  let dynamics!: ItemDynamics
  let hasDynamics = false
  let wantsMelt = false
  let radiusKey = ''
  let blendKey = ''
  let effectKey = ''
  const derive = () => {
    blend = blendOf(o.contactBlur)
    const effects: GooeyEffect[] = Array.isArray(o.effect) ? o.effect : o.effect ? [o.effect] : []
    dynamics = {
      evolve: effects.includes('evolve'),
      move: effects.includes('move'),
      evolveOpts: { ...EVOLVE_DEFAULTS, ...o.evolve },
      moveOpts: { ...MOVE_DEFAULTS, ...o.move },
    }
    hasDynamics = dynamics.evolve || dynamics.move
    wantsMelt = o.contactBlur !== undefined && o.contactBlur !== false

    radiusKey = o.radius == null ? '' : JSON.stringify(o.radius)
    // `active` is intentionally NOT in the key: it changes every drag and must
    // not tear down the melt structure — the engine reads it live.
    blendKey = o.contactBlur
      ? `${blend.blur}/${blend.warp}/${blend.pull}/${blend.range ?? 'auto'}/${blend.zone ?? 'auto'}/${blend.mix}/${blend.gravity}/${blend.taper}/${blend.warpFreq}/${blend.flowSpeed}/${blend.warpStyle}/${blend.detail}/${blend.surface ?? 'liquid'}/${(blend.seamBlur ?? 1) > 0 ? 'seam' : 'noseam'}`
      : ''
    effectKey =
      effects.join(',') +
      (dynamics.evolve ? JSON.stringify(dynamics.evolveOpts) : '') +
      (dynamics.move ? JSON.stringify(dynamics.moveOpts) : '')
  }
  derive()

  // The blob and the melt host live in the group's SVG layers, not in the
  // item's own markup, so they are made by hand and appended there.
  fx.add(
    () => [group.portal],
    () => {
      const portal = group.portal
      if (!portal) return
      const rect = document.createElementNS(SVG_NS, 'rect')
      rect.setAttribute('x', '0')
      rect.setAttribute('y', '0')
      rect.setAttribute('width', '0')
      rect.setAttribute('height', '0')
      rect.style.willChange = 'transform'
      // Dynamics scale (stretch / squash) about the blob's own centre.
      rect.style.transformBox = 'fill-box'
      rect.style.transformOrigin = 'center'
      portal.appendChild(rect)
      blobEl = rect
      return () => {
        rect.remove()
        blobEl = null
      }
    },
  )

  fx.add(
    () => [wantsMelt, group.meltPortal],
    () => {
      const portal = group.meltPortal
      if (!wantsMelt || !portal) return
      const g = document.createElementNS(SVG_NS, 'g')
      g.setAttribute('opacity', '0')
      portal.appendChild(g)
      meltEl = g
      return () => {
        g.remove()
        meltEl = null
      }
    },
  )

  // The engine attaches its change listeners to the group the first time
  // an item is added, and only if the group element exists by then. A piece
  // can be attached before its group is, so this waits for the group's
  // element: reading it here runs the effect again once it is there.
  fx.add(
    () => [radiusKey, blendKey, effectKey, o.blobInset, o.bridgeGrow, blobEl, meltEl, content(), group.element],
    () => {
      const blob = blobEl
      const melt = meltEl
      const target = content()
      if (!target || !blob || !group.element) return
      const config = o.contactBlur && melt ? { host: melt, ...blend } : undefined
      live = config ?? null
      return group.engine.add({
        target,
        blob,
        radius: o.radius == null ? undefined : normalizeRadius(o.radius)[0],
        blobInset: o.blobInset,
        bridgeGrow: o.bridgeGrow,
        blend: config,
        dynamics: hasDynamics ? dynamics : undefined,
      })
    },
  )

  // `active` / `releaseMs` / `fadeMs` / `strength` / `sink` are pushed
  // straight into the live config so a drag release (or a strength slider)
  // updates the melt without rebuilding its SVG structure.
  fx.add(
    () => [blend.active, blend.releaseMs, blend.fadeMs, blend.strength, blend.sink, blend.seamBlur],
    () => {
      if (!live) return
      live.active = blend.active
      live.releaseMs = blend.releaseMs
      live.fadeMs = blend.fadeMs
      live.strength = blend.strength
      live.sink = blend.sink
      live.seamBlur = blend.seamBlur
      group.engine.wake()
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
    /* nothing of this driver's is written on the element's own style */
    restyle() {},
    destroy: () => fx.destroy(),
  }
}
