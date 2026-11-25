/* Bare metal-filled text — the Pro badge's glyph treatment without the pill.

   MetalFx's `mask` paints the word with the same font and metrics as the
   live span, so layout and hit-testing stay DOM. The metal is composited
   over the live text, so `color` is the tone the shader blends onto — the
   design's own colour, not white. The canvas is lifted above the content
   layer and the glow (clipped to the glyphs) above that.

   `metalTextView` is the ring's view with the text's span inside it;
   `attachMetalText` brings both to life, and `mountMetalText` makes them. */

import { Effects } from '../internal/effects';
import { applyStyle, type Style } from '../internal/view';
import { gaussBlur } from './engine/glow/bake';
import type { MaskFn } from './engine/renderer/core';
import { paintTextRun } from './engine/textMask';
import { isMetalFxSupported } from './engine/renderer/core';
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
import { injectStyleFor } from './styles';
import type { MetalFxOptions, MetalTextOptions, TextInnerShadow } from './types';

/**
 * Figma inner shadow on the text (1471:40930): white 90 %, offset 0/1,
 * blur 0.5 — a hairline of light along the top inside edge of every glyph.
 * CSS has no inner shadow for text, so it's computed: glyph alpha minus the
 * same alpha shifted down by the offset leaves exactly that top rim, which is
 * then blurred and drawn white on an overlay above the metal.
 */
const FIGMA_INNER_SHADOW: TextInnerShadow = { offsetY: 1, blur: 0.5, alpha: 0.9 };
/** Tuned on the demo's "Plan Pro" card. */
export const METAL_TEXT_DEFAULTS = Object.freeze({
  metalOpacity: 0.62,
  shaderScale: 2.8,
  glowGain: 2.5,
  innerShadow: FIGMA_INNER_SHADOW
});

function drawInnerShadow(cv: HTMLCanvasElement, root: HTMLElement, textEl: HTMLElement, sh: TextInnerShadow): void {
  const dpr = window.devicePixelRatio || 1;
  const rr = root.getBoundingClientRect();
  const w = Math.max(1, Math.round(rr.width * dpr)),
    h = Math.max(1, Math.round(rr.height * dpr));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const og = off.getContext('2d', { willReadFrequently: true });
  const g = cv.getContext('2d');
  if (!og || !g) return;
  og.fillStyle = '#fff';
  paintTextRun(og, root, textEl, dpr);
  const d = og.getImageData(0, 0, w, h).data;
  const n = w * h;
  const a = new Float32Array(n);
  for (let i = 0, j = 3; i < n; i++, j += 4) a[i] = d[j] / 255;
  const shift = Math.max(1, Math.round(sh.offsetY * dpr)) * w;
  const rim = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const above = i >= shift ? a[i - shift] : 0;
    // Coverage the shifted glyph doesn't cover — the strip along the top
    // edge. A difference, not a product: on anti-aliased side edges both
    // values are partial and a product lit every edge of every glyph.
    rim[i] = Math.max(0, a[i] - above);
  }
  const blurred = gaussBlur(rim, w, h, sh.blur * dpr);
  cv.width = w;
  cv.height = h;
  cv.style.width = `${rr.width}px`;
  cv.style.height = `${rr.height}px`;
  const img = g.createImageData(w, h);
  const o = img.data;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    o[j] = 255;
    o[j + 1] = 255;
    o[j + 2] = 255;
    // Inner shadow: clipped to the glyph, so the blur never leaks outside
    // the letterform (it read as a halo, worst when zoomed in).
    o[j + 3] = Math.round(Math.min(1, blurred[i] * a[i] * sh.alpha) * 255);
  }
  g.putImageData(img, 0, 0);
}

// MetalFx dresses its root as a button: fill, inset rims (::before/::after)
// and the inner hairline. Bare text wants none of that — only the glyphs.
const BARE_STYLE_ID = 'mfx-bare-style';
const BARE_CSS =
  '.metal-fx-root[data-mfx-bare]{background:transparent!important}' +
  '.metal-fx-root[data-mfx-bare]::before,.metal-fx-root[data-mfx-bare]::after{box-shadow:none!important}' +
  '.metal-fx-root[data-mfx-bare] .metal-fx-inner{display:none!important}';

/* ── what the options come to ─────────────────────────────────────────── */

const shadowOf = (o: MetalTextOptions): TextInnerShadow | null | undefined => (o.innerShadow === undefined ? FIGMA_INNER_SHADOW : o.innerShadow);

/* the ring the text is drawn with */
const ringOptions = (o: MetalTextOptions, mask?: MaskFn): MetalFxOptions => ({
  preset: 'chromatic',
  theme: o.theme,
  strength: (o.strength ?? 1) * (o.metalOpacity ?? METAL_TEXT_DEFAULTS.metalOpacity),
  glowGain: o.glowGain ?? METAL_TEXT_DEFAULTS.glowGain,
  disableGlow: !(o.glow ?? false),
  mask,
  reflectionTargets: o.reflectionTargets,
  shaderScale: o.shaderScale ?? METAL_TEXT_DEFAULTS.shaderScale,
  paused: o.paused ?? false,
  borderRadius: 4,
});

/** What metal text's elements look like. */
export interface MetalTextView {
  /** The ring's elements, as for MetalFx: the span below is what its content layer holds. */
  fx: MetalFxView;
  /** The live text: a span with these styles, `aria-label` and text. */
  text: { style: Style; label: string; text: string };
}

/**
 * The elements of metal text for these options. `state` is what the engine
 * has reported through `onstate`; leave it out for the first render.
 */
export function metalTextView(options: MetalTextOptions, state: MetalFxState = METAL_FX_INITIAL_STATE): MetalTextView {
  const fx = metalFxView(ringOptions(options), state);
  fx.root.attrs['data-mfx-bare'] = '';
  fx.root.base = { ...fx.root.base, background: 'transparent', 'border-radius': '4px' };
  /* the metal above the content layer, and the glow above the metal */
  fx.canvas.style['z-index'] = '6';
  fx.glow.style['z-index'] = '7';
  return {
    fx,
    text: {
      style: { font: options.font, color: options.color, 'letter-spacing': '0', 'white-space': 'nowrap' },
      label: options.text,
      text: options.text,
    },
  };
}

/** The elements `metalTextView` describes, once rendered. */
export interface MetalTextParts extends MetalFxParts {
  /** The span holding the text. */
  text: HTMLElement;
}

export interface MetalTextHandle {
  /** Give the text new options. Each call replaces the last set whole. */
  update(options: MetalTextOptions): void;
  /** Stop the metal and let go of the elements. */
  destroy(): void;
}

/**
 * Bring metal text to life on elements rendered as `metalTextView` says:
 * the ring, masked to the glyphs of the span, and the inner shadow drawn
 * over them. Where there is no WebGL2 it reports `supported: false`, as
 * `attachMetalFx` does, and the text stays plain.
 */
export function attachMetalText(parts: MetalTextParts, options: MetalTextOptions, hooks: MetalFxHooks = {}): MetalTextHandle {
  let o = options;
  const { root, text: textEl } = parts;
  const mask: MaskFn = (ctx, _w, _h, dpr) => {
    paintTextRun(ctx, root, textEl, dpr);
  };
  const metal = attachMetalFx(parts, ringOptions(o, mask), hooks);
  if (!isMetalFxSupported()) return { update() {}, destroy: () => metal.destroy() };
  injectStyleFor(root, BARE_STYLE_ID, BARE_CSS);
  const fx = new Effects();

  // Inner-shadow overlay: above the metal (6) and the glow (7), redrawn when
  // fonts land, the box changes or the text does. Static otherwise.
  fx.add(
    () => {
      const shadow = shadowOf(o);
      return [shadow ? JSON.stringify(shadow) : '', o.text, o.font];
    },
    () => {
      const shadow = shadowOf(o);
      if (!shadow) return;
      const cv = document.createElement('canvas');
      cv.className = 'metal-fx-text-rim';
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:8';
      root.appendChild(cv);
      const draw = () => drawInnerShadow(cv, root, textEl, shadow);
      draw();
      let alive = true;
      document.fonts?.ready.then(() => {
        if (alive) draw();
      });
      const ro = new ResizeObserver(draw);
      ro.observe(root);
      // Browser zoom changes the DPR without changing the CSS box, so the
      // ResizeObserver stays quiet; re-rasterise from a resolution query.
      let mql: MediaQueryList | null = null;
      const watchDpr = () => {
        mql?.removeEventListener('change', onDpr);
        mql =
          typeof window.matchMedia === 'function'
            ? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
            : null;
        mql?.addEventListener('change', onDpr);
      };
      const onDpr = () => {
        if (!alive) return;
        draw();
        watchDpr();
      };
      watchDpr();
      return () => {
        alive = false;
        ro.disconnect();
        mql?.removeEventListener('change', onDpr);
        cv.remove();
      };
    },
  );
  fx.flush();

  return {
    update(next) {
      o = next;
      metal.update(ringOptions(o, mask));
      fx.flush();
    },
    destroy() {
      fx.destroy();
      metal.destroy();
    },
  };
}

/** What `mountMetalText` takes on top of the text's own options. */
export interface MetalTextMountOptions extends MetalTextOptions {
  /** A class for the text span. */
  class?: string;
}

export interface MountedMetalText {
  /** The wrapper: lay it out like any element. */
  element: HTMLDivElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: Partial<MetalTextMountOptions>): void;
  /** Stop the metal and take the text out of the page. */
  destroy(): void;
}

/**
 * Put metal text inside `parent`, with no framework: its elements are made
 * here, kept in step with the options, and removed by `destroy`.
 *
 *   const pro = mountMetalText(document.querySelector('#plan'), { text: 'Pro', font: '600 24px/1 Inter, sans-serif', color: '#d8d8d8' });
 *   pro.update({ glow: true });
 */
export function mountMetalText(parent: Element | ShadowRoot, options: MetalTextMountOptions): MountedMetalText {
  const doc = parent.ownerDocument ?? document;
  const span = doc.createElement('span');
  const frame = createMetalFxFrame(span);

  let o = { ...options };
  let state: MetalFxState = METAL_FX_INITIAL_STATE;
  let style: Style | null = null;
  const render = () => {
    const view = metalTextView(o, state);
    frame.render(view.fx);
    span.className = o.class ?? '';
    applyStyle(span, view.text.style, style);
    style = view.text.style;
    span.setAttribute('aria-label', view.text.label);
    if (span.textContent !== view.text.text) span.textContent = view.text.text;
  };
  render();
  parent.appendChild(frame.parts.root);
  const handle = attachMetalText({ ...frame.parts, text: span }, o, {
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
