/* The robot head outside any framework.

   `robotHeadView` says what the element looks like for a set of options —
   pure, so a server can render it. `attachRobotHead` brings two existing
   elements to life: it is what the framework adapters call, on the elements
   they rendered. `mountRobotHead` makes the elements itself, for a page
   with no framework at all. */

import { Effects } from '../../internal/effects';
import { applyStyle, nextSeed, pixelRatio, reducedMotion, whenNear, whileOnScreen, type Style } from '../../internal/view';
import { parseColor } from '../color';
import { pointer, subscribe } from '../ticker';
import { getShape } from './geometry';
import { shellMaterial, trimMaterial } from './light';
import { robotHeadColorways, robotHeadShapes, robotStateLabels } from './presets';
import { RobotRenderer, frameFor, type Frame, type Palette } from './render';
import { RobotSim, restPose, type RobotPose } from './sim';
import type { RobotHeadOptions, RobotHeadShape, RobotHeadState } from './types';

/* how far a pointer is followed from, in CSS px */
const REACH = 700;
/* the switching-on of the screen, in seconds: a head frozen before it is
   over shows the state's still frame instead */
const WARM = 0.6;

const stateOf = (o: RobotHeadOptions): RobotHeadState => (o.state && o.state in robotStateLabels ? o.state : 'idle');
const shapeOf = (o: RobotHeadOptions): RobotHeadShape => (o.shape && robotHeadShapes.includes(o.shape) ? o.shape : 'rectangle');
const sizeOf = (o: RobotHeadOptions) => (typeof o.size === 'number' && Number.isFinite(o.size) && o.size > 0 ? o.size : 160);

/** What a robot head's elements look like: a box, and the canvas inside it. */
export interface RobotHeadView {
  /** Inline style of the box: the `size` × `size` element that takes part in layout. */
  box: Style;
  /** Inline style of the canvas, which reaches past the box on every side. */
  canvas: Style;
  /** The default accessible name, such as "Robot, thinking". */
  label: string;
  shape: RobotHeadShape;
  state: RobotHeadState;
}

/**
 * The elements of a robot head for these options. `shown` is whether the
 * head has drawn its first frame: until then the canvas is transparent, and
 * it fades in.
 */
export function robotHeadView(options: RobotHeadOptions, shown = false): RobotHeadView {
  const shape = shapeOf(options), state = stateOf(options), px = sizeOf(options);
  const frame = frameFor(getShape(shape), options.antenna ?? true, px);
  const box: Style = {
    position: 'relative',
    display: 'inline-block',
    'vertical-align': 'middle',
    flex: 'none',
    width: `${px}px`,
    height: `${px}px`,
  };
  if (options.interactive ?? true) box.cursor = 'pointer';
  return {
    box,
    canvas: {
      position: 'absolute',
      left: `${-frame.padSide}px`,
      top: `${-frame.padTop}px`,
      width: `${frame.box + 2 * frame.padSide}px`,
      height: `${frame.box + frame.padTop + frame.padBottom}px`,
      display: 'block',
      'max-width': 'none',
      'pointer-events': 'none',
      opacity: shown ? '1' : '0',
      transition: 'opacity 0.3s ease-out',
    },
    label: `Robot, ${robotStateLabels[state]}`,
    shape,
    state,
  };
}

export interface RobotHeadHooks {
  /** The head has drawn its first frame: time to show the canvas. */
  onshown?: () => void;
}

export interface RobotHeadHandle {
  /** Give the head new options. Each call replaces the last set whole. */
  update(options: RobotHeadOptions): void;
  /** What a click does: a hop with a full turn and a happy face. */
  poke(): void;
  /** Stop everything and let go of the elements. */
  destroy(): void;
}

/**
 * Bring a robot head to life on two existing elements: the box, and the
 * canvas inside it, styled as `robotHeadView` says. Draws nothing until the
 * box is near the screen, animates only while it is on it, and hops when
 * the box is clicked.
 */
export function attachRobotHead(box: HTMLElement, canvas: HTMLCanvasElement, options: RobotHeadOptions = {}, hooks: RobotHeadHooks = {}): RobotHeadHandle {
  let o = options;
  let sim: RobotSim | null = null;
  let renderer: RobotRenderer | null = null;
  let near = false;
  let shown = false;
  const seed = Math.min(1, Math.max(0, o.seed ?? nextSeed()));
  const fx = new Effects();

  /* what the options come to; made again only when what it is made from changes */
  let frame: Frame = frameFor(getShape(shapeOf(o)), o.antenna ?? true, sizeOf(o));
  let frameKey = '';
  let palette: Palette | null = null;
  let paletteKey = '';
  const derive = () => {
    const fk = `${shapeOf(o)}|${o.antenna ?? true}|${sizeOf(o)}`;
    if (fk !== frameKey) {
      frameKey = fk;
      frame = frameFor(getShape(shapeOf(o)), o.antenna ?? true, sizeOf(o));
    }
    const pk = `${o.colorway}|${o.color}|${o.trimColor}|${o.screenColor}|${o.finish}`;
    if (pk !== paletteKey || !palette) {
      paletteKey = pk;
      const base = robotHeadColorways.cobalt;
      const way = (o.colorway && robotHeadColorways[o.colorway]) || base;
      const pick = (given: string | undefined, own: string, fallback: string) =>
        (given && parseColor(given)) || parseColor(own) || (parseColor(fallback) as [number, number, number]);
      palette = {
        shell: shellMaterial(pick(o.color, way.color, base.color), o.finish === 'matte' || o.finish === 'metal' ? o.finish : 'gloss'),
        trim: trimMaterial(pick(o.trimColor, way.trimColor, base.trimColor)),
        led: pick(o.screenColor, way.screenColor, base.screenColor),
      };
    }
  };
  const frozen = () => !!o.paused || !((o.speed ?? 1) > 0);

  const paint = () => {
    const s = sim;
    if (!s || !palette) return;
    const f = frame;
    const dpr = pixelRatio();
    const w = Math.round((f.box + 2 * f.padSide) * dpr);
    const h = Math.round((f.box + f.padTop + f.padBottom) * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!renderer) renderer = new RobotRenderer();
    const state = stateOf(o);
    /* the live frame while it runs, and when frozen part-way; the state's
       still frame under reduced motion, or frozen before it ever ran */
    const live = !reducedMotion() && (!frozen() || (s.age > WARM && s.shown === state));
    const still = restPose(state);
    let p: RobotPose = live ? s.pose : still;
    const held = o.pose;
    if (held) {
      /* turned by hand: no hop, no squash; the antenna keeps its own sway */
      p = { ...still, yaw: held.yaw ?? 0, pitch: held.pitch ?? still.pitch, roll: held.roll ?? still.roll, antennaX: live ? s.pose.antennaX : 0, antennaZ: live ? s.pose.antennaZ : 0 };
    }
    renderer.draw(ctx, f, dpr, p, live ? s : null, state, getShape(shapeOf(o)), palette, {
      floorShadow: o.floorShadow ?? true,
      antenna: o.antenna ?? true,
      pixels: o.pixels === 'round' ? 'round' : 'square',
    });
    if (!shown) {
      shown = true;
      hooks.onshown?.();
    }
  };

  /* near the screen yet? Checked once: after that the head is kept. */
  fx.add(
    () => [near],
    () => {
      if (near) return;
      return whenNear(box, 400, () => {
        near = true;
        fx.touch();
      });
    },
  );

  /* Whenever anything the picture is made from changes: keep the sim on the
     state and draw at once, so a change shows on a head that has no loop
     running (paused, or under reduced motion). */
  fx.add(
    () => [stateOf(o), frame, palette, o.pixels, o.antenna, o.floorShadow, frozen(), o.pose?.yaw, o.pose?.pitch, o.pose?.roll, near],
    () => {
      if (!sim) sim = new RobotSim(seed, stateOf(o));
      else sim.setState(stateOf(o));
      if (near) paint();
    },
  );

  /* the loop: only while on screen, animated and not reduced */
  fx.add(
    () => [frozen(), near, reducedMotion()],
    () => {
      if (frozen() || !near || reducedMotion()) return;
      let unsub: (() => void) | null = null;
      const tick = (dt: number) => {
        const s = sim;
        if (!s) return;
        if ((o.interactive ?? true) && !o.pose && !Number.isNaN(pointer.x)) {
          /* measured from the resting head's centre */
          const r = box.getBoundingClientRect();
          const dx = pointer.x - (r.left + r.width / 2);
          const dy = pointer.y - (r.top + frame.cy - frame.padTop);
          s.pointer = Math.hypot(dx, dy) < REACH ? { x: dx, y: dy } : null;
        } else s.pointer = null;
        s.update(dt * (o.speed ?? 1));
        paint();
      };
      return whileOnScreen(
        box,
        () => {
          if (!unsub) unsub = subscribe(tick);
        },
        () => {
          if (unsub) unsub();
          unsub = null;
        },
      );
    },
  );

  const poke = () => {
    if ((o.interactive ?? true) && !frozen() && !o.pose) sim?.poke();
  };
  box.addEventListener('click', poke);

  derive();
  fx.flush();

  return {
    update(next) {
      o = next;
      derive();
      fx.flush();
    },
    poke,
    destroy() {
      box.removeEventListener('click', poke);
      fx.destroy();
    },
  };
}

/** What `mountRobotHead` takes on top of the head's own options. */
export interface RobotHeadMountOptions extends RobotHeadOptions {
  /** A class for the box element. */
  class?: string;
  /** The accessible name. Default: "Robot, " and the state. */
  label?: string;
}

export interface MountedRobotHead {
  /** The box: a `size` × `size` element, the one to lay out and listen on. */
  element: HTMLSpanElement;
  canvas: HTMLCanvasElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: RobotHeadMountOptions): void;
  poke(): void;
  /** Stop the head and take its elements out of the page. */
  destroy(): void;
}

/**
 * Put a robot head inside `parent`, with no framework: the elements are
 * made here, kept in step with the options, and removed by `destroy`.
 *
 *   const head = mountRobotHead(document.querySelector('#agent'), { state: 'thinking' });
 *   head.update({ state: 'success' });
 */
export function mountRobotHead(parent: Element | ShadowRoot, options: RobotHeadMountOptions = {}): MountedRobotHead {
  const doc = parent.ownerDocument ?? document;
  const element = doc.createElement('span');
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  element.setAttribute('role', 'img');
  element.appendChild(canvas);

  let o = { ...options };
  let shown = false;
  let boxStyle: Style | null = null, canvasStyle: Style | null = null;
  const render = () => {
    const view = robotHeadView(o, shown);
    applyStyle(element, view.box, boxStyle);
    applyStyle(canvas, view.canvas, canvasStyle);
    boxStyle = view.box;
    canvasStyle = view.canvas;
    element.className = o.class ?? '';
    element.setAttribute('aria-label', o.label ?? view.label);
    element.dataset.robotHead = view.shape;
    element.dataset.state = view.state;
  };
  render();
  parent.appendChild(element);
  const handle = attachRobotHead(element, canvas, o, {
    onshown: () => {
      shown = true;
      render();
    },
  });
  return {
    element,
    canvas,
    update(next) {
      o = { ...o, ...next };
      render();
      handle.update(o);
    },
    poke: handle.poke,
    destroy() {
      handle.destroy();
      element.remove();
    },
  };
}
