/* The "New" badge: a white pill with a metal rim and a clean core under the
   label.

     45×25, pill r 55.556. Layers bottom→top:
       1. white fill
       2. metal texture (the live shader, via a full-pill mask so it covers
          the fill)
       3. gradient rgba(255,255,255,.6) → 0, top→bottom
       3b. clean white core under the label: radial ellipse 46%, solid to
           `core`, ramp over `coreBlur`, so the text sits on white and metal
           creeps in at the rim
       4. text: Inter Semi Bold 12.222/1.4 #323232, box 26.667×13.333
       5. inset shadows: 0 0 8.333 #fff ×2, 0 0 0 0.833 rgba(255,255,255,.5),
          0 0.833 0 rgba(255,255,255,.78)

   The gradient AND the inset shadows have to sit above the metal canvas
   (z 0) and below the text (content z 5) — on the root they'd be painted
   under the opaque metal and vanish. Both live on one overlay inside the
   content layer, one level down: MetalFx normalises the *direct* child's
   background/box-shadow to transparent/none, so the overlay is nested under
   a plain wrapper to keep them.

   `metalBadgeView` is the ring's view with the badge's layers inside it;
   `attachMetalBadge` brings it to life, and `mountMetalBadge` makes it. */

import { applyStyle, type Style } from '../internal/view';
import type { MaskFn } from './engine/renderer/core';
import {
  METAL_FX_INITIAL_STATE,
  attachMetalFx,
  createMetalFxFrame,
  metalFxView,
  type MetalFxHooks,
  type MetalFxParts,
  type MetalFxState,
  type MetalFxView,
} from './metal';
import type { MetalBadgeOptions, MetalFxOptions } from './types';

const RADIUS = 55.556;
const W = 45,
  H = 25;
const TEXT_W = 26.667;
const PAD_X = (W - TEXT_W) / 2;

const LAYER: Style = { position: 'absolute', inset: '0', 'pointer-events': 'none' };

/** `glow` scales the two soft inner glows; the hairline rims stay as designed. */
const shadowFor = (k: number, glow: number) =>
  `inset 0px 0px ${8.333 * k}px 0px rgba(255,255,255,${glow}), ` +
  `inset 0px 0px ${8.333 * k}px 0px rgba(255,255,255,${glow}), ` +
  `inset 0px 0px 0px ${0.833 * k}px rgba(255,255,255,0.5), ` +
  `inset 0px ${0.833 * k}px 0px 0px rgba(255,255,255,0.78)`;

/** Tuned on the demo's "Live mode · New" card. */
export const METAL_BADGE_DEFAULTS = Object.freeze({
  metalOpacity: 0.8,
  shaderScale: 1.6,
  /** White core under the label: solid radius (% of ellipse), ramp width, opacity, ellipse size (% of box). */
  core: Object.freeze({ r: 46, blur: 100, a: 0.94, size: 49 }),
  gradient: 0,
  glow: 0.41
});

// Full-fill mask: the pill itself.
const mask: MaskFn = (ctx, w, h, dpr) => {
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, RADIUS * dpr);
  ctx.fill();
};

/* ── what the options come to ─────────────────────────────────────────── */

const radiusOf = (o: MetalBadgeOptions) => RADIUS * (o.scale ?? 1);

/* the ring the badge is drawn with */
const ringOptions = (o: MetalBadgeOptions): MetalFxOptions => ({
  preset: 'chromatic',
  theme: o.theme,
  strength: (o.strength ?? 1) * (o.metalOpacity ?? METAL_BADGE_DEFAULTS.metalOpacity),
  shaderScale: o.shaderScale ?? METAL_BADGE_DEFAULTS.shaderScale,
  mask,
  glowMode: 'ring',
  reflectionTargets: o.reflectionTargets,
  paused: o.paused ?? false,
  borderRadius: radiusOf(o),
});

/** What a metal badge's elements look like. */
export interface MetalBadgeView {
  /** The ring's elements, as for MetalFx: the box below is what its content layer holds. */
  fx: MetalFxView;
  /**
   * Inline layout only — no utility classes, so the badge renders the
   * same with or without a CSS framework on the host page. A plain div,
   * holding the three layers below in this order.
   */
  box: Style;
  /**
   * layer 3b — clean white core under the label (rim-only metal).
   * Stops are relative to the ellipse radius, so 100% = its edge.
   * An `aria-hidden` div.
   */
  core: Style;
  /** layers 3 + 5 — white gradient and inset rims, over the metal. An `aria-hidden` div. */
  wash: Style;
  /** The label: a span with these styles, `aria-label` and text. */
  label: { style: Style; label: string; text: string };
}

/**
 * The elements of a metal badge for these options. `state` is what the
 * engine has reported through `onstate`; leave it out for the first render.
 */
export function metalBadgeView(options: MetalBadgeOptions, state: MetalFxState = METAL_FX_INITIAL_STATE): MetalBadgeView {
  const text = options.text ?? 'New';
  const scale = options.scale ?? 1;
  const core = options.core ?? METAL_BADGE_DEFAULTS.core;
  const gradient = options.gradient ?? METAL_BADGE_DEFAULTS.gradient;
  const glow = options.glow ?? METAL_BADGE_DEFAULTS.glow;
  const r = radiusOf(options);
  const fx = metalFxView(ringOptions(options), state);
  fx.root.base = { ...fx.root.base, background: '#ffffff', 'border-radius': `${r}px` };
  return {
    fx,
    box: { position: 'relative', width: `${W * scale}px`, height: `${H * scale}px`, 'border-radius': `${r}px` },
    core: {
      ...LAYER,
      'border-radius': `${r}px`,
      background: `radial-gradient(ellipse ${core.size}% ${core.size}% at 50% 50%, rgba(255,255,255,1) ${core.r}%, rgba(255,255,255,0) ${Math.min(100, core.r + core.blur)}%)`,
      opacity: String(core.a),
    },
    wash: {
      ...LAYER,
      'border-radius': `${r}px`,
      background: `linear-gradient(to bottom, rgba(255,255,255,${gradient}), rgba(255,255,255,0))`,
      'box-shadow': shadowFor(scale, glow),
    },
    label: {
      style: {
        position: 'relative',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'box-sizing': 'border-box',
        width: `${W * scale}px`,
        height: `${H * scale}px`,
        'padding-left': `${PAD_X * scale}px`,
        'padding-right': `${PAD_X * scale}px`,
        font: `600 ${12.222 * scale}px/1.4 Inter, sans-serif`,
        color: options.textColor ?? '#323232',
        'letter-spacing': '0',
        'white-space': 'nowrap',
      },
      label: text,
      text,
    },
  };
}

export interface MetalBadgeHandle {
  /** Give the badge new options. Each call replaces the last set whole. */
  update(options: MetalBadgeOptions): void;
  /** Stop the metal and let go of the elements. */
  destroy(): void;
}

/**
 * Bring a metal badge to life on elements rendered as `metalBadgeView`
 * says. The badge's own layers are still; only the ring needs its engine.
 */
export function attachMetalBadge(parts: MetalFxParts, options: MetalBadgeOptions = {}, hooks: MetalFxHooks = {}): MetalBadgeHandle {
  const metal = attachMetalFx(parts, ringOptions(options), hooks);
  return {
    update: (next) => metal.update(ringOptions(next)),
    destroy: () => metal.destroy(),
  };
}

export interface MountedMetalBadge {
  /** The wrapper: lay it out like any element. */
  element: HTMLDivElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: MetalBadgeOptions): void;
  /** Stop the metal and take the badge out of the page. */
  destroy(): void;
}

/**
 * Put a metal badge inside `parent`, with no framework: its elements are
 * made here, kept in step with the options, and removed by `destroy`.
 *
 *   const badge = mountMetalBadge(document.querySelector('#live'), { text: 'New' });
 *   badge.update({ scale: 2 });
 */
export function mountMetalBadge(parent: Element | ShadowRoot, options: MetalBadgeOptions = {}): MountedMetalBadge {
  const doc = parent.ownerDocument ?? document;
  const box = doc.createElement('div');
  const core = doc.createElement('div');
  core.setAttribute('aria-hidden', 'true');
  const wash = doc.createElement('div');
  wash.setAttribute('aria-hidden', 'true');
  const label = doc.createElement('span');
  box.append(core, wash, label);
  const frame = createMetalFxFrame(box);

  let o = { ...options };
  let state: MetalFxState = METAL_FX_INITIAL_STATE;
  let last: MetalBadgeView | null = null;
  const render = () => {
    const view = metalBadgeView(o, state);
    frame.render(view.fx);
    applyStyle(box, view.box, last?.box);
    applyStyle(core, view.core, last?.core);
    applyStyle(wash, view.wash, last?.wash);
    applyStyle(label, view.label.style, last?.label.style);
    label.setAttribute('aria-label', view.label.label);
    if (label.textContent !== view.label.text) label.textContent = view.label.text;
    last = view;
  };
  render();
  parent.appendChild(frame.parts.root);
  const handle = attachMetalBadge(frame.parts, o, {
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
      handle.update(o);
    },
    destroy() {
      handle.destroy();
      frame.parts.root.remove();
    },
  };
}
