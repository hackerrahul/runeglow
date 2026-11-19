<!--
  @component
  An animated WebGL "image generation" loader. Wrap a card and it gets a
  shader-driven mosaic that can resolve into an image from a pool you
  provide, hold it, and dissolve back.

  The component exposes four functions; bind it with `bind:this` to call
  them: `triggerReveal`, `triggerHide`, `triggerRegenerate`, `isImageActive`.

  @example
  ```svelte
  <ImageGeneration preset="pixels-organic" images={['/a.jpg', '/b.jpg']} autoReveal>
    <div style="width: 320px; height: 320px; border-radius: 20px;"></div>
  </ImageGeneration>
  ```
-->
<script lang="ts" module>
  import type { ImageGenerationPreset } from './types';
  import { ensureStylesInjected } from './styles';

  ensureStylesInjected();

  /**
   * Resolve `'auto'` to a concrete `'dark' | 'light'` value, checking sources in
   * priority order so the library plays nicely with the most common app-side
   * theme conventions (not just the OS-level media query):
   *
   *   1. `<html data-theme="dark|light">`          — shadcn / many SSR apps
   *   2. `<html class="dark">` / `class="light">`  — Tailwind v3 darkMode: class
   *   3. `<html style="color-scheme: dark">`       — CSS-only theme toggles
   *   4. `matchMedia('(prefers-color-scheme: dark)')` — OS / browser preference
   *   5. Default `'dark'`                          — SSR-safe fallback
   *
   * Live updates: subscribed to both the matchMedia change event AND a
   * MutationObserver on `<html>` for `class` / `style` / `data-theme` changes,
   * so toggling a theme-class via JS reflects in the shader without remount.
   */
  function detectTheme(): 'dark' | 'light' {
    if (typeof document === 'undefined') return 'dark';
    const html = document.documentElement;

    const dataTheme = html.getAttribute('data-theme');
    if (dataTheme === 'dark' || dataTheme === 'light') return dataTheme;

    if (html.classList.contains('dark')) return 'dark';
    if (html.classList.contains('light')) return 'light';

    const colorScheme = html.style.colorScheme || getComputedStyle(html).colorScheme;
    if (colorScheme === 'dark') return 'dark';
    if (colorScheme === 'light') return 'light';

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  function normaliseImages(input: string | string[] | undefined): string[] {
    if (!input) return [];
    if (typeof input === 'string') return [input];
    return input.slice();
  }

  /** The regenerate churn always runs on one of these pixel-mosaic presets. */
  const PIXEL_CHURN_PRESETS = ['pixels-mechanic', 'pixels-organic'] as const;

  type PixelChurnPreset = (typeof PIXEL_CHURN_PRESETS)[number];

  function isPixelChurnPreset(name: ImageGenerationPreset): name is PixelChurnPreset {
    return (PIXEL_CHURN_PRESETS as readonly string[]).includes(name);
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import {
    createCycle,
    createInstance,
    createReveal,
    destroyInstance,
    renderInstanceOnce,
    samplePaletteFromCanvas,
    setInstanceCardBg,
    setInstanceColors,
    setInstancePaused,
    setInstancePixelScale,
    setInstancePreset,
    setInstanceSpeed,
    setInstanceStrength,
    setInstanceVisible,
    setSharedFragmentShader,
    updateInstanceSize,
    type Cycle,
    type Instance,
    type RevealState,
    type SampledPalette
  } from './engine';
  import { PRESETS } from './presets';
  import type { ImageGenerationHandle, ImageGenerationProps } from './types';

  let {
    children,
    preset = 'pixels-organic',
    theme = 'auto',
    strength = 1,
    speed = 1,
    pixelScale = 1,
    cardBg: cardBgProp,
    colors,
    images,
    autoReveal = false,
    revealDelayRange = [2, 4],
    revealInitialDelay,
    revealHoldMs = 2000,
    revealFadeOutMs = 300,
    borderRadius,
    paused = false,
    fragmentShader,
    onCycle,
    excludeSrcs,
    class: className,
    style,
    ref = $bindable(null),
    ...rest
  }: ImageGenerationProps = $props();

  let shaderCanvas = $state<HTMLCanvasElement | null>(null);
  let overlayCanvas = $state<HTMLCanvasElement | null>(null);
  let contentEl = $state<HTMLDivElement | null>(null);

  // Engine objects. They are not reactive; `generation` is, and it moves when
  // they are created, so the effects that keep them in step run again.
  let instance: Instance | null = null;
  let reveal: RevealState | null = null;
  let cycle: Cycle | null = null;
  let generation = $state(0);

  // The corner radius the engine settled on, mirrored onto the wrapper.
  let radius = $state<number | null>(null);

  // Transient image-derived recolor for the regenerate churn. While set, it
  // overrides the palette + card surface (shader uniforms AND the wrapper's
  // CSS background) so the effect wears the outgoing image's colors; cleared
  // automatically when the next image reaches `visible`.
  let regenTint = $state.raw<SampledPalette | null>(null);

  // Transient preset override for the regenerate churn. The churn must always
  // run on a pixel-mosaic preset (`pixels-mechanic` / `pixels-organic`): when
  // the active preset is not one of those (e.g. `sweep-gradient`), a random
  // pixel preset is swapped onto the instance for the churn's duration and
  // the authored preset is restored once the next image is fully visible.
  let regenPresetName = $state<ImageGenerationPreset | null>(null);

  // 'auto' starts as 'dark', so server and client agree; the effect corrects
  // it from the page before the first frame is drawn.
  let resolvedTheme = $state<'dark' | 'light'>(untrack(() => (theme !== 'auto' ? theme : 'dark')));
  $effect(() => {
    if (theme !== 'auto') {
      resolvedTheme = theme;
      return;
    }
    if (typeof window === 'undefined') return;

    const update = (): void => {
      resolvedTheme = detectTheme();
    };
    update();

    const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    mql?.addEventListener('change', update);

    let mo: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(update);
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-theme']
      });
    }

    return () => {
      mql?.removeEventListener('change', update);
      mo?.disconnect();
    };
  });

  const presetMode = $derived(PRESETS[preset].modes[resolvedTheme]);
  // Effective background colour (override > preset). Drives both the wrapper's
  // CSS background and the shader's `u_cardBg` uniform so contrast logic in
  // the shader stays in sync with the actual host card surface.
  const cardBg = $derived(cardBgProp ?? presetMode.cardBg);
  const imagesArr = $derived(normaliseImages(images));

  // Resolve `revealInitialDelay` into a stable ms value once. Range tuples
  // randomise here, so later prop changes never reseed the value.
  const initialDelayMs = untrack(() => {
    if (revealInitialDelay == null) return undefined;
    if (typeof revealInitialDelay === 'number') return Math.max(0, revealInitialDelay) * 1000;
    const [min, max] = revealInitialDelay;
    const lo = Math.max(0, Math.min(min, max));
    const hi = Math.max(0, Math.max(min, max));
    return (lo + Math.random() * (hi - lo)) * 1000;
  });

  /**
   * Run a reveal pass now. No-op while one is already in progress. With
   * `hold: 'manual'` the image stays until `triggerHide()` is called.
   */
  export const triggerReveal: ImageGenerationHandle['triggerReveal'] = (opts) => {
    cycle?.triggerOnce(opts);
  };

  /** Fade the revealed image back to the effect. No-op if none is showing. */
  export const triggerHide: ImageGenerationHandle['triggerHide'] = () => {
    cycle?.triggerHide();
  };

  /**
   * Regenerate the revealed image in place: it breaks into the effect's
   * cells, churns, and the next image from the pool dissolves in.
   */
  export const triggerRegenerate: ImageGenerationHandle['triggerRegenerate'] = (opts) => {
    if (!cycle || paused) return;
    const phase = cycle.getPhase();
    if (phase !== 'reveal' && phase !== 'visible') return;
    // The churn always runs on a pixel-mosaic preset: keep the active
    // preset when it's already one, otherwise (e.g. sweep-gradient)
    // temporarily switch the instance to a random pixel preset. The
    // authored preset is restored when the next image reaches `visible`.
    const churnName = isPixelChurnPreset(preset)
      ? null
      : PIXEL_CHURN_PRESETS[Math.floor(Math.random() * PIXEL_CHURN_PRESETS.length)];
    // Recolor the effect from the visible image (overlay canvas) so the
    // churn showing through the dropped cells reads as pixelation born
    // from that image rather than the preset's stock palette. The sample
    // maps onto the CHURN preset's palette slots (the preset actually
    // rendering during the churn), not the outgoing preset's.
    if (opts?.tintFromImage ?? true) {
      if (overlayCanvas) {
        const churnColors = churnName ? PRESETS[churnName].modes[resolvedTheme].colors : presetMode.colors;
        const sampled = samplePaletteFromCanvas(overlayCanvas, churnColors);
        if (sampled) regenTint = sampled;
      }
    }
    if (churnName) regenPresetName = churnName;
    const auto = opts?.autoReveal ?? true;
    cycle.triggerBoil(auto ? { autoRevealAfterMs: opts?.durationMs ?? 4000 } : undefined);
  };

  /** True while an image is showing on top of the effect. */
  export const isImageActive: ImageGenerationHandle['isImageActive'] = () => {
    const phase = cycle?.getPhase() ?? 'idle';
    return phase === 'reveal' || phase === 'visible' || phase === 'hide';
  };

  // Lifecycle: create instance + reveal once the nodes exist, destroy on
  // unmount. Everything else it reads is read when it is needed.
  $effect(() => {
    const root = ref;
    const shader = shaderCanvas;
    const overlay = overlayCanvas;
    if (!root || !shader || !overlay) return;
    return untrack(() => mount(root, shader, overlay));
  });

  function mount(root: HTMLDivElement, shader: HTMLCanvasElement, overlay: HTMLCanvasElement): () => void {
    ensureStylesInjected();

    // Dynamic measure: size from the root's bounding box and corner radius
    // from the wrapped child's computed style (falls back to the root if the
    // child has none). The shader can only render a single uniform corner
    // radius, so we sample `borderTopLeftRadius` and apply it on all four
    // corners — matches how the canvases inherit border-radius from the root.
    const measure = (): { w: number; h: number; r: number } => {
      const rect = root.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      let r = 0;
      if (typeof borderRadius === 'number') {
        r = borderRadius;
      } else {
        const childEl = contentEl?.firstElementChild as HTMLElement | null;
        if (childEl) {
          const parsed = parseFloat(getComputedStyle(childEl).borderTopLeftRadius);
          if (Number.isFinite(parsed) && parsed > 0) r = parsed;
        }
        if (r === 0) {
          // The wrapper's own radius, ignoring the one this component sets.
          const own = root.style.borderRadius;
          root.style.borderRadius = '';
          const parsed = parseFloat(getComputedStyle(root).borderTopLeftRadius);
          root.style.borderRadius = own;
          if (Number.isFinite(parsed) && parsed > 0) r = parsed;
        }
      }
      return { w, h, r };
    };

    const initial = measure();
    const inst = createInstance({
      canvas: shader,
      cssWidth: initial.w,
      cssHeight: initial.h,
      preset: presetMode,
      strength,
      speed,
      cardBg: cardBgProp ?? null,
      pixelScale
    });
    instance = inst;
    inst.canvas.style.opacity = String(Math.max(0, Math.min(1, strength)));

    const rev = createReveal({
      canvas: overlay,
      cssWidth: initial.w,
      cssHeight: initial.h,
      shaderCanvas: shader
    });
    inst.reveal = rev;
    reveal = rev;

    // Cycle is created up-front (independent of `autoReveal`) so that the
    // imperative `triggerReveal()` works for manual user-driven reveals too.
    // `start()` is only called when `autoReveal` is true (separate effect).
    const cyc = createCycle({
      reveal: rev,
      images: imagesArr,
      delayRange: revealDelayRange,
      holdMs: revealHoldMs,
      fadeOutMs: revealFadeOutMs,
      initialDelayMs,
      onPhase: (e) => {
        // A fully-visible image ends any regenerate churn — restore the
        // preset palette / consumer-provided colors and the authored preset.
        if (e.phase === 'visible') {
          regenTint = null;
          regenPresetName = null;
        }
        onCycle?.(e);
      },
      excludeSrcs: () => excludeSrcs?.() ?? null
    });
    cycle = cyc;
    if (paused) cyc.setPaused(true);

    radius = initial.r;

    // Sync the wrapper's dimensions + corner radius to the host card.
    //
    // The radius must follow the wrapped child dynamically so the effect
    // always matches whatever the consumer's card looks like — even if they
    // toggle a class, adjust an inline style, or swap the child entirely.
    //
    // Three observers handle the three change vectors:
    //   1. ResizeObserver on root  -> wrapper resized (window resize, parent
    //      flex/grid change, container query, etc.)
    //   2. ResizeObserver on child -> child intrinsic size changed (text
    //      reflow, image load), which can also imply a CSS recalc that
    //      affects radius.
    //   3. MutationObserver on child -> class / style / data-* attribute
    //      changes that may swap border-radius without touching size (theme
    //      toggle, hover/active class flip from parent, etc.).
    //
    // All three coalesce through a single rAF so the canvas isn't resized
    // more than once per frame.
    let resizeRaf = 0;
    let lastW = initial.w;
    let lastH = initial.h;
    let lastR = initial.r;
    const applyMeasure = (): void => {
      resizeRaf = 0;
      if (instance !== inst) return;
      const next = measure();
      // Skip GL resize if dimensions didn't actually change; still re-apply
      // border-radius because that's the cheap part and may have moved.
      if (next.w !== lastW || next.h !== lastH) {
        updateInstanceSize(inst, next.w, next.h);
        lastW = next.w;
        lastH = next.h;
      }
      if (next.r !== lastR) {
        radius = next.r;
        lastR = next.r;
      }
    };
    const scheduleMeasure = (): void => {
      if (resizeRaf !== 0) return;
      resizeRaf = requestAnimationFrame(applyMeasure);
    };
    remeasure = scheduleMeasure;

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(root);
    const childEl = contentEl?.firstElementChild as HTMLElement | null;
    if (childEl) ro.observe(childEl);

    // Watch for CSS-affecting attribute changes on the child so radius
    // updates that don't trigger a resize (e.g. swapping a `rounded-lg`
    // class with `rounded-xl`) are still reflected immediately.
    let mo: MutationObserver | null = null;
    if (childEl && typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(scheduleMeasure);
      mo.observe(childEl, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (instance !== inst) return;
          for (const e of entries) setInstanceVisible(inst, e.isIntersecting);
        },
        { rootMargin: '64px' }
      );
      io.observe(root);
    }
    generation += 1;

    return () => {
      ro.disconnect();
      mo?.disconnect();
      io?.disconnect();
      if (resizeRaf !== 0) cancelAnimationFrame(resizeRaf);
      remeasure = null;
      cyc.dispose();
      if (cycle === cyc) cycle = null;
      rev.dispose();
      if (reveal === rev) reveal = null;
      destroyInstance(inst);
      if (instance === inst) instance = null;
    };
  }

  let remeasure: (() => void) | null = null;
  // An explicit radius is read when the wrapper is measured; measure again
  // when it changes.
  $effect(() => {
    borderRadius;
    generation;
    untrack(() => remeasure?.());
  });

  // Sync preset/theme to the instance + force a one-shot repaint so paused
  // instances reflect the prop change live (rAF tick is gated on `!paused`).
  // An active regenerate churn preset override takes precedence over the prop.
  $effect(() => {
    generation;
    const effectiveMode = regenPresetName ? PRESETS[regenPresetName].modes[resolvedTheme] : presetMode;
    if (!instance) return;
    setInstancePreset(instance, effectiveMode);
    renderInstanceOnce(instance);
  });

  // Sync cardBg override to the instance (shader uniform + reveal helper),
  // then repaint once so the change shows immediately even while paused.
  // An active regenerate tint takes precedence over the prop.
  $effect(() => {
    generation;
    const bg = regenTint?.cardBg ?? cardBgProp ?? null;
    if (!instance) return;
    setInstanceCardBg(instance, bg);
    renderInstanceOnce(instance);
  });

  // Sync the palette override (per-slot colors, e.g. sampled from an image).
  // An active regenerate tint takes precedence over the prop.
  $effect(() => {
    generation;
    const palette = regenTint?.colors ?? colors ?? null;
    if (!instance) return;
    setInstanceColors(instance, palette);
    renderInstanceOnce(instance);
  });

  // Sync strength via the visible canvas opacity (no shader recompile).
  // The `opacity` style change is purely DOM and applies even while paused;
  // no GL repaint needed.
  $effect(() => {
    generation;
    const amount = strength;
    if (!instance) return;
    setInstanceStrength(instance, amount);
    if (instance.canvas) instance.canvas.style.opacity = String(Math.max(0, Math.min(1, amount)));
  });

  // Sync speed — scales the instance's animation clock, no repaint needed.
  $effect(() => {
    generation;
    const rate = speed;
    if (instance) setInstanceSpeed(instance, rate);
  });

  // Sync pixelScale (recomputes the mosaic grid density) and repaint once so
  // the change is visible immediately even while paused.
  $effect(() => {
    generation;
    const scale = pixelScale;
    if (!instance) return;
    setInstancePixelScale(instance, scale);
    renderInstanceOnce(instance);
  });

  // Custom fragment stage: page-wide while set, back to the bundled one when
  // this instance drops it or unmounts.
  $effect(() => {
    if (!fragmentShader) return;
    setSharedFragmentShader(fragmentShader);
    return () => setSharedFragmentShader(null);
  });

  $effect(() => {
    generation;
    const hold = paused;
    if (instance) setInstancePaused(instance, hold);
    cycle?.setPaused(hold);
  });

  // Patch live updates to the always-on cycle (avoid recreating per prop change).
  $effect(() => {
    generation;
    cycle?.setImages(imagesArr);
  });
  $effect(() => {
    generation;
    cycle?.setOptions({
      delayRange: revealDelayRange,
      holdMs: revealHoldMs,
      fadeOutMs: revealFadeOutMs
    });
  });

  // Start/stop the auto-loop in response to the `autoReveal` flag. The cycle
  // itself is created with the instance so manual `triggerReveal()` works
  // even when `autoReveal === false`.
  $effect(() => {
    generation;
    const active = cycle;
    if (!active) return;
    if (autoReveal) {
      active.start();
      return () => active.stop();
    }
    active.stop();
  });

  // During a regenerate churn the card surface wears the outgoing image's
  // average color so the dropped cells read as image pixels.
  const background = $derived(regenTint?.cardBg ?? cardBg);
</script>

<div
  {...rest}
  bind:this={ref}
  class={['image-gen-root', className]}
  data-preset={preset}
  data-theme={resolvedTheme}
  data-paused={paused ? 'true' : undefined}
  style="background: {background};{style ? ` ${style}` : ''}"
  style:--image-gen-radius={radius == null ? undefined : `${radius}px`}
  style:border-radius={radius == null ? undefined : `${radius}px`}
>
  <canvas bind:this={shaderCanvas} class="image-gen-shader" aria-hidden="true"></canvas>
  <canvas bind:this={overlayCanvas} class="image-gen-overlay" aria-hidden="true"></canvas>
  <div bind:this={contentEl} class="image-gen-child">
    {@render children?.()}
  </div>
</div>
