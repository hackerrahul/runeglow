<!--
  @component
  Bare metal-filled text — the Pro badge's glyph treatment without the pill.

  MetalFx's `mask` paints the word with the same font and metrics as the
  live span, so layout and hit-testing stay DOM. The metal is composited
  over the live text, so `color` is the tone the shader blends onto — the
  design's own colour, not white. The canvas is lifted above the content
  layer and the glow (clipped to the glyphs) above that.

  @example
  ```svelte
  <MetalText text="Pro" font="600 24px/1 Inter, sans-serif" color="#d8d8d8" />
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { METAL_FX_INITIAL_STATE, attachMetalText, metalTextView, type MetalFxState, type MetalTextHandle, type MetalTextOptions } from 'runeglow/metal-fx';
  import { styleText } from 'runeglow/kit';
  import MetalFrame from './MetalFrame.svelte';
  import type { MetalTextProps } from './types';

  let {
    text,
    font,
    color,
    strength,
    theme,
    reflectionTargets,
    class: className,
    innerShadow,
    glow,
    glowGain,
    metalOpacity,
    shaderScale,
    paused,
    ref = $bindable(null)
  }: MetalTextProps = $props();

  /* what the text is told, as the core takes it; the defaults are the core's */
  const options = $derived<MetalTextOptions>({
    text, font, color, strength, theme, reflectionTargets, innerShadow, glow, glowGain, metalOpacity, shaderScale, paused,
  });

  let fx = $state.raw<MetalFxState>(METAL_FX_INITIAL_STATE);
  const view = $derived(metalTextView(options, fx));

  let canvas = $state<HTMLCanvasElement | null>(null);
  let glowHost = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);
  let textEl = $state<HTMLSpanElement | null>(null);

  /* the core masks the metal to the span's glyphs and draws their inner shadow */
  let metal: MetalTextHandle | null = null;
  $effect(() => {
    if (!ref || !canvas || !glowHost || !content || !textEl) return;
    metal = attachMetalText({ root: ref, canvas, glow: glowHost, content, text: textEl }, untrack(() => options), {
      onstate: (state) => (fx = state),
    });
    return () => {
      metal?.destroy();
      metal = null;
    };
  });
  $effect(() => {
    metal?.update(options);
  });
</script>

<MetalFrame view={view.fx} bind:root={ref} bind:canvas bind:glow={glowHost} bind:content>
  <span bind:this={textEl} class={className} style={styleText(view.text.style)} aria-label={view.text.label}>
    {view.text.text}
  </span>
</MetalFrame>
