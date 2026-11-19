<!--
  @component
  Wraps any element with an animated metallic ring effect driven by a single
  shared WebGL renderer. All visible MetalFx instances on the page share one
  offscreen GL canvas; each instance composites a cropped/scaled copy of it
  onto its own 2D canvas with a rounded hole punched through the centre.

  @example
  ```svelte
  <MetalFx variant="button">
    <button class="upgrade-pill">Upgrade to Pro</button>
  </MetalFx>
  ```
-->
<script lang="ts" module>
  import type { MetalFxInstance } from './engine/renderer/core';
  import { setGlowCallback } from './engine/renderer/loop';
  import { injectGlow, updateGlow } from './engine/glow/glow';
  import { ensureStylesInjected } from './styles';

  // Runs at module scope so styles exist before the first component render,
  // even in SSR-hydration scenarios where effects haven't fired yet.
  ensureStylesInjected();

  // Maps each live instance to its SVG glow handles and a theme ref.
  // Keyed by instance (not component) because the same component can be
  // remounted with a new instance after shape/glowEnabled changes.
  const glowHandlesMap = new Map<
    MetalFxInstance,
    { handles: ReturnType<typeof injectGlow>; themeRef: { readonly current: 'dark' | 'light' } }
  >();
  // Opt-in introspection for the demo's dev tooling: with
  // `globalThis.__MFX_DEBUG__ = true` the live instance → glow map is exposed
  // as `globalThis.__mfxGlow` on the next mount. Never set in production.
  function exposeGlowDebug(): void {
    const g = globalThis as { __MFX_DEBUG__?: boolean; __mfxGlow?: unknown };
    if (g.__MFX_DEBUG__) g.__mfxGlow = glowHandlesMap;
  }

  // Bridge between the shared animation loop and per-instance glow SVGs.
  // The loop module doesn't import glow directly — it invokes this callback
  // for one queued instance per frame (round-robin), keeping render work
  // proportional to frame budget regardless of instance count.
  setGlowCallback((inst, nowMs) => {
    const entry = glowHandlesMap.get(inst);
    if (!entry) return false;
    return updateGlow(entry.handles, inst, nowMs, inst.opacityMul * inst.glowGain, entry.themeRef.current);
  });
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import {
    createInstance,
    destroyInstance,
    registerGlowInstance,
    setInstanceVisible,
    setSharedPreset,
    unregisterGlowInstance,
    updateInstance,
    refreshInstanceDpr
  } from './engine/renderer/loop';
  import { carryGlowState, updateGlowMask, type GlowOptions } from './engine/glow/glow';
  import { attachCursorLight, detachCursorLight } from './engine/cursor/light';
  import { RIM_DEFAULTS, injectRim, removeRim, updateRim, type RimHandles, type RimOptions } from './engine/rim';
  import { subscribeGlowConfig } from './engine/glow/config';
  import { addReflectionTarget, removeReflectionTarget } from './engine/reflection/paint';
  import { isMetalFxSupported } from './engine/renderer/core';
  import { scheduleReflectionPaint } from './engine/reflection/reflectionScheduler';
  import type { MetalFxProps } from './types';

  let {
    children,
    variant = 'button',
    preset = 'chromatic',
    theme = 'auto',
    strength = 1,
    glowGain = 1,
    paused = false,
    borderRadius,
    normalizeHostStyles = true,
    reflectionTargets,
    disableGlow = false,
    innerShadow,
    shaderScale,
    ringCssPx,
    scale = 1,
    mask,
    glowMode = 'mask',
    class: className,
    style,
    ref = $bindable(null),
    ...rest
  }: MetalFxProps = $props();

  // DOM nodes the engine draws into.
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let glowHost = $state<HTMLDivElement | null>(null);
  let rimHost = $state<HTMLDivElement | null>(null);
  let contentEl = $state<HTMLDivElement | null>(null);

  // Engine objects. They are not reactive: `generation` is, and it moves each
  // time an instance is created, so the effects that configure an instance
  // run again for the new one.
  let instance: MetalFxInstance | null = null;
  let glowHandles: ReturnType<typeof injectGlow> | null = null;
  let rimHandles: RimHandles | null = null;
  let initialWrapperRadius = 0;
  let rebuild: { glow: () => void; rim: () => void } | null = null;
  let generation = $state(0);

  let ready = $state(false);
  // No WebGL2 → no engine. Every effect below bails on this, and the markup
  // falls through to the plain child so the button is never lost.
  let supported = $state(true);
  // The corner radius the engine settled on, mirrored onto the wrapper.
  let radius = $state<number | null>(null);

  // 'auto' resolves to 'dark' | 'light' and follows the OS preference. The
  // first render uses 'dark' for 'auto', so server and client agree; the
  // effect corrects it before anything is visible.
  let resolvedTheme = $state<'dark' | 'light'>(untrack(() => (theme !== 'auto' ? theme : 'dark')));
  $effect(() => {
    if (theme !== 'auto') {
      resolvedTheme = theme;
      return;
    }
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => (resolvedTheme = mql.matches ? 'dark' : 'light');
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  });
  // Lets the glow callback read the current theme without holding a value.
  const themeRef = {
    get current() {
      return resolvedTheme;
    }
  };

  const shape = $derived<'pill' | 'circle'>(variant === 'circle' ? 'circle' : 'pill');
  const glowEnabled = $derived(!disableGlow);

  function resolveRadius(kind: 'pill' | 'circle', w: number, h: number): number {
    // variant='circle' is the user's explicit promise that the wrapped
    // element should render as a circle. Always pick min(w,h)/2 so the
    // engine produces a true circle even when the child's CSS border-radius
    // is read in a different coordinate space than the bounding rect (the
    // exact failure mode under CSS `zoom: 2`, where getComputedStyle
    // returns source pixels but getBoundingClientRect returns zoomed ones).
    if (kind === 'circle') return Math.min(w, h) / 2;

    let raw = initialWrapperRadius;
    if (typeof borderRadius === 'number') raw = borderRadius;
    else {
      const childEl = contentEl?.firstElementChild as HTMLElement | null;
      if (childEl) {
        const parsed = parseFloat(getComputedStyle(childEl).borderTopLeftRadius);
        if (Number.isFinite(parsed) && parsed > 0) raw = parsed;
      }
    }
    return Math.min(raw, Math.min(w, h) / 2);
  }

  // The instance's lifetime. It is rebuilt only when the shape changes;
  // everything else it reads is read when it is needed, and the smaller
  // effects below keep a living instance in step with the props.
  $effect(() => {
    const canvas = canvasEl;
    const root = ref;
    const host = glowHost;
    const kind = shape;
    if (!canvas || !root) return;
    return untrack(() => mount(canvas, root, host, kind));
  });

  function mount(
    canvas: HTMLCanvasElement,
    root: HTMLDivElement,
    host: HTMLDivElement | null,
    kind: 'pill' | 'circle'
  ): (() => void) | void {
    if (!isMetalFxSupported()) {
      supported = false;
      return;
    }

    {
      const computed = getComputedStyle(root);
      const parsed = parseFloat(computed.borderTopLeftRadius);
      initialWrapperRadius = Number.isFinite(parsed) ? parsed : 0;
    }

    const measure = () => {
      const rect = root.getBoundingClientRect();
      const cssWidth = Math.max(1, Math.round(rect.width));
      const cssHeight = Math.max(1, Math.round(rect.height));
      return { cssWidth, cssHeight, cornerRadius: resolveRadius(kind, cssWidth, cssHeight) };
    };

    const initial = measure();
    const inst = createInstance({
      onComposite: () => {
        if (instance && glowHandles) updateGlowMask(glowHandles, instance.deform);
        if (instance && rimHandles) updateRim(rimHandles, instance.deform);
      },
      hostCanvas: canvas,
      cssWidth: initial.cssWidth,
      cssHeight: initial.cssHeight,
      cornerRadius: initial.cornerRadius,
      kind,
      paused,
      shaderScale,
      ringCssPx,
      scale,
      mask: mask ?? null,
      onFirstCopy: () => (ready = true)
    });
    instance = inst;
    radius = initial.cornerRadius;

    // Custom-mask instances feed the glow a point set inside the glyphs and
    // the mask itself as an image, so the halo sits *on the metal* and is
    // clipped to it — not to a ring band that doesn't exist.
    const glowMaskData = (w: number, h: number): Pick<GlowOptions, 'samplePoints' | 'maskDataUrl'> => {
      if (!mask || glowMode === 'ring') return {};
      const dpr = window.devicePixelRatio || 1;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const g = c.getContext('2d');
      if (!g) return {};
      g.fillStyle = '#fff';
      mask(g, c.width, c.height, dpr);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const pts: Array<{ x: number; y: number }> = [];
      const step = Math.max(1, Math.round(2 * dpr)); // ~2 CSS px grid
      for (let y = step >> 1; y < c.height; y += step) {
        for (let x = step >> 1; x < c.width; x += step) {
          if (d[(y * c.width + x) * 4 + 3] > 128) pts.push({ x: x / dpr, y: y / dpr });
        }
      }
      return { samplePoints: pts, maskDataUrl: c.toDataURL('image/png') };
    };

    type Dims = { cssWidth: number; cssHeight: number; cornerRadius: number };
    const buildGlow = (dims: Dims) =>
      injectGlow(host!, {
        width: dims.cssWidth,
        height: dims.cssHeight,
        cornerRadius: dims.cornerRadius,
        kind,
        scale,
        ...glowMaskData(dims.cssWidth, dims.cssHeight)
      });

    if (host) glowHandles = buildGlow(initial);

    const rebuildGlow = (dims: Dims) => {
      if (!host) return;
      const prev = glowHandles;
      host.innerHTML = '';
      glowHandles = buildGlow(dims);
      // A rebuild is a fresh, invisible glow. Carry the old one's state over so
      // a resize doesn't read as "the glow vanished, then came back elsewhere".
      if (prev) carryGlowState(prev, glowHandles);
      if (glowHandles) glowHandlesMap.set(inst, { handles: glowHandles, themeRef });
    };

    const rimOpts = (): RimOptions | null => {
      if (!innerShadow) return null;
      return innerShadow === true ? RIM_DEFAULTS : { ...RIM_DEFAULTS, ...innerShadow };
    };
    const rebuildRim = (dims: Dims) => {
      removeRim(rimHandles);
      rimHandles = null;
      const o = rimOpts();
      if (!rimHost || !o) return;
      rimHandles = injectRim(
        rimHost,
        { width: dims.cssWidth, height: dims.cssHeight, cornerRadius: dims.cornerRadius, kind, ring: inst.ringCssPx },
        o
      );
    };
    rebuildRim(initial);
    rebuild = { glow: () => rebuildGlow(measure()), rim: () => rebuildRim(measure()) };

    let resizeRaf = 0;
    // Last dimensions the glow was built for. ResizeObserver fires on any box
    // change — including ones that leave the size identical (re-layout, font
    // load, a parent's transform) — and rebuilding the glow for those restarts
    // it from invisible, which reads as the halo blinking out with no fade.
    let builtW = initial.cssWidth,
      builtH = initial.cssHeight,
      builtR = initial.cornerRadius;
    const ro = new ResizeObserver(() => {
      if (resizeRaf !== 0) return;
      // RAF-debounce: coalesce multiple resize events within the same frame and
      // skip any that fire while a frame is already queued.
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        const next = measure();
        if (instance !== inst) return;
        const same =
          Math.abs(next.cssWidth - builtW) < 0.5 &&
          Math.abs(next.cssHeight - builtH) < 0.5 &&
          Math.abs(next.cornerRadius - builtR) < 0.5;
        if (same) return;
        builtW = next.cssWidth;
        builtH = next.cssHeight;
        builtR = next.cornerRadius;
        updateInstance(inst, { cssWidth: next.cssWidth, cssHeight: next.cssHeight, cornerRadius: next.cornerRadius });
        radius = next.cornerRadius;
        rebuildGlow(next);
        rebuildRim(next);
      });
    });
    ro.observe(root);

    // Browser zoom changes the DPR but not the CSS box, so the observer above
    // stays quiet and every raster (metal, glow, rim) would stay at the old
    // resolution. A resolution query fires once per DPR change; re-arm it
    // for the new value each time.
    let dprMql: MediaQueryList | null = null;
    const onDpr = () => {
      if (instance === inst && refreshInstanceDpr(inst)) {
        const next = measure();
        rebuildGlow(next);
        rebuildRim(next);
      }
      watchDpr();
    };
    const watchDpr = () => {
      dprMql?.removeEventListener('change', onDpr);
      dprMql =
        typeof window.matchMedia === 'function'
          ? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
          : null;
      dprMql?.addEventListener('change', onDpr);
    };
    watchDpr();

    // Glow markup params (stroke widths, blurs, blob lengths) are baked into
    // the SVG, so a live config change to one of them means a rebuild. Runtime
    // params are read per-frame and need nothing here.
    const unsubGlow = subscribeGlowConfig((markupChanged) => {
      if (markupChanged && instance === inst) rebuildGlow(measure());
    });

    // Skip GL compositing for off-screen instances — the loop checks inst.visible
    // before copyShaderToInstance, so hidden instances cost nothing per frame.
    // rootMargin: 64px starts rendering slightly before the element scrolls into view.
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

    if (glowHandles) {
      glowHandlesMap.set(inst, { handles: glowHandles, themeRef });
      registerGlowInstance(inst);
    }
    attachCursorLight();
    exposeGlowDebug();
    generation += 1;

    return () => {
      detachCursorLight();
      removeRim(rimHandles);
      rimHandles = null;
      rebuild = null;
      ro.disconnect();
      dprMql?.removeEventListener('change', onDpr);
      io?.disconnect();
      unsubGlow();
      if (resizeRaf !== 0) cancelAnimationFrame(resizeRaf);
      glowHandlesMap.delete(inst);
      unregisterGlowInstance(inst);
      destroyInstance(inst);
      if (instance === inst) instance = null;
      glowHandles = null;
      if (host) host.innerHTML = '';
    };
  }

  $effect(() => {
    if (supported) setSharedPreset(preset, resolvedTheme);
  });
  $effect(() => {
    generation;
    if (instance) updateInstance(instance, { mask: mask ?? null });
  });
  // `paused` is per-instance: it freezes only this instance's 2D canvas while
  // the shared GL loop keeps running for any other unpaused instance.
  $effect(() => {
    generation;
    if (instance) updateInstance(instance, { paused });
  });

  // Re-sync optional shader/ring/scale overrides if they change at runtime.
  $effect(() => {
    generation;
    if (!instance) return;
    const patch: Partial<Parameters<typeof updateInstance>[1]> = {};
    if (shaderScale !== undefined) patch.shaderScale = shaderScale;
    if (ringCssPx !== undefined) patch.ringCssPx = ringCssPx;
    if (scale !== undefined) patch.scale = scale;
    if (Object.keys(patch).length > 0) updateInstance(instance, patch);
  });

  // strength=1 maps directly to a full-opacity composite (opacityMul=1) for
  // every variant. Per-preset toning lives in `shaderOpacity` inside each
  // PresetMode, not here, so buttons and circles share the same headroom.
  $effect(() => {
    generation;
    if (!instance) return;
    updateInstance(instance, { opacityMul: Math.max(0, Math.min(1, strength)), glowGain: Math.max(0, glowGain) });
  });

  // onAfterFrame is wired here rather than at createInstance time so instances
  // without reflectionTargets never schedule the reflection RAF.
  // Reflections are dark-mode only — no DOM work in light mode.
  $effect(() => {
    generation;
    const inst = instance;
    const root = ref;
    const targets = reflectionTargets;
    if (!inst || !root || !targets || resolvedTheme !== 'dark') return;
    const live = targets.flatMap((t) => {
      if (!t) return [];
      const el = 'nodeType' in t ? t : t.el;
      const amount = 'nodeType' in t ? 1 : (t.strength ?? 1);
      return el ? [{ el, strength: amount }] : [];
    });
    inst.onAfterFrame = scheduleReflectionPaint;
    for (const { el, strength: amount } of live) addReflectionTarget(el, inst, root, amount);
    return () => {
      inst.onAfterFrame = undefined;
      for (const { el } of live) removeReflectionTarget(el);
    };
  });

  // Separate from the instance's lifetime so borderRadius / variant / theme
  // changes re-sync the radius without destroying and recreating the instance.
  $effect(() => {
    generation;
    borderRadius;
    resolvedTheme;
    variant;
    const inst = instance;
    if (!ref || !inst) return;
    const cornerRadius = untrack(() => resolveRadius(inst.kind === 'circle' ? 'circle' : 'pill', inst.cssWidth, inst.cssHeight));
    updateInstance(inst, { cornerRadius });
    radius = cornerRadius;
  });

  // The inner shadow and the glow's markup are built once per size. Rebuild
  // them when what they are built from changes, so the props are live.
  $effect(() => {
    generation;
    rimHost;
    typeof innerShadow === 'object' && innerShadow ? JSON.stringify(innerShadow) : innerShadow;
    ringCssPx;
    scale;
    untrack(() => rebuild?.rim());
  });
  let glowBuiltFor = '';
  $effect(() => {
    generation;
    const key = `${scale}|${glowMode}`;
    untrack(() => {
      // The first pass is the build the mount just did.
      if (glowBuiltFor && glowBuiltFor !== key) rebuild?.glow();
      glowBuiltFor = key;
    });
  });

  // --mfx-strength is consumed by downstream CSS (e.g. content opacity rules).
  const strengthVar = $derived(String(Math.min(1, Math.max(0, strength))));
</script>

{#if supported}
  <div
    {...rest}
    bind:this={ref}
    class={['metal-fx-root', className]}
    data-variant={variant}
    data-shape={shape}
    data-theme={resolvedTheme}
    data-paused={paused ? 'true' : undefined}
    data-normalize={normalizeHostStyles ? 'true' : 'false'}
    {style}
    style:--mfx-strength={strengthVar}
    style:--mfx-radius={radius == null ? undefined : `${radius}px`}
    style:border-radius={radius == null ? undefined : `${radius}px`}
    style:opacity={ready ? 1 : 0}
    style:visibility={ready ? 'visible' : 'hidden'}
    style:transition={ready ? 'opacity 0.15s ease-out' : 'none'}
  >
    <canvas
      bind:this={canvasEl}
      class="metal-fx-canvas"
      style="position: absolute; inset: 0; width: 100%; height: 100%;"
    ></canvas>
    <div class="metal-fx-inner" aria-hidden="true" style="position: absolute; inset: 3px;"></div>
    <div
      bind:this={glowHost}
      aria-hidden="true"
      style="position: absolute; inset: 0; pointer-events: none; z-index: 3; border-radius: inherit;"
      style:display={glowEnabled ? undefined : 'none'}
    ></div>
    <!-- Rim sits above the metal and the glow, below the content. -->
    {#if innerShadow}
      <div
        bind:this={rimHost}
        aria-hidden="true"
        style="position: absolute; inset: 0; pointer-events: none; z-index: 4;"
      ></div>
    {/if}
    <div bind:this={contentEl} class="metal-fx-content">{@render children?.()}</div>
  </div>
{:else}
  <!-- Graceful degradation: the wrapped element with its own styling intact —
       no normalisation, no canvas, no glow. Consumers can style
       `[data-metal-fx-unsupported]` if they want a static stand-in ring. -->
  <div
    {...rest}
    bind:this={ref}
    class={['metal-fx-fallback', className]}
    data-metal-fx-unsupported=""
    style="display: inline-flex;{style ? ` ${style}` : ''}"
  >
    {@render children?.()}
  </div>
{/if}
