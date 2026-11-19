<!--
  @component
  A wave that leaves a button, an edge or a point and crosses the element,
  bending what is there and carrying one view into another.

  Bind the component with `bind:this` for `play()`, `reverse()`, `reset()`
  and `prepare()`.

  @example
  ```svelte
  <DistortionWave revealed={sent}>
    <Review onsend={() => (sent = true)} />
    {#snippet revealedContent()}
      <Receipt />
    {/snippet}
  </DistortionWave>
  ```
-->
<script lang="ts" module>
  /* The two views share one grid cell. These strings never change, so
     Svelte never writes over what the controller sets on the layers as it
     runs. */
  const LAYER = 'grid-area: 1 / 1; min-width: 0; min-height: 0; isolation: isolate;';
  const LAYER_HIDDEN = `${LAYER} opacity: 0; pointer-events: none;`;
  /* Over the canvas, which is at 1. It covers the whole element, so it takes
     no clicks itself; the rule below gives them back to what is put in it. */
  const OVERLAY =
    'grid-area: 1 / 1; min-width: 0; min-height: 0; position: relative; z-index: 2; pointer-events: none;';
  const OVERLAY_RULE = ':where([data-dw-layer="overlay"])>*{pointer-events:auto}';
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { WaveController } from './controller';
  import type { DistortionWaveHandle, DistortionWaveProps } from './types';

  let {
    children,
    revealedContent,
    overlay,
    revealed,
    type,
    source,
    focus,
    waveStyle,
    palette,
    scale,
    cornerRadius,
    scrub,
    capture,
    live,
    prewarm,
    resolution,
    reducedMotion,
    onFinish,
    style,
    ref = $bindable(null),
    ...rest
  }: DistortionWaveProps = $props();

  let first = $state<HTMLDivElement | null>(null);
  let second = $state<HTMLDivElement | null>(null);
  // The engine is not reactive; `generation` moves when one is made.
  let controller: WaveController | null = null;
  let generation = $state(0);

  // Which view the markup starts on. After that the controller decides.
  const startRevealed = untrack(() => !!revealed);
  const two = $derived(revealedContent != null);
  // Read once: the layers' styles must not be written again while a wave runs.
  const firstStyle = untrack(() => (revealedContent != null && startRevealed ? LAYER_HIDDEN : LAYER));
  const secondStyle = startRevealed ? LAYER : LAYER_HIDDEN;

  $effect(() => {
    const root = ref;
    const content = first;
    if (!root || !content) return;
    const made = untrack(() => new WaveController(root, content, second));
    controller = made;
    // Written without being read here, or this effect would wait on itself.
    untrack(() => (generation += 1));
    return () => {
      made.destroy();
      if (controller === made) controller = null;
    };
  });

  // Compared by content, so an inline object literal does not count as a
  // change every time the parent's expression is evaluated again.
  const styleKey = $derived(waveStyle ? JSON.stringify(waveStyle) : '');
  const focusKey = $derived(focus ? `${focus.x},${focus.y}` : String(focus));

  $effect(() => {
    generation;
    styleKey;
    focusKey;
    const options = {
      revealed,
      type,
      source,
      palette,
      scale,
      cornerRadius,
      scrub,
      capture,
      live,
      prewarm,
      resolution,
      reducedMotion,
      onFinish
    };
    const layer = second;
    const c = controller;
    if (!c) return;
    untrack(() => {
      c.setRevealedLayer(layer);
      c.update({ ...options, focus, waveStyle });
    });
  });

  /** Runs the wave from the start. */
  export const play: DistortionWaveHandle['play'] = (options) => controller?.play(options);
  /** Runs it back to the first view. */
  export const reverse: DistortionWaveHandle['reverse'] = () => controller?.reverse();
  /** Straight back to the first view, with no wave. */
  export const reset: DistortionWaveHandle['reset'] = () => controller?.reset();
  /** Pictures the element now, so the next wave starts with its lens. */
  export const prepare: DistortionWaveHandle['prepare'] = () => controller?.prepare() ?? Promise.resolve();
  /** The engine behind it, for benches. */
  export const getController: DistortionWaveHandle['getController'] = () => controller;
</script>

<div bind:this={ref} data-distortion-wave="" {...rest} style="display: grid; isolation: isolate;{style ? ` ${style}` : ''}">
  <div bind:this={first} data-dw-layer="content" style={firstStyle}>
    {@render children?.()}
  </div>
  {#if two}
    <div bind:this={second} data-dw-layer="revealed" style={secondStyle}>
      {@render revealedContent?.()}
    </div>
  {/if}
  {#if overlay}
    <div data-dw-layer="overlay" data-dw-skip="" style={OVERLAY}>
      {@html `<style data-dw-skip="">${OVERLAY_RULE}</style>`}
      {@render overlay()}
    </div>
  {/if}
</div>
