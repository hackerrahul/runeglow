<!--
  @component
  One piece of a liquid group. Wrap an element in it and the group draws
  that element's share of the merged surface.

  @example
  ```svelte
  <Liquid.Item effect="move"><div class="thumb"></div></Liquid.Item>
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { attachLiquidItem, liquidItemView, type LiquidItemHandle, type LiquidItemOptions } from 'runeglow/liquid-gooey'
  import { styleText } from 'runeglow/kit'
  import { getGooeyContext } from './context'
  import type { LiquidItemProps } from './types'

  // The prop is called `effect`, as in every framework; it is renamed on
  // the way in because a local of that name would shadow the `$effect` rune.
  let {
    effect: kind,
    morph,
    move,
    bend,
    melt,
    dissolve,
    x,
    y,
    scale,
    transition,
    delay,
    observe,
    radius,
    class: className,
    style,
    children,
  }: LiquidItemProps = $props()

  const group = getGooeyContext()

  /* what the piece is told, as the core takes it; the defaults are the core's */
  const options = $derived<LiquidItemOptions>({
    effect: kind,
    morph,
    move,
    bend,
    melt,
    dissolve,
    x,
    y,
    scale,
    transition,
    delay,
    observe,
    radius,
  })
  /* which wrapper the piece gets: a box the library moves, or a holder for content you move */
  const view = $derived(liquidItemView(options))

  let wrap = $state<HTMLElement | null>(null)

  /* the core draws the piece's share of the liquid and keeps it with the content */
  let item: LiquidItemHandle | null = null
  $effect(() => {
    if (!wrap) return
    item = attachLiquidItem(group, wrap, untrack(() => options))
    return () => {
      item?.destroy()
      item = null
    }
  })
  $effect(() => {
    item?.update(options)
  })
  // `transform` is owned by the core's clock. Svelte rewrites the whole style
  // attribute when `style` changes, which would drop it, so it is put back.
  $effect(() => {
    style
    item?.restyle()
  })
</script>

<!-- A change of effect starts the piece afresh, wrapper and content. -->
{#key view.key}
  {#if view.tag === 'div'}
    <div
      bind:this={wrap}
      class={className}
      style="{styleText(view.style)}{style ? ` ${style};` : ''} {styleText(view.lastStyle)}"
    >
      {@render children?.()}
    </div>
  {:else if view.styled}
    <span bind:this={wrap} class={className} style="{styleText(view.style)}{style ? ` ${style}` : ''}">
      {@render children?.()}
    </span>
  {:else}
    <span bind:this={wrap} style={styleText(view.style)}>{@render children?.()}</span>
  {/if}
{/key}
