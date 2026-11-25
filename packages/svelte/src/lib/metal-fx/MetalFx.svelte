<!--
  @component
  Wraps any element with an animated metallic ring effect driven by a single
  shared WebGL renderer. All visible MetalFx instances on the page share one
  offscreen GL canvas; each instance composites a cropped/scaled copy of it
  onto its own 2D canvas with a rounded hole punched through the centre.

  @example
  ```svelte
  <MetalFx variant="button">
    <button class="upgrade-pill">Upgrade to Pro</button>
  </MetalFx>
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { METAL_FX_INITIAL_STATE, attachMetalFx, metalFxView, type MetalFxHandle, type MetalFxOptions, type MetalFxState } from 'runeglow/metal-fx';
  import MetalFrame from './MetalFrame.svelte';
  import type { MetalFxProps } from './types';

  let {
    children,
    variant,
    preset,
    theme,
    strength,
    glowGain,
    paused,
    borderRadius,
    normalizeHostStyles,
    reflectionTargets,
    disableGlow,
    innerShadow,
    shaderScale,
    ringCssPx,
    scale,
    mask,
    glowMode,
    class: className,
    style,
    ref = $bindable(null),
    ...rest
  }: MetalFxProps = $props();

  /* what the ring is told, as the core takes it; the defaults are the core's */
  const options = $derived<MetalFxOptions>({
    variant, preset, theme, strength, glowGain, paused, borderRadius, normalizeHostStyles,
    reflectionTargets, disableGlow, innerShadow, shaderScale, ringCssPx, scale, mask, glowMode,
  });

  /* what the engine has found out: whether there is WebGL2 at all, the first
     frame, the corner radius, what theme 'auto' came to */
  let fx = $state.raw<MetalFxState>(METAL_FX_INITIAL_STATE);
  const view = $derived(metalFxView(options, fx));

  // DOM nodes the engine draws into.
  let canvas = $state<HTMLCanvasElement | null>(null);
  let glow = $state<HTMLDivElement | null>(null);
  let rim = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);

  /* the core runs the engine on those nodes, for as long as they are the ring's */
  let ring: MetalFxHandle | null = null;
  $effect(() => {
    if (!ref || !canvas || !glow || !content) return;
    ring = attachMetalFx({ root: ref, canvas, glow, content, rim: untrack(() => rim) }, untrack(() => options), {
      onstate: (state) => (fx = state),
    });
    return () => {
      ring?.destroy();
      ring = null;
    };
  });
  $effect(() => {
    ring?.update(options, rim);
  });
</script>

<MetalFrame {view} class={className} {style} bind:root={ref} bind:canvas bind:glow bind:rim bind:content {...rest}>
  {@render children?.()}
</MetalFrame>
