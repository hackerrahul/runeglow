<!--
  @component
  Mirrored mode: the library moves the wrapper and its blob together, from
  one clock. Used when an item needs no measurement engine.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { getGooeyContext } from './context'
  import {
    measureRadius,
    normalizeRadius,
    offsetTo,
    roundedRectPath,
    type BlobBox,
    type CornerRadii,
  } from './geometry'
  import { easingFunction, resolveTransition } from './spring'
  import type { GooeyItemProps } from './types'

  const SVG_NS = 'http://www.w3.org/2000/svg'

  let {
    x = 0,
    y = 0,
    scale = 1,
    transition = 'smooth',
    delay = 0,
    radius,
    class: className,
    style,
    children,
  }: GooeyItemProps = $props()

  const ctx = getGooeyContext()

  let wrap = $state<HTMLDivElement | null>(null)
  let blob: SVGGraphicsElement | null = null
  let box = $state.raw<BlobBox | null>(null)

  let reduced = $state(false)
  $effect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced = mq.matches
    const onChange = (e: MediaQueryListEvent) => (reduced = e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  })

  // Compared by content, so an inline `{ duration, ease }` literal does not
  // restart anything each time the parent updates.
  const tKey = $derived(typeof transition === 'string' ? transition : JSON.stringify(transition ?? null))
  const resolved = $derived.by(() => {
    tKey
    return resolveTransition(untrack(() => transition), reduced)
  })
  const radiusKey = $derived(radius == null ? '' : JSON.stringify(radius))

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

  $effect(() => {
    radiusKey
    const el = wrap
    const group = ctx.getGroup()
    if (!el || !group) return
    const fixed = untrack(() => radius)
    const measure = () => {
      const base = offsetTo(el, group)
      const w = el.offsetWidth
      const h = el.offsetHeight
      const target = (el.firstElementChild as HTMLElement | null) ?? el
      const r: CornerRadii = fixed != null ? normalizeRadius(fixed) : measureRadius(target, w, h)
      const next: BlobBox = { x: base.x, y: base.y, w, h, r }
      if (!sameBox(untrack(() => box), next)) box = next
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    ro.observe(group)
    return () => ro.disconnect()
  })

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
  const transformOf = (px: number, py: number, ps: number) =>
    `translate(${px}px, ${py}px)` + (ps !== 1 ? ` scale(${ps})` : '')
  const writeTransform = (px: number, py: number, ps: number) => {
    const t = transformOf(px, py, ps)
    if (wrap) wrap.style.transform = t
    if (blob) blob.style.transform = t
  }

  // The blob lives in the group's filtered layer, not in this component's
  // markup, so it is made by hand and appended there. It is rebuilt whenever
  // the measured box changes and caught up to the currently rendered value.
  $effect(() => {
    const portal = ctx.portal
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
    const c = cur ?? untrack(() => ({ x, y, s: scale }))
    el.style.transform = transformOf(c.x, c.y, c.s)
    portal.appendChild(el)
    blob = el
    return () => {
      el.remove()
      if (blob === el) blob = null
    }
  })

  $effect(() => {
    const { duration, easing } = resolved
    const tx = x
    const ty = y
    const ts = scale
    const wait = delay
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
  })

  // `transform` is owned by the clock above. Svelte rewrites the whole style
  // attribute when `style` changes, which would drop it, so it is put back.
  $effect(() => {
    style
    if (cur) writeTransform(cur.x, cur.y, cur.s)
  })
</script>

<div
  bind:this={wrap}
  class={className}
  style="display: inline-block;{style ? ` ${style};` : ''} will-change: transform;"
>
  {@render children?.()}
</div>
