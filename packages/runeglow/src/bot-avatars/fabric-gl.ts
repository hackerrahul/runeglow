/* fabric-gl.ts — fabric's pile drawn by the GPU.

   The canvas-2D fabric (plastic.ts) bakes a film of fur for every outline,
   size, light and style on the main thread, then shades and composites the
   body there every frame. Here the same body — the form's pillow height
   field, front and back — is a mesh, and the pile is drawn on it each
   frame by a shader: the solid undercoat, a stack of shells lifted off it
   that keep only the fibres reaching their height, and single strands
   over the top that break the silhouette into hairs. Nothing is baked but
   the mesh, once per form.

   Every fabric avatar on the page shares one WebGL2 context (a browser
   allows only a handful): it draws one avatar at a time at the corner of
   its own canvas, and that picture is copied at once into the avatar's 2D
   canvas under the body's transform, where the rest of the face and
   whatever is worn are drawn over it as before. Without WebGL2, or while
   its context is lost, `drawFabricGL` declines and the canvas-2D fabric
   draws instead.

   The eyes are not drawn over the pile but set into it: every pass is
   told the curve the face draws each eye as, the pile parts and shortens
   round it, and the bead itself is the undercoat's. Under a hat, a pair of
   headphones or a bow tie the pile lies flat in the same way.

   The lighting is plastic.ts's fabric matcap (buildFabricMatcap) evaluated
   per fragment in view space, with the same tone curve and occlusion. */

import { parseColor } from './color';
import type { Form, FurLights, FurStyle, Material, Rig } from './plastic';

type V3 = [number, number, number];

/** What `drawFabricGL` is given beyond the rig: the form and how it sits in design units. */
export interface FabricBody {
  form: Form;
  /** the texture's margin round the 100 × 100 body box, and its span (PAD and SPAN in plastic.ts) */
  pad: number;
  span: number;
  /** the body colour, linear */
  color: V3;
  style: FurStyle;
  lights: FurLights;
}

/**
 * An eye to set into the pile: the curve the face draws it as (draw.ts) —
 * endpoints at ±x0,y0, a control point at 0,cy, `half` its width, round
 * caps — in a frame of its own, whose origin is at (x, y) in the body's
 * space (about the body's centre, y down) and whose units are sx across
 * and sy down. `alpha` fades it as it goes round the side.
 */
export interface FabricEye {
  x: number; y: number; sx: number; sy: number;
  x0: number; y0: number; cy: number; half: number;
  alpha: number;
}

/**
 * Where the pile lies flat under what the body wears, in design units
 * (the 100 × 100 body box, z out of its front): under a hat, everything
 * above its seat within `r` of the upright line through `x` — the seat
 * at `y` there, sloping `dx` across and `dz` through as the hat is tilted;
 * and under anything else an ellipsoid of radii `r` about `c`, as far
 * down as `to`.
 */
export interface FabricPressed {
  hat: { x: number; y: number; r: number; dx: number; dz: number } | null;
  pads: { c: V3; r: V3; to?: number }[];
}

/** The eyes of a fabric body, their colour, and where the key is (degrees
    clockwise from the top); and what is worn over its pile. `set` is made
    true once the eyes are in the pile. */
export interface FabricFace {
  eyes: FabricEye[];
  ink: string;
  light: number;
  pressed?: FabricPressed | null;
  set: boolean;
}

/* ── the mesh ──────────────────────────────────────────────────────── */

/** floats per vertex: position, normal, occlusion, distance in from the outline */
const VERT = 8;
/** floats per strand: root, normal, two seeds and the occlusion there */
const ROOT = 9;
/** cross-sections along a strand */
const STRAND_RINGS = 4;

interface Mesh {
  vertices: Float32Array;
  indices: Uint32Array;
  roots: Float32Array;
  /** the furthest any vertex is from the body's centre, in design units */
  reach: number;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/**
 * The form as a closed surface: its height field over a grid of `G` cells,
 * front and back, the cells the outline crosses drawn in to it — a corner
 * outside is moved onto the outline, where the two halves meet at the
 * centre plane — and `density` strand roots to the unit of its area.
 * Positions are in design units about the body's centre (50, 50), y down,
 * z toward the viewer.
 */
function buildMesh(form: Form, pad: number, span: number, G: number, round: number, density: number): Mesh {
  const { N, sd, h, ao } = form;
  const u = span / N;
  const samp = (f: Float32Array, x: number, y: number) => {
    const fx = Math.min(N - 1, Math.max(0, (x + pad) / u - 0.5)), fy = Math.min(N - 1, Math.max(0, (y + pad) / u - 0.5));
    const x0 = Math.min(N - 2, fx | 0), y0 = Math.min(N - 2, fy | 0), tx = fx - x0, ty = fy - y0, i = y0 * N + x0;
    return (f[i] * (1 - tx) + f[i + 1] * tx) * (1 - ty) + (f[i + N] * (1 - tx) + f[i + N + 1] * tx) * ty;
  };
  let top = 0;
  for (let i = 0; i < N * N; i++) if (h[i] > top) top = h[i];
  const q = Math.max(0.05, Math.min(1, round));
  /* the surface's depth from the centre plane: the relief's own profile
     (see reliefFor), brought to nothing at the outline, which the blurred
     height field passes a little above */
  const Z = new Float32Array(N * N);
  if (top > 0) for (let i = 0; i < N * N; i++) if (sd[i] > 0 && h[i] > 0) Z[i] = top * Math.pow(Math.min(1, h[i] / top), q) * Math.sqrt(Math.min(1, sd[i] / 1.2));
  const zAt = (x: number, y: number) => samp(Z, x, y);
  const e = u * 0.75;
  const inward = (x: number, y: number): [number, number, number] => {
    const gx = samp(sd, x + e, y) - samp(sd, x - e, y), gy = samp(sd, x, y + e) - samp(sd, x, y - e);
    const l = Math.hypot(gx, gy);
    return l > 1e-6 ? [gx / l, gy / l, l / (2 * e)] : [0, 0, 0];
  };
  const occlusion = (x: number, y: number, s: number) => {
    const ix = Math.min(N - 1, Math.max(0, Math.round((x + pad) / u - 0.5))), iy = Math.min(N - 1, Math.max(0, Math.round((y + pad) / u - 0.5)));
    const a = ao[iy * N + ix];
    if (!a) return 1;
    /* the edge's own darkening taken back out, as fabric's texels have it (edgeLift) */
    const k = 1 - Math.min(1, Math.max(0, s) / 3);
    const lin = Math.min(1, Math.pow(a / 255, 2.2) / (1 - 0.2 * k * k));
    return Math.pow(lin, 1 / 2.2);
  };
  /* a point of the surface: position, normal (front half), occlusion, inset */
  const point = (x: number, y: number, out: number[] | Float32Array, o: number, back: boolean, rim: boolean) => {
    const s = rim ? 0 : samp(sd, x, y);
    const z = rim ? 0 : zAt(x, y);
    let nx: number, ny: number, nz: number;
    if (rim) {
      const [ix, iy] = inward(x, y);
      nx = -ix; ny = -iy; nz = 0;
    } else {
      const d = u * 0.6;
      nx = -(zAt(x + d, y) - zAt(x - d, y)) / (2 * d);
      ny = -(zAt(x, y + d) - zAt(x, y - d)) / (2 * d);
      nz = 1;
      let l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      if (s < 2) {
        /* toward the outline's own outward direction, so the silhouette grazes */
        const [ix, iy] = inward(x, y);
        const w = 0.7 * (1 - Math.max(0, s) / 2);
        nx += w * (-ix - nx); ny += w * (-iy - ny); nz += w * (0 - nz);
        l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
      }
    }
    if (!nx && !ny && !nz) nz = 1;
    out[o] = x - 50; out[o + 1] = y - 50; out[o + 2] = back ? -z : z;
    out[o + 3] = nx; out[o + 4] = ny; out[o + 5] = back ? -nz : nz;
    out[o + 6] = occlusion(x, y, s); out[o + 7] = Math.max(0, s);
  };

  const step = span / G, W = G + 1;
  const sdv = new Float32Array(W * W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) sdv[j * W + i] = samp(sd, -pad + i * step, -pad + j * step);
  /* the cells drawn: any with a corner or its middle inside */
  const used = new Uint8Array(G * G);
  const need = new Uint8Array(W * W);
  let cells = 0;
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const a = j * W + i;
      if (sdv[a] > 0 || sdv[a + 1] > 0 || sdv[a + W] > 0 || sdv[a + W + 1] > 0 || samp(sd, -pad + (i + 0.5) * step, -pad + (j + 0.5) * step) > 0) {
        used[j * G + i] = 1;
        need[a] = need[a + 1] = need[a + W] = need[a + W + 1] = 1;
        cells++;
      }
    }
  }
  const index = new Int32Array(W * W).fill(-1);
  let count = 0;
  for (let k = 0; k < W * W; k++) if (need[k]) index[k] = count++;
  const vertices = new Float32Array(2 * count * VERT);
  let reach = 0;
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const k = index[j * W + i];
      if (k < 0) continue;
      let x = -pad + i * step, y = -pad + j * step;
      const rim = sdv[j * W + i] <= 0;
      if (rim) {
        /* onto the outline: down the distance's own slope, a few steps */
        for (let n = 0; n < 4; n++) {
          const s = samp(sd, x, y);
          const [gx, gy, gl] = inward(x, y);
          if (!gl) break;
          x -= (s * gx) / Math.max(0.5, gl);
          y -= (s * gy) / Math.max(0.5, gl);
        }
      }
      point(x, y, vertices, k * VERT, false, rim);
      point(x, y, vertices, (count + k) * VERT, true, rim);
      const o = k * VERT;
      reach = Math.max(reach, Math.hypot(vertices[o], vertices[o + 1], vertices[o + 2]));
    }
  }
  const indices = new Uint32Array(cells * 12);
  let t = 0;
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      if (!used[j * G + i]) continue;
      const a = index[j * W + i], b = index[j * W + i + 1], c = index[(j + 1) * W + i], d = index[(j + 1) * W + i + 1];
      indices[t++] = a; indices[t++] = c; indices[t++] = b;
      indices[t++] = b; indices[t++] = c; indices[t++] = d;
      indices[t++] = count + a; indices[t++] = count + b; indices[t++] = count + c;
      indices[t++] = count + b; indices[t++] = count + d; indices[t++] = count + c;
    }
  }

  /* the strands' roots: spread by the surface's own area — a steep side
     has as many to the unit as the front — then shuffled, so that any
     leading share of them is as even: a small avatar draws only so many */
  const rand = rng(N * 7919 + G * 31 + 17);
  const spots: number[] = [];
  for (let i = 0; i < t; i += 3) {
    const a = indices[i] * VERT, b = indices[i + 1] * VERT, c = indices[i + 2] * VERT;
    const abx = vertices[b] - vertices[a], aby = vertices[b + 1] - vertices[a + 1], abz = vertices[b + 2] - vertices[a + 2];
    const acx = vertices[c] - vertices[a], acy = vertices[c + 1] - vertices[a + 1], acz = vertices[c + 2] - vertices[a + 2];
    const area = 0.5 * Math.hypot(aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx);
    for (let n = Math.floor(area * density + rand()); n > 0; n--) {
      const u1 = Math.sqrt(rand()), v1 = u1 * rand();
      for (let k = 0; k < 6; k++) spots.push((1 - u1) * vertices[a + k] + (u1 - v1) * vertices[b + k] + v1 * vertices[c + k]);
      spots.push(rand(), rand(), (1 - u1) * vertices[a + 6] + (u1 - v1) * vertices[b + 6] + v1 * vertices[c + 6]);
    }
  }
  const roots = new Float32Array(spots);
  const held = new Float32Array(ROOT);
  for (let i = roots.length / ROOT - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    if (j === i) continue;
    held.set(roots.subarray(i * ROOT, (i + 1) * ROOT));
    roots.copyWithin(i * ROOT, j * ROOT, (j + 1) * ROOT);
    roots.set(held, j * ROOT);
  }
  return { vertices, indices, roots, reach };
}

/* ── the shaders ───────────────────────────────────────────────────── */

const PASS_BODY = 0, PASS_SHELL = 1, PASS_STRAND = 2;

/* the pile's direction at a point of the surface, shared by the shells and
   the strands: combed down from the crown and fanned to the sides
   (gravity) or standing out round the body's middle, turned by slow
   swirls so it is not combed one way everywhere; left unnormalised, so
   where the surface faces the comb the pile stands and does not lie */
const COMB = `
uniform vec4 uFur;   // length, gravity, curl, clumps
uniform vec4 uFur2;  // the pile's grain (noise cells per unit), the strands' length and width, fuzz
vec3 comb(vec3 p, vec3 n) {
  vec3 away = vec3(p.xy, 0.) / max(1., length(p.xy));
  vec3 want = mix(away * .8 + vec3(0., .15, 0.), vec3(.5 * p.x / 50., 1., .1), uFur.y);
  float a = (.2 + .3 * uFur.z) * (sin(dot(p, vec3(.11, .045, .08))) + .7 * sin(.13 * p.y - .07 * p.z + 1.7));
  want.xy = want.xy * cos(a) + vec2(-want.y, want.x) * sin(a);
  return want - n * dot(n, want);
}`;

/* An eye is set into the pile, not laid on it: every pass knows how far a
   point of the body is from the nearest eye, measured where the face
   draws it — on the turned body as it is seen. The curve is taken as the
   face strokes it, a line of eight pieces. */
const EYES = `
uniform vec4 uEyeAt[2];     // its frame: origin, and its units across and down
uniform vec4 uEyeShape[2];  // its curve: x0, y0, cy, and half its width
uniform vec2 uEyeOn;        // how much of each is there
float eyeDistance(vec2 at, int i) {
  vec4 frame = uEyeAt[i], curve = uEyeShape[i];
  float unit = min(frame.z, frame.w);
  vec2 e = (at - frame.xy) / frame.zw;
  float reach = max(curve.x, max(abs(curve.y), abs(curve.z))) + curve.w + 6. / unit;
  if (dot(e, e) > reach * reach) return 99.;
  float d = 1e9;
  vec2 from = vec2(-curve.x, curve.y);
  for (int k = 1; k <= 8; k++) {
    float t = float(k) / 8., mt = 1. - t;
    vec2 to = vec2((t * t - mt * mt) * curve.x, (mt * mt + t * t) * curve.y + 2. * mt * t * curve.z);
    vec2 pa = e - from, ba = to - from;
    d = min(d, length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0., 1.)));
    from = to;
  }
  return (d - curve.w) * unit;
}
/* to the nearer eye's edge, in body units: negative inside it */
float socket(vec2 at, out int which) {
  which = 0;
  float d = 99.;
  for (int i = 0; i < 2; i++) {
    if (uEyeOn[i] <= .02) continue;
    float e = eyeDistance(at, i);
    if (e < d) {
      d = e;
      which = i;
    }
  }
  return d;
}`;

const VERTEX = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in vec2 aAux;
layout(location = 3) in vec3 iPos;
layout(location = 4) in vec3 iNor;
layout(location = 5) in vec3 iSeed;
uniform mat3 uView;
uniform float uRadius;
uniform int uPass;
uniform float uShell;
out vec3 vRoot, vNormal, vLean;
out float vT, vAo, vSeed, vAcross, vSocket;
${COMB}
${EYES}
/* Under what is worn the pile lies flat — a hat's, everything above its
   seat inside its round; a pad's, an ellipsoid — or its hairs would stand
   out past the thing's edge, and through it as the head turns. How much
   of its length it keeps at a point of the body. */
uniform vec4 uHat;        // the upright line's x, the seat's y, the radius; and whether there is one
uniform vec2 uHatTilt;    // the seat's slope across and through
uniform vec4 uPadAt[3];   // centre, and how far down it reaches
uniform vec4 uPadSize[3]; // radii; and whether there is one
float worn(vec3 p) {
  float d = 99.;
  if (uHat.w > 0.) d = max(length(vec2(p.x - uHat.x, p.z)) - uHat.z, p.y - uHat.y - uHatTilt.x * (p.x - uHat.x) - uHatTilt.y * p.z);
  for (int i = 0; i < 3; i++) {
    if (uPadSize[i].w <= 0.) continue;
    vec3 r = uPadSize[i].xyz;
    float e = (length((p - uPadAt[i].xyz) / r) - 1.) * min(r.x, min(r.y, r.z));
    d = min(d, max(e, p.y - uPadAt[i].w));
  }
  return mix(.1, 1., smoothstep(-1.4, 1.2, d));
}
void main() {
  vec3 p, n;
  if (uPass == ${PASS_STRAND}) {
    p = iPos; n = normalize(iNor);
  } else {
    p = aPos; n = normalize(aNor);
  }
  vec3 lean = comb(p, n);
  vRoot = p;
  vLean = lean;
  vAo = aAux.x;
  vSeed = .5;
  vAcross = 0.;
  vT = 0.;
  vec3 nv = uView * n;
  vec3 view;
  /* round an eye the pile is pressed down: short at its edge, its full
     length a few units out */
  int eye;
  float d = socket((uView * p).xy, eye);
  if (uEyeOn[eye] <= .5) d = 99.;
  float loft = mix(.07, 1., smoothstep(.75, 3.7, d)) * worn(p);
  vSocket = d;
  if (uPass == ${PASS_SHELL}) {
    /* a shell: the surface lifted off itself and carried over by the comb */
    vT = uShell;
    p += uFur.x * uShell * loft * (1.1 * n + 1.05 * lean);
    view = uView * p;
  } else if (uPass == ${PASS_STRAND}) {
    /* a strand: a bent, tapered ribbon of four cross-sections from a root
       fixed on the body, lying along the comb in its own direction — more
       its own with curl — and lifting off the pile toward its tip */
    float tip = float(gl_VertexID / 2) / ${STRAND_RINGS - 1}.;
    float side = float(gl_VertexID % 2) * 2. - 1.;
    vec3 tangent = normalize(cross(n, abs(n.y) < .93 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
    vec3 bitangent = cross(n, tangent);
    float flow = 2.3 * sin(.24 * p.x + .13 * p.z + sin(.22 * p.y)) + 1.3 * sin(.32 * p.y - .15 * p.x);
    float angle = flow + (iSeed.x - .5) * 2.6;
    vec3 own = lean + (.1 + .22 * uFur.z) * (tangent * cos(angle) + bitangent * sin(angle));
    vec3 bend = cross(n, own);
    float len = uFur.x * uFur2.y * mix(1.6, 3.8, iSeed.y) * loft;
    vec3 direction = n * (.16 + .2 * uFur2.w + .18 * tip) + own * (.93 - .12 * tip) + bend * ((iSeed.x - .5) * (.2 + .45 * uFur.z) * tip);
    vec3 c = p + n * (.55 * uFur.x * loft) + len * tip * direction;
    view = uView * c;
    vec2 along = (uView * (direction + .06 * own)).xy;
    vec2 across = normalize(vec2(-along.y, along.x) + vec2(1e-4, 0.));
    view.xy += across * side * (.073 + .11 * iSeed.y) * uFur2.z * (1. - .94 * tip);
    vT = tip;
    vSeed = iSeed.x;
    vAcross = side;
    vAo = iSeed.z;
    nv = uView * normalize(n + .19 * own);
    /* none grows out of an eye */
    if (d < .1 - .08 * iSeed.x) view = vec3(4. * uRadius);
  } else {
    view = uView * p;
  }
  vNormal = nv;
  gl_Position = vec4(view.x, -view.y, -.9 * view.z, uRadius);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform int uPass;
uniform vec3 uL, uLb, uFl, uD;
uniform vec4 uK1;   // ambient, fill, wrap, floor
uniform vec4 uK2;   // sheen, rim, the terminator's band, the back light's softness
uniform vec4 uK3;   // occlusion strength, vivid, the fibres' own rim, shine
uniform vec3 uC, uDeep, uSc, uRimIn, uRimOut, uSheenC, uTip;
uniform mat3 uView;
uniform vec3 uEyeInk;
uniform vec2 uEyeLight;
in vec3 vRoot, vNormal, vLean;
in float vT, vAo, vSeed, vAcross, vSocket;
out vec4 result;
${COMB}
${EYES}

/* plastic.ts's fabric matcap for one normal, in view space: the key with
   its soft terminator, the shade deepened rather than greyed, the band of
   light passed through dyed fibres, the satin sheen and back light */
vec3 fabric(vec3 n, out float graze, out float back, out float facing) {
  float nl = dot(n, uL), nv = max(0., n.z), nd = dot(n, uD), nb = dot(n, uLb);
  float q = 1. - nv;
  float w = uK1.z + (.45 - uK1.z) * q * q;
  float dif = pow(clamp((nl + w) / (1. + w), 0., 1.), 1.35);
  float fill = uK1.y * max(0., dot(n, uFl));
  float floorK = 1. - uK1.w * max(0., nd) * (.6 + .4 * q);
  float light = (uK1.x + 1.3 * dif + fill) * floorK;
  float t = clamp(1. - light, 0., 1.);
  float sb = max(0., 1. - ((nl + .08) * (nl + .08)) / .18);
  float sss = uK2.z * sb * sb * floorK;
  float lit = clamp((nl + .2) / .8, 0., 1.);
  float sheen = uK2.x * q * q * lit;
  float bl = smoothstep(-.3, .6, nb);
  float rq = smoothstep(.18 - .12 * uK2.w, .62 + .18 * uK2.w, q);
  float rim = uK2.y * rq * sqrt(rq) * (.3 + .7 * bl) * (1. - .7 * max(0., nd));
  float hot = rq * rq * sqrt(rq) * (1. - .5 * uK2.w);
  graze = rq;
  back = (.3 + .7 * bl) * (1. - .7 * max(0., nd));
  facing = clamp(.42 + .58 * nl, 0., 1.) * floorK;
  vec3 base = uC + (uDeep - uC) * t * .9;
  return base * light + sss * uSc + sheen * uSheenC + rim * mix(uRimIn, uRimOut, hot);
}

vec3 vivify(vec3 c, float v) {
  if (v <= 0.) return c;
  float y = dot(c, vec3(.2126, .7152, .0722));
  float mn = min(c.r, min(c.g, c.b)), mx = max(c.r, max(c.g, c.b));
  float k = 1. + 3. * v;
  if (mn < y) k = min(k, y / (y - mn));
  if (mx > y) k = min(k, max(1., (1. - y) / (mx - y)));
  return y + (c - y) * k;
}

/* bright parts rolled off as a whole, the colour kept; then sRGB and the
   form's baked occlusion, which the key's own light takes less of */
vec3 finish(vec3 c, float ao) {
  c = max(c, 0.);
  float m = max(c.r, max(c.g, c.b));
  if (m > .8) c *= (.8 + .2 * (1. - exp(-(m - .8) / .2))) / m;
  c = clamp(vivify(c, uK3.y), 0., 1.);
  vec3 s = mix(12.92 * c, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c));
  float k = max(0., 1. - uK3.x * (1. - ao));
  k = 1. - (1. - k) * (1.1 - .75 * min(1., s.g * (255. / 235.)));
  return s * k;
}

/* How high the pile stands over a point of the body, 0–1. The noise is
   read at the fibres' roots, the same at every shell and from every
   side, and brushed: a short filter along the comb draws each cell out
   into a lock lying that way. Clumps gather the locks into tufts. */
float pile() {
  vec3 uvw = vRoot * (uFur2.x / 64.);
  vec3 stride = vLean * (1.2 / 64.);
  float locks = 4. * texture(uNoise, uvw).r;
  for (int i = 1; i <= 3; i++) {
    vec3 d = float(i) * stride;
    locks += (4. - float(i)) * (texture(uNoise, uvw + d).r + texture(uNoise, uvw - d).r);
  }
  float tuft = texture(uNoise, uvw * .42 + .21).r;
  float clump = texture(uNoise, uvw * .16 + .63).r;
  return clamp(.5 + 1.65 * (locks / 16. - .5) + (.1 + .16 * uFur.w) * (tuft - .5) + .55 * uFur.w * (clump - .5), 0., 1.);
}

/* The eye itself: a dark bead in its socket, round and matte — darker
   to its rim, with one soft light along the edge the key is on, and on a
   pale bead a shade along the other. */
vec3 bead(float d, int which) {
  vec4 curve = uEyeShape[which];
  float unit = min(uEyeAt[which].z, uEyeAt[which].w);
  float inside = clamp(-d / (unit * max(curve.w, 1e-3)), 0., 1.);
  float dome = sqrt(1. - (1. - inside) * (1. - inside));
  vec2 slope = vec2(dFdx(d), -dFdy(d));
  vec2 outward = slope / max(length(slope), 1e-6);
  vec2 lean = outward * (1. - inside);
  float value = max(uEyeInk.r, max(uEyeInk.g, uEyeInk.b));
  vec3 c = uEyeInk * mix(.62, 1., value) * (.5 + .5 * dome);
  vec2 lit = lean - .92 * uEyeLight, shaded = lean + .92 * uEyeLight;
  c += (1. - .6 * value) * .3 * exp(-dot(lit, lit) / .34) * smoothstep(0., .5, inside);
  c *= 1. - .34 * value * exp(-dot(shaded, shaded) / .5);
  return c;
}

void main() {
  vec3 n = normalize(vNormal);
  float graze, back, facing;
  vec3 c = fabric(n, graze, back, facing);
  /* how high the pile stands here, and how full it is: its hollows hold a
     little less light (a strand is over the pile: it reads none of it) */
  float height = uPass == ${PASS_STRAND} ? 1. : pile();
  float fill = .925 + .075 * smoothstep(.22, .81, height);
  float tone, light;
  /* how far from an eye: by the fibre's root, so the pile parts round it
     and what grows beside it still lies over its edge */
  int eye = 0;
  float d = vSocket;
  if (uPass != ${PASS_STRAND}) {
    d = socket((uView * vRoot).xy, eye);
  }
  float parted = uPass == ${PASS_STRAND} || uEyeOn[eye] > .5 ? d : 99.;
  if (uPass == ${PASS_STRAND}) {
    /* each strand its own tone, lighter to its tip, where it catches the
       light: brightest down its middle */
    /* (multisampling shades a ribbon thinner than a pixel at the pixel's
       centre, which may lie outside it: what runs across it is held in) */
    float edge = min(1., abs(vAcross)), along = clamp(vT, 0., 1.);
    float glint = smoothstep(.08, .82, along) * (1. - .32 * edge * edge);
    tone = .935 + .11 * vSeed + .035 * along;
    light = (.012 + .2 * glint * (1. + uK3.w)) * (.44 + .56 * vSeed) * facing;
    light += uK3.z * graze * back * (.5 + .5 * along);
  } else {
    float layer = uPass == ${PASS_SHELL} ? vT : 0.;
    /* a shell keeps only the locks that reach its height, and none over an eye */
    if (uPass == ${PASS_SHELL} && (height < .21 + .59 * layer || parted < .1)) discard;
    /* the relief is the lit crests of the locks, over hollows a little deeper */
    tone = .895 + .16 * height + .035 * layer;
    light = (.012 + .13 * smoothstep(.41, .86, height) * (1. + uK3.w) + .022 * layer) * facing;
    light += uK3.z * graze * back * (.8 + .34 * layer) * .8;
  }
  /* pressed down round the eye, the pile is in its own shade there */
  float crease = 1. - smoothstep(-.12, 2., parted);
  tone *= 1. - .3 * crease;
  light *= 1. - crease;
  tone *= tone * fill;
  c = c * tone + 1.45 * light * fill * mix(uTip, uRimOut, .35 * graze * back);
  vec3 seen = finish(c, vAo);
  if (uPass == ${PASS_BODY} && d < 1.) {
    float soft = max(.12, fwidth(d));
    seen = mix(seen, bead(d, eye), (1. - smoothstep(-.5 * soft, .5 * soft, d)) * uEyeOn[eye]);
  }
  result = vec4(seen, 1.);
}`;

/* ── the renderer ──────────────────────────────────────────────────── */

interface Geometry {
  surface: WebGLVertexArrayObject;
  indexCount: number;
  strands: WebGLVertexArrayObject;
  strandCount: number;
  buffers: WebGLBuffer[];
  reach: number;
  usedAt: number;
}

interface Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  uniforms: Record<string, WebGLUniformLocation | null>;
  geometries: Map<string, Geometry>;
  /** by form, the ids of its geometries: a form dropped from plastic.ts's cache takes them along */
  ids: WeakMap<Form, number>;
  nextId: number;
  /** the program is linked and the uniforms found: it can draw */
  ready: boolean;
  /** how many bodies this task has drawn, how many the tasks before it drew (smoothed), and whether a task has just begun */
  drawn: number;
  crowded: number;
  task: boolean;
  /** the largest picture asked for in the present spell, and when the spell began */
  widest: number;
  since: number;
}

/* the shared canvas's least side, and the largest picture drawn */
const MIN_SIDE = 128, MAX_IMAGE = 2048;
const KEPT = 16;

let renderer: Renderer | null | undefined;
let lost = false;
/* compiled and linked without asking how it went: asking waits for it */
function compile(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram()!;
  for (const [kind, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(kind)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  return program;
}

/* what waits on the program: called once it can draw, or cannot at all */
const waiting = new Set<() => void>();
const settled = () => {
  const fns = [...waiting];
  waiting.clear();
  for (const fn of fns) fn();
};

const UNIFORMS = ['uView', 'uRadius', 'uPass', 'uShell', 'uFur', 'uFur2', 'uNoise', 'uL', 'uLb', 'uFl', 'uD', 'uK1', 'uK2', 'uK3', 'uC', 'uDeep', 'uSc', 'uRimIn', 'uRimOut', 'uSheenC', 'uTip', 'uEyeAt', 'uEyeShape', 'uEyeOn', 'uEyeInk', 'uEyeLight', 'uHat', 'uHatTilt', 'uPadAt', 'uPadSize'];

/* The program, the pile's noise and the state every draw shares. The
   shaders take the GPU's compiler a tenth of a second or more: where the
   browser compiles them off the main thread (KHR_parallel_shader_compile)
   the renderer is not ready until they are done, and the avatars wait for
   it as they would for a bake. */
function prepare(r: Renderer) {
  const { gl } = r;
  r.ready = false;
  const program = compile(gl);
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const finish = () => {
    if (renderer !== r || gl.isContextLost()) return;
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      setTimeout(finish, 8);
      return;
    }
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.useProgram(program);
      for (const name of UNIFORMS) r.uniforms[name] = gl.getUniformLocation(program, name);
      gl.uniform1i(r.uniforms.uNoise, 0);
      r.ready = true;
    } else {
      /* no fabric by the GPU here: canvas 2D draws it */
      renderer = null;
    }
    settled();
  };
  /* random fibre strengths in a repeating cube: a volume has no seams */
  const side = 64, noise = new Uint8Array(side ** 3);
  const rand = rng(73021);
  for (let i = 0; i < noise.length; i++) noise[i] = (rand() * 256) | 0;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, side, side, side, 0, gl.RED, gl.UNSIGNED_BYTE, noise);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_3D);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.SCISSOR_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);
  if (parallel) setTimeout(finish, 0);
  else finish();
}

function rendererOf(): Renderer | null {
  if (renderer !== undefined) return renderer;
  renderer = null;
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = MIN_SIDE;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (!gl) return null;
    const r: Renderer = { canvas, gl, uniforms: {}, geometries: new Map(), ids: new WeakMap(), nextId: 1, ready: false, drawn: 0, crowded: 0, task: true, widest: 0, since: 0 };
    renderer = r;
    prepare(r);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      lost = true;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      if (renderer !== r) return;
      try {
        r.geometries.clear();
        lost = false;
        prepare(r);
      } catch {
        renderer = null;
      }
    });
  } catch {
    renderer = null;
  }
  return renderer;
}

/** Whether fabric is drawn by the GPU here: WebGL2 is there, its context is not lost. */
export function fabricGL(): boolean {
  return !!rendererOf() && !lost;
}

/** Whether the GPU's fabric is still being made ready: its shaders are compiling. */
export function fabricPending(): boolean {
  return !lost && !!renderer && !renderer.ready;
}

/** Call `fn` once the GPU's fabric can draw, or turns out not to be able to. */
export function whenFabricSettled(fn: () => void) {
  waiting.add(fn);
}

function upload(r: Renderer, mesh: Mesh): Geometry {
  const { gl } = r;
  const buffer = (target: number, data: Float32Array | Uint32Array) => {
    const b = gl.createBuffer()!;
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return b;
  };
  const surface = gl.createVertexArray()!;
  gl.bindVertexArray(surface);
  const vertices = buffer(gl.ARRAY_BUFFER, mesh.vertices);
  [3, 3, 2].reduce((offset, size, location) => {
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, VERT * 4, offset);
    return offset + size * 4;
  }, 0);
  const indices = buffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
  const strands = gl.createVertexArray()!;
  gl.bindVertexArray(strands);
  const roots = buffer(gl.ARRAY_BUFFER, mesh.roots);
  [3, 3, 3].reduce((offset, size, i) => {
    gl.enableVertexAttribArray(3 + i);
    gl.vertexAttribPointer(3 + i, size, gl.FLOAT, false, ROOT * 4, offset);
    gl.vertexAttribDivisor(3 + i, 1);
    return offset + size * 4;
  }, 0);
  gl.bindVertexArray(null);
  return { surface, indexCount: mesh.indices.length, strands, strandCount: mesh.roots.length / ROOT, buffers: [vertices, indices, roots], reach: mesh.reach, usedAt: 0 };
}

function geometryOf(r: Renderer, body: FabricBody, G: number, round: number): Geometry {
  let id = r.ids.get(body.form);
  if (!id) r.ids.set(body.form, (id = r.nextId++));
  const key = `${id}|${G}|${round.toFixed(2)}`;
  let g = r.geometries.get(key);
  if (g) r.geometries.delete(key);
  else g = upload(r, buildMesh(body.form, body.pad, body.span, G, round, ROOTS * SPARE * (G <= SMALL_GRID ? 0.45 : G <= MID_GRID ? 0.75 : 1)));
  r.geometries.set(key, g);
  g.usedAt = typeof performance !== 'undefined' ? performance.now() : 0;
  /* the oldest go once there are many, unless drawn within the last seconds */
  if (r.geometries.size > KEPT) {
    for (const [k, old] of r.geometries) {
      if (r.geometries.size <= KEPT || g.usedAt - old.usedAt < 3000) break;
      const { gl } = r;
      gl.deleteVertexArray(old.surface);
      gl.deleteVertexArray(old.strands);
      old.buffers.forEach((b) => gl.deleteBuffer(b));
      r.geometries.delete(k);
    }
  }
  return g;
}

/**
 * The shared canvas made to hold a picture `size` pixels a side, at its
 * corner. It is kept as small as the largest avatar drawn lately needs:
 * copying a picture out of it costs the browser the whole canvas — every
 * sample of it resolved — however little of it the picture takes.
 */
function fit(r: Renderer, size: number) {
  const { canvas } = r;
  const side = (n: number) => Math.max(MIN_SIDE, Math.ceil(n / 64) * 64);
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (now - r.since > 3000) {
    /* a few seconds in which nothing needed half of it: smaller again */
    if (r.widest && side(Math.max(r.widest, size)) * 2 <= canvas.width) canvas.width = canvas.height = side(Math.max(r.widest, size));
    r.widest = 0;
    r.since = now;
  }
  r.widest = Math.max(r.widest, size);
  if (size > canvas.width) canvas.width = canvas.height = side(size);
}

/* strands to the unit of the body's area at full detail and the stock
   density; a mesh carries SPARE times as many, for a denser pile, and a
   small avatar's two fifths of that, more than it ever draws */
const ROOTS = 3.3;
/* how long the pile is at the stock length, against the shaders' own unit */
const PILE = 1.45;
const SPARE = 1.2;
const SMALL_GRID = 36, MID_GRID = 52;
/* device pixels per design unit from which the pile is drawn in full: an
   avatar 128 CSS pixels wide on a 2× display */
const FULL = 2.56;

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * Draw the fabric body with the GPU and copy it into `ctx`, which is in
 * the body's transform (see drawPlasticCap). False when it cannot — no
 * WebGL2, the context lost — and the canvas-2D fabric is to draw instead;
 * 'pending' while its shaders compile (see whenFabricSettled).
 */
export function drawFabricGL(ctx: CanvasRenderingContext2D, body: FabricBody, rig: Rig, mat: Material): boolean | 'pending' {
  if (lost) return false;
  const r = rendererOf();
  if (!r) return false;
  const { gl, uniforms: u } = r;
  if (gl.isContextLost()) return false;
  if (!r.ready) return 'pending';

  /* how many are being drawn together: 0 up to a handful, 1 from a few
     dozen — a crowd's avatars are each drawn a little more plainly (see
     `over` and `coarse` below), so the page's whole cost stays in hand */
  if (r.task) {
    r.task = false;
    r.crowded += 0.5 * (r.drawn - r.crowded);
    r.drawn = 0;
    queueMicrotask(() => (r.task = true));
  }
  r.drawn++;
  const crowd = Math.min(1, Math.max(0, (Math.max(r.crowded, r.drawn) - 8) / 28));
  /* device pixels per design unit, as the body is drawn: the box's own
     scale and the squash on top */
  const m = rig.ctm;
  const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || rig.dev / 100;
  const detail = Math.min(1, scale / FULL);
  const G = scale <= 1.3 ? SMALL_GRID : scale <= 3.6 ? MID_GRID : 72;
  const round = rig.round ?? 1;
  let geometry: Geometry;
  try {
    geometry = geometryOf(r, body, G, round);
  } catch {
    return false;
  }

  const { style } = body;
  /* the stock pile: long enough to read as fur at the sizes avatars are shown */
  const length = PILE * Math.max(0.05, style.length);
  const gravity = Math.min(1, Math.max(0, style.gravity ?? 0.9));
  const curl = Math.min(1, Math.max(0, style.curl));
  const clumps = Math.min(1, Math.max(0, style.clumps));
  const fuzz = Math.min(1, Math.max(0, style.fuzz));
  const dense = Math.max(0.2, style.density) / 1.6;
  /* a strand is about a pixel wide at least — thinner, it is only grain —
     so a small avatar's are wider for its size, and as many fewer */
  const coarse = Math.max(1, 0.9 / (0.128 * scale)) * (1 + 0.8 * crowd);
  const strandLength = 0.78 + 0.26 * fuzz;
  const strandWidth = coarse / Math.sqrt(Math.min(SPARE, dense));
  const reachOut = length * (1.7 + 4.6 * strandLength);

  /* the square drawn: the body turned any way, and its pile round it */
  const radius = (geometry.reach + reachOut) * 1.06 + 1;
  /* drawn larger than it is shown, and brought down by the copy: the copy
     turns and squashes the picture, which would soften one made to size,
     and the pile's edges are cut, not blended */
  const over = 1 + ((scale <= 1.7 ? 2 : scale <= 3.3 ? 1.5 : 1.2) - 1) * (1 - 0.7 * crowd);
  const size = Math.min(MAX_IMAGE - 2, Math.max(16, Math.ceil(2 * radius * scale * over)));
  /* at the canvas's corner, a clear pixel all round: the copy's filter
     reads past the picture's edge */
  fit(r, size + 2);
  const x = 1, y = 1;
  const { canvas } = r;

  gl.viewport(x, canvas.height - y - size, size, size);
  gl.scissor(0, canvas.height - size - 2, size + 2, size + 2);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* yaw about y then pitch about x, as the slices and the face are placed
     (the rig's floored cosines and all): x right, y down, z to the viewer */
  const { cy, sy, cp, sp } = rig;
  gl.uniformMatrix3fv(u.uView, false, [cy, sy * sp, -sy * cp, 0, cp, sp, sy, -cy * sp, cy * cp]);
  gl.uniform1f(u.uRadius, radius);
  gl.uniform4f(u.uFur, length, gravity, curl, clumps);
  gl.uniform4f(u.uFur2, (64 / 15) * Math.sqrt(dense), strandLength, strandWidth, fuzz);

  /* the lights, in the body's own un-rolled space (see capFrame) */
  const cr = Math.cos(rig.roll), sr = Math.sin(rig.roll);
  const U: V3 = [cr * rig.lx + sr * rig.ly, -sr * rig.lx + cr * rig.ly, 0];
  const K: V3 = [cr * body.lights.bx + sr * body.lights.by, -sr * body.lights.bx + cr * body.lights.by, 0];
  const front = mat.front ?? body.lights.front;
  const L = norm([U[0] * Math.cos(front), U[1] * Math.cos(front), Math.sin(front)]);
  const Lb = norm([0.94 * K[0], 0.94 * K[1], -0.34]);
  const D: V3 = [sr, cr, 0];
  const Fl = norm([-0.55 * U[0] + 0.15 * D[0], -0.55 * U[1] + 0.15 * D[1], 0.85]);
  gl.uniform3fv(u.uL, L);
  gl.uniform3fv(u.uLb, Lb);
  gl.uniform3fv(u.uFl, Fl);
  gl.uniform3fv(u.uD, D);

  /* the material, as buildFabricMatcap reckons it */
  const c = body.color, vivid = mat.vivid ?? 0, satin = mat.sheen ?? 0;
  const backSoft = Math.min(1, Math.max(0, mat.backSoft ?? 1));
  gl.uniform4f(u.uK1, Math.max(0.03, 0.2 - 0.15 * mat.shadow), Math.max(0.04, 0.24 - 0.13 * mat.shadow), Math.min(0.7, 0.05 + 0.12 * mat.spread), 0.34 * Math.min(1.6, mat.shadow / 0.35));
  gl.uniform4f(u.uK2, 0.16 * mat.highlight * satin, 1.15 * mat.rim * satin, 0.2 + 0.25 * vivid, backSoft);
  gl.uniform4f(u.uK3, Math.min(1.2, 0.3 + 0.8 * mat.shadow), vivid, 0.46 * mat.rim * (0.45 + 0.55 * fuzz), mat.shine ?? 0);
  const mx = Math.max(c[0], c[1], c[2], 0.02);
  const cb: V3 = [c[0] / mx, c[1] / mx, c[2] / mx];
  const wR = 0.45 * (1 - vivid), wS = 0.25 * (1 - vivid);
  const yOf = (v: V3) => 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  const de = 1.8 + 2.2 * vivid;
  const d0: V3 = [Math.pow(c[0], de), Math.pow(c[1], de), Math.pow(c[2], de)];
  const dk = yOf(c) / Math.max(1e-4, yOf(d0));
  gl.uniform3fv(u.uC, c);
  gl.uniform3f(u.uDeep, d0[0] * dk, d0[1] * dk, d0[2] * dk);
  gl.uniform3f(u.uSc, cb[0] * cb[0] * c[0], cb[1] * cb[1] * c[1], cb[2] * cb[2] * c[2]);
  gl.uniform3fv(u.uRimIn, cb);
  gl.uniform3f(u.uRimOut, wR + (1 - wR) * cb[0], wR + (1 - wR) * cb[1], wR + (1 - wR) * cb[2]);
  gl.uniform3f(u.uSheenC, wS + (1 - wS) * cb[0], wS + (1 - wS) * cb[1], wS + (1 - wS) * cb[2]);
  /* the light a fibre's tip carries: the colour itself, and a little of
     its full brightness — little on a dark dye, which swallows it */
  const tipK = 0.16 * Math.sqrt(mx);
  gl.uniform3f(u.uTip, c[0] + tipK * cb[0], c[1] + tipK * cb[1], c[2] + tipK * cb[2]);

  /* the eyes, where the face has them */
  const face = rig.face;
  const frames = new Float32Array(8), curves = new Float32Array(8), there = [0, 0];
  (face?.eyes ?? []).slice(0, 2).forEach((e, i) => {
    frames.set([e.x, e.y, e.sx, e.sy], 4 * i);
    curves.set([e.x0, e.y0, e.cy, e.half], 4 * i);
    there[i] = e.alpha;
  });
  gl.uniform4fv(u.uEyeAt, frames);
  gl.uniform4fv(u.uEyeShape, curves);
  gl.uniform2f(u.uEyeOn, there[0], there[1]);
  if (face) {
    const ink = parseColor(face.ink) ?? [30, 26, 51];
    gl.uniform3f(u.uEyeInk, ink[0] / 255, ink[1] / 255, ink[2] / 255);
    /* the bead's light: from the key's side, and from above */
    const la = (face.light * Math.PI) / 180;
    const bx = 0.75 * Math.sin(la), by = -0.75 * Math.cos(la) - 0.6, bl = Math.hypot(bx, by) || 1;
    gl.uniform2f(u.uEyeLight, bx / bl, by / bl);
  }

  /* and what is worn, about the body's centre as the mesh is */
  const pressed = face?.pressed;
  const hat = pressed?.hat;
  gl.uniform4f(u.uHat, hat ? hat.x - 50 : 0, hat ? hat.y - 50 : 0, hat ? hat.r : 0, hat ? 1 : 0);
  gl.uniform2f(u.uHatTilt, hat ? hat.dx : 0, hat ? hat.dz : 0);
  const padAt = new Float32Array(12), padSize = new Float32Array(12);
  (pressed?.pads ?? []).slice(0, 3).forEach((pad, i) => {
    padAt.set([pad.c[0] - 50, pad.c[1] - 50, pad.c[2], pad.to === undefined ? 1e4 : pad.to - 50], 4 * i);
    padSize.set([Math.max(0.1, pad.r[0]), Math.max(0.1, pad.r[1]), Math.max(0.1, pad.r[2]), 1], 4 * i);
  });
  gl.uniform4fv(u.uPadAt, padAt);
  gl.uniform4fv(u.uPadSize, padSize);

  /* From the outside in — the strands, the shells from the outermost, the
     undercoat last — so that what is covered is never shaded: the depth
     test turns it away first. The picture is the same either way round. */
  const count = Math.min(geometry.strandCount, Math.round(((geometry.strandCount / SPARE) * Math.min(SPARE, dense)) / coarse));
  if (count > 0) {
    gl.bindVertexArray(geometry.strands);
    gl.uniform1i(u.uPass, PASS_STRAND);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * STRAND_RINGS, count);
  }
  gl.bindVertexArray(geometry.surface);
  const shells = Math.max(2, Math.ceil(5 * detail) - (crowd > 0.6 ? 1 : 0));
  gl.uniform1i(u.uPass, PASS_SHELL);
  for (let i = shells; i >= 1; i--) {
    gl.uniform1f(u.uShell, i / shells);
    gl.drawElements(gl.TRIANGLES, geometry.indexCount, gl.UNSIGNED_INT, 0);
  }
  gl.uniform1i(u.uPass, PASS_BODY);
  gl.uniform1f(u.uShell, 0);
  gl.drawElements(gl.TRIANGLES, geometry.indexCount, gl.UNSIGNED_INT, 0);
  gl.bindVertexArray(null);

  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(canvas, x, y, size, size, -radius, -radius, 2 * radius, 2 * radius);
  if (face) face.set = true;
  return true;
}
