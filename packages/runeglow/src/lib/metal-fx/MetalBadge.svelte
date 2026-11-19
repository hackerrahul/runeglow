<!--
  @component
  The "New" badge: a white pill with a metal rim and a clean core under the
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

  @example
  ```svelte
  <MetalBadge text="New" />
  ```
-->
<script lang="ts" module>
  const RADIUS = 55.556;
  const W = 45,
    H = 25;
  const TEXT_W = 26.667;
  const PAD_X = (W - TEXT_W) / 2;

  const LAYER = 'position: absolute; inset: 0; pointer-events: none;';

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
</script>

<script lang="ts">
  import MetalFx from './MetalFx.svelte';
  import type { MaskFn } from './engine/renderer/core';
  import type { MetalBadgeProps } from './types';

  let {
    text = 'New',
    strength = 1,
    theme,
    scale = 1,
    reflectionTargets,
    metalOpacity = METAL_BADGE_DEFAULTS.metalOpacity,
    shaderScale = METAL_BADGE_DEFAULTS.shaderScale,
    core = METAL_BADGE_DEFAULTS.core,
    gradient = METAL_BADGE_DEFAULTS.gradient,
    glow = METAL_BADGE_DEFAULTS.glow,
    textColor = '#323232',
    paused = false,
    ref = $bindable(null)
  }: MetalBadgeProps = $props();

  // Full-fill mask: the pill itself.
  const mask: MaskFn = (ctx, w, h, dpr) => {
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, RADIUS * dpr);
    ctx.fill();
  };

  const r = $derived(RADIUS * scale);
</script>

<MetalFx
  bind:ref
  preset="chromatic"
  {theme}
  strength={strength * metalOpacity}
  {shaderScale}
  {mask}
  glowMode="ring"
  {reflectionTargets}
  {paused}
  borderRadius={r}
  style="background: #ffffff; border-radius: {r}px;"
>
  <!-- Inline layout only — no utility classes, so the badge renders the
       same with or without a CSS framework on the host page. -->
  <div style="position: relative; width: {W * scale}px; height: {H * scale}px; border-radius: {r}px;">
    <!-- layer 3b — clean white core under the label (rim-only metal).
         Stops are relative to the ellipse radius, so 100% = its edge. -->
    <div
      aria-hidden="true"
      style="{LAYER} border-radius: {r}px; background: radial-gradient(ellipse {core.size}% {core.size}% at 50% 50%, rgba(255,255,255,1) {core.r}%, rgba(255,255,255,0) {Math.min(
        100,
        core.r + core.blur
      )}%); opacity: {core.a};"
    ></div>
    <!-- layers 3 + 5 — white gradient and inset rims, over the metal -->
    <div
      aria-hidden="true"
      style="{LAYER} border-radius: {r}px; background: linear-gradient(to bottom, rgba(255,255,255,{gradient}), rgba(255,255,255,0)); box-shadow: {shadowFor(
        scale,
        glow
      )};"
    ></div>
    <span
      style="position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: {W *
        scale}px; height: {H * scale}px; padding-left: {PAD_X * scale}px; padding-right: {PAD_X *
        scale}px; font: 600 {12.222 * scale}px/1.4 Inter, sans-serif; color: {textColor}; letter-spacing: 0; white-space: nowrap;"
      aria-label={text}
    >
      {text}
    </span>
  </div>
</MetalFx>
