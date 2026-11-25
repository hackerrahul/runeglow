<!--
  @component
  An animated WebGL "image generation" loader. Wrap a card and it gets a
  shader-driven mosaic that can resolve into an image from a pool you
  provide, hold it, and dissolve back.

  The component exposes four functions; bind it with `bind:this` to call
  them: `triggerReveal`, `triggerHide`, `triggerRegenerate`, `isImageActive`.

  @example
  ```svelte
  <ImageGeneration preset="pixels-organic" images={['/a.jpg', '/b.jpg']} autoReveal>
    <div style="width: 320px; height: 320px; border-radius: 20px;"></div>
  </ImageGeneration>
  ```
-->
<script lang="ts" module>
  import { ensureStylesInjected } from 'runeglow/img-fx';

  ensureStylesInjected();
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import {
    attachImageGeneration,
    imageGenerationView,
    type AttachedImageGeneration,
    type ImageGenerationHandle,
    type ImageGenerationOptions,
    type ImageGenerationState
  } from 'runeglow/img-fx';
  import { styleText } from 'runeglow/kit';
  import type { ImageGenerationProps } from './types';

  let {
    children,
    preset,
    theme,
    strength,
    speed,
    pixelScale,
    cardBg,
    colors,
    images,
    autoReveal,
    revealDelayRange,
    revealInitialDelay,
    revealHoldMs,
    revealFadeOutMs,
    borderRadius,
    paused,
    fragmentShader,
    onCycle,
    excludeSrcs,
    class: className,
    style,
    ref = $bindable(null),
    ...rest
  }: ImageGenerationProps = $props();

  /* what the card is told, as the core takes it; the defaults are the core's */
  const options = $derived<ImageGenerationOptions>({
    preset,
    theme,
    strength,
    speed,
    pixelScale,
    cardBg,
    colors,
    images,
    autoReveal,
    revealDelayRange,
    revealInitialDelay,
    revealHoldMs,
    revealFadeOutMs,
    borderRadius,
    paused,
    fragmentShader,
    onCycle,
    excludeSrcs
  });

  /* what the running card has found out: the page's theme, the card's corner
     radius, the surface of a regenerate churn. The wrapper is drawn from it. */
  let found = $state.raw<ImageGenerationState | null>(null);
  const view = $derived(imageGenerationView(options, found));

  /* the core does the measuring, the drawing and the reveal cycle, on the wrapper below */
  let card: AttachedImageGeneration | null = null;
  $effect(() => {
    if (!ref) return;
    card = attachImageGeneration(ref, untrack(() => options), { onstate: (next) => (found = next) });
    return () => {
      card?.destroy();
      card = null;
    };
  });
  $effect(() => {
    card?.update(options);
  });

  /**
   * Run a reveal pass now. No-op while one is already in progress. With
   * `hold: 'manual'` the image stays until `triggerHide()` is called.
   */
  export const triggerReveal: ImageGenerationHandle['triggerReveal'] = (opts) => {
    card?.triggerReveal(opts);
  };

  /** Fade the revealed image back to the effect. No-op if none is showing. */
  export const triggerHide: ImageGenerationHandle['triggerHide'] = () => {
    card?.triggerHide();
  };

  /**
   * Regenerate the revealed image in place: it breaks into the effect's
   * cells, churns, and the next image from the pool dissolves in.
   */
  export const triggerRegenerate: ImageGenerationHandle['triggerRegenerate'] = (opts) => {
    card?.triggerRegenerate(opts);
  };

  /** True while an image is showing on top of the effect. */
  export const isImageActive: ImageGenerationHandle['isImageActive'] = () => card?.isImageActive() ?? false;
</script>

<div
  {...rest}
  bind:this={ref}
  class={[view.class, className]}
  data-preset={view.preset}
  data-theme={view.theme}
  data-paused={view.paused ? 'true' : undefined}
  style="{styleText(view.style)}{style ? ` ${style}` : ''}"
  style:--image-gen-radius={view.radiusStyle['--image-gen-radius']}
  style:border-radius={view.radiusStyle['border-radius']}
>
  <canvas class={view.shaderClass} aria-hidden="true"></canvas>
  <canvas class={view.overlayClass} aria-hidden="true"></canvas>
  <div class={view.contentClass}>
    {@render children?.()}
  </div>
</div>
