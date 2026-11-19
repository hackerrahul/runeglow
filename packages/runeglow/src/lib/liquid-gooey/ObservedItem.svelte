<!--
  @component
  Observe mode: you move or resize the child however you like and the
  measurement engine makes the liquid follow its rendered rect.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { getGooeyContext } from './context'
  import { normalizeRadius } from './geometry'
  import { EVOLVE_DEFAULTS, MOVE_DEFAULTS } from './observer'
  import type { GooeyEffect, GooeyItemProps } from './types'

  const SVG_NS = 'http://www.w3.org/2000/svg'

  // The prop is called `effect`, as in the React library; it is renamed on
  // the way in because a local of that name would shadow the `$effect` rune.
  let {
    radius,
    blobInset,
    bridgeGrow,
    contactBlur,
    effect: effectProp,
    evolve,
    move,
    class: className,
    style,
    children,
  }: GooeyItemProps = $props()

  const ctx = getGooeyContext()

  let host = $state<HTMLSpanElement | null>(null)
  let blobEl = $state.raw<SVGRectElement | null>(null)
  let meltEl = $state.raw<SVGGElement | null>(null)
  let live: {
    active?: boolean
    releaseMs?: number
    fadeMs?: number
    strength?: number
    sink?: number
    seamBlur?: number
  } | null = null

  const blend = $derived.by(() => {
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
  })

  const effects = $derived<GooeyEffect[]>(
    Array.isArray(effectProp) ? effectProp : effectProp ? [effectProp] : [],
  )
  const dynamics = $derived({
    evolve: effects.includes('evolve'),
    move: effects.includes('move'),
    evolveOpts: { ...EVOLVE_DEFAULTS, ...evolve },
    moveOpts: { ...MOVE_DEFAULTS, ...move },
  })
  const hasDynamics = $derived(dynamics.evolve || dynamics.move)
  const wantsMelt = $derived(contactBlur !== undefined && contactBlur !== false)

  const radiusKey = $derived(radius == null ? '' : JSON.stringify(radius))
  // `active` is intentionally NOT in the key: it changes every drag and must
  // not tear down the melt structure — the engine reads it live.
  const blendKey = $derived(
    contactBlur
      ? `${blend.blur}/${blend.warp}/${blend.pull}/${blend.range ?? 'auto'}/${blend.zone ?? 'auto'}/${blend.mix}/${blend.gravity}/${blend.taper}/${blend.warpFreq}/${blend.flowSpeed}/${blend.warpStyle}/${blend.detail}/${blend.surface ?? 'liquid'}/${(blend.seamBlur ?? 1) > 0 ? 'seam' : 'noseam'}`
      : '',
  )
  const effectKey = $derived(
    effects.join(',') +
      (dynamics.evolve ? JSON.stringify(dynamics.evolveOpts) : '') +
      (dynamics.move ? JSON.stringify(dynamics.moveOpts) : ''),
  )

  // The blob and the melt host live in the group's SVG layers, not in this
  // component's markup, so they are made by hand and appended there.
  $effect(() => {
    const portal = ctx.portal
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
  })

  $effect(() => {
    const portal = ctx.meltPortal
    if (!wantsMelt || !portal) return
    const g = document.createElementNS(SVG_NS, 'g')
    g.setAttribute('opacity', '0')
    portal.appendChild(g)
    meltEl = g
    return () => {
      g.remove()
      meltEl = null
    }
  })

  $effect(() => {
    radiusKey
    blendKey
    effectKey
    const inset = blobInset
    const grow = bridgeGrow
    const blob = blobEl
    const melt = meltEl
    const target = (host?.firstElementChild as HTMLElement | null) ?? null
    // The engine attaches its change listeners to the group the first time
    // an item is added, and only if the group element exists by then. This
    // effect can run before the group's element is bound, so it waits for
    // it: reading it here makes the effect run again once it is there.
    const group = ctx.getGroup()
    if (!target || !blob || !group) return
    return untrack(() => {
      const config = contactBlur && melt ? { host: melt, ...blend } : undefined
      live = config ?? null
      return ctx.engine.add({
        target,
        blob,
        radius: radius == null ? undefined : normalizeRadius(radius)[0],
        blobInset: inset,
        bridgeGrow: grow,
        blend: config,
        dynamics: hasDynamics ? dynamics : undefined,
      })
    })
  })

  // `active` / `releaseMs` / `fadeMs` / `strength` / `sink` are pushed
  // straight into the live config so a drag release (or a strength slider)
  // updates the melt without rebuilding its SVG structure.
  $effect(() => {
    const { active, releaseMs, fadeMs, strength, sink, seamBlur } = blend
    if (!live) return
    live.active = active
    live.releaseMs = releaseMs
    live.fadeMs = fadeMs
    live.strength = strength
    live.sink = sink
    live.seamBlur = seamBlur
    ctx.engine.wake()
  })
</script>

<span bind:this={host} class={className} style="display: contents;{style ? ` ${style}` : ''}">
  {@render children?.()}
</span>
