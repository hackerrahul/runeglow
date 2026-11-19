import type { ShadowLayer } from './shadow'

/* The goo filter chain, as SVG markup. The React library builds these
   primitives as elements; a Svelte component cannot return a bare list of
   <fe*> nodes into another component's <filter>, so the same chain is
   written out as a string and set as the filter's content. */

/** Alpha-binarize matrix used before spread dilation: the goo alpha has a soft
 *  fringe past the opaque edge — dilating it directly pushes a spread ring a
 *  pixel out and the fringe reads as a second hairline. */
const BINARIZE = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -29.5'

const esc = (v: string | number): string =>
  String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** CSS inset emulation on the LIQUID: paint the colour where the silhouette
 *  is NOT covered by a shrunk/offset/blurred copy of itself, clipped back to
 *  the silhouette — an inner ring (spread), inner edge line (offset) or soft
 *  inner shadow (blur) that follows the merged goo through every state. */
function insetPass(i: number, s: ShadowLayer): string {
  let out = ''
  // `bin` is computed once for the whole stack (see gooFilterPrimitives) —
  // every full-region pass costs real milliseconds on WebKit's CPU
  // rasterizer, and each pass here used to re-binarize `shape` identically.
  let src = 'bin'
  // Erode by the SPREAD only. An offset-only inset (`inset 0 1px 0 0`) must
  // leave a 1px strip along the TOP edge and nothing else — eroding for it
  // too shrinks the shape all round and paints a spurious ring on the sides
  // and bottom, doubling up with a real inner ring in the same stack.
  if (s.spread !== 0) {
    out += `<feMorphology in="${src}" operator="${s.spread > 0 ? 'erode' : 'dilate'}" radius="${Math.abs(s.spread)}" result="s${i}-er"/>`
    src = `s${i}-er`
  }
  if (s.x !== 0 || s.y !== 0) {
    out += `<feOffset in="${src}" dx="${s.x}" dy="${s.y}" result="s${i}-o"/>`
    src = `s${i}-o`
  }
  if (s.blur > 0) {
    out += `<feGaussianBlur in="${src}" stdDeviation="${s.blur / 2}" result="s${i}-b"/>`
    src = `s${i}-b`
  }
  // The band: silhouette minus its shrunk/offset self.
  out +=
    `<feComposite in="bin" in2="${src}" operator="out" result="s${i}-band"/>` +
    `<feFlood flood-color="${esc(s.color)}" result="s${i}-c"/>` +
    `<feComposite in="s${i}-c" in2="s${i}-band" operator="in" result="s${i}"/>`
  return out
}

function shadowPass(i: number, s: ShadowLayer): string {
  let out = ''
  let src = 'shape'
  if (s.spread !== 0) {
    out += `<feMorphology in="bin" operator="${s.spread > 0 ? 'dilate' : 'erode'}" radius="${Math.abs(s.spread)}" result="s${i}-sp"/>`
    src = `s${i}-sp`
  }
  if (s.blur > 0) {
    out += `<feGaussianBlur in="${src}" stdDeviation="${s.blur / 2}" result="s${i}-b"/>`
    src = `s${i}-b`
  }
  if (s.x !== 0 || s.y !== 0) {
    out += `<feOffset in="${src}" dx="${s.x}" dy="${s.y}" result="s${i}-o"/>`
    src = `s${i}-o`
  }
  out +=
    `<feFlood flood-color="${esc(s.color)}" result="s${i}-c"/>` +
    `<feComposite in="s${i}-c" in2="${src}" operator="in" result="s${i}"/>`
  return out
}

export function gooFilterPrimitives({
  blur,
  contrast,
  shadows,
  waviness = 0,
  wavinessFreq = 0.018,
}: {
  blur: number
  contrast: number
  shadows: ShadowLayer[]
  /** Max px the liquid boundary undulates. 0 (default) = calm geometric edge. */
  waviness?: number
  /** Noise frequency of the undulation — lower = longer, lazier waves. */
  wavinessFreq?: number
}): string {
  const wavy = waviness > 0
  // Intercept tracks the slope so the alpha threshold stays near the same
  // crossing as the classic 18/-7 goo pairing.
  const intercept = Math.round((0.5 - contrast * (5 / 12)) * 100) / 100
  let out =
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="blur"/>` +
    `<feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${contrast} ${intercept}" result="goo"/>` +
    `<feComposite in="SourceGraphic" in2="goo" operator="atop" result="${wavy ? 'shape-raw' : 'shape'}"/>`
  // The liquid boundary itself undulates: the whole silhouette — edges,
  // neck, shadow source — runs through one gentle displacement field, so
  // the surface reads as fluid even at rest. Shadows consume the
  // displaced 'shape', so they hug the wavy edge exactly.
  if (wavy) {
    out +=
      `<feTurbulence type="fractalNoise" baseFrequency="${wavinessFreq}" numOctaves="2" seed="7" result="wave-noise"/>` +
      `<feDisplacementMap in="shape-raw" in2="wave-noise" scale="${waviness * 2}" xChannelSelector="R" yChannelSelector="G" result="shape"/>`
  }
  // Binarized silhouette, computed ONCE and shared by every pass that
  // needs it.
  if (shadows.some(s => s.inset || s.spread !== 0)) {
    out += `<feColorMatrix in="shape" type="matrix" values="${BINARIZE}" result="bin"/>`
  }
  shadows.forEach((s, i) => {
    out += s.inset ? insetPass(i, s) : shadowPass(i, s)
  })
  if (shadows.length > 0) {
    // CSS paints the first shadow of the list on top: outer passes merge in
    // reverse (among themselves) BELOW the shape; inset passes paint ABOVE
    // it — they live inside the liquid edge.
    const outer = shadows
      .map((s, i) => (!s.inset ? i : -1))
      .filter(i => i >= 0)
      .reverse()
      .map(i => `<feMergeNode in="s${i}"/>`)
      .join('')
    const inner = shadows.map((s, i) => (s.inset ? `<feMergeNode in="s${i}"/>` : '')).join('')
    out += `<feMerge>${outer}<feMergeNode in="shape"/>${inner}</feMerge>`
  }
  return out
}
