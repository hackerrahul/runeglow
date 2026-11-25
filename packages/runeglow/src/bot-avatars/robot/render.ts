/* Drawing the TV head on a 2D canvas. The shell's sides and rolled
   edges are lit per quad; the flat front and back are plates drawn in
   their own plane (an affine map is exact under an orthographic view),
   each carrying a baked relief — the lip into the screen hole, the
   rubber gasket, the shadow the lip casts on the glass, the screws, the
   vents on the back. The glass sits a little behind the face, so it
   slides against the bezel as the head turns. The LEDs are drawn crisp,
   then bloomed from a one-pixel-per-LED image scaled up smooth.

   What Runeglow changes in here: the meshes come at a level of detail
   picked from the drawn size; a frame allocates nothing per vertex or per
   quad; the baked reliefs are made at a few sizes and scaled, and the
   least recently used are dropped, so a head that is resized does not
   bake at every pixel; the LEDs may be round; the lit screen spills onto
   the lip and the gasket round it; and the ears and the collar shade the
   shell where they meet it. */

import { COLS, FACES, LIGHTS, ROWS, makeGrid, type Grid, type StateLight } from './faces';
import { HEAD, INSET, detailFor, headMeshes, rotation, type HeadMeshes, type Mesh, type Shape, type V3 } from './geometry';
import { HALF, KEY, colour, css, radiance, shade, type Material } from './light';
import type { RobotPose, RobotSim } from './sim';
import type { RobotHeadPixels, RobotHeadState } from './types';

export interface Palette {
  shell: Material;
  trim: Material;
  led: [number, number, number];
}

export interface RenderOptions {
  floorShadow: boolean;
  antenna: boolean;
  pixels: RobotHeadPixels;
}

type RGB = [number, number, number];

const TAU = Math.PI * 2;

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* a stable hash for the grain, so a rebake does not shimmer */
const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/* the head's reach, in head units: the antenna up to the top of its bulb,
   the knob alone, the ears past the sides; then the room motion needs past
   that: the bulb's glow, the highest hop (a click), the body rising past it
   as it stretches and leans in (with an antenna, its own room covers that),
   the floor's shadow, a turn or a lean past the ears */
const HEAD_TRAVEL = { antenna: 0.028 + HEAD.stem + HEAD.ball * 1.8, knob: 0.035, ear: 0.105, glow: 0.18, hop: 0.3, overshoot: 0.13, shadow: 0.22, side: 0.12 };
/* the resting robot fills its box but for this inset, as a share of the box */
const BOX_INSET = 0.05;

/**
 * Where a head sits, in CSS px. The element is a `box` × `box` square
 * holding the robot at rest, centred and filling it; the canvas reaches
 * past it by `pad*` on each side, room for hops, the glow and the floor's
 * shadow that takes no part in layout. `cx`, `cy` place the centre of the
 * resting head in the canvas; `unit` is one head unit.
 */
export interface Frame {
  box: number;
  padTop: number;
  padBottom: number;
  padSide: number;
  unit: number;
  cx: number;
  cy: number;
}

export function frameFor(shape: Shape, antenna: boolean, box: number): Frame {
  const top = antenna ? HEAD_TRAVEL.antenna : HEAD_TRAVEL.knob;
  const tall = 2 * shape.hy + top;
  const wide = 2 * (shape.earX + HEAD_TRAVEL.ear);
  const inner = box * (1 - 2 * BOX_INSET);
  const unit = Math.min(inner / tall, inner / wide);
  /* the resting robot, centred in the box */
  const above = (box - tall * unit) / 2;
  const centreY = above + (shape.hy + top) * unit;
  const reachUp = (antenna ? HEAD_TRAVEL.glow + HEAD_TRAVEL.hop : HEAD_TRAVEL.hop + HEAD_TRAVEL.overshoot) * unit;
  const reachDown = centreY + (shape.hy + HEAD_TRAVEL.shadow) * unit;
  const reachSide = box / 2 + (shape.earX + HEAD_TRAVEL.ear + HEAD_TRAVEL.side) * unit;
  /* whole px, and a pixel spare, so nothing ever touches the canvas edge */
  const padTop = Math.ceil(Math.max(0, reachUp - above) + 1);
  const padBottom = Math.ceil(Math.max(0, reachDown - box) + 1);
  const padSide = Math.ceil(Math.max(0, reachSide - box) + 1);
  return { box, padTop, padBottom, padSide, unit, cx: padSide + box / 2, cy: padTop + centreY };
}

/* how far the screen image reaches past the glass, so the recess never shows a gap */
const SCREEN_OVER = 0.035;

/* the glass's half extents, and the screen image's: the glass or the LED grid, whichever is bigger */
const glassOf = (s: Shape) => ({ hx: s.hx - INSET.glass, hy: s.hy - INSET.glass });
function screenOf(s: Shape) {
  const g = glassOf(s);
  return {
    hx: Math.max(g.hx, (COLS / 2) * s.pitch) + SCREEN_OVER,
    hy: Math.max(g.hy, (ROWS / 2) * s.pitch) + SCREEN_OVER,
  };
}
const plateOf = (s: Shape) => ({ hx: s.hx - INSET.plate, hy: s.hy - INSET.plate });

/**
 * A relief as light: positive brightens toward white, negative darkens
 * toward black, laid over a plate as white or black with that alpha.
 */
function bakeRelief(shape: Shape, unit: number, fn: (u: number, v: number, px: number, ix: number, iy: number) => number): HTMLCanvasElement {
  const PLATE = plateOf(shape);
  const w = Math.ceil(PLATE.hx * 2 * unit), h = Math.ceil(PLATE.hy * 2 * unit);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(c.width, c.height);
  const d = img.data;
  const px = (PLATE.hx * 2) / c.width;
  for (let iy = 0; iy < c.height; iy++) {
    const v = -PLATE.hy + (iy + 0.5) * px;
    for (let ix = 0; ix < c.width; ix++) {
      const u = -PLATE.hx + (ix + 0.5) * px;
      const edge = shape.sd(u, v, INSET.plate);
      const cover = Math.min(1, Math.max(0, 0.5 - edge / px));
      if (cover <= 0) continue;
      const val = fn(u, v, px, ix, iy);
      const i = (iy * c.width + ix) * 4;
      const a = Math.min(1, Math.abs(val)) * cover;
      const white = val > 0 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = white;
      d[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* lighting of a tilted bit of surface, relative to the flat plate */
function tilt(nx: number, ny: number, nz: number, gloss = 0.55, power = 36): number {
  const l = Math.hypot(nx, ny, nz);
  nx /= l; ny /= l; nz /= l;
  const diff = (nx * KEY[0] + ny * KEY[1] + nz * KEY[2] - KEY[2]) * 0.95;
  const spec = gloss * Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), power);
  return diff + spec - gloss * Math.pow(HALF[2], power);
}

/* gradient of a signed distance, by central differences */
function grad(fn: (u: number, v: number) => number, u: number, v: number): [number, number] {
  const e = 0.0015;
  const gx = fn(u + e, v) - fn(u - e, v);
  const gy = fn(u, v + e) - fn(u, v - e);
  const l = Math.hypot(gx, gy) || 1;
  return [gx / l, gy / l];
}

function screw(u: number, v: number, cx: number, cy: number, angle: number): number | null {
  const rs = 0.013;
  const dx = u - cx, dy = v - cy;
  const d = Math.hypot(dx, dy);
  if (d > rs + 0.006) return null;
  if (d > rs) return -0.5 * (1 - (d - rs) / 0.006);
  const nz = Math.sqrt(Math.max(0, 1 - (d / rs) ** 2)) + 0.6;
  let val = tilt(dx / rs, dy / rs, nz, 0.9, 30) * 1.3 + 0.08;
  /* the slot */
  const c = Math.cos(angle), s = Math.sin(angle);
  const across = Math.abs(dx * -s + dy * c);
  if (across < 0.0026 && d < rs * 0.8) val = -0.65;
  return val;
}

function bakeFront(shape: Shape, unit: number) {
  const LIP = 0.018;
  const sdHole = (u: number, v: number) => shape.sd(u, v, INSET.hole);
  const sdGlass = (u: number, v: number) => shape.sd(u, v, INSET.glass);
  const screws = shape.screws;
  return bakeRelief(shape, unit, (u, v, _px, ix, iy) => {
    const grain = (hash(ix, iy) - 0.5) * 0.07;
    for (const [cx, cy, a] of screws) {
      const s = screw(u, v, cx, cy, a);
      if (s !== null) return s;
    }
    const dh = sdHole(u, v);
    if (dh >= 0) {
      /* the shell rolls down into the hole */
      if (dh < LIP) {
        const [gx, gy] = grad(sdHole, u, v);
        const s = 1 - dh / LIP;
        const th = s * s * 1.25;
        return tilt(-gx * Math.sin(th), -gy * Math.sin(th), Math.cos(th)) + grain;
      }
      return grain;
    }
    const dg = sdGlass(u, v);
    if (dg >= 0) {
      /* the rubber gasket, a soft bead */
      const s = dg / HEAD.gasket;
      const [gx, gy] = grad(sdGlass, u, v);
      const th = (s - 0.45) * 2.2;
      return tilt(gx * Math.sin(th), gy * Math.sin(th), Math.cos(th), 0.22, 14) * 0.7 + grain * 0.4;
    }
    /* on the glass: the lip's cast shadow, darker toward the edge */
    const k = 0.05;
    const blocked = smooth(-0.012, 0.012, sdGlass(u - KEY[0] * k, v - KEY[1] * k));
    return -(0.5 * blocked + 0.32 * Math.exp(dg / 0.014));
  });
}

function bakeBack(shape: Shape, unit: number) {
  const vents = [-0.12, -0.065, -0.01, 0.045, 0.1];
  const panel = (u: number, v: number) => shape.sd(u, v, INSET.plate + 0.04);
  const screws = shape.backScrews;
  /* the vents stay inside the panel line on the narrow shapes */
  const reach = Math.min(0.196, shape.hx - INSET.plate - 0.13);
  return bakeRelief(shape, unit, (u, v, _px, ix, iy) => {
    const grain = (hash(ix, iy) - 0.5) * 0.07;
    for (const [cx, cy, a] of screws) {
      const s = screw(u, v, cx, cy, a);
      if (s !== null) return s;
    }
    /* a panel line */
    const dp = panel(u, v);
    if (Math.abs(dp) < 0.006) {
      const [gx, gy] = grad(panel, u, v);
      const th = (dp / 0.006) * 1.1;
      return tilt(-gx * Math.sin(th), -gy * Math.sin(th), Math.cos(th)) * 0.9 - 0.18;
    }
    for (const vy of vents) {
      const slot = (a: number, b: number) => Math.hypot(Math.max(0, Math.abs(a) - reach), b - vy) - 0.014;
      const d = slot(u, v);
      if (d < 0) {
        /* down in the slot: dark, the top lip's shadow over it */
        return -0.72 - 0.15 * smooth(-0.014, 0, -(v - vy));
      }
      if (d < 0.01) {
        const [gx, gy] = grad(slot, u, v);
        const th = (1 - d / 0.01) ** 2 * 1.2;
        return tilt(-gx * Math.sin(th), -gy * Math.sin(th), Math.cos(th)) + grain;
      }
    }
    return grain;
  });
}

/* Where the screen's light lands on the face round it: all of the gasket,
   and the lip rolling into the hole, fading out across the bezel. White
   with that alpha; the renderer tints it with the LEDs' colour. */
function bakeSpill(shape: Shape, unit: number) {
  const sdHole = (u: number, v: number) => shape.sd(u, v, INSET.hole);
  const sdGlass = (u: number, v: number) => shape.sd(u, v, INSET.glass);
  return bakeRelief(shape, unit, (u, v) => {
    const dh = sdHole(u, v);
    if (dh >= 0) return 0.62 * Math.exp(-dh / 0.02);
    const dg = sdGlass(u, v);
    /* brightest on the inner half of the bead, the side that faces the LEDs */
    return dg >= 0 ? 0.62 + 0.38 * (1 - dg / HEAD.gasket) : 0;
  });
}

/* one LED's outline: a square cell or a round one */
const cellPath = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, round: boolean) => {
  if (round) {
    ctx.moveTo(x + s, y + s / 2);
    ctx.arc(x + s / 2, y + s / 2, s / 2, 0, TAU);
  } else ctx.rect(x, y, s, s);
};

/* the lit share of a cell's pitch */
const cellSize = (pitch: number, round: boolean) => pitch * (round ? 0.86 : 0.8);

/* the screen's background and the dark LEDs, which never change */
function bakeScreenBase(w: number, h: number, pitch: number, x0: number, y0: number, led: RGB, round: boolean) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
  g.addColorStop(0, '#111417');
  g.addColorStop(1, '#050607');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  /* each LED a dark lens in a black grid */
  const cell = cellSize(pitch, round);
  const off = (pitch - cell) / 2;
  /* the dark lenses fill the whole glass, past the cells the faces use */
  const c0 = -Math.ceil(x0 / pitch), c1 = Math.ceil((w - x0) / pitch);
  const r0 = -Math.ceil(y0 / pitch), r1 = Math.ceil((h - y0) / pitch);
  ctx.fillStyle = `rgba(${Math.round(60 + led[0] * 0.12)},${Math.round(64 + led[1] * 0.12)},${Math.round(70 + led[2] * 0.12)},0.34)`;
  ctx.beginPath();
  for (let r = r0; r < r1; r++) for (let q = c0; q < c1; q++) cellPath(ctx, x0 + q * pitch + off, y0 + r * pitch + off, cell, round);
  ctx.fill();
  /* a faint highlight on the top edge of each lens */
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  for (let r = r0; r < r1; r++) {
    for (let q = c0; q < c1; q++) {
      const x = x0 + q * pitch + off, y = y0 + r * pitch + off;
      if (round) {
        ctx.moveTo(x + cell * 0.74, y + cell * 0.3);
        ctx.arc(x + cell * 0.5, y + cell * 0.3, cell * 0.24, 0, TAU);
      } else ctx.rect(x, y, cell, Math.max(1, cell * 0.16));
    }
  }
  ctx.fill();
  return c;
}

/* the glass over the LEDs: vignette, a curved reflection, a cool sheen */
function bakeGlass(w: number, h: number) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  const top = ctx.createLinearGradient(0, 0, 0, h);
  top.addColorStop(0, 'rgba(190,210,255,0.09)');
  top.addColorStop(0.42, 'rgba(190,210,255,0.015)');
  top.addColorStop(0.43, 'rgba(190,210,255,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w * 0.3, h * 0.2);
  ctx.scale(1, 0.45);
  const spot = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.35);
  spot.addColorStop(0, 'rgba(255,255,255,0.07)');
  spot.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(-w, -h * 3, w * 2, h * 6);
  ctx.restore();
  return c;
}

/* the shell's surface: a fine speckle, or the streaks of a brushed metal */
const grains: Array<CanvasPattern | null | undefined> = [undefined, undefined];
function grainPattern(ctx: CanvasRenderingContext2D, brushed: boolean): CanvasPattern | null {
  const made = grains[brushed ? 1 : 0];
  if (made !== undefined) return made;
  const c = makeCanvas(brushed ? 256 : 128, 128);
  const g = c.getContext('2d')!;
  const img = g.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    /* a brushed row is one long stroke, broken here and there */
    const row = hash(y, 31);
    for (let x = 0; x < c.width; x++) {
      const i = y * c.width + x;
      const r = brushed ? row * 0.7 + hash(x >> 5, y) * 0.3 : hash(i, 7);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = r > 0.5 ? 255 : 0;
      img.data[i * 4 + 3] = Math.round(brushed ? Math.abs(r - 0.5) * 2 * 30 : hash(i, 13) * 9);
    }
  }
  g.putImageData(img, 0, 0);
  return (grains[brushed ? 1 : 0] = ctx.createPattern(c, 'repeat'));
}

/* The baked reliefs depend only on the shape and the size, so every head
   on the page shares them. They are drawn through the plate's transform,
   which scales them, so they are made at the next of a few sizes up (three
   to a doubling) rather than at each one, and only the last few are kept. */
interface Bakes {
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
  glass: HTMLCanvasElement;
  spill: HTMLCanvasElement;
}
const BAKES_KEPT = 14;
const bakes = new Map<string, Bakes>();
const bakeUnit = (unit: number) => Math.min(1100, Math.pow(2, Math.ceil(Math.log2(Math.max(24, unit)) * 3) / 3));
function bakesFor(shape: Shape, unit: number): Bakes {
  const at = bakeUnit(unit);
  const key = `${shape.name}:${Math.round(at)}`;
  let b = bakes.get(key);
  if (b) bakes.delete(key);
  else {
    const sc = screenOf(shape);
    b = { front: bakeFront(shape, at), back: bakeBack(shape, at), glass: bakeGlass(sc.hx * 2 * at, sc.hy * 2 * at), spill: bakeSpill(shape, at) };
    if (bakes.size >= BAKES_KEPT) bakes.delete(bakes.keys().next().value as string);
  }
  /* the newest last, so the first is the one to drop */
  bakes.set(key, b);
  return b;
}

/* The shell is drawn on a layer of its own, so the grain and the contact
   shading stay on it. Drawing is synchronous, so one layer serves every
   head on the page, as large as the largest of them. */
let shared: HTMLCanvasElement | null = null;
function layerFor(w: number, h: number): HTMLCanvasElement {
  if (!shared) shared = makeCanvas(w, h);
  else if (shared.width < w || shared.height < h) {
    const nw = Math.max(shared.width, w), nh = Math.max(shared.height, h);
    shared.width = nw;
    shared.height = nh;
  }
  return shared;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

export class RobotRenderer {
  private shape: Shape | null = null;
  private meshes: HeadMeshes | null = null;
  private unit = 0;
  private ledKey = '';
  private bake: Bakes | null = null;
  private screen: HTMLCanvasElement | null = null;
  private screenBase: HTMLCanvasElement | null = null;
  private spill: HTMLCanvasElement | null = null;
  private tiny = makeCanvas(COLS, ROWS);
  private tinyHalf = makeCanvas(COLS / 2, ROWS / 2);
  private tinyImg: ImageData | null = null;
  private grid: Grid = makeGrid(COLS, ROWS);
  private gridPrev: Grid = makeGrid(COLS, ROWS);
  private screenGeo = { pitch: 0, x0: 0, y0: 0 };
  /* how much of the screen is lit, 0–1: what it spills onto the bezel */
  private energy = 0;

  /* this frame's view: the rotation, and where a turned point lands */
  private R: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  private ox = 0;
  private oy = 0;
  private kx = 1;
  private ky = 1;
  /* scratch for the meshes, grown to the largest one drawn */
  private proj = new Float32Array(0);
  private order = new Uint16Array(0);
  private tint = new Int32Array(0);
  private byTint = (a: number, b: number) => this.tint[a] - this.tint[b];

  private prepare(shape: Shape, unit: number, led: RGB, round: boolean) {
    if (Math.abs(unit - this.unit) > 0.5 || shape !== this.shape) {
      this.unit = unit;
      this.shape = shape;
      this.meshes = headMeshes(shape, detailFor(unit));
      const sc = screenOf(shape);
      this.screen = makeCanvas(sc.hx * 2 * unit, sc.hy * 2 * unit);
      this.ledKey = '';
      /* the matrix covers the whole glass, the face area centred in it */
      const gl = glassOf(shape);
      this.grid = makeGrid(Math.ceil((gl.hx * 2) / shape.pitch), Math.ceil((gl.hy * 2) / shape.pitch));
      this.gridPrev = makeGrid(this.grid.cols, this.grid.rows);
      this.tiny = makeCanvas(this.grid.cols, this.grid.rows);
      this.tinyHalf = makeCanvas(Math.ceil(this.grid.cols / 2), Math.ceil(this.grid.rows / 2));
      this.tinyImg = null;
      const pitch = shape.pitch * unit;
      this.screenGeo = {
        pitch,
        x0: (this.screen.width - pitch * this.grid.cols) / 2,
        y0: (this.screen.height - pitch * this.grid.rows) / 2,
      };
      const m = this.meshes;
      if (this.proj.length < m.verts * 2) this.proj = new Float32Array(m.verts * 2);
      const quads = Math.max(m.body.quads.length, m.earL.quads.length, m.collar.quads.length) / 4;
      if (this.order.length < quads) {
        this.order = new Uint16Array(quads);
        this.tint = new Int32Array(quads);
      }
    }
    /* looked up every frame: a bake another head still uses stays the newest */
    const bake = bakesFor(shape, unit);
    const key = `${led[0]},${led[1]},${led[2]}|${round}`;
    if ((key !== this.ledKey || bake !== this.bake) && this.screen) {
      if (key !== this.ledKey) {
        const { pitch, x0, y0 } = this.screenGeo;
        this.screenBase = bakeScreenBase(this.screen.width, this.screen.height, pitch, x0, y0, led, round);
      }
      this.ledKey = key;
      this.bake = bake;
      /* the spill in the LEDs' colour */
      const src = bake.spill;
      if (!this.spill || this.spill.width !== src.width || this.spill.height !== src.height) this.spill = makeCanvas(src.width, src.height);
      const s = this.spill.getContext('2d')!;
      s.globalCompositeOperation = 'copy';
      s.drawImage(src, 0, 0);
      s.globalCompositeOperation = 'source-in';
      s.fillStyle = rgb(led);
      s.fillRect(0, 0, src.width, src.height);
    }
  }

  /* the LED matrix for this frame */
  private compose(sim: RobotSim | null, state: RobotHeadState): Grid {
    const grid = this.grid;
    const g = grid.v;
    const { cols, rows } = grid;
    g.fill(0);
    if (!sim) {
      FACES[state](grid, { lookX: 0, lookY: 0, blink: 0, time: 0.4, side: 1, seed: 0 });
      return grid;
    }
    FACES[sim.shown](grid, sim.face);
    /* a cross-fade from the last face, with a flicker of glitch */
    if (sim.switched < 0.3) {
      const p = this.gridPrev;
      p.v.fill(0);
      FACES[sim.previous](p, { ...sim.face, time: sim.face.time + 10 });
      const k = sim.switched / 0.3;
      for (let i = 0; i < g.length; i++) g[i] = g[i] * k + p.v[i] * (1 - k);
      if (sim.switched < 0.13) {
        const seed = Math.floor(sim.time * 30);
        for (let r = 0; r < rows; r++) {
          const shift = Math.floor((Math.sin(seed * 12.9 + r * 78.2) * 0.5 + 0.5) * 3) - 1;
          if (!shift) continue;
          const row = g.slice(r * cols, (r + 1) * cols);
          for (let c = 0; c < cols; c++) g[r * cols + c] = row[(c - shift + cols) % cols];
        }
        for (let i = 0; i < g.length; i++) if (Math.sin(i * 91.7 + seed * 3.1) > 0.93) g[i] = Math.max(g[i], 0.3);
      }
    }
    /* switching on: a bright line that opens to the full screen */
    if (sim.age < 0.55) {
      const open = smooth(0.08, 0.5, sim.age) * (rows / 2 + 0.5);
      for (let r = 0; r < rows; r++) {
        const d = Math.abs(r - (rows - 1) / 2);
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (d > open) g[i] = 0;
          else if (d > open - 1.2) g[i] = Math.max(g[i], 0.85 * (1 - sim.age / 0.55));
        }
      }
    }
    return grid;
  }

  private drawScreen(grid: Grid, led: RGB, round: boolean) {
    const s = this.screen!;
    const ctx = s.getContext('2d')!;
    const { cols, rows, v: g } = grid;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(this.screenBase!, 0, 0);
    const { pitch, x0, y0 } = this.screenGeo;
    const coreCss = rgb(mix(led, [255, 255, 255], 0.6));
    const bleedCss = rgb(led);
    const cell = cellSize(pitch, round), off = (pitch - cell) / 2;
    let lit = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = g[r * cols + c];
        if (v < 0.01) continue;
        lit += Math.min(1, v);
        const x = x0 + c * pitch, y = y0 + r * pitch;
        /* the light bleeding into the gap round the lens, then the lens */
        ctx.globalAlpha = Math.min(1, v * 0.4);
        ctx.fillStyle = bleedCss;
        ctx.beginPath();
        cellPath(ctx, x + off * 0.4, y + off * 0.4, pitch - off * 0.8, round);
        ctx.fill();
        ctx.globalAlpha = Math.min(1, v);
        ctx.fillStyle = coreCss;
        ctx.beginPath();
        cellPath(ctx, x + off, y + off, cell, round);
        ctx.fill();
      }
    }
    /* a pair of open eyes is 24 cells; a little more than that is a full spill */
    this.energy = Math.min(1, lit / 34);
    /* bloom: the matrix at one pixel per LED, scaled up smooth */
    const t = this.tiny.getContext('2d')!;
    if (!this.tinyImg) this.tinyImg = t.createImageData(cols, rows);
    const d = this.tinyImg.data;
    for (let i = 0; i < cols * rows; i++) {
      d[i * 4] = led[0];
      d[i * 4 + 1] = led[1];
      d[i * 4 + 2] = led[2];
      d[i * 4 + 3] = Math.round(Math.min(1, g[i]) * 255);
    }
    t.putImageData(this.tinyImg, 0, 0);
    const h = this.tinyHalf.getContext('2d')!;
    h.clearRect(0, 0, this.tinyHalf.width, this.tinyHalf.height);
    h.imageSmoothingEnabled = true;
    h.drawImage(this.tiny, 0, 0, this.tinyHalf.width, this.tinyHalf.height);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(this.tiny, x0, y0, cols * pitch, rows * pitch);
    ctx.globalAlpha = 0.65;
    ctx.drawImage(this.tinyHalf, x0 - pitch, y0 - pitch, (cols + 2) * pitch, (rows + 2) * pitch);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(this.bake!.glass, 0, 0, s.width, s.height);
  }

  /* a point of the head, turned and projected: canvas x, y and depth */
  private P(x: number, y: number, z: number): V3 {
    const R = this.R;
    return [
      this.ox + (R[0] * x + R[1] * y + R[2] * z) * this.kx,
      this.oy + (R[3] * x + R[4] * y + R[5] * z) * this.ky,
      R[6] * x + R[7] * y + R[8] * z,
    ];
  }

  /* draw in the plane z of the head, x to the right (to the left when flipped) and y down */
  private plane(c: CanvasRenderingContext2D, z: number, flip: boolean) {
    const R = this.R, f = flip ? -1 : 1;
    c.setTransform(f * R[0] * this.kx, f * R[3] * this.ky, R[1] * this.kx, R[4] * this.ky, this.ox + R[2] * z * this.kx, this.oy + R[5] * z * this.ky);
  }

  /* A mesh, back faces culled and the rest lit per quad. Every mesh here is
     convex, so what is left after culling does not overlap and needs no
     depth order; the quads are drawn in order of colour instead, each
     colour as one path, which sets the canvas's fill a few dozen times a
     mesh rather than once a quad — by far the larger cost of the two. */
  private fillMesh(c: CanvasRenderingContext2D, mesh: Mesh, mat: Material, stroke: number) {
    const R = this.R, pr = this.proj, pos = mesh.pos;
    const { ox, oy, kx, ky } = this;
    for (let i = 0, j = 0; i < pos.length; i += 3, j += 2) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      pr[j] = ox + (R[0] * x + R[1] * y + R[2] * z) * kx;
      pr[j + 1] = oy + (R[3] * x + R[4] * y + R[5] * z) * ky;
    }
    const q = mesh.quads, nn = mesh.normals, tint = this.tint;
    let n = 0;
    for (let k = 0; k < q.length / 4; k++) {
      const nx = nn[k * 3], ny = nn[k * 3 + 1], nz = nn[k * 3 + 2];
      const wz = R[6] * nx + R[7] * ny + R[8] * nz;
      if (wz < -0.03) continue;
      tint[k] = shade(mat, R[0] * nx + R[1] * ny + R[2] * nz, R[3] * nx + R[4] * ny + R[5] * nz, wz);
      this.order[n++] = k;
    }
    const order = this.order.subarray(0, n).sort(this.byTint);
    c.lineWidth = stroke;
    c.lineJoin = 'round';
    let run = -1;
    for (let o = 0; o < n; o++) {
      const k = order[o];
      if (tint[k] !== run) {
        /* filled, and stroked in its own colour so no seam shows between neighbours */
        if (run >= 0) {
          c.fill();
          c.stroke();
        }
        run = tint[k];
        c.fillStyle = c.strokeStyle = colour(run);
        c.beginPath();
      }
      const a = q[k * 4] * 2, b = q[k * 4 + 1] * 2, d = q[k * 4 + 2] * 2, e = q[k * 4 + 3] * 2;
      c.moveTo(pr[a], pr[a + 1]);
      c.lineTo(pr[b], pr[b + 1]);
      c.lineTo(pr[d], pr[d + 1]);
      c.lineTo(pr[e], pr[e + 1]);
      c.closePath();
    }
    if (run >= 0) {
      c.fill();
      c.stroke();
    }
  }

  /** Draw a frame; `frame` is in CSS px, the canvas in device px (`dpr` per CSS px). */
  draw(ctx: CanvasRenderingContext2D, frame: Frame, dpr: number, pose: RobotPose, sim: RobotSim | null, state: RobotHeadState, shape: Shape, palette: Palette, opts: RenderOptions) {
    const U = frame.unit * dpr;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const PLATE = plateOf(shape);
    const GLASS = glassOf(shape);
    const SCREEN = screenOf(shape);
    const round = opts.pixels === 'round';
    const shown = sim ? sim.shown : state;
    const lightNow = LIGHTS[shown];
    let led: RGB = lightNow.screen ?? palette.led;
    if (sim && sim.switched < 0.3) {
      const was = LIGHTS[sim.previous].screen ?? palette.led;
      led = mix(was, led, sim.switched / 0.3);
    }
    led = [Math.round(led[0]), Math.round(led[1]), Math.round(led[2])];
    this.prepare(shape, U, led, round);

    const R = rotation(pose.yaw, pose.pitch, pose.roll, this.R);
    const cx = frame.cx * dpr + pose.x * U;
    /* the head's centre at rest, and now; it squashes about its bottom edge */
    const rest = frame.cy * dpr;
    const cy = rest - pose.lift * U;
    const by = cy + shape.hy * U;
    this.ox = cx;
    this.kx = U * pose.sx;
    this.ky = U * pose.sy;
    this.oy = by - shape.hy * this.ky;
    const stroke = Math.max(0.6, U / 260);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    /* the floor's shadow, smaller and fainter the higher the head is */
    if (opts.floorShadow) {
      const up = Math.max(0, pose.lift);
      const fy = rest + (shape.hy + 0.11) * U;
      const rx = U * shape.hx * (1 - up * 0.9) * pose.sx;
      ctx.save();
      ctx.translate(cx, fy);
      ctx.scale(1, 0.16);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      const a = 0.55 * Math.max(0, 1 - up * 1.6);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(0.55, `rgba(0,0,0,${a * 0.45})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const { body, earL, earR, collar } = this.meshes!;
    /* how far toward the viewer each ear and the top of the head are */
    const earLz = R[6] * (-shape.earX - 0.05) + R[7] * HEAD.earY;
    const earRz = R[6] * (shape.earX + 0.05) + R[7] * HEAD.earY;
    const topZ = R[7] * -shape.hy;
    const antennaBehind = topZ < -0.012;

    /* the knob on top always; the stem and its bulb only with the antenna on */
    const antenna = () => this.drawAntenna(ctx, U, pose, palette, sim, lightNow, collar, opts.antenna, stroke);

    if (antennaBehind) antenna();
    if (earLz < 0) this.fillMesh(ctx, earL, palette.trim, stroke);
    if (earRz < 0) this.fillMesh(ctx, earR, palette.trim, stroke);

    /* the shell, on its own layer so the grain and the contact shading stay on it */
    const sheet = layerFor(W, H);
    const layer = sheet.getContext('2d')!;
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.globalCompositeOperation = 'source-over';
    layer.globalAlpha = 1;
    layer.clearRect(0, 0, W, H);
    this.fillMesh(layer, body, palette.shell, stroke);
    const frontZ = R[8];
    const zf = shape.depth / 2;
    const facing = Math.abs(frontZ) > 0.005 ? (frontZ > 0 ? 1 : -1) : 0;
    if (facing) {
      const dome = 0.17;
      this.plane(layer, facing * zf, facing < 0);
      /* the plate is very slightly domed: lit as if it leaned a little each way */
      const at = (dx: number, dy: number) => {
        const x = dx * (facing < 0 ? -1 : 1), z = facing;
        const wx = R[0] * x + R[1] * dy + R[2] * z, wy = R[3] * x + R[4] * dy + R[5] * z, wz = R[6] * x + R[7] * dy + R[8] * z;
        const l = Math.hypot(wx, wy, wz);
        return css(radiance(palette.shell, wx / l, wy / l, wz / l));
      };
      layer.beginPath();
      shape.path(layer, INSET.plate - 0.002);
      const vg = layer.createLinearGradient(0, -PLATE.hy, 0, PLATE.hy);
      vg.addColorStop(0, at(0, -dome));
      vg.addColorStop(0.5, at(0, 0));
      vg.addColorStop(1, at(0, dome));
      layer.fillStyle = vg;
      layer.fill();
      const hg = layer.createLinearGradient(-PLATE.hx, 0, PLATE.hx, 0);
      hg.addColorStop(0, at(-dome, 0));
      hg.addColorStop(0.5, at(0, 0));
      hg.addColorStop(1, at(dome, 0));
      layer.globalAlpha = 0.5;
      layer.fillStyle = hg;
      layer.fill();
      layer.globalAlpha = 1;
      if (palette.shell.brushed) {
        /* a brushed plate smears the light into upright bands, which slide across it as the head turns */
        const slide = (facing < 0 ? 1 : -1) * Math.sin(pose.yaw) * 0.55 + Math.sin(pose.pitch) * 0.12;
        const band = layer.createLinearGradient(-PLATE.hx * 1.6 + slide, 0, PLATE.hx * 1.6 + slide, 0);
        band.addColorStop(0, 'rgba(0,0,0,0.3)');
        band.addColorStop(0.24, 'rgba(255,255,255,0.05)');
        band.addColorStop(0.36, 'rgba(255,255,255,0.5)');
        band.addColorStop(0.47, 'rgba(0,0,0,0.12)');
        band.addColorStop(0.58, 'rgba(255,255,255,0.3)');
        band.addColorStop(0.72, 'rgba(0,0,0,0.26)');
        band.addColorStop(1, 'rgba(0,0,0,0.34)');
        layer.globalCompositeOperation = 'overlay';
        layer.fillStyle = band;
        layer.fill();
        layer.globalCompositeOperation = 'source-over';
      }
    }
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.globalCompositeOperation = 'source-atop';
    /* where an ear or the collar meets the shell it keeps the light off it */
    const contact = (x: number, y: number, radius: number, strength: number) => {
      if (strength <= 0.01) return;
      const p = this.P(x, y, 0);
      const r = radius * U;
      const g = layer.createRadialGradient(p[0], p[1], r * 0.3, p[0], p[1], r);
      g.addColorStop(0, `rgba(4,6,12,${0.34 * strength})`);
      g.addColorStop(1, 'rgba(4,6,12,0)');
      layer.fillStyle = g;
      layer.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
    };
    contact(-shape.earX, HEAD.earY, 0.16, smooth(-0.06, 0.16, earLz));
    contact(shape.earX, HEAD.earY, 0.16, smooth(-0.06, 0.16, earRz));
    contact(0, -shape.hy, 0.1, 0.8);
    const speckle = grainPattern(ctx, palette.shell.brushed);
    if (speckle) {
      /* the grain rides with the head, and a brushed one tilts with it */
      if (typeof DOMMatrix === 'function' && 'setTransform' in speckle) speckle.setTransform(new DOMMatrix().translate(cx, cy).rotate((pose.roll * 180) / Math.PI));
      layer.fillStyle = speckle;
      layer.fillRect(0, 0, W, H);
    }
    layer.globalCompositeOperation = 'source-over';
    ctx.drawImage(sheet, 0, 0, W, H, 0, 0, W, H);

    /* the plate's details: the screen in front, the vents behind */
    if (facing > 0) {
      ctx.save();
      this.plane(ctx, zf, false);
      ctx.beginPath();
      shape.path(ctx, INSET.hole);
      ctx.fillStyle = '#060709';
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      shape.path(ctx, INSET.glass);
      ctx.clip();
      this.drawScreen(this.compose(sim, state), led, round);
      this.plane(ctx, zf - HEAD.recess, false);
      ctx.drawImage(this.screen!, -SCREEN.hx, -SCREEN.hy, SCREEN.hx * 2, SCREEN.hy * 2);
      /* a reflection sliding over the glass as the head turns */
      this.plane(ctx, zf, false);
      const s = -0.05 - pose.yaw * 0.9 + pose.pitch * 0.5;
      const sg = ctx.createLinearGradient(-0.55 + s, -0.35, 0.15 + s, 0.35);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.36, 'rgba(255,255,255,0)');
      sg.addColorStop(0.43, 'rgba(220,232,255,0.075)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0)');
      sg.addColorStop(0.58, 'rgba(255,255,255,0)');
      sg.addColorStop(0.61, 'rgba(220,232,255,0.04)');
      sg.addColorStop(0.65, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(-GLASS.hx, -GLASS.hy, GLASS.hx * 2, GLASS.hy * 2);
      ctx.restore();
      ctx.drawImage(this.bake!.front, -PLATE.hx, -PLATE.hy, PLATE.hx * 2, PLATE.hy * 2);
      /* the screen's light on the gasket and the lip round it */
      if (this.spill && this.energy > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.3 * this.energy;
        ctx.drawImage(this.spill, -PLATE.hx, -PLATE.hy, PLATE.hx * 2, PLATE.hy * 2);
      }
      ctx.restore();
    } else if (facing < 0) {
      ctx.save();
      this.plane(ctx, -zf, true);
      ctx.drawImage(this.bake!.back, -PLATE.hx, -PLATE.hy, PLATE.hx * 2, PLATE.hy * 2);
      ctx.restore();
    }

    if (earLz >= 0) this.fillMesh(ctx, earL, palette.trim, stroke);
    if (earRz >= 0) this.fillMesh(ctx, earR, palette.trim, stroke);
    if (!antennaBehind) antenna();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawAntenna(
    ctx: CanvasRenderingContext2D,
    U: number,
    pose: RobotPose,
    palette: Palette,
    sim: RobotSim | null,
    lightNow: StateLight,
    collar: Mesh,
    stem: boolean,
    stroke: number,
  ) {
    /* the collar, lit like the ears */
    this.fillMesh(ctx, collar, palette.trim, stroke);
    if (!stem) return;

    /* the stem bends toward its tip; the ball rides on the end */
    const top = -this.shape!.hy - 0.028;
    const L = HEAD.stem;
    const ax = pose.antennaX, az = pose.antennaZ;
    const dx = Math.sin(ax), dy = -Math.cos(ax) * Math.cos(az), dz = Math.sin(az);
    const base = this.P(0, top, 0);
    const ctrl = this.P(0, top - L * 0.55, 0);
    const tip = this.P(dx * L, top + dy * L, dz * L);
    const reach = L + HEAD.ball * 0.8;
    const ballC = this.P(dx * reach, top + dy * reach, dz * reach);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(base[0], base[1]);
    ctx.quadraticCurveTo(ctrl[0], ctrl[1], tip[0], tip[1]);
    ctx.lineWidth = U * 0.02;
    ctx.strokeStyle = '#4a5260';
    ctx.stroke();
    ctx.lineWidth = U * 0.009;
    ctx.strokeStyle = '#9aa3b1';
    ctx.stroke();
    ctx.save();
    ctx.translate(-U * 0.004, 0);
    ctx.lineWidth = U * 0.004;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.stroke();
    ctx.restore();

    /* the bulb: frosted glass, lit from inside by the state's light */
    let colour: RGB = lightNow.ball;
    let level = lightNow.pulse(sim ? sim.face.time : 0.3);
    if (sim && sim.switched < 0.3) {
      const was = LIGHTS[sim.previous];
      const k = sim.switched / 0.3;
      colour = mix(was.ball, colour, k);
      level = was.pulse(sim.face.time + 10) * (1 - k) + level * k;
    }
    if (sim && sim.age < 0.55) level *= smooth(0.1, 0.5, sim.age);
    const r = HEAD.ball * U * pose.sx;
    const bx = ballC[0], by = ballC[1];
    const frost: RGB = [168, 174, 186];
    const lit = mix(frost, mix(colour, [255, 255, 255], 0.35), level);
    /* the glass thickens toward its edge and tints with the light inside,
       so even a white bulb has a rim that reads on a pale page */
    const glassTint = mix([150, 158, 172], colour, 0.5);
    const shoulder = mix(lit, glassTint, 0.48);
    const edge = mix([70, 76, 88], mix(colour, [90, 96, 108], 0.5), level * 0.55);
    /* the hot core sits a little up and in, the filament the light comes from */
    const g = ctx.createRadialGradient(bx - r * 0.18, by - r * 0.22, r * 0.05, bx, by, r);
    g.addColorStop(0, rgb(mix(lit, [255, 255, 255], 0.6 + level * 0.3)));
    g.addColorStop(0.38, rgb(lit));
    g.addColorStop(0.78, rgb(shoulder));
    g.addColorStop(1, rgb(edge));
    /* its glow, behind the bulb so it lights the air and never washes out the glass */
    if (level > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(bx, by, r * 0.6, bx, by, r * 4.2);
      const c = `${Math.round(colour[0])},${Math.round(colour[1])},${Math.round(colour[2])}`;
      glow.addColorStop(0, `rgba(${c},${0.5 * level})`);
      glow.addColorStop(0.35, `rgba(${c},${0.14 * level})`);
      glow.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(bx, by, r * 4.2, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    /* where the bulb sits on the stem, a little contact shade */
    const seat = ctx.createRadialGradient(bx, by + r * 0.9, 0, bx, by + r * 0.9, r * 0.7);
    seat.addColorStop(0, 'rgba(20,24,32,0.28)');
    seat.addColorStop(1, 'rgba(20,24,32,0)');
    ctx.fillStyle = seat;
    ctx.beginPath();
    ctx.arc(bx, by + r * 0.9, r * 0.7, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    /* a hairline at the silhouette: the glass's own edge, invisible on dark, a crisp outline on light */
    ctx.lineWidth = Math.max(0.75, r * 0.07);
    ctx.strokeStyle = 'rgba(28,32,42,0.28)';
    ctx.stroke();
    /* the window's reflection */
    const sp = ctx.createRadialGradient(bx - r * 0.38, by - r * 0.42, 0, bx - r * 0.38, by - r * 0.42, r * 0.38);
    sp.addColorStop(0, 'rgba(255,255,255,0.95)');
    sp.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sp;
    ctx.fill();
  }
}
