/* The image-generation card outside any framework.

   `imageGenerationView` says what the wrapper looks like for a set of
   options — pure, so a server can render it. `attachImageGeneration` brings
   a wrapper to life: it is what the framework adapters call, on the wrapper
   they rendered round the card, and what a page with no framework calls on
   an element it already has. `mountImageGeneration` is the same for such a
   page, with updates that take only what changed. */

import { Effects } from '../internal/effects';
import { applyStyle, type Style } from '../internal/view';
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
import { ensureStylesInjected } from './styles';
import type { ImageGenerationHandle, ImageGenerationOptions, ImageGenerationPreset } from './types';

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

/* ── what the options come to ─────────────────────────────────────────── */

const presetOf = (o: ImageGenerationOptions): ImageGenerationPreset =>
  o.preset && Object.prototype.hasOwnProperty.call(PRESETS, o.preset) ? o.preset : 'pixels-organic';
const pinned = (o: ImageGenerationOptions) => (o.theme === 'dark' || o.theme === 'light' ? o.theme : null);
const delayRangeOf = (o: ImageGenerationOptions): [number, number] => {
  const range = o.revealDelayRange;
  return Array.isArray(range) && range.length >= 2 ? [range[0], range[1]] : [2, 4];
};
/* a list as one value, so one written out again in the same words is no change */
const listKey = (list: unknown): unknown => (Array.isArray(list) ? list.map((v) => v ?? '').join('\n') : list);

const ROOT = 'image-gen-root';
const SHADER = 'image-gen-shader';
const OVERLAY = 'image-gen-overlay';
const CONTENT = 'image-gen-child';

/** What a running card has found out, that its wrapper is drawn from. */
export interface ImageGenerationState {
  /** The theme in use: the option's, or what `'auto'` came to on this page. */
  theme: 'dark' | 'light';
  /** The corner radius read from the card, in px. `null` until it is measured. */
  radius: number | null;
  /** The card surface while an image regenerates: the outgoing image's average colour. `null` otherwise. */
  tint: string | null;
}

/** What an image-generation wrapper looks like. */
export interface ImageGenerationView {
  /** The wrapper's class. */
  class: string;
  /** The classes of its three children, in order: two canvases (`aria-hidden`) and the element that holds the card. */
  shaderClass: string;
  overlayClass: string;
  contentClass: string;
  /** `data-preset`, `data-theme`, and whether to set `data-paused="true"`. */
  preset: ImageGenerationPreset;
  theme: 'dark' | 'light';
  paused: boolean;
  /** Inline style of the wrapper that the caller's own style may override: the card surface. */
  style: Style;
  /** Inline style that goes after the caller's own: the card's corner radius, once it is measured. */
  radiusStyle: Style;
}

/**
 * The wrapper of an image-generation card for these options. `state` is
 * what the running card last reported through `onstate`; without it (on a
 * server, or before the card is attached) `'auto'` is taken as dark and no
 * radius is set, so server and client agree.
 */
export function imageGenerationView(options: ImageGenerationOptions = {}, state?: ImageGenerationState | null): ImageGenerationView {
  const preset = presetOf(options);
  const theme = pinned(options) ?? state?.theme ?? 'dark';
  const radius = state?.radius ?? null;
  return {
    class: ROOT,
    shaderClass: SHADER,
    overlayClass: OVERLAY,
    contentClass: CONTENT,
    preset,
    theme,
    paused: !!options.paused,
    // Effective background colour (override > preset). Drives both the wrapper's
    // CSS background and the shader's `u_cardBg` uniform so contrast logic in
    // the shader stays in sync with the actual host card surface. During a
    // regenerate churn the card surface wears the outgoing image's average
    // color so the dropped cells read as image pixels.
    style: { background: state?.tint ?? options.cardBg ?? PRESETS[preset].modes[theme].cardBg },
    radiusStyle: radius == null ? {} : { '--image-gen-radius': `${radius}px`, 'border-radius': `${radius}px` }
  };
}

export interface ImageGenerationHooks {
  /**
   * The state the wrapper is drawn from has changed: render
   * `imageGenerationView(options, state)` again. With this hook the wrapper's
   * class, attributes and style are the caller's to write; without it
   * `attachImageGeneration` writes them itself.
   */
  onstate?: (state: ImageGenerationState) => void;
}

/** A running card: its reveal functions, and the two every attached component has. */
export interface AttachedImageGeneration extends ImageGenerationHandle {
  /** Give the card new options. Each call replaces the last set whole. */
  update(options: ImageGenerationOptions): void;
  /** Stop everything and let go of the wrapper. */
  destroy(): void;
}

const childOf = <T extends HTMLElement>(root: HTMLElement, name: string): T | null => {
  for (const el of root.children) if (el.classList.contains(name)) return el as T;
  return null;
};

/**
 * Bring an image-generation card to life on `root`, the wrapper round the
 * card.
 *
 * An adapter renders the wrapper as `imageGenerationView` says, with its two
 * canvases and the element that holds the card, and passes `onstate` to
 * render it again when the theme, the measured corner radius or the
 * regenerate tint changes. A page with no framework passes an element it
 * already has, the card inside it, and nothing else: the canvases are made
 * here, the element's children are moved into the holder, and its class,
 * data attributes and style are kept in step here. `destroy` puts such an
 * element back as it was found.
 *
 *   const card = attachImageGeneration(document.querySelector('#cover'), { images: ['/a.jpg', '/b.jpg'] });
 *   card.triggerReveal({ hold: 'manual' });
 */
export function attachImageGeneration(
  root: HTMLElement,
  options: ImageGenerationOptions = {},
  hooks: ImageGenerationHooks = {}
): AttachedImageGeneration {
  let o = options;
  const fx = new Effects();
  let alive = true;

  const scope = root.getRootNode();
  ensureStylesInjected(typeof ShadowRoot === 'function' && scope instanceof ShadowRoot ? scope : root.ownerDocument);

  /* the wrapper's three children: the adapter's, or made here round what the element holds */
  let shader = childOf<HTMLCanvasElement>(root, SHADER);
  let overlay = childOf<HTMLCanvasElement>(root, OVERLAY);
  let content = childOf<HTMLElement>(root, CONTENT);
  let unwrap: (() => void) | null = null;
  if (!shader || !overlay || !content) {
    const doc = root.ownerDocument;
    const canvas = (name: string) => {
      const el = doc.createElement('canvas');
      el.className = name;
      el.setAttribute('aria-hidden', 'true');
      return el;
    };
    const madeShader = (shader = canvas(SHADER));
    const madeOverlay = (overlay = canvas(OVERLAY));
    const holder = (content = doc.createElement('div'));
    holder.className = CONTENT;
    while (root.firstChild) holder.appendChild(root.firstChild);
    root.append(madeShader, madeOverlay, holder);
    unwrap = () => {
      madeShader.remove();
      madeOverlay.remove();
      while (holder.firstChild) root.insertBefore(holder.firstChild, holder);
      holder.remove();
    };
  }
  const shaderCanvas = shader;
  const overlayCanvas = overlay;
  const contentEl = content;

  /* The card: the first element in the holder. Where the holder has a
     <slot> (the custom element), it is what the page put in the slot. */
  const cardOf = (): HTMLElement | null => {
    const first = contentEl.firstElementChild as HTMLElement | null;
    if (first && first.localName === 'slot') return ((first as HTMLSlotElement).assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    return first;
  };

  // Engine objects, made by the lifecycle effect below; the effects after
  // it keep them in step with the options.
  let instance: Instance | null = null;
  let reveal: RevealState | null = null;
  let cycle: Cycle | null = null;

  // Transient image-derived recolor for the regenerate churn. While set, it
  // overrides the palette + card surface (shader uniforms AND the wrapper's
  // CSS background) so the effect wears the outgoing image's colors; cleared
  // automatically when the next image reaches `visible`.
  let regenTint: SampledPalette | null = null;

  // Transient preset override for the regenerate churn. The churn must always
  // run on a pixel-mosaic preset (`pixels-mechanic` / `pixels-organic`): when
  // the active preset is not one of those (e.g. `sweep-gradient`), a random
  // pixel preset is swapped onto the instance for the churn's duration and
  // the authored preset is restored once the next image is fully visible.
  let regenPresetName: ImageGenerationPreset | null = null;

  // What the wrapper is drawn from: the resolved theme ('auto' starts as
  // 'dark', so server and client agree; the first effect corrects it from
  // the page before the first frame is drawn), the corner radius the engine
  // settled on, and the regenerate tint's surface.
  let state: ImageGenerationState = { theme: pinned(o) ?? 'dark', radius: null, tint: null };
  const set = (next: Partial<ImageGenerationState>): boolean => {
    let changed = false;
    for (const key in next) if (!Object.is(state[key as keyof ImageGenerationState], next[key as keyof ImageGenerationState])) changed = true;
    if (changed) state = { ...state, ...next };
    return changed;
  };

  /* with no one to render the wrapper, it is written here */
  let painted: Style | null = null;
  const hadClass = root.classList.contains(ROOT);
  const paint = () => {
    const view = imageGenerationView(o, state);
    root.classList.add(view.class);
    root.dataset.preset = view.preset;
    root.dataset.theme = view.theme;
    if (view.paused) root.dataset.paused = 'true';
    else delete root.dataset.paused;
    const style = { ...view.style, ...view.radiusStyle };
    applyStyle(root, style, painted);
    painted = style;
  };
  /* say that the state has moved, once, however many parts of it did */
  let told = state;
  const tell = () => {
    if (!alive || told === state) return;
    told = state;
    if (hooks.onstate) hooks.onstate(state);
    else paint();
  };

  const presetMode = () => PRESETS[presetOf(o)].modes[state.theme];

  // Resolve `revealInitialDelay` into a stable ms value once. Range tuples
  // randomise here, so later option changes never reseed the value.
  const initialDelayMs = (() => {
    const delay = o.revealInitialDelay;
    if (delay == null) return undefined;
    if (typeof delay === 'number') return Math.max(0, delay) * 1000;
    const [min, max] = delay;
    const lo = Math.max(0, Math.min(min, max));
    const hi = Math.max(0, Math.max(min, max));
    return (lo + Math.random() * (hi - lo)) * 1000;
  })();

  /* the theme: the option's, or the page's, followed as it changes */
  fx.add(
    () => [o.theme ?? 'auto'],
    () => {
      const theme = pinned(o);
      if (theme) {
        set({ theme });
        return;
      }
      if (typeof window === 'undefined') return;

      set({ theme: detectTheme() });
      const update = (): void => {
        if (!set({ theme: detectTheme() })) return;
        fx.touch();
        tell();
      };

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
    }
  );

  // Custom fragment stage: page-wide while set, back to the bundled one when
  // this instance drops it or is destroyed. It is ahead of the lifecycle
  // effect so that, on destroy, the bundled stage is put back while the
  // shared renderer still exists, rather than making a new one to hold it.
  fx.add(
    () => [o.fragmentShader],
    () => {
      if (!o.fragmentShader) return;
      setSharedFragmentShader(o.fragmentShader);
      return () => setSharedFragmentShader(null);
    }
  );

  let remeasure: (() => void) | null = null;

  // Lifecycle: create instance + reveal once, destroy when the card is.
  // Everything else it reads is read when it is needed.
  fx.add(
    () => [],
    () => {
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
        if (typeof o.borderRadius === 'number') {
          r = o.borderRadius;
        } else {
          const childEl = cardOf();
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
      const strength = o.strength ?? 1;
      const inst = createInstance({
        canvas: shaderCanvas,
        cssWidth: initial.w,
        cssHeight: initial.h,
        preset: presetMode(),
        strength,
        speed: o.speed ?? 1,
        cardBg: o.cardBg ?? null,
        pixelScale: o.pixelScale ?? 1
      });
      instance = inst;
      inst.canvas.style.opacity = String(Math.max(0, Math.min(1, strength)));

      const rev = createReveal({
        canvas: overlayCanvas,
        cssWidth: initial.w,
        cssHeight: initial.h,
        shaderCanvas
      });
      inst.reveal = rev;
      reveal = rev;

      // Cycle is created up-front (independent of `autoReveal`) so that the
      // imperative `triggerReveal()` works for manual user-driven reveals too.
      // `start()` is only called when `autoReveal` is true (separate effect).
      const cyc = createCycle({
        reveal: rev,
        images: normaliseImages(o.images),
        delayRange: delayRangeOf(o),
        holdMs: o.revealHoldMs ?? 2000,
        fadeOutMs: o.revealFadeOutMs ?? 300,
        initialDelayMs,
        onPhase: (e) => {
          // A fully-visible image ends any regenerate churn — restore the
          // preset palette / consumer-provided colors and the authored preset.
          if (e.phase === 'visible') {
            regenTint = null;
            regenPresetName = null;
            set({ tint: null });
            fx.touch();
            tell();
          }
          o.onCycle?.(e);
        },
        excludeSrcs: () => o.excludeSrcs?.() ?? null
      });
      cycle = cyc;
      if (o.paused) cyc.setPaused(true);

      set({ radius: initial.r });

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
        watchCard(cardOf());
        const next = measure();
        // Skip GL resize if dimensions didn't actually change; still re-apply
        // border-radius because that's the cheap part and may have moved.
        if (next.w !== lastW || next.h !== lastH) {
          updateInstanceSize(inst, next.w, next.h);
          lastW = next.w;
          lastH = next.h;
        }
        if (next.r !== lastR) {
          set({ radius: next.r });
          lastR = next.r;
          tell();
        }
      };
      const scheduleMeasure = (): void => {
        if (resizeRaf !== 0) return;
        resizeRaf = requestAnimationFrame(applyMeasure);
      };
      remeasure = scheduleMeasure;

      const ro = new ResizeObserver(scheduleMeasure);
      ro.observe(root);

      // Watch for CSS-affecting attribute changes on the child so radius
      // updates that don't trigger a resize (e.g. swapping a `rounded-lg`
      // class with `rounded-xl`) are still reflected immediately.
      const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(scheduleMeasure) : null;

      /* The two observers of the child follow it: the card may not be there
         yet (a custom element is connected before its children are parsed)
         and may be swapped for another, so the holder is watched for that
         and the card looked up again at each measure. */
      let watched: HTMLElement | null = null;
      const watchCard = (childEl: HTMLElement | null): void => {
        if (childEl === watched) return;
        if (watched) ro.unobserve(watched);
        mo?.disconnect();
        watched = childEl;
        if (!childEl) return;
        ro.observe(childEl);
        mo?.observe(childEl, {
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      };
      watchCard(cardOf());
      const swaps = typeof MutationObserver !== 'undefined' ? new MutationObserver(scheduleMeasure) : null;
      swaps?.observe(contentEl, { childList: true });
      contentEl.addEventListener('slotchange', scheduleMeasure);

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

      return () => {
        ro.disconnect();
        mo?.disconnect();
        swaps?.disconnect();
        contentEl.removeEventListener('slotchange', scheduleMeasure);
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
  );

  // An explicit radius is read when the wrapper is measured; measure again
  // when it changes.
  fx.add(
    () => [o.borderRadius],
    () => remeasure?.()
  );

  // Sync preset/theme to the instance + force a one-shot repaint so paused
  // instances reflect the option change live (rAF tick is gated on `!paused`).
  // An active regenerate churn preset override takes precedence over the option.
  fx.add(
    () => [regenPresetName, presetOf(o), state.theme],
    () => {
      const effectiveMode = regenPresetName ? PRESETS[regenPresetName].modes[state.theme] : presetMode();
      if (!instance) return;
      setInstancePreset(instance, effectiveMode);
      renderInstanceOnce(instance);
    }
  );

  // Sync cardBg override to the instance (shader uniform + reveal helper),
  // then repaint once so the change shows immediately even while paused.
  // An active regenerate tint takes precedence over the option.
  fx.add(
    () => [regenTint, o.cardBg],
    () => {
      const bg = regenTint?.cardBg ?? o.cardBg ?? null;
      if (!instance) return;
      setInstanceCardBg(instance, bg);
      renderInstanceOnce(instance);
    }
  );

  // Sync the palette override (per-slot colors, e.g. sampled from an image).
  // An active regenerate tint takes precedence over the option.
  fx.add(
    () => [regenTint, listKey(o.colors)],
    () => {
      const palette = regenTint?.colors ?? o.colors ?? null;
      if (!instance) return;
      setInstanceColors(instance, palette);
      renderInstanceOnce(instance);
    }
  );

  // Sync strength via the visible canvas opacity (no shader recompile).
  // The `opacity` style change is purely DOM and applies even while paused;
  // no GL repaint needed.
  fx.add(
    () => [o.strength ?? 1],
    () => {
      const amount = o.strength ?? 1;
      if (!instance) return;
      setInstanceStrength(instance, amount);
      if (instance.canvas) instance.canvas.style.opacity = String(Math.max(0, Math.min(1, amount)));
    }
  );

  // Sync speed — scales the instance's animation clock, no repaint needed.
  fx.add(
    () => [o.speed ?? 1],
    () => {
      if (instance) setInstanceSpeed(instance, o.speed ?? 1);
    }
  );

  // Sync pixelScale (recomputes the mosaic grid density) and repaint once so
  // the change is visible immediately even while paused.
  fx.add(
    () => [o.pixelScale ?? 1],
    () => {
      if (!instance) return;
      setInstancePixelScale(instance, o.pixelScale ?? 1);
      renderInstanceOnce(instance);
    }
  );

  fx.add(
    () => [!!o.paused],
    () => {
      const hold = !!o.paused;
      if (instance) setInstancePaused(instance, hold);
      cycle?.setPaused(hold);
    }
  );

  // Patch live updates to the always-on cycle (avoid recreating per option change).
  fx.add(
    () => [listKey(o.images)],
    () => {
      cycle?.setImages(normaliseImages(o.images));
    }
  );
  fx.add(
    () => [...delayRangeOf(o), listKey(o.revealHoldMs ?? 2000), o.revealFadeOutMs ?? 300],
    () => {
      cycle?.setOptions({
        delayRange: delayRangeOf(o),
        holdMs: o.revealHoldMs ?? 2000,
        fadeOutMs: o.revealFadeOutMs ?? 300
      });
    }
  );

  // Start/stop the auto-loop in response to the `autoReveal` flag. The cycle
  // itself is created with the instance so manual `triggerReveal()` works
  // even when `autoReveal === false`.
  fx.add(
    () => [!!o.autoReveal],
    () => {
      const active = cycle;
      if (!active) return;
      if (o.autoReveal) {
        active.start();
        return () => active.stop();
      }
      active.stop();
    }
  );

  fx.flush();
  /* the first word on the state, or the first picture of the wrapper */
  told = state;
  if (hooks.onstate) hooks.onstate(state);
  else paint();

  return {
    update(next) {
      if (!alive) return;
      o = next;
      fx.flush();
      /* a wrapper written here is written again for the new options */
      if (hooks.onstate) tell();
      else {
        told = state;
        paint();
      }
    },

    /**
     * Run a reveal pass now. No-op while one is already in progress. With
     * `hold: 'manual'` the image stays until `triggerHide()` is called.
     */
    triggerReveal(opts) {
      cycle?.triggerOnce(opts);
    },

    /** Fade the revealed image back to the effect. No-op if none is showing. */
    triggerHide() {
      cycle?.triggerHide();
    },

    /**
     * Regenerate the revealed image in place: it breaks into the effect's
     * cells, churns, and the next image from the pool dissolves in.
     */
    triggerRegenerate(opts) {
      if (!cycle || o.paused) return;
      const phase = cycle.getPhase();
      if (phase !== 'reveal' && phase !== 'visible') return;
      // The churn always runs on a pixel-mosaic preset: keep the active
      // preset when it's already one, otherwise (e.g. sweep-gradient)
      // temporarily switch the instance to a random pixel preset. The
      // authored preset is restored when the next image reaches `visible`.
      const churnName = isPixelChurnPreset(presetOf(o))
        ? null
        : PIXEL_CHURN_PRESETS[Math.floor(Math.random() * PIXEL_CHURN_PRESETS.length)];
      // Recolor the effect from the visible image (overlay canvas) so the
      // churn showing through the dropped cells reads as pixelation born
      // from that image rather than the preset's stock palette. The sample
      // maps onto the CHURN preset's palette slots (the preset actually
      // rendering during the churn), not the outgoing preset's.
      if (opts?.tintFromImage ?? true) {
        const churnColors = churnName ? PRESETS[churnName].modes[state.theme].colors : presetMode().colors;
        const sampled = samplePaletteFromCanvas(overlayCanvas, churnColors);
        if (sampled) {
          regenTint = sampled;
          set({ tint: sampled.cardBg });
        }
      }
      if (churnName) regenPresetName = churnName;
      fx.touch();
      tell();
      const auto = opts?.autoReveal ?? true;
      cycle.triggerBoil(auto ? { autoRevealAfterMs: opts?.durationMs ?? 4000 } : undefined);
    },

    /** True while an image is showing on top of the effect. */
    isImageActive() {
      const phase = cycle?.getPhase() ?? 'idle';
      return phase === 'reveal' || phase === 'visible' || phase === 'hide';
    },

    destroy() {
      if (!alive) return;
      alive = false;
      fx.destroy();
      if (!hooks.onstate) {
        if (!hadClass) {
          root.classList.remove(ROOT);
          if (!root.classList.length) root.removeAttribute('class');
        }
        delete root.dataset.preset;
        delete root.dataset.theme;
        delete root.dataset.paused;
        if (painted) applyStyle(root, {}, painted);
        if (!root.getAttribute('style')) root.removeAttribute('style');
      }
      unwrap?.();
    }
  };
}

/** A card on a page with no framework. */
export interface MountedImageGeneration extends ImageGenerationHandle {
  /** The wrapper: the element that was given. */
  element: HTMLElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: ImageGenerationOptions): void;
  /** Stop the card and put the element back as it was found. */
  destroy(): void;
}

/**
 * Run an image-generation card on an element the page already has, with no
 * framework: the element becomes the wrapper, and what is inside it the card.
 * It is `attachImageGeneration` with updates that take only what changed.
 *
 *   <div id="cover"><div style="width: 320px; height: 320px; border-radius: 20px"></div></div>
 *
 *   const card = mountImageGeneration(document.querySelector('#cover'), { images: ['/a.jpg', '/b.jpg'] });
 *   card.update({ preset: 'sweep-gradient' });
 */
export function mountImageGeneration(element: HTMLElement, options: ImageGenerationOptions = {}): MountedImageGeneration {
  let o = { ...options };
  const card = attachImageGeneration(element, o);
  return {
    element,
    update(next) {
      o = { ...o, ...next };
      card.update(o);
    },
    triggerReveal: card.triggerReveal,
    triggerHide: card.triggerHide,
    triggerRegenerate: card.triggerRegenerate,
    isImageActive: card.isImageActive,
    destroy: card.destroy
  };
}
