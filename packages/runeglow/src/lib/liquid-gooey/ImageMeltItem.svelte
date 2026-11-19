<!--
  @component
  Host for one melting item: keeps the child interactive but invisible — the
  melt SVG is the painter. Auto-detects the image source from the first
  <img> descendant when `src` isn't given.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { ImageMeltOptions, ImageMeltRegistry } from './imageMelt'

  interface Props {
    src?: string
    opts: Required<ImageMeltOptions>
    registry: ImageMeltRegistry
    children?: Snippet
  }

  let { src, opts, registry, children }: Props = $props()
  let host = $state<HTMLSpanElement | null>(null)

  $effect(() => {
    const target = host?.firstElementChild as HTMLElement | null
    if (!target) return
    const img = src ?? target.querySelector('img')?.src ?? (target as HTMLImageElement).src
    if (!img) {
      console.warn(
        '[runeglow/liquid-gooey] effect="melt" needs an image: pass melt={{ src }} or put an <img> inside the item.',
      )
      return
    }
    // The DOM element stays for layout + interaction; the SVG paints it.
    const prevOpacity = target.style.opacity
    target.style.opacity = '0'
    const unregister = registry.register({ el: target, src: img, opts })
    return () => {
      target.style.opacity = prevOpacity
      unregister()
    }
  })
</script>

<span bind:this={host} style="display: contents">{@render children?.()}</span>
