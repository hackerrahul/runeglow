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
<script lang="ts">
  import { untrack } from 'svelte';
  import {
    attachDistortionWave,
    distortionWaveView,
    type AttachedDistortionWave,
    type DistortionWaveOptions,
  } from 'runeglow/distortion-waves';
  import { styleText } from 'runeglow/kit';
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

  /* what the wave is told, as the core takes it; the defaults are the core's */
  const options = $derived<DistortionWaveOptions>({
    revealed, type, source, focus, waveStyle, palette, scale, cornerRadius,
    scrub, capture, live, prewarm, resolution, reducedMotion,
  });

  let first = $state<HTMLDivElement | null>(null);
  let second = $state<HTMLDivElement | null>(null);
  // The engine is not reactive; `generation` moves when one is made.
  let wave: AttachedDistortionWave | null = null;
  let generation = $state(0);

  const two = $derived(revealedContent != null);
  /* The two views share one grid cell. Which one the markup starts on is
     read once: after that the controller decides, and these strings never
     change, so Svelte never writes over what the controller sets on the
     layers as it runs. */
  const view = untrack(() => distortionWaveView(options, revealedContent != null));
  const rootStyle = styleText(view.root.style);
  const firstStyle = styleText(view.content.style);
  const secondStyle = styleText(view.revealed.style);
  const overlayStyle = styleText(view.overlay.style);

  /* the core runs the wave, on the element and the layers below */
  $effect(() => {
    const root = ref;
    const content = first;
    if (!root || !content) return;
    const made = untrack(() =>
      attachDistortionWave(root, { content, revealed: second }, options, {
        onFinish: (now) => onFinish?.(now),
        rendered: true,
      })
    );
    wave = made;
    // Written without being read here, or this effect would wait on itself.
    untrack(() => (generation += 1));
    return () => {
      made.destroy();
      if (wave === made) wave = null;
    };
  });

  /* Whenever an option changes or the second view comes or goes. The core
     compares the wave's numbers and its focus by content, so an inline
     object literal does not count as a change every time the parent's
     expression is evaluated again. */
  $effect(() => {
    generation;
    const next = options;
    const layer = second;
    const w = wave;
    if (!w) return;
    untrack(() => {
      w.setRevealedLayer(layer);
      w.update(next);
    });
  });

  /** Runs the wave from the start. */
  export const play: DistortionWaveHandle['play'] = (options) => wave?.play(options);
  /** Runs it back to the first view. */
  export const reverse: DistortionWaveHandle['reverse'] = () => wave?.reverse();
  /** Straight back to the first view, with no wave. */
  export const reset: DistortionWaveHandle['reset'] = () => wave?.reset();
  /** Pictures the element now, so the next wave starts with its lens. */
  export const prepare: DistortionWaveHandle['prepare'] = () => wave?.prepare() ?? Promise.resolve();
  /** The engine behind it, for benches. */
  export const getController: DistortionWaveHandle['getController'] = () => wave?.getController() ?? null;
</script>

<div bind:this={ref} {...view.root.attributes} {...rest} style="{rootStyle}{style ? ` ${style}` : ''}">
  <div bind:this={first} {...view.content.attributes} style={firstStyle}>
    {@render children?.()}
  </div>
  {#if two}
    <div bind:this={second} {...view.revealed.attributes} style={secondStyle}>
      {@render revealedContent?.()}
    </div>
  {/if}
  {#if overlay}
    <div {...view.overlay.attributes} style={overlayStyle}>
      {@html `<style data-dw-skip="">${view.overlay.rule}</style>`}
      {@render overlay()}
    </div>
  {/if}
</div>
