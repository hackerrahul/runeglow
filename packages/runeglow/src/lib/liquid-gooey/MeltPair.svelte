<!--
  @component
  The melt SVG for one pair, rendered into the group. A pure function of the
  two geometries, sources and tuning; ids are namespaced per instance.
-->
<script lang="ts">
  import type { CardGeom, ImageMeltOptions } from './imageMelt'

  interface Props {
    a: CardGeom
    b: CardGeom
    srcA: string
    srcB: string
    opts: Required<ImageMeltOptions>
    width: number
    height: number
  }

  let { a, b, srcA, srcB, opts, width, height }: Props = $props()

  const pid = $props.id()
  const uid = `lgm-${pid.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const ca = $derived({ x: a.x + a.w / 2, y: a.y + a.h / 2 })
  const cb = $derived({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
  const gap = $derived(
    Math.max(
      0,
      Math.hypot(
        Math.max(Math.abs(ca.x - cb.x) - (a.w + b.w) / 2, 0),
        Math.max(Math.abs(ca.y - cb.y) - (a.h + b.h) / 2, 0),
      ),
    ),
  )
  const proxTarget = $derived.by(() => {
    const near = Math.max(0, Math.min(1, 1 - gap / Math.max(8, opts.blur * 2.6)))
    return near * near * (3 - 2 * near)
  })

  /* Exponential chase toward the target — the eased proximity that keeps the
     melt growing in over ~200ms instead of popping at the goo threshold. */
  const RATE = 14
  // svelte-ignore state_referenced_locally
  let prox = $state(proxTarget)
  // svelte-ignore state_referenced_locally
  const chase = { value: proxTarget, target: proxTarget, raf: 0, last: 0 }
  $effect(() => {
    chase.target = proxTarget
    if (chase.raf) return
    chase.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - chase.last) / 1000)
      chase.last = now
      const k = 1 - Math.exp(-RATE * dt)
      chase.value += (chase.target - chase.value) * k
      if (Math.abs(chase.value - chase.target) < 0.004) chase.value = chase.target
      prox = chase.value
      chase.raf = chase.value === chase.target ? 0 : requestAnimationFrame(tick)
    }
    chase.raf = requestAnimationFrame(tick)
  })
  $effect(() => () => {
    if (chase.raf) cancelAnimationFrame(chase.raf)
    chase.raf = 0
  })

  const intercept = $derived(Math.round((0.5 - opts.contrast * (5 / 12)) * 100) / 100)
  const rA = $derived((Math.hypot(a.w, a.h) / 2) * opts.reach * prox)
  const rB = $derived((Math.hypot(b.w, b.h) / 2) * opts.reach * prox)
  const seam = $derived({ x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 })
  const tangent = $derived.by(() => {
    const dxc = cb.x - ca.x
    const dyc = cb.y - ca.y
    const dc = Math.max(1e-3, Math.hypot(dxc, dyc))
    const tx = -dyc / dc
    const ty = dxc / dc
    const ovx = Math.max(0, (a.w + b.w) / 2 - Math.abs(dxc))
    const ovy = Math.max(0, (a.h + b.h) / 2 - Math.abs(dyc))
    return {
      half: 0.5 * (ovx * Math.abs(tx) + ovy * Math.abs(ty)) * prox,
      deg: Math.round((Math.atan2(ty, tx) * 180) / Math.PI),
    }
  })
  const tanHalf = $derived(tangent.half)
  const seamDeg = $derived(tangent.deg)
  const mixAmt = $derived(Math.round(opts.mix * prox * 100) / 100)
  const blurEff = $derived(Math.round((2 + (opts.blur - 2) * prox) * 10) / 10)
  const warpEff = $derived(Math.round(opts.warp * prox * 10) / 10)
  const colorBlur = $derived(Math.round(blurEff * 2.5 * 10) / 10)
  const edgeSoft = $derived(Math.round((0.4 + (2 + opts.blur * 0.8) * prox) * 10) / 10)
  const gooMatrix = $derived(`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${opts.contrast} ${intercept}`)
  const waveFreq = $derived((2 + opts.waviness * 1.2) / 1000)
  const seamRotate = $derived(`rotate(${seamDeg}, ${seam.x}, ${seam.y})`)

  const gA = $derived(`translate(${a.x}, ${a.y})`)
  const gB = $derived(`translate(${b.x}, ${b.y})`)
</script>

<svg
  aria-hidden="true"
  focusable="false"
  data-gooey-imagemelt=""
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  style="position: absolute; inset: 0; overflow: visible; pointer-events: none;"
>
  <defs>
    <!-- No x/y: the rects referencing these patterns already sit inside a
         translated <g>, and userSpaceOnUse resolves in that transformed
         space — an origin here shifted the tile a second time, so the
         image repeated instead of filling the card once. -->
    <pattern id="{uid}-pa" patternUnits="userSpaceOnUse" width={a.w} height={a.h}>
      <image href={srcA} width={a.w} height={a.h} preserveAspectRatio="xMidYMid slice" />
    </pattern>
    <pattern id="{uid}-pb" patternUnits="userSpaceOnUse" width={b.w} height={b.h}>
      <image href={srcB} width={b.w} height={b.h} preserveAspectRatio="xMidYMid slice" />
    </pattern>
    <!-- Goo on colour: blur mixes both images, contrast re-solidifies only
         alpha; colours come from a wider blur clipped into that shape, so
         internal edges average away while the boundary stays liquid. -->
    <filter id="{uid}-goo" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation={blurEff} result="b" />
      <feColorMatrix in="b" type="matrix" values={gooMatrix} result="goo" />
      <feGaussianBlur in="SourceGraphic" stdDeviation={colorBlur} result="bc" />
      <feComposite in="bc" in2="goo" operator="in" result="mix" />
      <feTurbulence type="fractalNoise" baseFrequency={waveFreq} numOctaves="2" seed="4" result="wn" />
      <feDisplacementMap in="mix" in2="wn" scale={warpEff} xChannelSelector="R" yChannelSelector="G" result="warped" />
      <!-- Solidify by self-compositing (premultiplied-safe), then restore
           the anti-aliased edge with a sub-pixel blur. -->
      <feComposite in="warped" in2="warped" operator="over" result="s1" />
      <feComposite in="s1" in2="s1" operator="over" result="s2" />
      <feComposite in="s2" in2="s2" operator="over" result="solid" />
      <feGaussianBlur in="solid" stdDeviation="0.6" />
    </filter>
    <filter id="{uid}-soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation={opts.fade} />
    </filter>
    <!-- Marbling: nested large-scale displacements fold the molten colours
         into streaks, clipped to the goo silhouette. -->
    {#if mixAmt > 0.01}
      <filter id="{uid}-marble" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation={opts.mixBlur} result="c" />
        <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="2" seed="5" result="n1" />
        <feDisplacementMap in="c" in2="n1" scale={mixAmt * 90} xChannelSelector="R" yChannelSelector="G" result="d1" />
        <feTurbulence type="fractalNoise" baseFrequency="0.019" numOctaves="2" seed="11" result="n2" />
        <feDisplacementMap in="d1" in2="n2" scale={mixAmt * 50} xChannelSelector="R" yChannelSelector="G" result="d2" />
        <feComposite in="d2" in2="d2" operator="over" result="m1" />
        <feComposite in="m1" in2="m1" operator="over" result="m2" />
        <feGaussianBlur in="m2" stdDeviation="0.6" result="marble" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={blurEff} result="mb" />
        <feColorMatrix in="mb" type="matrix" values={gooMatrix} result="mg" />
        <feTurbulence type="fractalNoise" baseFrequency={waveFreq} numOctaves="2" seed="4" result="mwn" />
        <feDisplacementMap in="mg" in2="mwn" scale={warpEff} xChannelSelector="R" yChannelSelector="G" result="mshape" />
        <feComposite in="marble" in2="mshape" operator="in" />
      </filter>
      <mask id="{uid}-marblemask" maskUnits="userSpaceOnUse" x="0" y="0" {width} {height}>
        <g filter="url(#{uid}-soft)">
          <ellipse
            cx={seam.x}
            cy={seam.y}
            rx={(rA + rB) / 2 + tanHalf}
            ry={((rA + rB) / 2) * opts.gravity}
            transform={seamRotate}
            fill="#fff"
          />
        </g>
      </mask>
    {/if}
    <filter id="{uid}-edge" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation={edgeSoft} />
    </filter>
    <!-- Crisp faces: each is its plain card minus a blurred seam-spanning
         erase ellipse — apart, a card is exactly a card. -->
    <mask id="{uid}-ma" maskUnits="userSpaceOnUse" x="0" y="0" {width} {height}>
      <g filter="url(#{uid}-edge)">
        <g transform={gA}>
          <rect width={a.w} height={a.h} rx={a.r} fill="#fff" />
        </g>
      </g>
      <g filter="url(#{uid}-soft)">
        <ellipse cx={seam.x} cy={seam.y} rx={rB + tanHalf} ry={rB} transform={seamRotate} fill="#000" />
      </g>
    </mask>
    <mask id="{uid}-mb" maskUnits="userSpaceOnUse" x="0" y="0" {width} {height}>
      <g filter="url(#{uid}-edge)">
        <g transform={gB}>
          <rect width={b.w} height={b.h} rx={b.r} fill="#fff" />
        </g>
      </g>
      <g filter="url(#{uid}-soft)">
        <ellipse cx={seam.x} cy={seam.y} rx={rA + tanHalf} ry={rA} transform={seamRotate} fill="#000" />
      </g>
    </mask>
  </defs>

  <!-- MOLTEN layer -->
  <g filter="url(#{uid}-goo)">
    <g transform={gA}><rect width={a.w} height={a.h} rx={a.r} fill="url(#{uid}-pa)" /></g>
    <g transform={gB}><rect width={b.w} height={b.h} rx={b.r} fill="url(#{uid}-pb)" /></g>
  </g>

  <!-- MARBLE layer -->
  {#if mixAmt > 0.01}
    <g mask="url(#{uid}-marblemask)">
      <g filter="url(#{uid}-marble)">
        <g transform={gA}><rect width={a.w} height={a.h} rx={a.r} fill="url(#{uid}-pa)" /></g>
        <g transform={gB}><rect width={b.w} height={b.h} rx={b.r} fill="url(#{uid}-pb)" /></g>
      </g>
    </g>
  {/if}

  <!-- CRISP layer -->
  <g mask="url(#{uid}-ma)">
    <g transform={gA}><rect width={a.w} height={a.h} rx={a.r} fill="url(#{uid}-pa)" /></g>
  </g>
  <g mask="url(#{uid}-mb)">
    <g transform={gB}><rect width={b.w} height={b.h} rx={b.r} fill="url(#{uid}-pb)" /></g>
  </g>
</svg>
