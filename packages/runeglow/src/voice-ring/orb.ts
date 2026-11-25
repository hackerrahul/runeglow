/* The voice orb outside any framework, and the voice ring, which is the
   orb with its type fixed to one of the two aura types.

   `voiceOrbView` says what the canvas looks like for a set of options —
   pure, so a server can render it. `attachVoiceOrb` brings an existing
   canvas to life: it is what the framework adapters call, on the canvas
   they rendered. `mountVoiceOrb` makes the canvas itself, for a page with
   no framework at all. The `…VoiceRing` three are the same for the ring.

   Each instance runs its own rAF loop (capped near 60 fps), paused while
   offscreen or on a hidden tab. Every frame the follower reads the voice
   source (a stream, an AnalyserNode or a level), shapes and smooths it, and
   the type's geometry is painted with the shared depth-shaded painter.
   Sources are read when the loop asks for them, so a new level getter or
   sensitivity never restarts the loop or resets the envelope. */

import { Effects } from '../internal/effects';
import { applyStyle, type Style } from '../internal/view';
import { watchReducedMotion, watchResolvedDark } from '../thinking-orbs/theme';
import { acquireAnalyser } from './audio';
import { ACCENT_COLORS, EMOTION_COLORS, GlowFollower } from './emotion';
import { bendFrame, bendRadius, bendReach } from './engine/bend';
import { EdgeBounce, LEAN_DEFAULTS, leanFrame, leanReach, type LeanAmounts } from './engine/lean';
import { paintFrame, type OrbGlow, type OrbTint } from './engine/paint';
import type { VoiceOrbType } from './engine/registry';
import type { VoiceInput } from './engine/types';
import { PRESETS, resolvePreset } from './presets';
import type { VoiceOrbOptions, VoiceOrbState, VoiceRingOptions } from './types';
import { VoiceFollower } from './voice';

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

const LABELS: Record<VoiceOrbState, string> = {
  idle: 'Waiting',
  listening: 'Listening',
  speaking: 'Speaking',
  processing: 'Thinking'
};

// The hover bend's strength when it is simply on.
const HOVER_BEND = 0.55;

// 120 Hz displays would double the paint work for no visible gain.
const FRAME_MS = 1000 / 62;

/* ── what the options come to ─────────────────────────────────────────── */

/**
 * The room from the orb's box to the edges it may lean up to, left and
 * right, in CSS px. The view is made from the options and this together:
 * before the orb has measured (and on a server) there is all the room in
 * the world, and `attachVoiceOrb` reports each change through its `onroom`
 * hook. It only matters to an orb that is given a `direction`.
 */
export type VoiceOrbRoom = readonly [left: number, right: number];

const OPEN: VoiceOrbRoom = [Infinity, Infinity];

/* A type or a state can arrive as the text of an HTML attribute, so one the
   library does not know falls back to the default. */
const typeOf = (o: VoiceOrbOptions): VoiceOrbType => (o.type && o.type in PRESETS ? o.type : 'orbit');
const stateOf = (o: VoiceOrbOptions): VoiceOrbState => (o.state && o.state in LABELS ? o.state : 'listening');
const sizeOf = (o: VoiceOrbOptions): number => (typeof o.size === 'number' && o.size > 0 ? o.size : 160);

// each amount: the option, else the type's own, else the shared default
function leanOf(o: VoiceOrbOptions): LeanAmounts {
  const own = PRESETS[typeOf(o)].lean ?? {};
  return {
    move: o.directionMove ?? own.move ?? LEAN_DEFAULTS.move,
    pull: o.directionPull ?? own.pull ?? LEAN_DEFAULTS.pull,
    deform: o.directionDeform ?? own.deform ?? LEAN_DEFAULTS.deform,
    squash: o.directionSquash ?? own.squash ?? LEAN_DEFAULTS.squash,
    lens: o.directionLens ?? own.lens ?? LEAN_DEFAULTS.lens,
    stretch: o.directionStretch ?? own.stretch ?? LEAN_DEFAULTS.stretch,
    split: o.directionSplit ?? own.split ?? LEAN_DEFAULTS.split,
    blur: o.directionBlur ?? own.blur ?? LEAN_DEFAULTS.blur,
    bounce: o.directionBounce ?? own.bounce ?? LEAN_DEFAULTS.bounce
  };
}

/* The canvas reaches past the orb's box by as far as the lean can carry
   it — but no further than the edge of the screen, where the lean stops —
   so a leaning orb is never cut off and never overflows; negative margins
   keep the layout at `size`. No direction, no lean, no reach. */
function boxOf(o: VoiceOrbOptions, room: VoiceOrbRoom) {
  const size = sizeOf(o);
  const lean = leanOf(o);
  const reach = o.direction == null ? 0 : leanReach(lean, size);
  // how far short of the screen's edge the lean stops: the option, else the type's own
  const margin = o.directionMargin ?? PRESETS[typeOf(o)].margin ?? 32;
  // the lean's bounds: up to the margin short of the screen's edge…
  const left = Math.min(reach, room[0]);
  const right = Math.min(reach, room[1]);
  // …but the canvas reaches on into the margin, so a glow or a squashed
  // side fades out there instead of being cut at the bound
  const padL = reach ? left + margin : 0;
  const padR = reach ? right + margin : 0;
  return { size, lean, reach, margin, left, right, padL, padR };
}

/** What a voice orb's canvas looks like. */
export interface VoiceOrbView {
  /** Inline style of the canvas: its size, and the margins that pull the room it leans into back in. */
  style: Style;
  /** The default accessible name, such as "Listening". */
  label: string;
  state: VoiceOrbState;
}

/** The canvas of a voice orb for these options, with this much room to lean into. */
export function voiceOrbView(options: VoiceOrbOptions = {}, room: VoiceOrbRoom = OPEN): VoiceOrbView {
  const { size, padL, padR } = boxOf(options, room);
  const state = stateOf(options);
  return {
    style: {
      width: `${size + padL + padR}px`,
      height: `${size}px`,
      display: 'block',
      'margin-left': `${-padL}px`,
      'margin-right': `${-padR}px`
    },
    label: LABELS[state],
    state
  };
}

export interface VoiceOrbHooks {
  /**
   * The room the orb has to lean into has changed, so the view has: render
   * `voiceOrbView` again with this room, then call `update` with it.
   * Without this hook the orb takes the canvas to be in step already.
   */
  onroom?: (room: VoiceOrbRoom) => void;
}

export interface VoiceOrbHandle {
  /**
   * Give the orb new options. Each call replaces the last set whole.
   * `room` is the room the canvas was last rendered with, where an adapter
   * renders it.
   */
  update(options: VoiceOrbOptions, room?: VoiceOrbRoom): void;
  /** Stop everything and let go of the canvas. */
  destroy(): void;
}

interface LoopConfig {
  type: VoiceOrbType;
  size: number;
  reach: number;
  left: number;
  right: number;
  padL: number;
  padR: number;
  margin: number;
  dark: boolean;
  speed: number;
  paused: boolean;
  reduced: boolean;
  hasSource: boolean;
  tint: OrbTint | undefined;
  dots: number;
  dotSize: number;
  frame: VoiceOrbOptions['frame'];
}

/**
 * Bring a voice orb to life on an existing canvas, styled as `voiceOrbView`
 * says. It follows the stream, the analyser or the level it is given while
 * its state is one that listens, animates only while on screen and the tab
 * is visible, and draws one still frame when paused.
 */
export function attachVoiceOrb(canvas: HTMLCanvasElement, options: VoiceOrbOptions = {}, hooks: VoiceOrbHooks = {}): VoiceOrbHandle {
  let o = options;
  let alive = true;
  const fx = new Effects();

  let dark = true;
  let reduced = false;
  /* the room measured last, and the room the canvas is laid out with */
  let room: VoiceOrbRoom = OPEN;
  let shown: VoiceOrbRoom = OPEN;

  // The followers outlive every change of options, so the envelope never
  // drops to silence mid-sentence when one moves.
  const follower = new VoiceFollower();
  const glower = new GlowFollower();

  /* What the options come to, made again whenever they change. The loop
     reads these every frame, and nothing here restarts it. */
  let box = boxOf(o, shown);
  let preset = PRESETS[typeOf(o)];
  let emotionTint: OrbTint | null = null;
  // Live inputs, read by the loop every frame.
  // saturation past 1 is vividness: the colour itself purer and deeper
  let colors = { saturation: 0, vivid: 0, brightness: 1, hue: 0, start: 0, width: 0, accent: null as OrbTint | null, angle: 0, spin: 0, neutral: 1, size: 0 };
  let dotSize = 1;
  let attack = 0.06;
  let voiceSpeed = 1;
  let bendStrength = 0;
  const derive = () => {
    box = boxOf(o, shown);
    preset = PRESETS[typeOf(o)];
    const emotion = o.emotion ?? null;
    emotionTint = emotion ? (o.emotionColors?.[emotion] ?? EMOTION_COLORS[emotion] ?? null) : null;
    const saturation = o.saturation ?? 2;
    colors = {
      saturation: Math.min(1, saturation),
      vivid: Math.max(0, Math.min(1, saturation - 1)),
      brightness: o.colorBrightness ?? 1.02,
      hue: o.colorHue ?? 0,
      start: o.gradientStart ?? 0.1,
      width: o.gradientWidth ?? 0.6,
      accent: o.accent ? (ACCENT_COLORS[o.accent] ?? null) : null,
      angle: o.gradientAngle ?? 99,
      spin: o.gradientSpin ?? 12,
      neutral: o.neutral ?? 1,
      size: box.size
    };
    dotSize = o.dotSize ?? preset.dotSize ?? 1;
    attack = o.attack ?? preset.attack ?? 0.06;
    voiceSpeed = o.voiceSpeed ?? preset.voiceSpeed ?? 1;
    const hoverBend = o.hoverBend ?? false;
    bendStrength = hoverBend === true ? HOVER_BEND : typeof hoverBend === 'number' ? Math.max(0, Math.min(1, hoverBend)) : 0;
  };
  derive();

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

  // Compared by content, so an inline options literal does not restart the
  // loop every time the caller renders again.
  const optsKey = () => (o.opts ? JSON.stringify(o.opts) : '');
  // processing moves on its own, so it needs the loop even with no source
  const hasSource = () => Boolean(o.stream || o.analyser || o.level != null || stateOf(o) === 'processing');

  // Where the pointer is, for the hover bend, in the orb's own CSS px:
  // desktop only (a fine pointer that hovers), never with reduced motion.
  const pointer = { x: 0, y: 0, over: false };
  fx.add(
    () => [bendStrength > 0 && !reduced, box.size, box.padL, box.padR],
    () => {
      if (!(bendStrength > 0 && !reduced) || typeof matchMedia !== 'function') return;
      if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const full = box.size + box.padL + box.padR;
      const pad = box.padL;
      const move = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        const r = canvas.getBoundingClientRect();
        // the canvas may be scaled by an ancestor's transform
        const k = full / (r.width || 1);
        pointer.x = (e.clientX - r.left) * k - pad;
        pointer.y = (e.clientY - r.top) * k;
        pointer.over = true;
      };
      const leave = () => {
        pointer.over = false;
      };
      window.addEventListener('pointermove', move, { passive: true });
      document.documentElement.addEventListener('pointerleave', leave);
      return () => {
        window.removeEventListener('pointermove', move);
        document.documentElement.removeEventListener('pointerleave', leave);
        pointer.over = false;
      };
    }
  );

  // A stream gets its own analyser, released when the stream goes.
  let ownAnalyser: AnalyserNode | null = null;
  fx.add(
    () => [o.stream ?? null],
    () => {
      const source = o.stream;
      if (!source) return;
      const lease = acquireAnalyser(source);
      ownAnalyser = lease?.analyser ?? null;
      return () => {
        ownAnalyser = null;
        lease?.release();
      };
    }
  );

  // What the loop is built from. Reading these here, and nothing else, is
  // what decides when the loop restarts: everything it reads every frame
  // (the level, the state, the lean amounts, the colours) is read live and
  // left out, so moving one of those never tears the loop down.
  const still = () => !!o.paused || reduced;
  // The emotion and the colours join in only while the orb is still, so a
  // still frame repaints with them.
  const stillKey = () =>
    still()
      ? `${o.emotion ?? null}|${o.saturation ?? 2}|${o.accent ?? null}|${o.gradientAngle ?? 99}|${o.gradientSpin ?? 12}|${o.neutral ?? 1}|${o.colorBrightness ?? 1.02}|${o.colorHue ?? 0}|${o.gradientStart ?? 0.1}|${o.gradientWidth ?? 0.6}`
      : '';

  fx.add(
    () => [
      typeOf(o), box.size, box.reach, box.left, box.right, box.padL, box.padR, box.margin, dark, o.speed ?? 1, !!o.paused, reduced,
      hasSource(), o.color, o.dots ?? 1, dotSize, o.frame, optsKey(), stillKey()
    ],
    () =>
      run({
        type: typeOf(o),
        size: box.size,
        reach: box.reach,
        left: box.left,
        right: box.right,
        padL: box.padL,
        padR: box.padR,
        margin: box.margin,
        dark,
        speed: o.speed ?? 1,
        paused: !!o.paused,
        reduced,
        hasSource: hasSource(),
        tint: parseTint(o.color),
        dots: o.dots ?? 1,
        dotSize,
        frame: o.frame
      })
  );

  function run(cfg: LoopConfig): (() => void) | void {
    const { size, reach, left, right, padL, padR, paused, reduced, dark } = cfg;
    const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
    canvas.width = Math.round((size + padL + padR) * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolved = resolvePreset(cfg.type, size, cfg.dots, cfg.dotSize);
    // raw overrides land last, over everything the preset and multipliers set
    const override = o.opts;
    const opts = override ? { ...resolved.opts, ...override } : resolved.opts;
    const frameFn = cfg.frame ?? resolved.frame;
    const tint = cfg.tint;

    // the bounce off the edge chases how hard the last frame pressed on it
    const bounce = new EdgeBounce();
    let press = 0;
    // the hover bend, eased in as the pointer nears the rim and out as it
    // leaves, toward a pointer position that is eased too
    let bend = 0;
    let bx = size / 2;
    let by = size / 2;

    const draw = (voice: VoiceInput, glow: OrbGlow, dt: number) => {
      const orbState = stateOf(o);
      ctx.setTransform(dpr, 0, 0, dpr, padL * dpr, 0);
      ctx.clearRect(-padL, 0, size + padL + padR, size);
      // lean toward where the voice comes from, after the geometry
      const hit = paused || reduced ? 0 : bounce.step(press, dt);
      let frame = leanFrame(frameFn(size, follower.t, voice, opts), voice.pan, size, box.lean, [left, right], hit);
      press = frame.contact?.press ?? 0;
      // then bend toward the pointer on hover, while no voice moves the
      // orb: waiting or processing
      const strength = bendStrength;
      if (strength > 0) {
        const p = pointer;
        const R = bendRadius(frame, size);
        const quiet = orbState === 'idle' || orbState === 'processing';
        const near =
          p.over && quiet && !paused && !reduced ? bendReach(Math.hypot(p.x - size / 2, p.y - size / 2) - R, R) : 0;
        bend += (near - bend) * (1 - Math.exp(-dt / 0.14));
        // a fresh approach starts where the pointer is, not from the middle
        const follow = bend < 0.01 ? 1 : 1 - Math.exp(-dt / 0.05);
        bx += (p.x - bx) * follow;
        by += (p.y - by) * follow;
        if (bend > 0.002) frame = bendFrame(frame, size, { x: bx, y: by, amount: bend * strength });
      }
      // On the ink types the emotion *is* the colour: the gradient runs from
      // the neutral ink into the emotion's hue, fading in and crossfading as
      // the glow follower eases. A fixed accent, if set, holds the colour
      // without one. With neither, the orb stays neutral. The gradient turns
      // slowly on the orb's own clock, so it never jumps.
      const c = colors;
      const e = glow.amount;
      const base = c.accent;
      const hue = base
        ? { r: base.r + (glow.r - base.r) * e, g: base.g + (glow.g - base.g) * e, b: base.b + (glow.b - base.b) * e }
        : { r: glow.r, g: glow.g, b: glow.b };
      const painted = {
        ...c,
        accent: hue,
        saturation: c.saturation * (base ? 1 : e),
        angle: c.angle + c.spin * follower.clock
      };
      // luminous frames keep the emotion as a shift of their own spectrum,
      // tubes as a wash over their greys
      paintFrame(ctx, frame, dark, tint, frame.light || frame.tube ? glow : undefined, painted);
    };

    // the room from the orb's box to the edges of the viewport, checked every
    // half second; a change re-sizes the canvas
    let lastMeasure = -Infinity;
    const measure = (now: number) => {
      if (!reach || now - lastMeasure < 500) return;
      lastMeasure = now;
      const edge = canvas.getBoundingClientRect().left + padL;
      // the screen's edges, or the bounding element's
      const within = o.directionBounds?.getBoundingClientRect();
      const lo = within ? within.left : 0;
      const hi = within ? within.right : document.documentElement.clientWidth;
      // the lean stops short of those edges by the margin
      const next: VoiceOrbRoom = [
        Math.max(0, Math.floor(edge - lo - cfg.margin)),
        Math.max(0, Math.floor(hi - edge - size - cfg.margin))
      ];
      const was = room;
      if (Math.abs(was[0] - next[0]) > 1 || Math.abs(was[1] - next[1]) > 1) setRoom(next);
    };

    let lastStep = 0;
    const step = (now: number) => {
      measure(now);
      const orbState = stateOf(o);
      const sensitivity = o.sensitivity ?? 0.85;
      const level = o.level;
      const direction = o.direction;
      const dt = lastStep ? Math.min(0.05, (now - lastStep) / 1000) : 1 / 60;
      lastStep = now;
      // waiting and processing do not listen, whatever is attached
      const hears = orbState === 'listening' || orbState === 'speaking';
      const node = ownAnalyser ?? o.analyser ?? null;
      if (!hears) follower.readSilence();
      else if (node) follower.readAnalyser(node, sensitivity * resolved.gain, dt);
      else if (level != null) {
        follower.readLevel(typeof level === 'function' ? level() : level, sensitivity * resolved.gain);
      } else follower.readSilence();
      const voice = follower.step(
        dt,
        {
          sensitivity,
          threshold: o.threshold ?? 0.04,
          attack,
          release: o.release ?? 0.32,
          idle: o.idle ?? 0.1,
          driveGain: resolved.driveGain * voiceSpeed,
          calm: o.calm ?? 0.4,
          rate: resolved.speed * cfg.speed,
          processing: orbState === 'processing',
          direction: typeof direction === 'function' ? direction() : (direction ?? 0)
        },
        reduced
      );
      o.onLevel?.(voice.level);
      // a still orb (paused, or reduced motion) shows the emotion at once
      const glow = glower.step(dt, emotionTint, follower.clock, size, paused || reduced);
      draw(voice, glow, dt);
    };

    // paused, or reduced motion with nothing to listen to: one still frame
    step(performance.now());
    if (paused || (reduced && !cfg.hasSource)) return;

    let raf = 0;
    let running = false;
    let lastPaint = 0;
    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (now - lastPaint < FRAME_MS) return;
      lastPaint = now;
      step(now);
    };
    const start = () => {
      if (running) return;
      running = true;
      // the gap while stopped is not time the orb lived through
      lastStep = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

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

  /* A new measure of the room changes the canvas's size, which is the
     adapter's to render: it is told, and the loop takes the new size up
     when `update` says the canvas has it; with no one to tell, the orb
     takes it up itself. Either way after the frame that measured it is
     done: that frame is drawn at the size it started with. */
  function setRoom(next: VoiceOrbRoom) {
    room = next;
    queueMicrotask(() => {
      if (!alive || room !== next) return;
      if (hooks.onroom) hooks.onroom(next);
      else {
        shown = next;
        derive();
        fx.flush();
      }
    });
  }

  fx.flush();

  return {
    update(next, rendered = room) {
      o = next;
      shown = rendered;
      derive();
      fx.flush();
    },
    destroy() {
      alive = false;
      fx.destroy();
    }
  };
}

/** What `mountVoiceOrb` takes on top of the orb's own options. */
export interface VoiceOrbMountOptions extends VoiceOrbOptions {
  /** A class for the canvas. */
  class?: string;
  /** The accessible name. Default: the state, as in "Listening". */
  label?: string;
}

export interface MountedVoiceOrb {
  /** The canvas: lay it out and listen on it like any element. */
  element: HTMLCanvasElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: VoiceOrbMountOptions): void;
  /** Stop the orb and take its canvas out of the page. */
  destroy(): void;
}

/**
 * Put a voice orb inside `parent`, with no framework: the canvas is made
 * here, kept in step with the options, and removed by `destroy`.
 *
 *   const orb = mountVoiceOrb(document.querySelector('#assistant'), { type: 'aura', size: 240 });
 *   orb.update({ state: 'speaking', analyser });
 */
export function mountVoiceOrb(parent: Element | ShadowRoot, options: VoiceOrbMountOptions = {}): MountedVoiceOrb {
  const doc = parent.ownerDocument ?? document;
  const element = doc.createElement('canvas');
  element.setAttribute('role', 'img');

  let o = { ...options };
  let room: VoiceOrbRoom = OPEN;
  let style: Style | null = null;
  const render = () => {
    const view = voiceOrbView(o, room);
    applyStyle(element, view.style, style);
    style = view.style;
    element.className = o.class ?? '';
    element.setAttribute('aria-label', o.label ?? view.label);
  };
  render();
  parent.appendChild(element);
  let handle: VoiceOrbHandle | null = null;
  handle = attachVoiceOrb(element, o, {
    onroom(next) {
      room = next;
      render();
      handle?.update(o, room);
    }
  });
  return {
    element,
    update(next) {
      o = { ...o, ...next };
      render();
      handle?.update(o, room);
    },
    destroy() {
      handle?.destroy();
      handle = null;
      element.remove();
    }
  };
}

/* ── the ring ─────────────────────────────────────────────────────────── */

const ORB_TYPE = { ring: 'aura', mono: 'aura-mono' } as const;

/* A voice-reactive ring: the orb with its type fixed to one of the two aura types. */
const asOrb = <T extends VoiceRingOptions>(o: T): Omit<T, 'type'> & VoiceOrbOptions => ({ ...o, type: ORB_TYPE[o.type ?? 'ring'] ?? ORB_TYPE.ring });

/** What a voice ring's canvas looks like. */
export type VoiceRingView = VoiceOrbView;
export type VoiceRingHooks = VoiceOrbHooks;

/** The canvas of a voice ring for these options, with this much room to lean into. */
export function voiceRingView(options: VoiceRingOptions = {}, room: VoiceOrbRoom = OPEN): VoiceRingView {
  return voiceOrbView(asOrb(options), room);
}

export interface VoiceRingHandle {
  /** Give the ring new options. Each call replaces the last set whole. */
  update(options: VoiceRingOptions, room?: VoiceOrbRoom): void;
  /** Stop everything and let go of the canvas. */
  destroy(): void;
}

/**
 * Bring a voice ring to life on an existing canvas, styled as
 * `voiceRingView` says: `ring`, rings drawn in light, a blooming spectrum
 * with chromatic fringes that bends with the voice and leans toward where
 * it comes from, or `mono`, the same rings as two loops of grey tube, which
 * a voice opens into a turning globe.
 */
export function attachVoiceRing(canvas: HTMLCanvasElement, options: VoiceRingOptions = {}, hooks: VoiceRingHooks = {}): VoiceRingHandle {
  const orb = attachVoiceOrb(canvas, asOrb(options), hooks);
  return { update: (next, room) => orb.update(asOrb(next), room), destroy: orb.destroy };
}

/** What `mountVoiceRing` takes on top of the ring's own options. */
export type VoiceRingMountOptions = VoiceRingOptions & Pick<VoiceOrbMountOptions, 'class' | 'label'>;

export interface MountedVoiceRing {
  /** The canvas: lay it out and listen on it like any element. */
  element: HTMLCanvasElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: VoiceRingMountOptions): void;
  /** Stop the ring and take its canvas out of the page. */
  destroy(): void;
}

/**
 * Put a voice ring inside `parent`, with no framework.
 *
 *   const ring = mountVoiceRing(document.querySelector('#assistant'), { size: 240 });
 *   mic.subscribe(() => ring.update({ stream: mic.stream }));
 */
export function mountVoiceRing(parent: Element | ShadowRoot, options: VoiceRingMountOptions = {}): MountedVoiceRing {
  let o = { ...options };
  const orb = mountVoiceOrb(parent, asOrb(o));
  return {
    element: orb.element,
    update(next) {
      o = { ...o, ...next };
      orb.update(asOrb(o));
    },
    destroy: orb.destroy
  };
}
