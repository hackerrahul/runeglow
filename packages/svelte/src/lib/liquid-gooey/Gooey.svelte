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
  import { untrack } from 'svelte'
  import { LiquidGroup, attachLiquid, liquidView, type LiquidHandle, type LiquidOptions } from 'runeglow/liquid-gooey'
  import { styleText } from 'runeglow/kit'
  import { setGooeyContext } from './context'
  import type { GooeyProps } from './types'

  let {
    blur,
    contrast,
    fill,
    shadow,
    filterPadding,
    waviness,
    wavinessFreq,
    filter,
    class: className,
    style,
    children,
    ref = $bindable(null),
    ...rest
  }: GooeyProps = $props()

  const uid = $props.id()

  /* what the group is told, as the core takes it; the defaults are the core's */
  const options = $derived<LiquidOptions>({
    blur,
    contrast,
    fill,
    shadow,
    filterPadding,
    waviness,
    wavinessFreq,
    filter,
  })
  const view = $derived(liquidView(options, uid))

  /* The pieces reach the group through this object. It is made before the
     element below exists, so a piece's effects may run first: it draws
     itself once the group is attached. */
  const group = new LiquidGroup()
  setGooeyContext(group)

  /* the core measures the group, runs the engine and draws a melting pair, in the layers below */
  let liquid: LiquidHandle | null = null
  $effect(() => {
    if (!ref) return
    liquid = attachLiquid(ref, untrack(() => options), group)
    return () => {
      liquid?.destroy()
      liquid = null
    }
  })
  $effect(() => {
    liquid?.update(options)
  })
</script>

<div
  {...rest}
  bind:this={ref}
  class={className}
  style="{styleText(view.style)}{style ? ` ${style}` : ''}"
>
  <!-- The silhouette: every piece draws its blob in the filtered group. The
       core sizes the filter's region to the group's measured box. -->
  <svg aria-hidden="true" focusable="false" data-gooey-svg="" style={styleText(view.surfaceStyle)}>
    <defs>
      <filter id={view.filterId} filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        {@html view.primitives}
      </filter>
    </defs>
    <g id={view.silhouetteId} filter="url(#{view.filterId})" style:fill={view.fill}></g>
  </svg>
  <!-- The melt overlay, above the content, masked to where liquid exists. -->
  <svg aria-hidden="true" focusable="false" data-gooey-overlay="" style={styleText(view.overlayStyle)}>
    <defs>
      <mask id={view.maskId} maskUnits="userSpaceOnUse">
        <use href="#{view.silhouetteId}" />
      </mask>
    </defs>
    <g mask="url(#{view.maskId})">
      <g></g>
    </g>
  </svg>
  {@render children?.()}
</div>
