<!--
  @component
  VoiceBeam — sound-reactive glow for Svelte

  A centred, colourful beam along the bottom edge of the wrapped element
  that rises and blooms with the level of a voice. Feed it a microphone
  stream, or drive it yourself with `level`.

  @example
  ```svelte
  <script>
    const mic = useMicrophone();
  </script>

  <VoiceBeam stream={mic.stream}>
    <ChatInput />
  </VoiceBeam>
  ```
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { attachVoiceBeam, voiceBeamState, voiceBeamView, type VoiceBeamHandle, type VoiceBeamOptions } from 'runeglow/voice-glow';
  import type { VoiceBeamProps } from './types';

  let {
    children,
    ref = $bindable(null),
    type, look, dotSize, dotGap, dotShape, lineWidth, lineGap, linePattern, seeThrough, texture,
    gravity, surfaceHeight, surfaceCurve, surfaceTail, surfaceTailPosition, surfaceTailCurve,
    surfaceFade, scale, stream, sensitivity, threshold, attack, release, idle, breatheDuration,
    reach, spread, bands, flow, colorVariant, colors, bandColors, theme, staticColors, hueRange,
    hueDuration, active, paused, borderRadius, brightness, saturation, glowSize, strokeOpacity,
    innerOpacity, bloomOpacity, bend, bandStrength, bandWidth, bandPosition, bandCurve, bandSpread,
    bandSkew, bandOffset, bandTail, bandTailPosition, bandTailCurve, bandTailOverflow,
    bandAberration, distortion, distortionDetail, glowWidth, glowHeight, lobeSpacing, rangeWidth,
    rangeHeight, softness, coreSize, coreLight, coreLightWidth, coreLightHeight, strokeScale,
    innerScale, innerHeight, bloomScale, bloomHeight, strength, css,
    level, motion, onLevel, onActivate, onDeactivate,
    ...props
  }: VoiceBeamProps = $props();

  // Stable across server and client, so the generated stylesheet hydrates.
  const uid = $props.id();

  /* What the beam is told, as the core takes it; the defaults are the
     core's. The level, the motion and the callbacks are left out: the core
     reads those when it wants them, every frame, so a level that changes
     many times a second makes nothing here again. */
  const options = $derived<VoiceBeamOptions>({
    type, look, dotSize, dotGap, dotShape, lineWidth, lineGap, linePattern, seeThrough, texture,
    gravity, surfaceHeight, surfaceCurve, surfaceTail, surfaceTailPosition, surfaceTailCurve,
    surfaceFade, scale, stream, sensitivity, threshold, attack, release, idle, breatheDuration,
    reach, spread, bands, flow, colorVariant, colors, bandColors, theme, staticColors, hueRange,
    hueDuration, active, paused, borderRadius, brightness, saturation, glowSize, strokeOpacity,
    innerOpacity, bloomOpacity, bend, bandStrength, bandWidth, bandPosition, bandCurve, bandSpread,
    bandSkew, bandOffset, bandTail, bandTailPosition, bandTailCurve, bandTailOverflow,
    bandAberration, distortion, distortionDetail, glowWidth, glowHeight, lobeSpacing, rangeWidth,
    rangeHeight, softness, coreSize, coreLight, coreLightWidth, coreLightHeight, strokeScale,
    innerScale, innerHeight, bloomScale, bloomHeight, strength, css,
  });
  const told = (): VoiceBeamOptions => ({ ...options, level, motion, onLevel, onActivate, onDeactivate });

  /* What the page has told the beam since it was attached (the system's
     theme, whether it is on screen, where its fade stands). The server has
     none of it to ask, so both sides start on the same values and the
     client corrects itself once mounted. */
  let beamState = $state.raw(untrack(() => voiceBeamState(options)));
  const view = $derived(voiceBeamView(options, uid, beamState));

  /* the core does the listening and the motion, on the elements below */
  let beam: VoiceBeamHandle | null = null;
  $effect(() => {
    if (!ref) return;
    beam = attachVoiceBeam(ref, untrack(told), uid, { state: untrack(() => beamState), onstate: (next) => (beamState = next) });
    return () => {
      beam?.destroy();
      beam = null;
    };
  });
  /* after the elements show the state: the core looks for its canvases among them */
  $effect(() => {
    beam?.update(told(), beamState);
  });
</script>

{@html `<style>${view.css}</style>`}
<div
  {...props}
  bind:this={ref}
  {...view.attributes}
  style:--voice-strength={view.style['--voice-strength']}
>
  {@render children?.()}
  {#if view.parts.surface}
    <canvas data-voice-beam-surface aria-hidden="true"></canvas>
  {:else}
    <div data-voice-beam-bloom></div>
    {#if view.parts.warp}
      <!-- Mirrors of the inner light and bloom, clipped to below the band
           line and carrying the displacement filter. -->
      <div data-voice-beam-warp="inner"></div>
      <div data-voice-beam-warp="bloom"></div>
    {/if}
    {#if view.parts.halo}
      <canvas data-voice-beam-band-halo aria-hidden="true"></canvas>
    {/if}
    <canvas data-voice-beam-band aria-hidden="true"></canvas>
    <!-- After the band canvases, so the wash sits over the band's halo under
         the line (it is clipped to below the line, so the ridge itself
         stays) while the host's own content stays above it. -->
    {#if view.parts.core}
      <div data-voice-beam-core>
        <div></div>
      </div>
    {/if}
    {#if view.parts.warp}
      <!-- The distortion filter: drifting fractal noise, its green channel
           pinned to 0.5 so only x displaces, driven per frame by the driver
           (scale and offset), which also narrows the region to the strip
           under the band line once it runs — the full box here is only the
           first frame. Zero-sized, so it takes no room. -->
      <svg aria-hidden="true" width="0" height="0" style="position: absolute; pointer-events: none;">
        <filter id={view.parts.filterId} x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={view.parts.noiseFrequency} numOctaves="2" seed="7" result="noise" />
          <feOffset in="noise" dx="0" dy="0" result="moved" />
          <feColorMatrix in="moved" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    {/if}
  {/if}
</div>
