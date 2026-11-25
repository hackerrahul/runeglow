import type { OptionKinds } from '../internal/options'
import type { CornerRadii } from './geometry'
import type { ImageMeltOptions } from './imageMelt'
import type { EvolveOptions, MoveOptions } from './observer'
import type { Transition } from './spring'

/** What a liquid group is told: the look of the one merged surface it draws
 *  behind its pieces. */
export interface LiquidOptions {
  /** Goo blur sigma in px — how far apart pieces start bridging. Default 6. */
  blur?: number
  /** Alpha-contrast slope — how sharp the liquid edge is. Default 18. */
  contrast?: number
  /** Fill of the liquid surface. Any CSS color, `var()` welcome. Default '#fff'. */
  fill?: string
  /** `box-shadow` syntax; rendered on the MERGED silhouette. `inset` layers
   *  paint inside the liquid edge (inner rings / top highlights). */
  shadow?: string
  /** Extra filter-region slack in px for blobs travelling outside the group box. Default 24. */
  filterPadding?: number
  /** Max px the liquid boundary undulates — the silhouette (and its shadows)
   *  run through a gentle noise displacement, so edges read as fluid instead
   *  of geometric. 0 (default) keeps the calm edge. */
  waviness?: number
  /** Noise frequency of the undulation; lower = longer, lazier waves. */
  wavinessFreq?: number
  /** Escape hatch: raw SVG filter primitives that REPLACE the goo chain
   *  (`blur`, `contrast`, `waviness` and the SVG half of `shadow` are then
   *  yours to reproduce). The input is `SourceGraphic`; the last primitive's
   *  output is what paints. Inset and spread shadows normally read a
   *  binarised `shape` result — keep that name if you keep them. */
  filter?: string
}

export type GooeyEffect = 'morph' | 'evolve' | 'move'

/** Full tuning surface of the contact melt ("dissolve"). All values optional —
 *  the defaults are the library's tuned look. */
export interface DissolveOptions {
  /** Melt blur in px. Default 8. */
  blur?: number
  /** Displacement strength of the liquid warp. Default 26. */
  warp?: number
  /** Magnetic drift toward the contact, px. Default 4. */
  pull?: number
  /** Distance where melting starts (defaults from the group's goo blur). */
  range?: number
  /** Size of the melt zone around the contact, px. */
  zone?: number
  /** 0..1 — two-liquid mixing: erodes the melted copy into tendrils so the
   *  liquid behind shows through the gaps. Default 0.7 when dissolving. */
  mix?: number
  /** Px the melt is drawn toward the neighbour's centre (flow gravity). */
  gravity?: number
  /** 0..1 — how pointy that flow tapers toward the neighbour. */
  taper?: number
  /** Noise frequency multiplier: <1 broad swirls, >1 fine veins. */
  warpFreq?: number
  /** Px/s the noise field drifts so the liquid churns. 0 = static. */
  flowSpeed?: number
  /** 'fractalNoise' (soft billows) or 'turbulence' (veinier). */
  warpStyle?: 'fractalNoise' | 'turbulence'
  /** Noise octaves; higher = finer swirls. */
  detail?: number
  /** While false the melt fades out over `releaseMs`, regardless of
   *  proximity. */
  active?: boolean
  /** Structural release time when `active` goes false, ms. */
  releaseMs?: number
  /** Ms the melt takes to evaporate (opacity -> 0), independent of
   *  `releaseMs`. Defaults to `releaseMs`. */
  fadeMs?: number
  /** 0..1 — overall dissolve intensity, independent of proximity: caps how
   *  far the melt can develop even at full contact (scales warp/blur/
   *  gravity/mix and the hole depth together). Default 1. */
  strength?: number
  /** How deep this piece may sink into its neighbour before the melt is fully
   *  gone, as a fraction of the smaller body (1 = completely engulfed).
   *  Melting is a surface event — once a piece is well inside the other there
   *  is no seam left to mix at, so the melt recedes and the content resolves
   *  back to crisp. Default 0.8; raise toward (or past) 1 to keep melting
   *  while deeply overlapped. */
  sink?: number
  /** What the liquid is made of. 'liquid' (default): the group fill — white
   *  surface goo with imagery melted over it. 'image': the liquid body IS the
   *  image, so the neck between two items blends both images' colours. */
  surface?: 'liquid' | 'image'
  /** Blur (px) of the seam-blend layer — the imagery painted once more
   *  through a plain heavy blur at the contact, half opacity per side, so
   *  the seam shows the two pictures' colours literally averaged. Defaults
   *  to 1.6x `blur`; 0 disables. */
  seamBlur?: number
}

/** The engine-level item the public `Liquid.Item` maps onto. */
export interface GooeyItemOptions {
  /** Liquid behavior of this piece:
   *  - 'morph' (default): merges gooily with touching neighbours.
   *  - 'evolve': the surface springs behind size/shape changes and settles
   *    like jelly.
   *  - 'move': the surface lags a moving element and stretches with velocity —
   *    liquid rubber (great for dragged things).
   *  Combine with an array. Anything beyond 'morph' runs on the measurement
   *  engine, so it implies observe mode. */
  effect?: GooeyEffect | GooeyEffect[]
  /** Tuning for effect="evolve": springs for mass / size / corner radius,
   *  content cross-blur, and droplet roundness. See EvolveOptions. */
  evolve?: EvolveOptions
  /** Tuning for effect="move": trail spring, velocity stretch, tail size. */
  move?: MoveOptions
  /** Mirrored mode: translation applied to both the wrapper and its blob. */
  x?: number
  y?: number
  scale?: number
  /** Mirrored mode: spring preset/config or `{ duration, ease }`. Default 'smooth'. */
  transition?: Transition
  /** Mirrored mode: transition delay in ms (stagger). Default 0. */
  delay?: number
  /** Observe mode: you animate the child however you like (a framework's
   *  transitions and motion, GSAP, CSS); the blob follows its rendered rect.
   *  `x/y/scale` are ignored. */
  observe?: boolean
  /** Observe mode: liquid-melt the item's imagery at the point where it
   *  touches a neighbour. See DissolveOptions. Text is never melted. */
  contactBlur?: boolean | DissolveOptions
  /** Override the measured border-radius for the blob (px). */
  radius?: number | CornerRadii
  /** Observe mode: shrink the blob by this many px on every side, so an opaque
   *  element (e.g. a round photo) fully covers its own liquid — white then
   *  only appears as the merge bridge. */
  blobInset?: number
  /** Observe mode: px the blob swells back out (beyond blobInset) as the item
   *  nears a neighbour — the element visibly grows a liquid coat that necks
   *  into the other surface. */
  bridgeGrow?: number
}

/** The public liquid behaviors:
 *  - 'morph' (default): pieces merge gooily, change shape like jelly, and can
 *    dissolve into each other on contact — menus, avatar groups, morphing
 *    panels.
 *  - 'move': the surface trails a moving element as liquid rubber with a
 *    droplet tail — sliders, tab indicators, dragged things.
 *  - 'melt': two images run molten into each other where they touch.
 *  - 'bend': the body bows with velocity. */
export type LiquidEffect = 'morph' | 'move' | 'melt' | 'bend'

/** Tuning for effect="bend": the surface stays glued to the content and the
 *  BODY deforms with velocity — vertical drag arcs the top/bottom edges
 *  (middle leads, ends lag), horizontal drag reshapes the rounded caps
 *  (leading blunts, trailing stretches). The live bend is published on the
 *  item as --lg-bend-x/-y (px) and --lg-bend-xn/-yn (unitless) CSS vars, so
 *  content can lean/rotate/shear along with the silhouette. */
export interface BendTuning {
  /** Vertical bow strength, 0..1. Default 0.6. */
  vertical?: number
  /** Horizontal cap deformation, 0..1. Default 0.35. */
  horizontal?: number
  /** Raw MoveOptions escape hatch, merged last. */
  advanced?: MoveOptions
}

/** Simple tuning for effect="morph". All knobs are normalized; defaults are
 *  the library's tuned look. Raw physics live under `advanced`. */
export interface MorphTuning {
  /** Liquid shape-change physics: the surface springs behind size changes,
   *  travels as a droplet and settles like jelly. Off by default — plain
   *  merge needs no engine. */
  shape?: boolean
  /** Speed multiplier for the shape physics. 1 = default, 2 = twice as fast. */
  speed?: number
  /** 0..1 — how much the shape physics overshoot and wobble. 0 = calm and
   *  critically damped, 1 = very springy. Default 0.5. */
  bounce?: number
  /** Max px your CONTENT cross-blurs by while the liquid is in motion,
   *  sharpening as the shape settles — the content half of the effect, not
   *  just the surface. Applies with `shape`. Default 7, `0` disables. */
  contentBlur?: number
  /** Full escape hatch: raw engine options, merged over the mapped values. */
  advanced?: {
    evolve?: EvolveOptions
    /** Shrink the blob by px per side so opaque content fully covers its own
     *  liquid (e.g. round photos). */
    blobInset?: number
    /** Px the blob swells back out near a neighbour — a visible liquid coat
     *  that necks into the other surface. */
    bridgeGrow?: number
  }
}

/** Simple tuning for effect="move". All knobs are 0..1; defaults are the
 *  library's tuned look. Raw physics live under `advanced`. */
export interface MoveTuning {
  /** How tightly the liquid chases the element. 0 = heavy syrup lag,
   *  1 = near-instant. Default 0.5. */
  springiness?: number
  /** How much the surface overshoots and wobbles on arrival. Default 0.5. */
  wobble?: number
  /** Velocity stretch of the drop. 0 = rigid. Default 0.36. */
  stretch?: number
  /** Trailing droplet size. 0 disables the tail. Default 0.575. */
  trail?: number
  /** Full escape hatch: raw spring values, merged over the mapped values. */
  advanced?: MoveOptions
}

/** What one piece of a liquid group is told. */
export interface LiquidItemOptions {
  /** 'morph' (default), 'move', 'melt' or 'bend'. */
  effect?: LiquidEffect
  /** Tuning for effect="morph". */
  morph?: MorphTuning
  /** Tuning for effect="move". */
  move?: MoveTuning
  /** Tuning for effect="bend". */
  bend?: BendTuning
  /** Tuning for effect="melt": the image source (auto-detected from a child
   *  <img> when omitted) plus the melt's physics. */
  melt?: ImageMeltOptions & { src?: string }
  /** Melt this item's imagery into a touching neighbour at the contact point
   *  — a liquid warp, not a blur. Orthogonal to `effect`: it describes what
   *  your CONTENT does where two surfaces meet, not how the surface moves.
   *  `true` for the tuned look, `0..1` to scale it, or the raw
   *  `DissolveOptions` for full control (wire `active` to your drag). */
  dissolve?: boolean | number | DissolveOptions
  /** Component-driven position: the library animates both the element and its
   *  liquid in perfect sync. Omit x/y and animate the child yourself (CSS,
   *  a framework's motion, …) — the liquid follows automatically when the effect
   *  needs it, or with `observe` for plain merge. */
  x?: number
  y?: number
  scale?: number
  /** Spring preset/config or `{ duration, ease }` for x/y. Default 'smooth'. */
  transition?: Transition
  /** Transition delay in ms (stagger). */
  delay?: number
  /** Plain-merge items animated by YOUR code: makes the liquid follow the
   *  child's rendered rect. Implied by `morph.shape`, `dissolve` and
   *  effect="move". */
  observe?: boolean
  /** Override the measured border-radius for the liquid (px). */
  radius?: number | CornerRadii
}

/* What kind of value each option takes, for the adapters. The ones marked
   `object` here take more than a record: `transition` a preset's name too,
   `dissolve` true or a strength, `radius` one number or four. */
export const liquidOptionKinds = {
  blur: 'number',
  contrast: 'number',
  fill: 'string',
  shadow: 'string',
  filterPadding: 'number',
  waviness: 'number',
  wavinessFreq: 'number',
  filter: 'string',
} as const satisfies OptionKinds<LiquidOptions>

export const liquidItemOptionKinds = {
  effect: 'string',
  morph: 'object',
  move: 'object',
  bend: 'object',
  melt: 'object',
  dissolve: 'object',
  x: 'number',
  y: 'number',
  scale: 'number',
  transition: 'object',
  delay: 'number',
  observe: 'boolean',
  radius: 'object',
} as const satisfies OptionKinds<LiquidItemOptions>
