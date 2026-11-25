<!--
  @component
  The elements of a metal ring, as the core's view describes them: the
  wrapper, the canvas, the glow's and the inner shadow's hosts, and the
  content layer the children are rendered in. Shared by MetalFx, MetalText
  and MetalBadge; not part of the package's API.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { MetalFxView } from 'runeglow/metal-fx';
  import { styleText } from 'runeglow/kit';

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'style' | 'class'> {
    view: MetalFxView;
    children?: Snippet;
    class?: string;
    style?: string;
    root?: HTMLDivElement | null;
    canvas?: HTMLCanvasElement | null;
    glow?: HTMLDivElement | null;
    rim?: HTMLDivElement | null;
    content?: HTMLDivElement | null;
  }

  let {
    view,
    children,
    class: className,
    style,
    root = $bindable(null),
    canvas = $bindable(null),
    glow = $bindable(null),
    rim = $bindable(null),
    content = $bindable(null),
    ...rest
  }: Props = $props();

  /* the caller's inline style, on top of what the view puts beneath it */
  const outer = $derived([styleText(view.root.base), style].filter(Boolean).join(' ') || undefined);
</script>

{#if view.supported}
  <div
    {...rest}
    {...view.root.attrs}
    bind:this={root}
    class={[view.root.class, className]}
    style={outer}
    style:--mfx-strength={view.root.style['--mfx-strength']}
    style:--mfx-radius={view.root.style['--mfx-radius']}
    style:border-radius={view.root.style['border-radius']}
    style:opacity={view.root.style.opacity}
    style:visibility={view.root.style.visibility}
    style:transition={view.root.style.transition}
  >
    <canvas bind:this={canvas} class={view.canvas.class} style={styleText(view.canvas.style)}></canvas>
    <div class={view.inner.class} aria-hidden="true" style={styleText(view.inner.style)}></div>
    <div
      bind:this={glow}
      aria-hidden="true"
      style={styleText(view.glow.style)}
      style:display={view.glow.hidden ? 'none' : undefined}
    ></div>
    <!-- Rim sits above the metal and the glow, below the content. -->
    {#if view.rim}
      <div bind:this={rim} aria-hidden="true" style={styleText(view.rim.style)}></div>
    {/if}
    <div bind:this={content} class={view.content.class}>{@render children?.()}</div>
  </div>
{:else}
  <!-- Graceful degradation: the wrapped element with its own styling intact —
       no normalisation, no canvas, no glow. Consumers can style
       `[data-metal-fx-unsupported]` if they want a static stand-in ring. -->
  <div {...rest} {...view.root.attrs} bind:this={root} class={[view.root.class, className]} style={outer}>
    {@render children?.()}
  </div>
{/if}
