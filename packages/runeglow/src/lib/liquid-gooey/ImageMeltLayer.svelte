<!--
  @component
  Rendered by the Liquid group: watches the registered melt items and draws
  the pair. rAF-measured; updates only when a rect actually moves.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { getGooeyContext } from './context'
  import { geomKey, readGeom, type CardGeom, type ImageMeltRegistry } from './imageMelt'
  import MeltPair from './MeltPair.svelte'

  let { registry }: { registry: ImageMeltRegistry } = $props()
  const ctx = getGooeyContext()

  let version = $state(0)
  // The registry calls this from inside whichever effect registered or
  // unregistered an item. It must not read `version` there in a tracked
  // way: that effect would then depend on the very thing it writes, and
  // re-run itself without end.
  const bump = () => {
    version = untrack(() => version) + 1
  }
  $effect(() => {
    const off = registry.subscribe(bump)
    // Items register from their own effects, which run before this one, so
    // the first registrations arrive before anyone is listening. Read them
    // once now that we are.
    bump()
    return off
  })

  const pair = $derived.by(() => {
    version
    return registry.entries().slice(0, 2)
  })
  const active = $derived(pair.length === 2)

  let geoms = $state.raw<{ a: CardGeom; b: CardGeom; w: number; h: number } | null>(null)

  $effect(() => {
    if (!active) {
      geoms = null
      return
    }
    const [first, second] = pair
    let key = ''
    let raf = 0
    const tick = () => {
      const group = ctx.getGroup()
      if (group) {
        const a = readGeom(group, first.el)
        const b = readGeom(group, second.el)
        const next = `${geomKey(a)}|${geomKey(b)}|${group.offsetWidth}x${group.offsetHeight}`
        if (next !== key) {
          key = next
          geoms = { a, b, w: group.offsetWidth, h: group.offsetHeight }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })
</script>

{#if active && geoms}
  <MeltPair
    a={geoms.a}
    b={geoms.b}
    srcA={pair[0].src}
    srcB={pair[1].src}
    opts={pair[0].opts}
    width={geoms.w}
    height={geoms.h}
  />
{/if}
