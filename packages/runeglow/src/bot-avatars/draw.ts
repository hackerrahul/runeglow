/* The renderer. The body is a stack of copies of its outline, spaced along
   a depth axis with a pillow profile (smaller at the caps); each copy is
   projected with the head's yaw and pitch, so the stack reads as a rounded
   extruded solid that turns, flips and shows its side. Nearest copies are
   lit with a directional gradient, the far side sits in shade. The face
   lives on the front cap and follows it. */

import type { Pose } from './engine';
import type { BotAvatarFace, BotAvatarShading } from './types';
import { luminance, shade } from './color';
import { drawPlasticCap, mulAffine, surfaceAt, type FurStyle } from './plastic';
import type { FabricEye, FabricFace } from './fabric-gl';
import { drawGlasses, drawWearBehind, drawWearFront, wearPressed, type EyeSpot, type Wear, type WearRig } from './wear';

export interface DrawConfig {
  path: Path2D;
  face: Exclude<BotAvatarFace, 'none'>;
  /** Runeglow addition: lay the face out (glasses still need its eyes) but paint none of it. */
  faceless?: boolean;
  faceX: number;
  faceY: number;
  faceScale: number;
  color: string;
  ink: string;
  shading: BotAvatarShading;
  /** intensities and geometry of the lighting; omitted means the stock look */
  shadow?: number;
  highlight?: number;
  depth?: number;
  /** degrees clockwise from the top, where the light comes from */
  light?: number;
  rim?: number;
  spread?: number;
  /** plastic and fabric: the profile through the depth — 1 (the default) a
      cushion, thickest in the middle and rounding off to nothing at the
      outline all round; toward 0 a slab with softened edges */
  roundness?: number;
  /** fabric: the pile's style — length, density, edge fuzz, tufts, curl */
  fur?: FurStyle;
  /** plastic and fabric: 0–1, how much colour the light keeps past the
      palette's full saturation — highlights, sheen and rim stay coloured
      rather than paling toward white */
  vivid?: number;
  /** fabric: where the back light comes from, degrees clockwise from the
      top; by default above the toy, toward the side away from the key */
  backLight?: number;
  /** fabric: how far round to the front the key sits, degrees — 0 grazes
      the toy from the side, 90 lights it from the camera (default 32) */
  lightFront?: number;
  /** fabric: the strength of the highlights along single fibres (default 0) */
  shine?: number;
  /** fabric: 0–1, how soft the back light is — 0 a small source caught on
      single fibres, 1 a large one, an even glow (default 1) */
  backSoftness?: number;
  /** fabric: the smooth, satin sheen over the body's edge — the key's
      sheen and the back light's band as even gradients (default 0) */
  sheen?: number;
  /** identifies the outline for the material caches (the type name) */
  typeKey?: string;
  /** no animation loop follows this draw (reduced motion, paused): build
   * materials now instead of on idle time */
  still?: boolean;
  /** with `still`, bake fabric's pile on idle time all the same; the caller
   * draws again when it lands (`takeMissed` and `onLanded` in plastic.ts),
   * as the component does */
  furOnIdle?: boolean;
  /** thin parts (antennae) drawn behind the body with `partsDepth` of its
      depth; a list draws each piece as its own solid */
  parts?: Path2D | Path2D[];
  partsDepth?: number;
  /** the resolved surface: the whirl is white on dark, black on light */
  theme?: 'dark' | 'light';
  /** the device pixel ratio the context is scaled by: with it given the
      context's transform is taken as that scale and never read back */
  dpr?: number;
  /** plastic's side slices: filled as vectors, or blitted from sprites of
      the outline. `auto` (the default) blits on WebKit, where a
      conic-gradient fill costs thirty times a flat one. */
  sides?: 'auto' | 'vector' | 'sprite';
  /** the whirl's knobs; 1 everywhere is the stock look */
  whirl?: { strength: number; size: number; width: number; length: number; tilt: number };
  /** what the bot wears: a hat, glasses, headphones, a bow tie */
  wear?: Wear;
}

/* The canvas is drawn larger than the avatar's layout box, so a hop or a
   flip can leave the box without being clipped. */
export const OVERSCAN = 1.5;
/** the body's centre sits this fraction of the box below the canvas
    centre: hops and flips need the room above, not below */
export const RISE = 0.1;

/* Copies through the depth, and the stock half-depth in body units. */
const SLICES = 17;
const HALF_DEPTH = 15;
/* Cap scale at the ends of the pillow, at the stock rim width. */
const CAP = 0.9;
const profile = (z: number, cap: number) => cap + (1 - cap) * Math.sqrt(Math.max(0, 1 - z * z));

/* Big, plain dark eyes: they carry the face at 24px. */
const EYE_GAP = 25;
const EYE_RX = 6.3;
const EYE_Y = { eyes: 1, mouth: -3.5 } as const;

interface Palette {
  base: string;
  far: string;
  near: string;
  light: string;
  dark: string;
  capTop: string;
  capBottom: string;
  /** the slice colours by draw order (far → near), crisp and smooth */
  crispMix: string[];
  smoothMix: string[];
  /** crisp: the lit side and cap gradients, for a light direction */
  grad: { lx: number; ly: number; lit: CanvasGradient; cap: CanvasGradient } | null;
}
const paletteCache = new Map<string, Palette>();
function palette(color: string, shadow: number, highlight: number): Palette {
  const key = `${color}|${shadow}|${highlight}`;
  let p = paletteCache.get(key);
  if (!p) {
    const far = shade(color, -0.3 * shadow, 0.05 * shadow);
    const near = shade(color, -0.12 * shadow, 0.03 * shadow);
    const crispMix: string[] = [], smoothMix: string[] = [];
    for (let j = 0; j < SLICES; j++) {
      const t = j / (SLICES - 1);
      crispMix.push(t > 0.6 ? '' : mixCss(far, near, t / 0.6));
      smoothMix.push(t >= 0.5 ? color : mixCss(far, color, t / 0.5));
    }
    p = {
      base: color,
      far,
      near,
      light: shade(color, 0.04 * highlight),
      dark: shade(color, -0.3 * shadow, 0.05 * shadow),
      capTop: shade(color, 0.035 * highlight),
      capBottom: shade(color, -0.035 * shadow),
      crispMix,
      smoothMix,
      grad: null,
    };
    if (paletteCache.size > 200) paletteCache.clear();
    paletteCache.set(key, p);
  }
  return p;
}

/* the numbers of an hsl() string; any other colour is normalised through shade() first */
const hslNums = (c: string) => (c.startsWith('hsl(') ? c : shade(c, 0)).match(/[\d.]+/g)!.map(Number);
function mixCss(a: string, b: string, t: number): string {
  /* interpolate the hsl numbers */
  const pa = hslNums(a);
  const pb = hslNums(b);
  const m = pa.map((v, i) => v + (pb[i] - v) * t);
  return `hsl(${m[0].toFixed(1)} ${m[1].toFixed(1)}% ${m[2].toFixed(1)}%)`;
}

/* The whirl: the cartoon motion round a spinning body — one tapered
   trail on a tilted ring, made of the body's own material: a translucent
   plastic tube in the body colour, lit from the same light — a lighter
   flank toward it, a darker underside, a white specular ridge along the
   top — with a soft halo so it reads as a puff of plastic cloud. The
   ring lies in the body's equatorial plane seen a little from above,
   with a touch of perspective: the near half (sin > 0) is larger,
   thicker and stronger and is drawn over the body and face, casting a
   soft shadow on them; the far half is smaller and fainter and goes
   behind. */
const WHIRL_SEGMENTS = 34;
const WHIRL_SPAN = Math.PI * 1.55;
const WHIRL_RX = 57;
const WHIRL_RATIO = 0.4;
const WHIRL_TILT = -0.28;
interface WhirlInk {
  base: string;
  light: string;
  dark: string;
  halo: string;
}
const whirlInkCache = new Map<string, WhirlInk>();
function whirlInk(color: string): WhirlInk {
  let w = whirlInkCache.get(color);
  if (!w) {
    w = { base: shade(color, 0.1, 0.02), light: shade(color, 0.3, 0.04), dark: shade(color, -0.22, 0.08), halo: shade(color, 0.2) };
    if (whirlInkCache.size > 200) whirlInkCache.clear();
    whirlInkCache.set(color, w);
  }
  return w;
}
/* an hsl() from shade() with an alpha */
const withAlpha = (hsl: string, a: number) => hsl.replace(')', ` / ${Math.max(0, Math.min(1, a)).toFixed(3)})`);

function drawWhirl(ctx: CanvasRenderingContext2D, pose: Pose, color: string, lx: number, ly: number, near: boolean, knobs?: DrawConfig['whirl']) {
  const strength = knobs?.strength ?? 0;
  const k = Math.min(1, pose.whirl * strength);
  if (k <= 0.01) return;
  const sizeK = knobs?.size ?? 1, widthK = knobs?.width ?? 1, lengthK = knobs?.length ?? 1, tiltK = knobs?.tilt ?? 1;
  const span = WHIRL_SPAN * lengthK;
  const ink = whirlInk(color);
  /* the ring runs the way the body's near face moves: to the right */
  const head = -pose.whirlAngle;
  const rx = WHIRL_RX * sizeK;
  const ry = rx * WHIRL_RATIO * tiltK * (near ? 1.14 : 0.86);
  /* where round the ring the light falls, in the ring's own frame */
  const lightA = Math.atan2(ly, lx) - WHIRL_TILT;
  ctx.save();
  ctx.rotate(WHIRL_TILT);
  ctx.translate(0, 5);
  ctx.lineCap = 'butt';
  const seg = (a0: number, a1: number, width: number, style: string, dy: number) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(0, dy, rx, ry, 0, a0, a1, false);
    ctx.stroke();
  };
  /* the near half casts a soft shadow on the body it crosses */
  if (near) {
    for (let i = 0; i < WHIRL_SEGMENTS; i++) {
      const f = i / WHIRL_SEGMENTS;
      const a1 = head + f * span, a0 = a1 + span / WHIRL_SEGMENTS + 0.012;
      if (Math.sin((a0 + a1) / 2) <= 0) continue;
      const fade = Math.pow(1 - f, 1.3);
      seg(a1, a0, (2 + 8 * fade) * 1.5 * widthK, `rgba(0,0,0,${(0.2 * k * fade).toFixed(3)})`, 3.5);
    }
  }
  for (let i = 0; i < WHIRL_SEGMENTS; i++) {
    const f = i / WHIRL_SEGMENTS;
    /* the trail lies at the angles the head has already passed */
    const a1 = head + f * span, a0 = a1 + span / WHIRL_SEGMENTS + 0.012;
    const mid = (a0 + a1) / 2;
    if ((Math.sin(mid) > 0) !== near) continue;
    /* perspective and depth: the nearest point of the ring is fullest */
    const depth = 0.6 + 0.4 * Math.sin(mid);
    const fade = Math.pow(1 - f, 1.3);
    /* a gentle puff along the trail */
    const puff = 1 + 0.18 * Math.sin(f * 9 + 1.2);
    const width = (2 + 8 * fade) * depth * widthK * puff;
    const a = k * (0.3 + 0.7 * fade) * depth;
    /* how much this stretch of the ring faces the light */
    const facing = 0.5 + 0.5 * Math.cos(mid - lightA);
    /* halo, underside, body, lit flank, specular ridge: a plastic tube */
    seg(a1, a0, width * 2.6, withAlpha(ink.halo, a * 0.2), 0);
    seg(a1, a0, width * 0.8, withAlpha(ink.dark, a * 0.45), width * 0.32);
    seg(a1, a0, width, withAlpha(ink.base, a * 0.72), 0);
    seg(a1, a0, width * 0.62, withAlpha(ink.light, a * 0.78 * (0.4 + 0.6 * facing)), -width * 0.16);
    seg(a1, a0, width * 0.24, `rgba(255,255,255,${(a * 0.9 * (0.15 + 0.85 * facing * facing)).toFixed(3)})`, -width * 0.3);
  }
  ctx.restore();
}

/**
 * Draw one frame. `box` is the avatar's layout size in CSS px; the canvas
 * is `box * OVERSCAN` square with the body's centre `RISE * box` below
 * its middle, and the context already scaled for the device pixel ratio.
 */
/* the back light's direction on screen from its angle, when one is given */
const backOf = (deg: number | undefined): { bx?: number; by?: number } => {
  if (deg === undefined || !Number.isFinite(deg)) return {};
  const a = (deg * Math.PI) / 180;
  return { bx: Math.sin(a), by: -Math.cos(a) };
};

/** The light each material looks its best in where the config leaves it:
    a plush pile wants a broad, low studio light that shows its lobes and
    grain, a clear coat a brighter one for its gloss. */
export const LIGHT_DEFAULTS = {
  fabric: { shadow: 1.15, highlight: 1.45, light: 295, rim: 0.6, spread: 1.6 },
  other: { shadow: 0.35, highlight: 1.3, light: 300, rim: 0.5, spread: 1.55 },
};

export function draw(ctx: CanvasRenderingContext2D, box: number, pose: Pose, cfg: DrawConfig) {
  const full = box * OVERSCAN;
  ctx.clearRect(0, 0, full, full);
  const S = box / 100;
  /* the context's transform as given (the device scale) is the base of
     every transform set here; known from `dpr`, else read once */
  let dpr: number, base: readonly number[];
  if (cfg.dpr !== undefined) {
    dpr = cfg.dpr;
    base = [dpr, 0, 0, dpr, 0, 0];
  } else if (ctx.getTransform) {
    const t = ctx.getTransform();
    base = [t.a, t.b, t.c, t.d, t.e, t.f];
    dpr = t.a || 1;
  } else {
    dpr = 1;
    base = [1, 0, 0, 1, 0, 0];
  }
  const lit = LIGHT_DEFAULTS[cfg.shading === 'fabric' ? 'fabric' : 'other'];
  const shadow = cfg.shadow ?? lit.shadow, highlight = cfg.highlight ?? lit.highlight;
  const halfDepth = HALF_DEPTH * (cfg.depth ?? 0.65);
  const rimK = cfg.rim ?? lit.rim;
  const cap = 1 - (1 - CAP) * rimK;
  const spread = cfg.spread ?? lit.spread;
  /* the light's direction on screen: a unit vector toward the source */
  const la = ((cfg.light ?? lit.light) * Math.PI) / 180;
  const lx = Math.sin(la), ly = -Math.cos(la);
  const pal = palette(cfg.color, shadow, highlight);

  const cy0 = Math.cos(pose.yaw), sy = Math.sin(pose.yaw);
  const cp0 = Math.cos(pose.pitch), sp = Math.sin(pose.pitch);
  /* which cap faces the viewer: the front while this is positive */
  const facing = cy0 * cp0;
  /* edge-on, every slice would thin to a line and the stack would show
     gaps; a floor on the foreshortening keeps it a solid */
  const floor = (v: number) => (Math.abs(v) < 0.22 ? (v < 0 ? -0.22 : 0.22) : v);
  const cy = floor(cy0), cp = floor(cp0);

  /* body space: the box centre plus the pose's offset, its roll and
     squash. The squash and stretch scale about the body's base (y = 50),
     so a landing keeps the feet on the ground and presses the top down,
     and a stretch rises from the base. */
  const cr = Math.cos(pose.roll), sr = Math.sin(pose.roll), kx = pose.sx * S, ky = pose.sy * S;
  const lift = 50 * (1 - pose.sy) * S;
  const body = mulAffine(base, [cr * kx, sr * kx, -sr * ky, cr * ky, full / 2 + pose.x * S - sr * lift, full / 2 + RISE * box + pose.y * S + cr * lift]);
  ctx.save();
  ctx.setTransform(body[0], body[1], body[2], body[3], body[4], body[5]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const mode = cfg.shading;
  /* fabric's eyes are set into its pile where the GPU draws it: the body's
     draw is handed them, and says whether it has */
  const pile: FabricFace = { eyes: mode === 'fabric' ? eyesInPile(pose, cfg, facing) : [], ink: cfg.ink, light: cfg.light ?? lit.light, set: false };
  /* and under what it wears the pile lies flat */
  if (mode === 'fabric' && cfg.wear && (cfg.wear.hat !== 'none' || cfg.wear.headphones || cfg.wear.bowTie)) {
    const at = (x: number, y: number) => surfaceAt(cfg.typeKey ?? 'custom', halfDepth, x, y, cfg.roundness ?? 1) ?? 0.8 * halfDepth;
    pile.pressed = wearPressed(cfg.path, cfg.wear, at, { y: cfg.faceY, scale: cfg.faceScale });
  }
  /* one solid: the slice stack (or the plastic material) for an outline
     at a depth; the thin parts come first with a fraction of the depth,
     then the body over them. A plush toy's antennae are moulded plastic:
     a pile on a rod that thin is all fringe, so parts take the plastic
     when the body is fabric (`plush` false) */
  const drawSolid = (path: Path2D, key: string, halfDepth: number, plush = true): boolean => {
    /* the lit gradient, in the body's own space: light from the upper left */
    let lit: CanvasGradient | string = pal.near;
    let capFill: CanvasGradient | string = pal.base;
    if (mode === 'crisp') {
      if (!pal.grad || pal.grad.lx !== lx || pal.grad.ly !== ly) {
        const g = ctx.createLinearGradient(lx * 56, ly * 56, -lx * 56, -ly * 56);
        g.addColorStop(0, pal.light);
        g.addColorStop(0.45, pal.near);
        g.addColorStop(1, pal.dark);
        const c = ctx.createLinearGradient(lx * 46, ly * 46, -lx * 46, -ly * 46);
        c.addColorStop(0, pal.capTop);
        c.addColorStop(1, pal.capBottom);
        pal.grad = { lx, ly, lit: g, cap: c };
      }
      lit = pal.grad.lit;
      capFill = pal.grad.cap;
    }

    /* plastic and fabric: the material module draws the whole body, an
       inflated relief of the lit texture. While a form is still baking on
       idle time it declines, and the stock slices with the smooth overlay
       stand in for that frame. */
    let plasticDone = false;
    if (mode === 'plastic' || mode === 'fabric') {
      plasticDone = drawPlasticCap(
        ctx,
        { ...cfg, path, typeKey: key, shading: plush ? mode : 'plastic' },
        { cy, sy, cp, sp, facing, roll: pose.roll, halfDepth, cap, lx, ly, ...backOf(cfg.backLight), dev: box * dpr, ctm: body, still: cfg.still, round: cfg.roundness ?? 1, face: plush && mode === 'fabric' && path === cfg.path ? pile : undefined },
        pal,
        null,
        { shadow, highlight, spread, rim: rimK, vivid: cfg.vivid ?? 0, front: (Math.min(85, Math.max(0, cfg.lightFront ?? 32)) * Math.PI) / 180, shine: cfg.shine ?? 0, sheen: cfg.sheen ?? 0, backSoft: cfg.backSoftness ?? 1 }
      );
    }
    const mode2: BotAvatarShading = (mode === 'plastic' || mode === 'fabric') && !plasticDone ? 'smooth' : mode;
    const soft = mode2 === 'smooth';
    const union = soft && typeof Path2D === 'function' ? new Path2D() : null;
    /* slices, far to near; each sets its transform outright from the
       body's, no save/restore */
    const order = facing >= 0 ? 1 : -1;
    const [ca, cb, cc, cd, ce, cf] = body;
    let fill: CanvasGradient | string | null = null;
    /* each slice's affine is applied relative to the previous slice's: one
       transform() per slice, no save/restore */
    let pa = 1, pb = 0, pc = 0, pd = 1, pe = 0, pf = 0;
    for (let j = 0; j < SLICES && !plasticDone; j++) {
      const k = order > 0 ? j : SLICES - 1 - j;
      const z = -1 + (2 * k) / (SLICES - 1);
      const s = profile(z, cap);
      const near = j / (SLICES - 1);
      /* yaw about Y then pitch about X, orthographic: an affine per slice,
         then the path's own origin at its centre */
      const m0 = cy * s, m1 = sy * sp * s, m3 = cp * s;
      const e = z * sy * halfDepth - 50 * m0, fo = -z * cy * sp * halfDepth - 50 * m1 - 50 * m3;
      const det = pa * pd - pb * pc;
      const ia = pd / det, ib = -pb / det, ic = -pc / det, id = pa / det, ie = (pc * pf - pd * pe) / det, jf = (pb * pe - pa * pf) / det;
      ctx.transform(ia * m0 + ic * m1, ib * m0 + id * m1, ic * m3, id * m3, ia * e + ic * fo + ie, ib * e + id * fo + jf);
      pa = m0; pb = m1; pc = 0; pd = m3; pe = e; pf = fo;
      let style: CanvasGradient | string;
      /* smooth: one colour ramp through the depth to the front, no edge at the cap */
      if (soft) style = pal.smoothMix[j];
      else if (j === SLICES - 1) style = capFill;
      else if (near > 0.6) style = lit;
      else style = pal.crispMix[j];
      if (style !== fill) ctx.fillStyle = fill = style;
      ctx.fill(path);
      if (union) union.addPath(path, { a: m0, b: m1, c: 0, d: m3, e, f: fo });
    }
    if (!plasticDone) ctx.setTransform(ca, cb, cc, cd, ce, cf);

    /* smooth: a soft shadow from the lower right and a light from the upper
       left, laid over the whole form so nothing has an edge */
    if (union && mode2 === 'smooth') {
      /* the two gradients are made per frame on purpose: a kept one is
         slower to use in Safari than a fresh one */
      ctx.save();
      ctx.clip(union);
      const sa = Math.min(1, 0.34 * shadow);
      const sg = ctx.createRadialGradient(-lx * 45, -ly * 45, 4 * spread, -lx * 45, -ly * 45, 84 * spread);
      sg.addColorStop(0, `rgba(0,0,0,${sa})`);
      sg.addColorStop(0.5, `rgba(0,0,0,${sa * 0.35})`);
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = sg;
      ctx.fillRect(-120, -120, 240, 240);
      ctx.globalCompositeOperation = 'source-over';
      const ha = Math.min(1, 0.22 * highlight);
      const hg = ctx.createRadialGradient(lx * 37, ly * 37, 0, lx * 37, ly * 37, 62 * spread);
      hg.addColorStop(0, `rgba(255,255,255,${ha})`);
      hg.addColorStop(0.6, `rgba(255,255,255,${ha * 0.23})`);
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(-120, -120, 240, 240);
      ctx.restore();
    }

    return plasticDone;
  };

  /* the far half of the whirl sits behind everything */
  drawWhirl(ctx, pose, cfg.color, lx, ly, false, cfg.whirl);

  /* what the bot wears, placed on its own geometry and turned with it */
  const wear = cfg.wear;
  const worn = !!wear && (wear.hat !== 'none' || wear.glasses !== 'none' || wear.headphones || wear.bowTie);
  const wr: WearRig = { cy, sy, cp, sp, facing, halfDepth, lx, ly };
  if (worn) drawWearBehind(ctx, cfg.path, wr, wear!);

  const key = cfg.typeKey ?? 'custom';
  /* each piece rounds on its own: two antennae inflated as one shape
     would be scaled toward the middle between them, slice by slice */
  const parts = cfg.parts ? (Array.isArray(cfg.parts) ? cfg.parts : [cfg.parts]) : [];
  for (let i = 0; i < parts.length; i++) drawSolid(parts[i], Array.isArray(cfg.parts) ? `${key}:parts${i}/${parts.length}` : `${key}:parts`, halfDepth * (cfg.partsDepth ?? 0.4), false);
  const plasticDone = drawSolid(cfg.path, key, halfDepth);

  /* the face: each feature sits on a sphere behind the front cap, so a
     turn slides it round the head — the eye moving toward the edge
     narrows, the other comes to the front, and past the side they go */
  /* the front's outline in body space: the face's clip, and where worn
     things cast their shadows. The extruded modes have a front cap; the
     cushion of plastic and fabric has none, so its outline is taken a
     little over halfway up the face's own height */
  const zf = facing >= 0 ? 1 : -1;
  const round = cfg.roundness ?? 1;
  const cushion = plasticDone;
  const sf = cushion ? 1 : profile(zf, cap);
  const surface = (x: number, y: number) => (cushion ? surfaceAt(key, halfDepth, x, y, round) ?? 0.8 * halfDepth : halfDepth * sf);
  const zFace = cushion ? 0.55 * surface(cfg.faceX, cfg.faceY) : halfDepth;
  const fm0 = cy * sf, fm1 = sy * sp * sf, fm3 = cp * sf;
  const fe = zf * sy * zFace - 50 * fm0;
  const ffo = -zf * cy * sp * zFace - 50 * fm1 - 50 * fm3;
  let frontClip: Path2D | null = null;
  if (worn && typeof Path2D === 'function') {
    frontClip = new Path2D();
    frontClip.addPath(cfg.path, { a: fm0, b: fm1, c: 0, d: fm3, e: fe, f: ffo });
  }

  if (facing > -0.2) {
    ctx.save();
    /* The face is printed on the front of the body, so it cannot leave
       it: clip to the front slice's own outline first. On a wide turn a
       feature's place on the sphere can reach past the body's foreshortened
       silhouette, and without this it floats off the side. */
    {
      const [ca, cb, cc, cd, ce, cf] = body;
      ctx.setTransform(ca * fm0 + cc * fm1, cb * fm0 + cd * fm1, cc * fm3, cd * fm3, ca * fe + cc * ffo + ce, cb * fe + cd * ffo + cf);
      ctx.clip(cfg.path);
      ctx.setTransform(ca, cb, cc, cd, ce, cf);
    }
    ctx.translate(cfg.faceX - 50, cfg.faceY - 50);
    ctx.scale(cfg.faceScale, cfg.faceScale);
    /* under a clear coat the print shows the gloss faintly through it */
    if (mode === 'plastic' && plasticDone) ctx.globalAlpha = 0.93;
    let eyes: [EyeSpot, EyeSpot];
    if (cfg.faceless) {
      /* an empty clip: the face is placed, and nothing of it is drawn */
      ctx.save();
      ctx.beginPath();
      ctx.clip();
      eyes = drawFace(ctx, pose, cfg);
      ctx.restore();
    } else eyes = drawFace(ctx, pose, cfg, pile.set);
    ctx.globalAlpha = 1;
    /* glasses: their shadow falls on the face (inside its clip), the frames
       themselves may reach past the body's edge */
    const glasses = wear && wear.glasses !== 'none' ? wear.glasses : null;
    const turn = { yaw: pose.yaw, pitch: pose.pitch };
    if (glasses) drawGlasses(ctx, glasses, eyes, { lx, ly }, 'shadow', turn);
    ctx.restore();
    if (glasses) {
      ctx.save();
      ctx.translate(cfg.faceX - 50, cfg.faceY - 50);
      ctx.scale(cfg.faceScale, cfg.faceScale);
      drawGlasses(ctx, glasses, eyes, { lx, ly }, 'frame', turn);
      ctx.restore();
    }
  }
  if (worn) drawWearFront(ctx, cfg.path, wr, wear!, frontClip, surface, { y: cfg.faceY, scale: cfg.faceScale });
  /* the near half of the whirl passes in front of the face */
  drawWhirl(ctx, pose, cfg.color, lx, ly, true, cfg.whirl);
  ctx.restore();
}

/* Radius of the sphere the face is drawn on, in body units. */
const FACE_R = 30;

/* A feature's place on the sphere: longitude and latitude from its
   design position, turned by the head. Returns its screen offset, its
   foreshortening, and how much it faces the viewer. */
function onSphere(x: number, y: number, yaw: number, pitch: number) {
  const lon = Math.asin(Math.max(-1, Math.min(1, x / FACE_R))) + yaw;
  const lat = Math.asin(Math.max(-1, Math.min(1, -y / FACE_R))) + pitch;
  const cl = Math.cos(lat);
  return {
    x: FACE_R * Math.sin(lon) * cl,
    y: -FACE_R * Math.sin(lat),
    sx: Math.cos(lon),
    sy: cl,
    z: Math.cos(lon) * cl,
  };
}

/* An eye's curve as a short polyline with round joins, cached by its
   numbers. Stroking the open eye's hairpin curve directly gives a pill in
   Chrome but a teardrop in Safari, whose stroker does not round a cusp;
   both stroke a polyline the same way. */
const EYE_STEPS = 8;
const eyePaths = new Map<number, Path2D>();
function eyePath(x0: number, y0: number, cy: number): Path2D {
  const qx = Math.round(x0 * 50), qy = Math.round(y0 * 50), qc = Math.round(cy * 50);
  const key = qx + 2000 * qy + 4e6 * qc;
  let p = eyePaths.get(key);
  if (!p) {
    const ax = qx / 50, ay = qy / 50, ac = qc / 50;
    let d = `M${-ax} ${ay}`;
    for (let i = 1; i <= EYE_STEPS; i++) {
      const t = i / EYE_STEPS, mt = 1 - t;
      d += ` L${(mt * mt * -ax + t * t * ax).toFixed(3)} ${((mt * mt + t * t) * ay + 2 * mt * t * ac).toFixed(3)}`;
    }
    p = new Path2D(d);
    if (eyePaths.size > 256) eyePaths.clear();
    eyePaths.set(key, p);
  }
  return p;
}

/* The mouth's outline as a path, cached by its numbers: corners at ±hw on
   y = 0, a top edge from the left corner to the right with its controls
   a·hw in from the corners at depth yt, a bottom edge back at depth yb
   with controls ab·hw in, and round caps of radius t0 round each corner,
   set square to the smile's end slope. */
interface Mouth { hw: number; t0: number; a: number; yt: number; ab: number; yb: number }
const MOUTH_SIN = Math.sin(0.684), MOUTH_COS = Math.cos(0.684);
const mouthPaths = new Map<string, Path2D>();
function mouthPath(m: Mouth): Path2D {
  const q = (v: number) => Math.round(v * 50) / 50;
  const hw = q(m.hw), t0 = q(m.t0), a = q(m.a), yt = q(m.yt), ab = q(m.ab), yb = q(m.yb);
  const key = `${hw},${t0},${a},${yt},${ab},${yb}`;
  let p = mouthPaths.get(key);
  if (p) return p;
  const f = (v: number) => v.toFixed(3);
  /* the corners, offset along the end normal for the caps */
  const nx = t0 * MOUTH_SIN, ny = t0 * MOUTH_COS;
  const ltx = -hw + nx, lty = -ny, rtx = hw - nx, rty = -ny;
  const lbx = -hw - nx, lby = ny, rbx = hw + nx, rby = ny;
  /* the caps bulge outward along the end tangents */
  const cx = (4 / 3) * t0 * MOUTH_COS, cy = (4 / 3) * t0 * MOUTH_SIN;
  const d =
    `M${f(ltx)} ${f(lty)}` +
    `C${f(-hw + a * hw)} ${f(yt - t0)} ${f(hw - a * hw)} ${f(yt - t0)} ${f(rtx)} ${f(rty)}` +
    `C${f(rtx + cx)} ${f(rty - cy)} ${f(rbx + cx)} ${f(rby - cy)} ${f(rbx)} ${f(rby)}` +
    `C${f(hw - ab * hw)} ${f(yb + t0)} ${f(-hw + ab * hw)} ${f(yb + t0)} ${f(lbx)} ${f(lby)}` +
    `C${f(lbx - cx)} ${f(lby - cy)} ${f(ltx - cx)} ${f(lty - cy)} ${f(ltx)} ${f(lty)}Z`;
  p = new Path2D(d);
  if (mouthPaths.size > 256) mouthPaths.clear();
  mouthPaths.set(key, p);
  return p;
}

/** One eye as it is drawn: where the feature sits on the face (before the
    head turns it), and its curve's numbers. */
interface EyeShape { x: number; y: number; x0: number; y0: number; cy: number; w: number }

/* Each eye is one stroked curve — endpoints at ±x0,y0, a control point
   at 0,cy, width w, round caps — so every look is the same shape with
   different numbers, and a blend of the numbers is a real morph: the
   upright pill of an open eye squashes into a shut line, swings up into
   a laughing arc, or droops into a sleeping lid. */
function eyeShapes(pose: Pose, face: DrawConfig['face']): EyeShape[] {
  const [wd, ww, ws] = pose.w;
  const ey = EYE_Y[face];
  const half = EYE_GAP / 2;
  const lx = pose.lookX, ly = pose.lookY;
  /* the eyes take the head's aim, but only once it really aims
     somewhere: at rest and through the small drift of a breath they keep
     their own shape, and past that they draw taller looking up, shorter
     looking down, and a little wider from the corner of a sideways
     glance — the mimic that makes a turn read as a look */
  const past = (v: number, d: number) => (Math.abs(v) <= d ? 0 : (Math.sign(v) * (Math.abs(v) - d)) / (1 - d));
  const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
  const up = past(clamp1(-pose.pitch / 0.26 - pose.lookY / 7), 0.34);
  const aside = Math.abs(past(clamp1(pose.lookX / 4.5), 0.4));
  const tall = Math.max(0.3, 1 + 0.55 * up - 0.1 * aside);
  const wide = 1 - 0.05 * up + 0.12 * aside;
  const open = wd + ww * (1 - pose.laugh);
  const laugh = ww * pose.laugh;
  const lift = Math.max(0, -pose.y) / 26;
  const sag = 0.5 + 0.5 * pose.breath;
  const out: EyeShape[] = [];
  for (const side of [-1, 1] as const) {
    const lid = side < 0 ? pose.blinkL : pose.blinkR;
    const e = Math.max(0, Math.min(1, pose.eyeOpen * (1 - lid)));
    const kOpen = open * e, kShut = open * (1 - e), kLaugh = laugh, kSleep = ws;
    const x0 = kOpen * 0.01 + kShut * 5.4 + kLaugh * 6.2 + kSleep * 6;
    const y0 = kOpen * 1.1 * tall + kShut * 0.6 + kLaugh * (2.2 - lift * 1.5) + kSleep * (-1.4 + sag);
    const cy = kOpen * -3.3 * tall + kShut * 0.6 + kLaugh * (-11.4 - 4 * lift) + kSleep * (5.4 + 2 * sag);
    const w = kOpen * EYE_RX * 2 * wide + kShut * 2.8 + kLaugh * 4.4 + kSleep * 4;
    /* the eyes drift toward the look when open, less so when shut */
    const dx = lx * (kOpen + 0.5 * (kShut + kLaugh)), dy = ly * (kOpen + 0.5 * kShut);
    out.push({ x: side * half + dx, y: ey + dy, x0, y0, cy, w });
  }
  return out;
}

/**
 * The eyes as fabric's GPU pass sets them into the pile (fabric-gl.ts):
 * each curve with where the turned head puts it, in the body's own space.
 * None once the face has gone round the back.
 */
function eyesInPile(pose: Pose, cfg: DrawConfig, facing: number): FabricEye[] {
  if (cfg.faceless || facing <= -0.2) return [];
  const out: FabricEye[] = [];
  for (const { x, y, x0, y0, cy, w } of eyeShapes(pose, cfg.face)) {
    const q = onSphere(x, y, pose.yaw, pose.pitch);
    if (q.z <= 0.02) continue;
    const k = cfg.faceScale;
    out.push({
      x: cfg.faceX - 50 + k * q.x,
      y: cfg.faceY - 50 + k * q.y,
      sx: k * Math.max(0.02, q.sx),
      sy: k * Math.max(0.02, q.sy),
      x0, y0, cy,
      half: w / 2,
      alpha: Math.min(1, q.z * 5),
    });
  }
  return out;
}

/** `inPile`: the eyes are in the pile already (fabric by the GPU): only the rest of the face is drawn. */
function drawFace(ctx: CanvasRenderingContext2D, pose: Pose, cfg: DrawConfig, inPile = false): [EyeSpot, EyeSpot] {
  const [wd, ww, ws] = pose.w;
  const ink = cfg.ink;
  const ey = EYE_Y[cfg.face];
  const half = EYE_GAP / 2;
  const lx = pose.lookX;
  const { yaw, pitch } = pose;

  /* place a feature: skip it once it has gone round the side */
  const at = (x: number, y: number, fn: () => void, alpha = 1) => {
    const q = onSphere(x, y, yaw, pitch);
    if (q.z <= 0.02 || alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha * Math.min(1, q.z * 5);
    ctx.translate(q.x, q.y);
    ctx.scale(Math.max(0.02, q.sx), Math.max(0.02, q.sy));
    fn();
    ctx.restore();
  };

  const shapes = eyeShapes(pose, cfg.face);
  /* Fabric's eyes and mouth are dark beads set into the pile, not printed
     on it: the fur round each is pressed down, in its shade, with a crease
     under it; and the bead is round — matte, with one dim, soft light on
     the side the key is on (on a pale bead, a shade on the other). */
  const bead = cfg.shading === 'fabric';
  const pale = bead && luminance(ink) > 0.5;
  const la = ((cfg.light ?? LIGHT_DEFAULTS.fabric.light) * Math.PI) / 180;
  const bl = Math.hypot(0.75 * Math.sin(la), -0.75 * Math.cos(la) - 0.6) || 1;
  const beadX = (0.75 * Math.sin(la)) / bl, beadY = (-0.75 * Math.cos(la) - 0.6) / bl;
  /* the socket: `stroke` strokes the feature's outline, `w` its own width */
  const socket = (stroke: () => void, w: number) => {
    for (const [more, a] of [[3.6, 0.045], [2.5, 0.06], [1.5, 0.08], [0.7, 0.1]]) {
      ctx.lineWidth = w + more;
      ctx.strokeStyle = `rgba(0,0,0,${a})`;
      stroke();
    }
    ctx.save();
    ctx.translate(0, 0.9);
    ctx.lineWidth = w + 1.8;
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    stroke();
    ctx.restore();
  };
  /* the bead's light, for a feature `size` across with its middle at (x, y) */
  const sheen = (x: number, y: number, size: number): CanvasGradient => {
    const gx = x + 0.4 * size * beadX, gy = y + 0.46 * size * beadY;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 0.72 * size);
    if (pale) {
      const fx = x - 0.4 * size * beadX, fy = y - 0.46 * size * beadY;
      const f = ctx.createRadialGradient(fx, fy, 0, fx, fy, 0.9 * size);
      f.addColorStop(0, 'rgba(0,0,0,0.2)');
      f.addColorStop(0.6, 'rgba(0,0,0,0.05)');
      f.addColorStop(1, 'rgba(0,0,0,0)');
      return f;
    }
    g.addColorStop(0, 'rgba(255,255,255,0.2)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.06)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    return g;
  };
  for (const { x, y, x0, y0, cy, w } of inPile ? [] : shapes) {
    at(x, y, () => {
      const path = eyePath(x0, y0, cy);
      if (bead) socket(() => ctx.stroke(path), w);
      ctx.strokeStyle = ink;
      ctx.lineWidth = w;
      ctx.stroke(path);
      if (bead) {
        ctx.strokeStyle = sheen(0, 0.75 * y0 + 0.25 * cy, w);
        ctx.stroke(path);
      }
    });
  }

  if (cfg.face === 'mouth') {
    const mx = lx * 0.35;
    /* One mouth for every state, so a switch morphs it rather than fading
       one shape into another: two cubic edges between the corners, round
       caps of radius t0 at the corners (the smile is a thick line; the
       open mouth and the sleeping "o" have sharp corners), every number a
       blend of the three states'. The smile widens on the in-breath, the
       open mouth at the top of a hop, the "o" swells with each breath. */
    const kd = (0.6 + 0.4 * wd) * (1 + 0.06 * pose.breath);
    const kw = (0.6 + 0.4 * ww) * (1 + (0.25 * Math.max(0, -pose.y)) / 26);
    const r = 2.7 * ws * (1 + 0.25 * pose.breath);
    const b = (d: number, w: number, s: number) => wd * d + ww * w + ws * s;
    const m = {
      hw: b(6.5 * kd, 9.5 * kw, r),
      t0: b(1.9, 0, 0),
      a: b(2 / 3, 2 / 3, 0),
      yt: b(3.53 * kd, 1.6 * kw, (-4 * r) / 3),
      ab: b(2 / 3, 0, 0),
      yb: b(3.53 * kd, 17.3 * kw, (4 * r) / 3),
    };
    at(mx, b(12.5, 11.6, 15.5), () => {
      const path = mouthPath(m);
      if (bead) socket(() => ctx.stroke(path), 0);
      ctx.fillStyle = ink;
      ctx.fill(path);
      if (bead) {
        ctx.fillStyle = sheen(0, 0.35 * (m.yt + m.yb), 2 * m.hw);
        ctx.fill(path);
      }
    });
  }

  /* where the eyes sit on the face, for anything worn over them: the
     design spots on the sphere, without the look's drift */
  const spot = (x: number): EyeSpot => {
    const q = onSphere(x, ey, yaw, pitch);
    return { x: q.x, y: q.y, sx: q.sx, sy: q.sy, z: q.z, ox: x, oy: ey, fz: Math.sqrt(Math.max(0, FACE_R * FACE_R - x * x - ey * ey)) };
  };
  return [spot(-half), spot(half)];
}
