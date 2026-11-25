/* The thinking orb outside any framework.

   `thinkingOrbView` says what the canvas looks like for a set of options —
   pure, so a server can render it. `attachThinkingOrb` brings an existing
   canvas to life: it is what the framework adapters call, on the canvas
   they rendered. `mountThinkingOrb` makes the canvas itself, for a page
   with no framework at all.

   One shared clock (performance.now) keeps every mounted orb in phase; each
   instance runs its own rAF loop but pauses automatically while offscreen
   (IntersectionObserver) or when the tab is hidden (visibilitychange).
   Reduced-motion users get a static representative frame that still follows
   the live theme. */

import { Effects } from '../internal/effects';
import { applyStyle, type Style } from '../internal/view';
import { paintFrame, type OrbTint } from './engine/core';
import { scaleCounts, scaleRadii } from './engine/profiles';
import { MODE_FRAMES } from './engine/registry';
import { attachGravity } from './gravity';
import { resolvePreset, STATE_TO_MODE } from './presets';
import { watchReducedMotion, watchResolvedDark } from './theme';
import type { OrbSize, OrbState, ThinkingOrbOptions } from './types';

/** Parse a CSS color into an RGB triple for the tinted ink painter.
 *  Supports #rgb, #rrggbb and rgb()/rgba(); anything else -> no tint. */
function parseTint(color: string | undefined): OrbTint | undefined {
  if (!color) return undefined;
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const fn = color.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (fn) return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]) };
  return undefined;
}

const LABELS: Record<OrbState, string> = {
  working: 'Working…',
  searching: 'Searching…',
  solving: 'Solving…',
  listening: 'Listening…',
  connecting: 'Connecting…',
  weaving: 'Weaving…',
  composing: 'Composing…',
  breathing: 'Thinking…',
  shaping: 'Shaping…'
};

/* ── what the options come to ─────────────────────────────────────────── */

/* A state or a size can arrive as the text of an HTML attribute, so one the
   library does not know falls back rather than throwing: the default state,
   and the tuning of the nearest size that has one. */
const stateOf = (o: ThinkingOrbOptions): OrbState => (o.state && o.state in STATE_TO_MODE ? o.state : 'working');
const sizeOf = (o: ThinkingOrbOptions): number => (typeof o.size === 'number' && o.size > 0 ? o.size : 64);
const TUNED: readonly OrbSize[] = [64, 32, 20];
const tunedSize = (size: number): OrbSize =>
  TUNED.reduce((best, s) => (Math.abs(Math.log(s / size)) < Math.abs(Math.log(best / size)) ? s : best));

/** What a thinking orb's canvas looks like. */
export interface ThinkingOrbView {
  /** Inline style of the canvas: its width, height and display. */
  style: Style;
  /** The default accessible name, such as "Searching…". */
  label: string;
  state: OrbState;
}

/** The canvas of a thinking orb for these options. */
export function thinkingOrbView(options: ThinkingOrbOptions = {}): ThinkingOrbView {
  const state = stateOf(options), size = sizeOf(options);
  return {
    style: { width: `${size}px`, height: `${size}px`, display: 'block' },
    label: LABELS[state],
    state
  };
}

export interface ThinkingOrbHandle {
  /** Give the orb new options. Each call replaces the last set whole. */
  update(options: ThinkingOrbOptions): void;
  /** Stop everything and let go of the canvas. */
  destroy(): void;
}

/**
 * Bring a thinking orb to life on an existing canvas, styled as
 * `thinkingOrbView` says. It animates only while on screen and the tab is
 * visible, follows the page's theme live, and draws one still frame for
 * people who ask for reduced motion.
 */
export function attachThinkingOrb(canvas: HTMLCanvasElement, options: ThinkingOrbOptions = {}): ThinkingOrbHandle {
  let o = options;
  const fx = new Effects();

  let dark = true;
  let reduced = false;

  fx.add(
    () => [o.theme ?? 'auto'],
    () =>
      watchResolvedDark(o.theme ?? 'auto', canvas, (v) => {
        dark = v;
        fx.touch();
      })
  );
  fx.add(
    () => [],
    () =>
      watchReducedMotion((v) => {
        reduced = v;
        fx.touch();
      })
  );

  // Compared by content, so an inline options literal neither re-attaches
  // gravity nor restarts the loop every time the caller renders again.
  const optsKey = () => (o.opts ? JSON.stringify(o.opts) : '');
  const gravityKey = () => (o.gravity ? JSON.stringify(o.gravity) : '');

  // Gravity attaches the canvas to the document-level tracker.
  fx.add(
    () => [gravityKey()],
    () => {
      const gravity = o.gravity;
      if (!gravity) return;
      return attachGravity(canvas, gravity === true ? true : gravity);
    }
  );

  fx.add(
    () => [stateOf(o), sizeOf(o), o.dots ?? 1, o.dotSize ?? 1, optsKey(), o.frame, o.color, o.speed ?? 1, !!o.paused, dark, reduced],
    () => {
      const size = sizeOf(o);
      const dots = o.dots ?? 1, dotSize = o.dotSize ?? 1;
      const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { mode, speed: baseSpeed, opts: presetOpts } = resolvePreset(stateOf(o), tunedSize(size));
      // `dots` rescales every count knob of the resolved preset with the same
      // sqrt-paired scaler the presets themselves use, so density changes keep
      // the mode's balance. resolvePreset caches — never mutate its result.
      let opts = dots !== 1 ? scaleCounts(presetOpts, Math.max(0.1, dots)) : presetOpts;
      if (dotSize !== 1) opts = scaleRadii(opts, Math.max(0.1, dotSize));
      // raw overrides land last, over everything the preset and multipliers set
      if (o.opts) opts = { ...opts, ...o.opts };
      const frameFn = o.frame ?? MODE_FRAMES[mode];
      const tint = parseTint(o.color);
      const effSpeed = baseSpeed * (o.speed ?? 1);
      const isDark = dark;
      const isPaused = !!o.paused;
      const px = size;

      const frame = (tSec: number) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, px, px);
        paintFrame(ctx, frameFn(px, tSec, opts), isDark, tint);
      };

      // reduced motion → one static, deterministic frame
      if (reduced) {
        frame(0.6);
        return;
      }

      let raf = 0;
      let running = false;
      const loop = () => {
        frame((performance.now() / 1000) * effSpeed);
        if (running) raf = requestAnimationFrame(loop);
      };
      const start = () => {
        if (running || isPaused) return;
        running = true;
        raf = requestAnimationFrame(loop);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      // draw at least one frame even when paused/offscreen
      frame((performance.now() / 1000) * effSpeed);

      // pause offscreen + on hidden tabs — free when not visible
      let visible = true;
      const io =
        typeof IntersectionObserver !== 'undefined'
          ? new IntersectionObserver(([entry]) => {
              visible = entry.isIntersecting;
              if (visible && document.visibilityState !== 'hidden') start();
              else stop();
            })
          : null;
      io?.observe(canvas);
      const onVis = () => {
        if (document.visibilityState === 'hidden') stop();
        else if (visible) start();
      };
      document.addEventListener('visibilitychange', onVis);
      if (!io) start();

      return () => {
        stop();
        io?.disconnect();
        document.removeEventListener('visibilitychange', onVis);
      };
    }
  );

  fx.flush();

  return {
    update(next) {
      o = next;
      fx.flush();
    },
    destroy() {
      fx.destroy();
    }
  };
}

/** What `mountThinkingOrb` takes on top of the orb's own options. */
export interface ThinkingOrbMountOptions extends ThinkingOrbOptions {
  /** A class for the canvas. */
  class?: string;
  /** The accessible name. Default: the state, as in "Searching…". */
  label?: string;
}

export interface MountedThinkingOrb {
  /** The canvas: lay it out and listen on it like any element. */
  element: HTMLCanvasElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: ThinkingOrbMountOptions): void;
  /** Stop the orb and take its canvas out of the page. */
  destroy(): void;
}

/**
 * Put a thinking orb inside `parent`, with no framework: the canvas is made
 * here, kept in step with the options, and removed by `destroy`.
 *
 *   const orb = mountThinkingOrb(document.querySelector('#status'), { state: 'searching' });
 *   orb.update({ state: 'solving' });
 */
export function mountThinkingOrb(parent: Element | ShadowRoot, options: ThinkingOrbMountOptions = {}): MountedThinkingOrb {
  const doc = parent.ownerDocument ?? document;
  const element = doc.createElement('canvas');
  element.setAttribute('role', 'img');

  let o = { ...options };
  let style: Style | null = null;
  const render = () => {
    const view = thinkingOrbView(o);
    applyStyle(element, view.style, style);
    style = view.style;
    element.className = o.class ?? '';
    element.setAttribute('aria-label', o.label ?? view.label);
  };
  render();
  parent.appendChild(element);
  const handle = attachThinkingOrb(element, o);
  return {
    element,
    update(next) {
      o = { ...o, ...next };
      render();
      handle.update(o);
    },
    destroy() {
      handle.destroy();
      element.remove();
    }
  };
}
