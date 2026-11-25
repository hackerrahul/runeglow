<!--
  @component
  BorderBeam - Animated border beam effect for Svelte

  @example
  ```svelte
  <BorderBeam>
    <Card>Content</Card>
  </BorderBeam>
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import {
    attachBorderBeam,
    borderBeamState,
    borderBeamView,
    type BorderBeamHandle,
    type BorderBeamOptions,
    type BorderBeamState,
  } from 'runeglow/border-beam';
  import type { BorderBeamProps } from './types';

  let {
    children,
    ref = $bindable(null),
    size,
    colorVariant,
    theme,
    staticColors,
    duration,
    active,
    borderRadius,
    brightness,
    saturation,
    hueRange,
    glowSize,
    strength,
    css,
    onActivate,
    onDeactivate,
    onanimationend: consumerOnAnimationEnd,
    ...props
  }: BorderBeamProps = $props();

  // Stable across server and client, so the generated stylesheet hydrates.
  const uid = $props.id();
  const id = uid.replace(/[^a-zA-Z0-9_-]/g, '-');

  /* what the beam is told, as the core takes it; the defaults are the core's */
  const options = $derived<BorderBeamOptions>({
    size, colorVariant, theme, staticColors, duration, active, borderRadius,
    brightness, saturation, hueRange, glowSize, strength, css,
  });

  /* What the core has found out in the browser (the system's theme, the
     content's radius, whether the beam is on screen, where it is in a
     fade). It starts as a server would have it, so the markup hydrates. */
  let beamState = $state.raw<BorderBeamState>(untrack(() => borderBeamState(options)));
  const view = $derived(borderBeamView(options, id, beamState));

  /* the core watches the wrapper below and drives the pulse; this component
     does the rendering, so the stylesheet is in the server's HTML too */
  let beam: BorderBeamHandle | null = null;
  $effect(() => {
    const el = ref;
    if (!el) return;
    beam = attachBorderBeam(el, untrack(() => options), {
      onActivate: () => onActivate?.(),
      onDeactivate: () => onDeactivate?.(),
      rendered: { id, onstate: (next) => (beamState = next) },
    });
    /* listened for after the core, so a consumer's handler runs once the
       beam has dealt with the end of its fade */
    const forward = (e: AnimationEvent) =>
      consumerOnAnimationEnd?.(e as AnimationEvent & { currentTarget: EventTarget & HTMLDivElement });
    el.addEventListener('animationend', forward);
    return () => {
      el.removeEventListener('animationend', forward);
      beam?.destroy();
      beam = null;
    };
  });
  $effect(() => {
    beam?.update(options);
  });
</script>

{@html `<style>${view.css}</style>`}
<div
  {...props}
  bind:this={ref}
  data-beam={id}
  data-active={view.attributes['data-active']}
  data-fading={view.attributes['data-fading']}
  data-paused={view.attributes['data-paused']}
  style:--beam-strength={view.style['--beam-strength']}
  style:--pulse-glow-sx={view.style['--pulse-glow-sx']}
  style:--pulse-glow-sy={view.style['--pulse-glow-sy']}
>
  {@render children?.()}
  <div data-beam-bloom></div>
</div>
