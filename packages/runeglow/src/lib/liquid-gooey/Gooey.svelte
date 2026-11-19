<!--
  @component
  The liquid group: renders the silhouette SVG layer (goo filter + shadow
  chain) behind its children. Children stay crisp; each `Liquid.Item` mirrors
  its piece's geometry into the liquid layer.

  Filters run on SVG content — not CSS url() filters on HTML — because that
  is the one variant WebKit renders correctly and promotes properly.

  @example
  ```svelte
  <Liquid>
    <Liquid.Item><button>One</button></Liquid.Item>
    <Liquid.Item><button>Two</button></Liquid.Item>
  </Liquid>
  ```
-->
<script lang="ts">
  import { setGooeyContext } from './context'
  import { gooFilterPrimitives } from './filter'
  import { createImageMeltRegistry } from './imageMelt'
  import ImageMeltLayer from './ImageMeltLayer.svelte'
  import { ObserveEngine } from './observer'
  import { parseShadow } from './shadow'
  import type { GooeyProps } from './types'

  let {
    blur = 6,
    contrast = 18,
    fill = '#fff',
    shadow,
    filterPadding = 24,
    waviness = 0,
    wavinessFreq = 0.018,
    filter: customFilter,
    class: className,
    style,
    children,
    ref = $bindable(null),
    ...rest
  }: GooeyProps = $props()

  const uid = $props.id()
  const filterId = `gooey-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`

  let portal = $state<SVGGElement | null>(null)
  let meltPortal = $state<SVGGElement | null>(null)
  let size = $state({ w: 0, h: 0 })

  const shadows = $derived(parseShadow(shadow))

  $effect(() => {
    const el = ref
    if (!el) return
    const measure = () => {
      if (size.w !== el.offsetWidth || size.h !== el.offsetHeight) {
        size = { w: el.offsetWidth, h: el.offsetHeight }
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })

  const engine = new ObserveEngine(() => ref)
  const imageMelt = createImageMeltRegistry()
  $effect(() => () => engine.dispose())
  $effect(() => {
    engine.gooBlur = blur
  })

  setGooeyContext({
    get portal() {
      return portal
    },
    get meltPortal() {
      return meltPortal
    },
    get fill() {
      return fill
    },
    getGroup: () => ref,
    engine,
    imageMelt,
  })

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
  const svgShadows = $derived(shadows.filter(s => s.inset || s.spread !== 0))
  const cssShadowFilter = $derived(
    shadows
      .filter(s => !s.inset && s.spread === 0)
      // box-shadow lists paint the FIRST layer on top; drop-shadow chains
      // paint later filters behind earlier output, so document order already
      // matches.
      .map(s => `drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${s.color})`)
      .join(' '),
  )
  const shadowExtent = $derived(
    svgShadows.reduce(
      (m, s) => Math.max(m, Math.max(Math.abs(s.x), Math.abs(s.y)) + s.blur * 1.5 + Math.max(0, s.spread)),
      0,
    ),
  )
  const pad = $derived(Math.ceil(blur * 3 + shadowExtent + filterPadding))

  const primitives = $derived(
    customFilter ?? gooFilterPrimitives({ blur, contrast, shadows: svgShadows, waviness, wavinessFreq }),
  )
</script>

<div
  {...rest}
  bind:this={ref}
  class={className}
  style="position: relative; isolation: isolate;{style ? ` ${style}` : ''}"
>
  <!-- z-index -1 inside the isolated group: the liquid paints above the
       group's own background but below every child, positioned or not.
       The filter is the GPU half of the shadow stack (see above); will-change
       promotes the filtered layer, as WebKit otherwise repaints the goo a
       frame or two behind the plain-DOM content. -->
  <svg
    aria-hidden="true"
    focusable="false"
    data-gooey-svg=""
    style="position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: -1; will-change: filter, transform;"
    style:filter={cssShadowFilter || undefined}
  >
    <defs>
      <filter
        id={filterId}
        filterUnits="userSpaceOnUse"
        x={-pad}
        y={-pad}
        width={size.w + pad * 2}
        height={size.h + pad * 2}
        color-interpolation-filters="sRGB"
      >
        {@html primitives}
      </filter>
    </defs>
    <g id="{filterId}-sil" bind:this={portal} filter="url(#{filterId})" style:fill></g>
  </svg>
  <!-- Melt overlay: warped-image copies render here, ABOVE the content
       layer. SVG content so displacement/blur filters work in WebKit. The
       z-index is high enough that an app's own stacking (e.g. a dragged item
       raised over its neighbours) can't slip in front and hide the melt.
       Scoped: the group is an isolated stacking context, so this can't
       escape it. -->
  <svg
    aria-hidden="true"
    focusable="false"
    data-gooey-overlay=""
    style="position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 9999;"
  >
    <defs>
      <!-- The melt may only paint where LIQUID exists: the mask re-renders
           the goo-filtered silhouette (same document, <use> across the two
           svgs), so the warped copies are clipped to the merged surface. -->
      <mask
        id="{filterId}-meltmask"
        maskUnits="userSpaceOnUse"
        x={-pad}
        y={-pad}
        width={size.w + pad * 2}
        height={size.h + pad * 2}
      >
        <use href="#{filterId}-sil" />
      </mask>
    </defs>
    <g mask="url(#{filterId}-meltmask)">
      <g bind:this={meltPortal}></g>
    </g>
  </svg>
  {@render children?.()}
  <ImageMeltLayer registry={imageMelt} />
</div>
