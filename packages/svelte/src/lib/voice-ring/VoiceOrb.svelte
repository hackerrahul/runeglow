<!--
  @component
  The VoiceOrb component. Each instance runs its own rAF loop (capped near
  60 fps), paused while offscreen or on a hidden tab. Every frame the
  follower reads the voice source (a stream, an AnalyserNode or a level),
  shapes and smooths it, and the type's geometry is painted with the shared
  depth-shaded painter. Sources are read when the loop asks for them, so a
  new level getter or sensitivity never restarts the loop or resets the
  envelope.

  @example
  ```svelte
  <VoiceOrb type="aura" size={240} state="listening" stream={mic.stream} />
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { attachVoiceOrb, voiceOrbView, type VoiceOrbHandle, type VoiceOrbOptions, type VoiceOrbRoom } from 'runeglow/voice-ring';
  import { styleText } from 'runeglow/kit';
  import type { VoiceOrbProps } from './types';

  // The prop is called `state`, as in every framework; it is renamed on
  // the way in because a local of that name would shadow the `$state` rune.
  let {
    type, state: orbState, size, stream, analyser, level, sensitivity, threshold, attack, release,
    idle, calm, voiceSpeed, emotion, emotionColors, saturation, accent, gradientAngle,
    gradientSpin, direction, directionMove, directionPull, directionDeform, directionSquash,
    directionLens, directionStretch, directionSplit, directionBlur, directionBounce,
    directionMargin, directionBounds, hoverBend, neutral, colorBrightness, colorHue, gradientStart,
    gradientWidth, theme, speed, paused, color, dots, dotSize, opts, frame, onLevel,
    style,
    'aria-label': ariaLabel,
    ref = $bindable(null),
    ...rest
  }: VoiceOrbProps = $props();

  /* what the orb is told, as the core takes it; the defaults are the core's */
  const options = $derived<VoiceOrbOptions>({
    type, state: orbState, size, stream, analyser, level, sensitivity, threshold, attack, release,
    idle, calm, voiceSpeed, emotion, emotionColors, saturation, accent, gradientAngle,
    gradientSpin, direction, directionMove, directionPull, directionDeform, directionSquash,
    directionLens, directionStretch, directionSplit, directionBlur, directionBounce,
    directionMargin, directionBounds, hoverBend, neutral, colorBrightness, colorHue, gradientStart,
    gradientWidth, theme, speed, paused, color, dots, dotSize, opts, frame, onLevel,
  });

  /* The room the orb has to lean into, which the core measures once the
     canvas is on the page: the canvas reaches that far past the orb's box. */
  let room = $state.raw<VoiceOrbRoom>([Infinity, Infinity]);
  const view = $derived(voiceOrbView(options, room));

  /* the core does the listening, the drawing and the motion, on the canvas below */
  let orb: VoiceOrbHandle | null = null;
  $effect(() => {
    if (!ref) return;
    orb = attachVoiceOrb(ref, untrack(() => options), { onroom: (next) => (room = next) });
    return () => {
      orb?.destroy();
      orb = null;
    };
  });
  $effect(() => {
    orb?.update(options, room);
  });
</script>

<canvas
  bind:this={ref}
  role="img"
  aria-label={ariaLabel ?? view.label}
  style="{styleText(view.style)}{style ? ` ${style}` : ''}"
  {...rest}
></canvas>
