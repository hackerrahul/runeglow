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
<script lang="ts" module>
  /** Band colour defaults per theme, as `r, g, b` triples. */
  const BAND_COLORS = {
    dark: { core: '255, 255, 255', above: '255, 70, 80', mid: '90, 255, 150', below: '80, 140, 255' },
    light: { core: '197, 139, 255', above: '255, 122, 182', mid: '126, 196, 255', below: '45, 255, 171' },
  } as const;

  const BORDER_WIDTH = 1;
  const DEFAULT_RADIUS = 16;

  /* WebKit (Safari) evaluates SVG filters on HTML content on the CPU every
     paint, which on a phone-sized host drops the frame rate by an order of
     magnitude, so the displacement warp is off there above this host area:
     a chat input (~39k px²) or a pill keeps it, the phone crop (~97k px²)
     and any real screen do not. Its 2D canvas also has no `filter`, so the
     band's blur is done in CSS on two canvases instead (the ridge and its
     wider halo), keeping Chromium's look. The half-resolution soft layers
     are explicit (a per-layer factor on every length, not `zoom`), so they
     run on every engine; Safari 18 rasters them pre-scale as Chromium does. */
  const WEBKIT_WARP_MAX_AREA = 60_000;
  // Every iOS browser is WebKit whatever its name (CriOS, FxiOS); only
  // desktop Blink carries "Chrome/".
  const IS_WEBKIT =
    typeof navigator !== 'undefined' &&
    /AppleWebKit/.test(navigator.userAgent) &&
    !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent);
  const CANVAS_FILTER = (() => {
    if (typeof document === 'undefined') return true;
    const ctx = document.createElement('canvas').getContext('2d');
    return !!ctx && typeof (ctx as { filter?: unknown }).filter === 'string';
  })();
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { VoiceBeamProps } from './types';
  import { VOICE_SURFACE } from './flags';
  import { themePresets, generateVoiceBeamCSS } from './styles';
  import { registerVoiceInstance, type VoiceDriverConfig } from './voiceDriver';
  import { resolveVoiceDefaults, resolveVoiceStyle } from './presets';
  import { toTriple } from './color';

  let {
    children,
    ref = $bindable(null),
    type = 'default',
    look: lookProp = 'glow',
    dotSize = 1,
    dotGap = 1,
    dotShape = 'round',
    lineWidth = 1,
    lineGap = 1,
    linePattern = 'rows',
    seeThrough = false,
    texture = 0.6,
    gravity = 1,
    surfaceHeight = 1,
    surfaceCurve = 1,
    surfaceTail = 0,
    surfaceTailPosition = 0.6,
    surfaceTailCurve = 2.4,
    surfaceFade = 0.2,
    scale: scaleProp,
    stream = null,
    level = 0,
    sensitivity = 3.1,
    threshold = 0.015,
    attack = 0.325,
    release = 0.86,
    idle: idleProp,
    breatheDuration = 5.2,
    reach: reachProp,
    spread: spreadProp,
    bands = true,
    flow: flowProp,
    motion = null,
    colorVariant = 'colorful',
    colors,
    bandColors,
    theme = 'dark',
    staticColors = false,
    hueRange: hueRangeProp,
    hueDuration: hueDurationProp,
    active = true,
    paused = false,
    borderRadius: customBorderRadius,
    brightness: brightnessProp,
    saturation: saturationProp,
    glowSize: glowSizeProp,
    strokeOpacity: strokeOpacityProp,
    innerOpacity: innerOpacityProp,
    bloomOpacity: bloomOpacityProp,
    bend: bendProp,
    bandStrength: bandStrengthProp,
    bandWidth: bandWidthProp,
    bandPosition: bandPositionProp,
    bandCurve: bandCurveProp,
    bandSpread: bandSpreadProp,
    bandSkew: bandSkewProp,
    bandOffset: bandOffsetProp,
    bandTail: bandTailProp,
    bandTailPosition: bandTailPositionProp,
    bandTailCurve: bandTailCurveProp,
    bandTailOverflow: bandTailOverflowProp,
    bandAberration: bandAberrationProp,
    distortion: distortionProp,
    distortionDetail: distortionDetailProp,
    glowWidth: glowWidthProp,
    glowHeight: glowHeightProp,
    lobeSpacing: lobeSpacingProp,
    rangeWidth: rangeWidthProp,
    rangeHeight: rangeHeightProp,
    softness: softnessProp,
    coreSize: coreSizeProp,
    coreLight: coreLightProp,
    coreLightWidth: coreLightWidthProp,
    coreLightHeight: coreLightHeightProp,
    strokeScale: strokeScaleProp,
    innerScale: innerScaleProp,
    innerHeight: innerHeightProp,
    bloomScale: bloomScaleProp,
    bloomHeight: bloomHeightProp,
    strength: strengthProp,
    css: extraCss,
    onLevel,
    onActivate,
    onDeactivate,
    onanimationend: consumerOnAnimationEnd,
    ...props
  }: VoiceBeamProps = $props();

  // Stable across server and client, so the generated stylesheet hydrates.
  const uid = $props.id();
  const id = uid.replace(/[^a-zA-Z0-9_-]/g, '-');

  // The server has no media queries to ask, so both sides start on the same
  // values and the client corrects itself once mounted.
  let systemTheme = $state<'dark' | 'light'>('dark');
  $effect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemTheme = mediaQuery.matches ? 'dark' : 'light';
    const handler = (e: MediaQueryListEvent) => (systemTheme = e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  });

  let reducedMotion = $state(false);
  $effect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = mediaQuery.matches;
    const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  });

  const resolvedTheme = $derived(theme === 'auto' ? systemTheme : theme);

  // Custom colours are compared by value, so a fresh array literal does not
  // rebuild the stylesheet or re-register the driver.
  const colorsKey = $derived(colors ? colors.join('|') : '');
  const bandColorsKey = $derived(
    bandColors ? [bandColors.core, bandColors.above, bandColors.mid, bandColors.below].join('|') : ''
  );

  let isActive = $state(untrack(() => active));
  let isFading = $state(false);
  let isVisible = $state(true);
  let detectedRadius = $state<number | null>(null);
  /* The host's area, measured on WebKit only, to keep the warp off large hosts there. */
  let hostArea = $state(0);
  $effect(() => {
    if (!IS_WEBKIT) return;
    const el = ref;
    if (!el) return;
    const measure = () => (hostArea = el.clientWidth * el.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // Dots and lines are one surface, painted on a canvas instead of the glow's layers.
  // Not released yet: without the switch every look is the glow.
  const look = $derived(VOICE_SURFACE ? lookProp : 'glow');
  const isSurface = $derived(VOICE_SURFACE && (look === 'dots' || look === 'lines'));

  // The type preset supplies the geometry defaults; an explicit prop
  // wins; `scale` then multiplies every pixel dimension as one.
  const g = $derived.by(() => {
    const d = resolveVoiceDefaults(type, resolvedTheme);
    const sc = Math.max(0.05, scaleProp ?? d.scale);
    const distortionBase = distortionProp ?? d.distortion;
    return {
      sc,
      glowSize: glowSizeProp ?? d.glowSize,
      strokeOpacityMul: strokeOpacityProp ?? d.strokeOpacity,
      innerOpacityMul: innerOpacityProp ?? d.innerOpacity,
      bloomOpacityMul: bloomOpacityProp ?? d.bloomOpacity,
      idle: idleProp ?? d.idle,
      reach: reachProp ?? d.reach,
      spread: spreadProp ?? d.spread,
      flow: (flowProp ?? d.flow) * sc,
      bend: (bendProp ?? d.bend) * sc,
      bandStrength: bandStrengthProp ?? d.bandStrength,
      bandWidth: (bandWidthProp ?? d.bandWidth) * sc,
      bandPosition: bandPositionProp ?? d.bandPosition,
      bandCurve: bandCurveProp ?? d.bandCurve,
      bandSpread: bandSpreadProp ?? d.bandSpread,
      bandSkew: bandSkewProp ?? d.bandSkew,
      bandOffset: (bandOffsetProp ?? d.bandOffset) * sc,
      bandTail: bandTailProp ?? d.bandTail,
      bandTailPosition: bandTailPositionProp ?? d.bandTailPosition,
      bandTailCurve: bandTailCurveProp ?? d.bandTailCurve,
      bandTailOverflow: (bandTailOverflowProp ?? d.bandTailOverflow) * sc,
      bandAberration: bandAberrationProp ?? d.bandAberration,
      // The WebKit gate is about the SVG warp's cost; the surface has no warp.
      distortion: !isSurface && IS_WEBKIT && hostArea > WEBKIT_WARP_MAX_AREA ? 0 : distortionBase,
      distortionDetail: (distortionDetailProp ?? d.distortionDetail) / sc,
      glowWidth: (glowWidthProp ?? d.glowWidth) * sc,
      glowHeight: (glowHeightProp ?? d.glowHeight) * sc,
      lobeSpacing: (lobeSpacingProp ?? d.lobeSpacing) * sc,
      rangeWidth: (rangeWidthProp ?? d.rangeWidth) * sc,
      rangeHeight: (rangeHeightProp ?? d.rangeHeight) * sc,
      softness: softnessProp ?? d.softness,
      coreSize: (coreSizeProp ?? d.coreSize) * sc,
      coreLight: Math.max(0, Math.min(3, coreLightProp ?? d.coreLight)),
      coreLightWidth: coreLightWidthProp ?? d.coreLightWidth,
      coreLightHeight: coreLightHeightProp ?? d.coreLightHeight,
      strokeScale: strokeScaleProp ?? d.strokeScale,
      innerScale: innerScaleProp ?? d.innerScale,
      innerHeight: innerHeightProp ?? d.innerHeight,
      bloomScale: bloomScaleProp ?? d.bloomScale,
      bloomHeight: bloomHeightProp ?? d.bloomHeight,
    };
  });

  // Auto-detect child border radius when no explicit value is provided
  $effect(() => {
    if (customBorderRadius != null) return;
    const el = ref;
    if (!el) return;

    const detect = () => {
      const child = el.firstElementChild as HTMLElement | null;
      if (!child) return;
      const computed = getComputedStyle(child);
      const raw = parseFloat(computed.borderTopLeftRadius);
      if (!isNaN(raw) && raw > 0) detectedRadius = raw;
    };

    detect();
    const observer = new MutationObserver(detect);
    observer.observe(el, { childList: true, subtree: false });
    return () => observer.disconnect();
  });

  $effect(() => {
    if (active && !isActive && !isFading) {
      isActive = true;
    } else if (!active && isActive && !isFading) {
      isFading = true;
    }
  });

  // Stop the per-frame work while the element is scrolled offscreen.
  $effect(() => {
    const el = ref;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) isVisible = entry.isIntersecting;
      },
      { rootMargin: '256px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  function handleAnimationEnd(e: AnimationEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    const animationName = e.animationName;
    if (animationName.includes('fade-out')) {
      isActive = false;
      isFading = false;
      onDeactivate?.();
    } else if (animationName.includes('fade-in')) {
      onActivate?.();
    }
    consumerOnAnimationEnd?.(e);
  }

  const preset = $derived(themePresets[resolvedTheme]);
  const finalBorderRadius = $derived(customBorderRadius ?? detectedRadius ?? DEFAULT_RADIUS);
  const typeStyle = $derived(resolveVoiceStyle(type, resolvedTheme));
  const strength = $derived(strengthProp ?? typeStyle.strength ?? preset.strength ?? 1);
  const hueRange = $derived(hueRangeProp ?? preset.hueRange ?? 24);
  const hueDuration = $derived(hueDurationProp ?? preset.hueDuration ?? 12);
  const finalBrightness = $derived(brightnessProp ?? typeStyle.brightness ?? preset.brightness);
  const finalSaturation = $derived(saturationProp ?? typeStyle.saturation ?? preset.saturation);

  const cssStyles = $derived.by(() => {
    colorsKey;
    return generateVoiceBeamCSS({
      id,
      borderRadius: finalBorderRadius,
      borderWidth: BORDER_WIDTH,
      strokeOpacity: preset.strokeOpacity * g.strokeOpacityMul,
      innerOpacity: preset.innerOpacity * g.innerOpacityMul,
      bloomOpacity: preset.bloomOpacity * g.bloomOpacityMul,
      innerShadow: preset.innerShadow,
      colorVariant,
      colors: untrack(() => colors),
      brightness: finalBrightness,
      saturation: finalSaturation,
      theme: resolvedTheme,
      hueBase: preset.hueBase ?? 0,
      glowSize: g.glowSize * g.sc,
      glowWidth: g.glowWidth,
      glowHeight: g.glowHeight,
      strokeScale: g.strokeScale,
      innerScale: g.innerScale,
      innerHeight: g.innerHeight,
      bloomScale: g.bloomScale,
      bloomHeight: g.bloomHeight,
      coreSize: g.coreSize,
      coreLight: g.coreLight,
      coreLightWidth: g.coreLightWidth,
      coreLightHeight: g.coreLightHeight,
      rangeWidth: g.rangeWidth,
      rangeHeight: g.rangeHeight,
      softness: g.softness,
      distortion: g.distortion > 0,
      scale: g.sc,
      look,
    });
  });

  // Runtime config for the shared driver.
  const driverConfig = $derived.by<VoiceDriverConfig>(() => {
    bandColorsKey;
    const custom = untrack(() => bandColors);
    return {
      id,
      sensitivity: Math.max(0, sensitivity),
      threshold: Math.max(0, Math.min(0.95, threshold)),
      attack: Math.max(0, attack),
      release: Math.max(0, release),
      idle: Math.max(0, Math.min(1, g.idle)),
      breatheDuration: Math.max(0.2, breatheDuration),
      reach: Math.max(0, g.reach),
      spread: Math.max(0, g.spread),
      bands,
      flow: g.flow,
      lobeSpacing: Math.max(0.1, g.lobeSpacing),
      bend: Math.max(0, g.bend),
      bandStrength: Math.max(0, g.bandStrength),
      bandWidth: Math.max(0, g.bandWidth),
      bandPosition: Math.max(0, g.bandPosition),
      bandCurve: Math.max(0.3, g.bandCurve),
      bandSpread: Math.max(0.05, g.bandSpread),
      bandSkew: Math.max(-0.9, Math.min(0.9, g.bandSkew)),
      bandOffset: g.bandOffset,
      bandTail: Math.max(0, Math.min(1.5, g.bandTail)),
      bandTailPosition: Math.max(0, Math.min(0.98, g.bandTailPosition)),
      bandTailCurve: Math.max(0.5, g.bandTailCurve),
      bandTailOverflow: Math.max(0, g.bandTailOverflow),
      bandAberration: Math.max(0, Math.min(1, g.bandAberration)),
      rangeWidth: g.rangeWidth,
      rangeHeight: g.rangeHeight,
      theme: resolvedTheme,
      bandColors: {
        core: (custom?.core && toTriple(custom.core)) || BAND_COLORS[resolvedTheme].core,
        above: (custom?.above && toTriple(custom.above)) || BAND_COLORS[resolvedTheme].above,
        mid: (custom?.mid && toTriple(custom.mid)) || BAND_COLORS[resolvedTheme].mid,
        below: (custom?.below && toTriple(custom.below)) || BAND_COLORS[resolvedTheme].below,
      },
      distortion: Math.max(0, Math.min(1, g.distortion)),
      coreLight: g.coreLight,
      scale: g.sc,
      radius: finalBorderRadius,
      hueRange: Math.max(0, hueRange),
      hueDuration: Math.max(0.5, hueDuration),
      staticColors: colorVariant === 'mono' ? true : staticColors,
      reducedMotion,
      paused,
      look,
      dotSize: Math.max(0.1, dotSize),
      dotGap: Math.max(0.3, dotGap),
      dotShape: dotShape === 'square' ? 'square' : 'round',
      lineWidth: Math.max(0.05, lineWidth),
      lineGap: Math.max(0.3, lineGap),
      linePattern: linePattern === 'columns' || linePattern === 'grid' ? linePattern : 'rows',
      seeThrough,
      texture: Math.max(0, Math.min(1, texture)),
      gravity: Math.max(0.05, gravity),
      surfaceHeight: Math.max(0.1, surfaceHeight),
      surfaceCurve: Math.max(-3, Math.min(5, surfaceCurve)),
      surfaceTail: Math.max(-2, Math.min(3, surfaceTail)),
      surfaceTailPosition: Math.max(0, Math.min(0.98, surfaceTailPosition)),
      surfaceTailCurve: Math.max(0.5, surfaceTailCurve),
      surfaceFade: Math.max(0, Math.min(1, surfaceFade)),
      layers: {
        glowWidth: g.glowWidth,
        glowHeight: g.glowHeight,
        innerScale: g.innerScale,
        innerHeight: g.innerHeight,
        bloomScale: g.bloomScale,
        bloomHeight: g.bloomHeight,
        strokeScale: g.strokeScale,
        softness: g.softness,
        coreSize: g.coreSize,
        innerOpacity: g.innerOpacityMul,
        bloomOpacity: g.bloomOpacityMul,
        strokeOpacity: g.strokeOpacityMul,
        brightness: finalBrightness,
      },
    };
  });

  const running = $derived(isActive || isFading);

  // The manual level, the motion and the onLevel callback are read when the
  // driver asks for them, every frame, and not while this effect runs: a
  // changing value never tears the driver down and up.
  $effect(() => {
    if (!running || !isVisible) return;
    const el = ref;
    if (!el) return;

    const getLevel = () => (typeof level === 'function' ? level() : level);
    const report = (value: number) => onLevel?.(value);
    const getMotion = () => (typeof motion === 'function' ? motion() : motion);

    const config = driverConfig;
    const source = stream;
    // Registering may sample the level straight away; that read must not
    // become something this effect waits on.
    return untrack(() => registerVoiceInstance(el, config, { stream: source, getLevel, getMotion }, report));
  });

  // The sheet is written as raw HTML, so a consumer's `css` cannot be allowed
  // to close the element it sits in.
  const sheet = $derived(
    (extraCss ? `${cssStyles}\n${extraCss.split('{id}').join(id)}` : cssStyles).replace(
      /<\/(style)/gi,
      '<\\/$1'
    )
  );

  const noiseFrequency = $derived(
    `${(0.012 * g.distortionDetail).toFixed(4)} ${(0.05 * g.distortionDetail).toFixed(4)}`
  );
</script>

{@html `<style>${sheet}</style>`}
<div
  {...props}
  bind:this={ref}
  data-voice-beam={id}
  data-voice-type={type}
  data-voice-look={look}
  data-voice-halfres=""
  data-active={isActive && !isFading ? '' : undefined}
  data-fading={isFading ? '' : undefined}
  data-paused={isActive && !isFading && (!isVisible || paused) ? '' : undefined}
  data-listening={stream ? '' : undefined}
  style:--voice-strength={Math.max(0, Math.min(1, strength))}
  onanimationend={handleAnimationEnd}
>
  {@render children?.()}
  {#if isSurface}
    <canvas data-voice-beam-surface aria-hidden="true"></canvas>
  {:else}
    <div data-voice-beam-bloom></div>
    {#if g.distortion > 0}
      <!-- Mirrors of the inner light and bloom, clipped to below the band
           line and carrying the displacement filter. -->
      <div data-voice-beam-warp="inner"></div>
      <div data-voice-beam-warp="bloom"></div>
    {/if}
    {#if !CANVAS_FILTER}
      <canvas data-voice-beam-band-halo aria-hidden="true"></canvas>
    {/if}
    <canvas data-voice-beam-band aria-hidden="true"></canvas>
    <!-- After the band canvases, so the wash sits over the band's halo under
         the line (it is clipped to below the line, so the ridge itself
         stays) while the host's own content stays above it. -->
    {#if g.coreLight > 0}
      <div data-voice-beam-core>
        <div></div>
      </div>
    {/if}
    {#if g.distortion > 0}
      <!-- The distortion filter: drifting fractal noise, its green channel
           pinned to 0.5 so only x displaces, driven per frame by the driver
           (scale and offset), which also narrows the region to the strip
           under the band line once it runs — the full box here is only the
           first frame. Zero-sized, so it takes no room. -->
      <svg aria-hidden="true" width="0" height="0" style="position: absolute; pointer-events: none;">
        <filter id="vb-distort-{id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={noiseFrequency} numOctaves="2" seed="7" result="noise" />
          <feOffset in="noise" dx="0" dy="0" result="moved" />
          <feColorMatrix in="moved" type="matrix" values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 0 1" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    {/if}
  {/if}
</div>
