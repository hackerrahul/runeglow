<!--
  @component
  The engine-level item. Picks mirrored mode (the library animates x/y/scale)
  or observe mode (you animate, the liquid follows). `Liquid.Item` is the
  public face of this.
-->
<script lang="ts">
  import MirroredItem from './MirroredItem.svelte'
  import ObservedItem from './ObservedItem.svelte'
  import type { GooeyItemProps } from './types'

  let props: GooeyItemProps = $props()

  const needsEngine = $derived.by(() => {
    const e = props.effect
    const list = Array.isArray(e) ? e : e ? [e] : []
    return !!props.observe || list.some(v => v !== 'morph')
  })
</script>

{#if needsEngine}
  <ObservedItem {...props} />
{:else}
  <MirroredItem {...props} />
{/if}
