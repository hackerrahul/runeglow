/* The metal ring outside any framework.

   Wraps any element with an animated metallic ring effect driven by a single
   shared WebGL renderer. All visible MetalFx instances on the page share one
   offscreen GL canvas; each instance composites a cropped/scaled copy of it
   onto its own 2D canvas with a rounded hole punched through the centre.

   `metalFxView` says what the wrapper and its layers look like for a set of
   options — pure, so a server can render it. `attachMetalFx` brings those
   elements to life once an adapter has rendered them. `mountMetalFx` builds
   them itself round an element already on the page, for no framework. */

import { Effects } from '../internal/effects';
import { applyStyle, type Style } from '../internal/view';
import { isMetalFxSupported, type MetalFxInstance } from './engine/renderer/core';
import {
  createInstance,
  destroyInstance,
  refreshInstanceDpr,
  registerGlowInstance,
  setGlowCallback,
  setInstanceVisible,
  setSharedPreset,
  unregisterGlowInstance,
  updateInstance,
} from './engine/renderer/loop';
import { carryGlowState, injectGlow, updateGlow, updateGlowMask, type GlowOptions } from './engine/glow/glow';
import { attachCursorLight, detachCursorLight } from './engine/cursor/light';
import { RIM_DEFAULTS, injectRim, removeRim, updateRim, type RimHandles, type RimOptions } from './engine/rim';
import { subscribeGlowConfig } from './engine/glow/config';
import { addReflectionTarget, removeReflectionTarget } from './engine/reflection/paint';
import { scheduleReflectionPaint } from './engine/reflection/reflectionScheduler';
import { ensureStylesFor, ensureStylesInjected } from './styles';
import type { MetalFxOptions, MetalFxReflectionTarget } from './types';

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

/* ── what the options come to ─────────────────────────────────────────── */

const shapeOf = (o: MetalFxOptions): 'pill' | 'circle' => (o.variant === 'circle' ? 'circle' : 'pill');
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** What the engine has found out about a ring since it was attached. */
export interface MetalFxState {
  /** The first frame of metal is on the canvas: until then the wrapper is hidden. */
  ready: boolean;
  /** No WebGL2 → no engine: the adapter renders the plain fallback instead. */
  supported: boolean;
  /** The corner radius the engine settled on, mirrored onto the wrapper. */
  radius: number | null;
  /** What a `theme` of `'auto'` resolved to. */
  theme: 'dark' | 'light';
}

/** A ring before its engine has started: what a server renders. `'auto'`
 *  starts as `'dark'`, so server and client agree; the engine corrects it
 *  before anything is visible. */
export const METAL_FX_INITIAL_STATE: Readonly<MetalFxState> = Object.freeze({ ready: false, supported: true, radius: null, theme: 'dark' });

/** What a metal ring's elements look like. */
export interface MetalFxView {
  /**
   * False when the browser has no WebGL2. Only `root` is rendered then,
   * with the wrapped element straight inside it: the element with its own
   * styling intact — no normalisation, no canvas, no glow. Consumers can
   * style `[data-metal-fx-unsupported]` if they want a static stand-in ring.
   */
  supported: boolean;
  /** The wrapper. `base` goes beneath the caller's own inline style, `style` on top of it. */
  root: { class: string; attrs: Record<string, string | undefined>; base: Style; style: Style };
  /** The canvas the ring is composited on, first inside the wrapper. */
  canvas: { class: string; style: Style };
  /** The inner spacer, `aria-hidden`. */
  inner: { class: string; style: Style };
  /** The host of the glow, `aria-hidden`; not displayed while `hidden`. */
  glow: { style: Style; hidden: boolean };
  /** The host of the inner shadow, `aria-hidden`: above the metal and the glow, below the content. Null without `innerShadow`. */
  rim: { style: Style } | null;
  /** The layer the wrapped element is rendered in, last inside the wrapper. */
  content: { class: string };
}

/**
 * The elements of a metal ring for these options. `state` is what the engine
 * has reported through `onstate`; leave it out for the first render.
 */
export function metalFxView(options: MetalFxOptions, state: MetalFxState = METAL_FX_INITIAL_STATE): MetalFxView {
  const variant = options.variant ?? 'button';
  const theme = options.theme && options.theme !== 'auto' ? options.theme : state.theme;
  const radius = state.radius == null ? null : `${state.radius}px`;
  const style: Style = {
    // --mfx-strength is consumed by downstream CSS (e.g. content opacity rules).
    '--mfx-strength': String(clamp01(options.strength ?? 1)),
  };
  if (radius) {
    style['--mfx-radius'] = radius;
    style['border-radius'] = radius;
  }
  style.opacity = state.ready ? '1' : '0';
  style.visibility = state.ready ? 'visible' : 'hidden';
  style.transition = state.ready ? 'opacity 0.15s ease-out' : 'none';
  return {
    supported: state.supported,
    root: state.supported
      ? {
          class: 'metal-fx-root',
          attrs: {
            'data-variant': variant,
            'data-shape': shapeOf(options),
            'data-theme': theme,
            'data-paused': options.paused ? 'true' : undefined,
            'data-normalize': (options.normalizeHostStyles ?? true) ? 'true' : 'false',
          },
          base: {},
          style,
        }
      : { class: 'metal-fx-fallback', attrs: { 'data-metal-fx-unsupported': '' }, base: { display: 'inline-flex' }, style: {} },
    canvas: { class: 'metal-fx-canvas', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } },
    inner: { class: 'metal-fx-inner', style: { position: 'absolute', inset: '3px' } },
    glow: {
      style: { position: 'absolute', inset: '0', 'pointer-events': 'none', 'z-index': '3', 'border-radius': 'inherit' },
      hidden: !!options.disableGlow,
    },
    rim: options.innerShadow ? { style: { position: 'absolute', inset: '0', 'pointer-events': 'none', 'z-index': '4' } } : null,
    content: { class: 'metal-fx-content' },
  };
}

/** The elements `metalFxView` describes, once rendered. */
export interface MetalFxParts {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  glow: HTMLElement;
  content: HTMLElement;
  /** The inner shadow's host, while there is one. It comes and goes with `innerShadow`: pass the current one to `update`. */
  rim?: HTMLElement | null;
}

export interface MetalFxHooks {
  /** The engine found out something the view depends on: render `metalFxView(options, state)` again. */
  onstate?: (state: MetalFxState) => void;
}

export interface MetalFxHandle {
  /**
   * Give the ring new options. Each call replaces the last set whole. `rim`
   * is the inner shadow's host as it is now rendered (null for none); leave
   * it out to keep the one already known.
   */
  update(options: MetalFxOptions, rim?: HTMLElement | null): void;
  /** Stop the ring and let go of its elements. */
  destroy(): void;
}

type LiveTarget = { el: HTMLElement; strength: number };

/* the targets that exist, each with its strength */
function liveTargets(targets: ReadonlyArray<MetalFxReflectionTarget> | undefined): LiveTarget[] {
  if (!targets) return [];
  return targets.flatMap((t) => {
    if (!t) return [];
    const el = 'nodeType' in t ? t : t.el;
    const amount = 'nodeType' in t ? 1 : (t.strength ?? 1);
    return el ? [{ el, strength: amount }] : [];
  });
}

/* a list made afresh by most callers: it is the same if its elements and strengths are */
function sameTargets(a: LiveTarget[], b: LiveTarget[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].el !== b[i].el || a[i].strength !== b[i].strength) return false;
  return true;
}

/**
 * Bring a metal ring to life on elements rendered as `metalFxView` says.
 * Where there is no WebGL2 it reports `supported: false` at once and does
 * nothing more: render the fallback, there is nothing to attach to it.
 */
export function attachMetalFx(parts: MetalFxParts, options: MetalFxOptions = {}, hooks: MetalFxHooks = {}): MetalFxHandle {
  let o = options;
  const { root, canvas, glow: host, content } = parts;
  let rimHost: HTMLElement | null = parts.rim ?? null;
  let alive = true;

  let state: MetalFxState = { ...METAL_FX_INITIAL_STATE, theme: o.theme && o.theme !== 'auto' ? o.theme : 'dark' };
  const tell = (patch: Partial<MetalFxState>) => {
    let changed = false;
    for (const key in patch) if (!Object.is(state[key as keyof MetalFxState], patch[key as keyof MetalFxState])) changed = true;
    if (!changed) return;
    state = { ...state, ...patch };
    if (alive) hooks.onstate?.(state);
  };

  // No WebGL2 → no engine. The markup falls through to the plain child so
  // the button is never lost.
  if (!isMetalFxSupported()) {
    tell({ supported: false });
    return { update() {}, destroy() { alive = false; } };
  }

  ensureStylesFor(root);
  const fx = new Effects();

  // Engine objects. `generation` moves each time an instance is created, so
  // the effects that configure an instance run again for the new one.
  let instance: MetalFxInstance | null = null;
  let glowHandles: ReturnType<typeof injectGlow> | null = null;
  let rimHandles: RimHandles | null = null;
  let initialWrapperRadius = 0;
  let rebuild: { glow: () => void; rim: () => void } | null = null;
  let generation = 0;

  // 'auto' resolves to 'dark' | 'light' and follows the OS preference.
  let resolvedTheme = state.theme;
  const setTheme = (theme: 'dark' | 'light') => {
    resolvedTheme = theme;
    tell({ theme });
  };
  fx.add(
    () => [o.theme ?? 'auto'],
    () => {
      const theme = o.theme ?? 'auto';
      if (theme !== 'auto') {
        setTheme(theme);
        return;
      }
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const update = () => {
        setTheme(mql.matches ? 'dark' : 'light');
        fx.touch();
      };
      update();
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    },
  );
  // Lets the glow callback read the current theme without holding a value.
  const themeRef = {
    get current() {
      return resolvedTheme;
    },
  };

  /* the reflection targets as last given, and a count that moves when they change */
  let targets = liveTargets(o.reflectionTargets);
  let targetsVersion = 0;

  function resolveRadius(kind: 'pill' | 'circle', w: number, h: number): number {
    // variant='circle' is the user's explicit promise that the wrapped
    // element should render as a circle. Always pick min(w,h)/2 so the
    // engine produces a true circle even when the child's CSS border-radius
    // is read in a different coordinate space than the bounding rect (the
    // exact failure mode under CSS `zoom: 2`, where getComputedStyle
    // returns source pixels but getBoundingClientRect returns zoomed ones).
    if (kind === 'circle') return Math.min(w, h) / 2;

    let raw = initialWrapperRadius;
    if (typeof o.borderRadius === 'number') raw = o.borderRadius;
    else {
      const first = content.firstElementChild;
      /* Runeglow: in a custom element the wrapped element is slotted into
         the content layer rather than being its child */
      const childEl = (first instanceof HTMLSlotElement ? (first.assignedElements({ flatten: true })[0] ?? null) : first) as HTMLElement | null;
      if (childEl) {
        const parsed = parseFloat(getComputedStyle(childEl).borderTopLeftRadius);
        if (Number.isFinite(parsed) && parsed > 0) raw = parsed;
      }
    }
    return Math.min(raw, Math.min(w, h) / 2);
  }

  // The instance's lifetime. It is rebuilt only when the shape changes;
  // everything else it reads is read when it is needed, and the smaller
  // effects below keep a living instance in step with the options.
  fx.add(
    () => [shapeOf(o)],
    () => mount(shapeOf(o)),
  );

  function mount(kind: 'pill' | 'circle'): () => void {
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
      paused: o.paused ?? false,
      shaderScale: o.shaderScale,
      ringCssPx: o.ringCssPx,
      scale: o.scale ?? 1,
      mask: o.mask ?? null,
      onFirstCopy: () => tell({ ready: true }),
    });
    instance = inst;
    tell({ radius: initial.cornerRadius });

    // Custom-mask instances feed the glow a point set inside the glyphs and
    // the mask itself as an image, so the halo sits *on the metal* and is
    // clipped to it — not to a ring band that doesn't exist.
    const glowMaskData = (w: number, h: number): Pick<GlowOptions, 'samplePoints' | 'maskDataUrl'> => {
      const mask = o.mask;
      if (!mask || (o.glowMode ?? 'mask') === 'ring') return {};
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
      injectGlow(host, {
        width: dims.cssWidth,
        height: dims.cssHeight,
        cornerRadius: dims.cornerRadius,
        kind,
        scale: o.scale ?? 1,
        ...glowMaskData(dims.cssWidth, dims.cssHeight),
      });

    glowHandles = buildGlow(initial);

    const rebuildGlow = (dims: Dims) => {
      const prev = glowHandles;
      host.innerHTML = '';
      glowHandles = buildGlow(dims);
      // A rebuild is a fresh, invisible glow. Carry the old one's state over so
      // a resize doesn't read as "the glow vanished, then came back elsewhere".
      if (prev) carryGlowState(prev, glowHandles);
      if (glowHandles) glowHandlesMap.set(inst, { handles: glowHandles, themeRef });
    };

    const rimOpts = (): RimOptions | null => {
      const innerShadow = o.innerShadow;
      if (!innerShadow) return null;
      return innerShadow === true ? RIM_DEFAULTS : { ...RIM_DEFAULTS, ...innerShadow };
    };
    const rebuildRim = (dims: Dims) => {
      removeRim(rimHandles);
      rimHandles = null;
      const opts = rimOpts();
      if (!rimHost || !opts) return;
      rimHandles = injectRim(
        rimHost,
        { width: dims.cssWidth, height: dims.cssHeight, cornerRadius: dims.cornerRadius, kind, ring: inst.ringCssPx },
        opts,
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
        tell({ radius: next.cornerRadius });
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
        { rootMargin: '64px' },
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
      host.innerHTML = '';
    };
  }

  fx.add(
    () => [o.preset ?? 'chromatic', resolvedTheme],
    () => setSharedPreset(o.preset ?? 'chromatic', resolvedTheme),
  );
  fx.add(
    () => [generation, o.mask],
    () => {
      if (instance) updateInstance(instance, { mask: o.mask ?? null });
    },
  );
  // `paused` is per-instance: it freezes only this instance's 2D canvas while
  // the shared GL loop keeps running for any other unpaused instance.
  fx.add(
    () => [generation, o.paused ?? false],
    () => {
      if (instance) updateInstance(instance, { paused: o.paused ?? false });
    },
  );

  // Re-sync optional shader/ring/scale overrides if they change at runtime.
  fx.add(
    () => [generation, o.shaderScale, o.ringCssPx, o.scale ?? 1],
    () => {
      if (!instance) return;
      const patch: Partial<Parameters<typeof updateInstance>[1]> = { scale: o.scale ?? 1 };
      if (o.shaderScale !== undefined) patch.shaderScale = o.shaderScale;
      if (o.ringCssPx !== undefined) patch.ringCssPx = o.ringCssPx;
      updateInstance(instance, patch);
    },
  );

  // strength=1 maps directly to a full-opacity composite (opacityMul=1) for
  // every variant. Per-preset toning lives in `shaderOpacity` inside each
  // PresetMode, not here, so buttons and circles share the same headroom.
  fx.add(
    () => [generation, o.strength ?? 1, o.glowGain ?? 1],
    () => {
      if (!instance) return;
      updateInstance(instance, { opacityMul: clamp01(o.strength ?? 1), glowGain: Math.max(0, o.glowGain ?? 1) });
    },
  );

  // onAfterFrame is wired here rather than at createInstance time so instances
  // without reflectionTargets never schedule the reflection RAF.
  // Reflections are dark-mode only — no DOM work in light mode.
  fx.add(
    () => [generation, targetsVersion, !!o.reflectionTargets, resolvedTheme],
    () => {
      const inst = instance;
      if (!inst || !o.reflectionTargets || resolvedTheme !== 'dark') return;
      const live = targets;
      inst.onAfterFrame = scheduleReflectionPaint;
      for (const { el, strength: amount } of live) addReflectionTarget(el, inst, root, amount);
      return () => {
        inst.onAfterFrame = undefined;
        for (const { el } of live) removeReflectionTarget(el);
      };
    },
  );

  // Separate from the instance's lifetime so borderRadius / variant / theme
  // changes re-sync the radius without destroying and recreating the instance.
  fx.add(
    () => [generation, o.borderRadius, resolvedTheme, o.variant ?? 'button'],
    () => {
      const inst = instance;
      if (!inst) return;
      const cornerRadius = resolveRadius(inst.kind === 'circle' ? 'circle' : 'pill', inst.cssWidth, inst.cssHeight);
      updateInstance(inst, { cornerRadius });
      tell({ radius: cornerRadius });
    },
  );

  // The inner shadow and the glow's markup are built once per size. Rebuild
  // them when what they are built from changes, so the options are live.
  fx.add(
    () => [generation, rimHost, typeof o.innerShadow === 'object' && o.innerShadow ? JSON.stringify(o.innerShadow) : o.innerShadow, o.ringCssPx, o.scale ?? 1],
    () => rebuild?.rim(),
  );
  let glowBuiltFor = '';
  fx.add(
    () => [generation, `${o.scale ?? 1}|${o.glowMode ?? 'mask'}`],
    () => {
      const key = `${o.scale ?? 1}|${o.glowMode ?? 'mask'}`;
      // The first pass is the build the mount just did.
      if (glowBuiltFor && glowBuiltFor !== key) rebuild?.glow();
      glowBuiltFor = key;
    },
  );

  fx.flush();

  return {
    update(next, rim) {
      if (!alive) return;
      o = next;
      if (rim !== undefined) rimHost = rim;
      const live = liveTargets(o.reflectionTargets);
      if (!sameTargets(live, targets)) {
        targets = live;
        targetsVersion++;
      }
      fx.flush();
    },
    destroy() {
      alive = false;
      fx.destroy();
    },
  };
}

/* ── no framework ─────────────────────────────────────────────────────── */

/* write a view's attributes on an element, taking back the last ones it no longer has */
function applyAttrs(el: Element, attrs: Record<string, string | undefined>, last?: Record<string, string | undefined> | null) {
  if (last) for (const key in last) if (attrs[key] === undefined && last[key] !== undefined) el.removeAttribute(key);
  for (const key in attrs) {
    const value = attrs[key];
    if (value !== undefined && (!last || last[key] !== value)) el.setAttribute(key, value);
  }
}

/** The elements of a ring, made here rather than by a framework, and kept as a view says. */
export interface MetalFxFrame {
  parts: MetalFxParts;
  /** Make the elements say what `view` says. */
  render(view: MetalFxView, className?: string): void;
  /** Take the wrapper away, leaving the wrapped element where the wrapper stood. */
  remove(): void;
}

/**
 * Build a ring's elements round `child`. If `child` is in a page the
 * wrapper takes its place there, with `child` inside; if not, the wrapper
 * is yours to place.
 */
export function createMetalFxFrame(child: Node): MetalFxFrame {
  const doc = child.ownerDocument ?? document;
  const root = doc.createElement('div');
  const canvas = doc.createElement('canvas');
  const inner = doc.createElement('div');
  inner.setAttribute('aria-hidden', 'true');
  const glow = doc.createElement('div');
  glow.setAttribute('aria-hidden', 'true');
  const content = doc.createElement('div');
  const parts: MetalFxParts = { root, canvas, glow, content, rim: null };

  child.parentNode?.insertBefore(root, child);
  root.append(canvas, inner, glow, content);
  content.appendChild(child);

  let last: MetalFxView | null = null;
  let framed = true;
  return {
    parts,
    render(view, className) {
      if (view.supported !== framed) {
        /* the fallback is the wrapped element straight inside the wrapper */
        framed = view.supported;
        if (framed) {
          root.append(canvas, inner, glow, content);
          content.appendChild(child);
        } else {
          root.replaceChildren(child);
          parts.rim = null;
        }
      }
      root.className = className ? `${view.root.class} ${className}` : view.root.class;
      applyAttrs(root, view.root.attrs, last?.root.attrs);
      const style = { ...view.root.base, ...view.root.style };
      applyStyle(root, style, last && { ...last.root.base, ...last.root.style });
      if (framed) {
        canvas.className = view.canvas.class;
        applyStyle(canvas, view.canvas.style, last?.canvas.style);
        inner.className = view.inner.class;
        applyStyle(inner, view.inner.style, last?.inner.style);
        applyStyle(glow, view.glow.hidden ? { ...view.glow.style, display: 'none' } : view.glow.style, last && (last.glow.hidden ? { ...last.glow.style, display: 'none' } : last.glow.style));
        content.className = view.content.class;
        if (view.rim && !parts.rim) {
          const rim = doc.createElement('div');
          rim.setAttribute('aria-hidden', 'true');
          applyStyle(rim, view.rim.style);
          root.insertBefore(rim, content);
          parts.rim = rim;
        } else if (!view.rim && parts.rim) {
          parts.rim.remove();
          parts.rim = null;
        }
      }
      last = view;
    },
    remove() {
      root.parentNode?.insertBefore(child, root);
      root.remove();
    },
  };
}

/** What `mountMetalFx` takes on top of the ring's own options. */
export interface MetalFxMountOptions extends MetalFxOptions {
  /** A class for the wrapper. */
  class?: string;
}

export interface MountedMetalFx {
  /** The wrapper: lay it out and listen on it like any element. It is what `attachMetalBend` takes. */
  element: HTMLDivElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: MetalFxMountOptions): void;
  /** Stop the ring and unwrap the element: it goes back where the wrapper stood. */
  destroy(): void;
}

/**
 * Put a metal ring round an element, with no framework: the wrapper takes
 * the element's place in the page, with the element inside it.
 *
 *   const ring = mountMetalFx(document.querySelector('#upgrade'), { variant: 'button' });
 *   ring.update({ preset: 'gold' });
 */
export function mountMetalFx(child: Element, options: MetalFxMountOptions = {}): MountedMetalFx {
  let o = { ...options };
  let state: MetalFxState = METAL_FX_INITIAL_STATE;
  const frame = createMetalFxFrame(child);
  const render = () => frame.render(metalFxView(o, state), o.class);
  render();
  const handle = attachMetalFx(frame.parts, o, {
    onstate: (next) => {
      state = next;
      render();
    },
  });
  return {
    element: frame.parts.root as HTMLDivElement,
    update(next) {
      o = { ...o, ...next };
      render();
      handle.update(o, frame.parts.rim ?? null);
    },
    destroy() {
      handle.destroy();
      frame.remove();
    },
  };
}
