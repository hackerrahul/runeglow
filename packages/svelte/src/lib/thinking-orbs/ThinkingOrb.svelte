<!--
  @component
  The ThinkingOrb component. One shared clock (performance.now) keeps
  every mounted orb in phase; each instance runs its own rAF loop but
  pauses automatically while offscreen (IntersectionObserver) or when
  the tab is hidden (visibilitychange). Reduced-motion users get a
  static representative frame that still follows the live theme.

  @example
  ```svelte
  <ThinkingOrb state="searching" size={64} />
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { attachThinkingOrb, thinkingOrbView, type ThinkingOrbHandle, type ThinkingOrbOptions } from 'runeglow/thinking-orbs';
  import { styleText } from 'runeglow/kit';
  import type { ThinkingOrbProps } from './types';

  // The prop is called `state`, as in every framework; it is renamed on
  // the way in because a local of that name would shadow the `$state` rune.
  let {
    state: orbState,
    size,
    theme,
    speed,
    paused,
    color,
    dots,
    dotSize,
    opts,
    frame,
    gravity,
    style,
    'aria-label': ariaLabel,
    ref = $bindable(null),
    ...rest
  }: ThinkingOrbProps = $props();

  /* what the orb is told, as the core takes it; the defaults are the core's */
  const options = $derived<ThinkingOrbOptions>({
    state: orbState, size, theme, speed, paused, color, dots, dotSize, opts, frame, gravity,
  });
  const view = $derived(thinkingOrbView(options));

  /* the core does the drawing and the motion, on the canvas below */
  let orb: ThinkingOrbHandle | null = null;
  $effect(() => {
    if (!ref) return;
    orb = attachThinkingOrb(ref, untrack(() => options));
    return () => {
      orb?.destroy();
      orb = null;
    };
  });
  $effect(() => {
    orb?.update(options);
  });
</script>

<canvas
  bind:this={ref}
  role="img"
  aria-label={ariaLabel ?? view.label}
  style="{styleText(view.style)}{style ? ` ${style}` : ''}"
  {...rest}
></canvas>
