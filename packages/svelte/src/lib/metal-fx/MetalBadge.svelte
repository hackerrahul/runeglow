<!--
  @component
  The "New" badge: a white pill with a metal rim and a clean core under the
  label. Its layers and their measures are the core's (`metalBadgeView`).

  @example
  ```svelte
  <MetalBadge text="New" />
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { METAL_FX_INITIAL_STATE, attachMetalBadge, metalBadgeView, type MetalBadgeHandle, type MetalBadgeOptions, type MetalFxState } from 'runeglow/metal-fx';
  import { styleText } from 'runeglow/kit';
  import MetalFrame from './MetalFrame.svelte';
  import type { MetalBadgeProps } from './types';

  let {
    text,
    strength,
    theme,
    scale,
    reflectionTargets,
    metalOpacity,
    shaderScale,
    core,
    gradient,
    glow,
    textColor,
    paused,
    ref = $bindable(null)
  }: MetalBadgeProps = $props();

  /* what the badge is told, as the core takes it; the defaults are the core's */
  const options = $derived<MetalBadgeOptions>({
    text, strength, theme, scale, reflectionTargets, metalOpacity, shaderScale, core, gradient, glow, textColor, paused,
  });

  let fx = $state.raw<MetalFxState>(METAL_FX_INITIAL_STATE);
  const view = $derived(metalBadgeView(options, fx));

  let canvas = $state<HTMLCanvasElement | null>(null);
  let glowHost = $state<HTMLDivElement | null>(null);
  let content = $state<HTMLDivElement | null>(null);

  /* the core runs the ring; the badge's own layers below are still */
  let metal: MetalBadgeHandle | null = null;
  $effect(() => {
    if (!ref || !canvas || !glowHost || !content) return;
    metal = attachMetalBadge({ root: ref, canvas, glow: glowHost, content }, untrack(() => options), {
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
  <!-- Inline layout only — no utility classes, so the badge renders the
       same with or without a CSS framework on the host page. -->
  <div style={styleText(view.box)}>
    <!-- layer 3b — clean white core under the label (rim-only metal). -->
    <div aria-hidden="true" style={styleText(view.core)}></div>
    <!-- layers 3 + 5 — white gradient and inset rims, over the metal -->
    <div aria-hidden="true" style={styleText(view.wash)}></div>
    <span style={styleText(view.label.style)} aria-label={view.label.label}>
      {view.label.text}
    </span>
  </div>
</MetalFrame>
