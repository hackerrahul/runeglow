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
  import type { BorderBeamProps } from './types';
  import { sizePresets, sizeThemePresets, generateBeamCSS, getPulseDriverConfig } from './styles';
  import { registerPulseInstance } from './pulseDriver';

  let {
    children,
    ref = $bindable(null),
    size = 'md',
    colorVariant = 'colorful',
    theme = 'dark',
    staticColors = false,
    duration,
    active = true,
    borderRadius: customBorderRadius,
    brightness: brightnessProp,
    saturation,
    hueRange = 30,
    glowSize = 1,
    strength = 1,
    css: extraCss,
    onActivate,
    onDeactivate,
    onanimationend: consumerOnAnimationEnd,
    ...props
  }: BorderBeamProps = $props();

  // Stable across server and client, so the generated stylesheet hydrates.
  const uid = $props.id();
  const id = uid.replace(/[^a-zA-Z0-9_-]/g, '-');

  // The server has no media query to ask, so both sides start on 'dark' and
  // the client corrects itself once mounted. Starting from the real value on
  // the client would leave a server-rendered stylesheet that hydration keeps.
  let systemTheme = $state<'dark' | 'light'>('dark');

  $effect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemTheme = mediaQuery.matches ? 'dark' : 'light';
    const handler = (e: MediaQueryListEvent) => {
      systemTheme = e.matches ? 'dark' : 'light';
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  });

  let isActive = $state(untrack(() => active));
  let isFading = $state(false);
  let isVisible = $state(true);
  let detectedRadius = $state<number | null>(null);
  let pulseGlowScale = $state<{ x: number; y: number }>({ x: 1, y: 1 });

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
      if (!isNaN(raw) && raw > 0) {
        detectedRadius = raw;
      }
    };

    detect();

    // Re-detect if child layout changes (e.g. CSS loaded late)
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

  // Pause the (paint-heavy) animations while the element is scrolled offscreen.
  // This stops per-frame painting entirely for hidden instances without changing
  // their logical active/fading state, so it never fires onActivate/onDeactivate.
  $effect(() => {
    const el = ref;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) isVisible = entry.isIntersecting;
      },
      // Start animating slightly before the element scrolls into view.
      { rootMargin: '256px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  });

  // Pulse Outside glow geometry is authored in fixed pixels for a reference
  // element (~350x140). Measure the actual wrapped element and scale the glow
  // per-axis so the halo grows/shrinks to fit any component it's applied to.
  $effect(() => {
    if (size !== 'pulse-outside') {
      untrack(() => {
        if (pulseGlowScale.x !== 1 || pulseGlowScale.y !== 1) pulseGlowScale = { x: 1, y: 1 };
      });
      return;
    }

    const el = ref;
    if (!el) return;

    const REF_WIDTH = 350;
    const REF_HEIGHT = 140;
    // Allow the glow to both shrink (small buttons) and grow (large cards),
    // with generous bounds to avoid degenerate geometry at the extremes.
    const MIN_SCALE = 0.35;
    const MAX_SCALE = 4;
    const clamp = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

    const measure = () => {
      const child = el.firstElementChild as HTMLElement | null;
      if (!child) return;
      const rect = child.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = +clamp(rect.width / REF_WIDTH).toFixed(3);
      const y = +clamp(rect.height / REF_HEIGHT).toFixed(3);
      untrack(() => {
        if (pulseGlowScale.x !== x || pulseGlowScale.y !== y) pulseGlowScale = { x, y };
      });
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;

    const child = el.firstElementChild as HTMLElement | null;
    if (!child) return;

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(child);
    return () => resizeObserver.disconnect();
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

  const resolvedTheme = $derived(theme === 'auto' ? systemTheme : theme);
  const themeConfig = $derived(sizeThemePresets[size][resolvedTheme]);
  const sizeConfig = $derived(sizePresets[size]);

  const isPulse = $derived(size === 'pulse-inner' || size === 'pulse-outside');

  const finalBorderRadius = $derived(
    customBorderRadius ?? detectedRadius ?? sizeConfig.borderRadius
  );
  const finalDuration = $derived(duration ?? (size === 'line' ? 3.1 : isPulse ? 2.3 : 1.96));
  const finalSaturation = $derived(saturation ?? themeConfig.saturation);
  const finalBrightness = $derived(brightnessProp ?? themeConfig.brightness ?? 1.3);
  const finalHueRange = $derived(size === 'line' ? Math.min(hueRange, 13) : hueRange);
  const finalStaticColors = $derived(colorVariant === 'mono' ? true : staticColors);

  const cssStyles = $derived(
    generateBeamCSS({
      id,
      borderRadius: finalBorderRadius,
      borderWidth: sizeConfig.borderWidth,
      duration: finalDuration,
      strokeOpacity: themeConfig.strokeOpacity,
      innerOpacity: themeConfig.innerOpacity,
      bloomOpacity: themeConfig.bloomOpacity,
      innerShadow: themeConfig.innerShadow,
      size,
      colorVariant,
      staticColors: finalStaticColors,
      brightness: finalBrightness,
      saturation: finalSaturation,
      hueRange: finalHueRange,
      theme: resolvedTheme,
      hairlineOpacity: themeConfig.hairlineOpacity,
      glowSize,
    })
  );

  // Runtime config for the JS breathing driver (null for non-pulse sizes).
  const driverConfig = $derived(
    isPulse
      ? getPulseDriverConfig(size, resolvedTheme, finalDuration, finalHueRange, finalStaticColors, id)
      : null
  );

  const running = $derived(isActive || isFading);

  // Drive the Pulse breathing from the shared, fps-capped rAF loop while the
  // instance is on, onscreen, and the user hasn't requested reduced motion.
  $effect(() => {
    if (!driverConfig) return;
    if (!running || !isVisible) return;

    const el = ref;
    if (!el) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    return registerPulseInstance(el, driverConfig);
  });

  // The sheet is written as raw HTML, so a consumer's `css` cannot be allowed
  // to close the element it sits in.
  const sheet = $derived(
    (extraCss ? `${cssStyles}\n${extraCss.split('{id}').join(id)}` : cssStyles).replace(
      /<\/(style)/gi,
      '<\\/$1'
    )
  );
</script>

{@html `<style>${sheet}</style>`}
<div
  {...props}
  bind:this={ref}
  data-beam={id}
  data-active={isActive && !isFading ? '' : undefined}
  data-fading={isFading ? '' : undefined}
  data-paused={isActive && !isFading && !isVisible ? '' : undefined}
  style:--beam-strength={Math.max(0, Math.min(1, strength))}
  style:--pulse-glow-sx={size === 'pulse-outside' ? pulseGlowScale.x : undefined}
  style:--pulse-glow-sy={size === 'pulse-outside' ? pulseGlowScale.y : undefined}
  onanimationend={handleAnimationEnd}
>
  {@render children?.()}
  <div data-beam-bloom></div>
</div>
