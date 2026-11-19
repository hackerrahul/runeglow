<!--
  @component
  Bare metal-filled text — the Pro badge's glyph treatment without the pill.

  MetalFx's `mask` paints the word with the same font and metrics as the
  live span, so layout and hit-testing stay DOM. The metal is composited
  over the live text, so `color` is the tone the shader blends onto — the
  design's own colour, not white. The canvas is lifted above the content
  layer and the glow (clipped to the glyphs) above that.

  @example
  ```svelte
  <MetalText text="Pro" font="600 24px/1 Inter, sans-serif" color="#d8d8d8" />
  ```
-->
<script lang="ts" module>
  import type { TextInnerShadow } from './types';
  import { gaussBlur } from './engine/glow/bake';
  import { paintTextRun } from './engine/textMask';

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
</script>

<script lang="ts">
  import MetalFx from './MetalFx.svelte';
  import type { MaskFn } from './engine/renderer/core';
  import type { MetalTextProps } from './types';

  let {
    text,
    font,
    color,
    strength = 1,
    theme,
    reflectionTargets,
    class: className,
    innerShadow = FIGMA_INNER_SHADOW,
    glow = false,
    glowGain = METAL_TEXT_DEFAULTS.glowGain,
    metalOpacity = METAL_TEXT_DEFAULTS.metalOpacity,
    shaderScale = METAL_TEXT_DEFAULTS.shaderScale,
    paused = false,
    ref = $bindable(null)
  }: MetalTextProps = $props();

  let textEl = $state<HTMLSpanElement | null>(null);

  $effect(() => {
    const root = ref;
    if (!root) return;
    if (!document.getElementById(BARE_STYLE_ID)) {
      const st = document.createElement('style');
      st.id = BARE_STYLE_ID;
      st.textContent = BARE_CSS;
      document.head.appendChild(st);
    }
    const cv = root.querySelector<HTMLCanvasElement>('canvas.metal-fx-canvas');
    if (cv) cv.style.zIndex = '6';
    const host = root.querySelector<HTMLElement>('.metal-fx-glow-svg')?.parentElement;
    if (host) host.style.zIndex = '7';
  });

  // Inner-shadow overlay: above the metal (6) and the glow (7), redrawn when
  // fonts land, the box changes or the text does. Static otherwise.
  const shadowKey = $derived(innerShadow ? JSON.stringify(innerShadow) : '');
  $effect(() => {
    const root = ref,
      t = textEl;
    shadowKey;
    text;
    font;
    const shadow = innerShadow;
    if (!root || !t || !shadow) return;
    const cv = document.createElement('canvas');
    cv.className = 'metal-fx-text-rim';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:8';
    root.appendChild(cv);
    const draw = () => drawInnerShadow(cv, root, t, shadow);
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
  });

  const mask: MaskFn = (ctx, _w, _h, dpr) => {
    if (ref && textEl) paintTextRun(ctx, ref, textEl, dpr);
  };
</script>

<MetalFx
  bind:ref
  preset="chromatic"
  {theme}
  strength={strength * metalOpacity}
  {glowGain}
  disableGlow={!glow}
  {mask}
  {reflectionTargets}
  {shaderScale}
  {paused}
  borderRadius={4}
  style="background: transparent; border-radius: 4px;"
  data-mfx-bare=""
>
  <span
    bind:this={textEl}
    class={className}
    style="font: {font}; color: {color}; letter-spacing: 0; white-space: nowrap;"
    aria-label={text}
  >
    {text}
  </span>
</MetalFx>
