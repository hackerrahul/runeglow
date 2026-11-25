/* The bot avatar outside any framework.

   `botAvatarView` says what the canvas looks like for a set of options —
   pure, so a server can render it. `attachBotAvatar` brings an existing
   canvas to life: it is what the framework adapters call, on the canvas
   they rendered. `mountBotAvatar` makes the canvas itself, for a page with
   no framework at all. */

import { Effects } from '../internal/effects';
import { applyStyle, closestAcross, nextSeed, pixelRatio, reducedMotion, whenNear, whileOnScreen, type Style } from '../internal/view';
import { autoInk, richer, shade } from './color';
import { draw, LIGHT_DEFAULTS, OVERSCAN, RISE, type DrawConfig } from './draw';
import { Sim, restPose } from './engine';
import { bakesPending, hurry, onLanded, stockLights, takeMissed, warmPlastic, type FurStyle } from './plastic';
import { botAvatarPresets, stateLabels } from './presets';
import { SHAPE_PARTS, SHAPE_PATHS } from './shapes';
import { pointer, subscribe } from './ticker';
import type { BotAvatarFace, BotAvatarOptions, BotAvatarShading, BotAvatarState, BotAvatarType } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 1));

/* a stable number for a custom outline, for the material caches' keys */
function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const pathCache = new Map<string, Path2D>();
function bodyPath(d: string): Path2D {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

/* the thin parts one piece per subpath, so each rounds on its own */
const partsCache = new Map<string, Path2D[]>();
function partPaths(d: string): Path2D[] {
  let p = partsCache.get(d);
  if (!p) {
    p = d.split(/(?=M)/).filter((s) => s.trim()).map((s) => new Path2D(s));
    partsCache.set(d, p);
  }
  return p;
}

/* the longest an avatar waits for its material before it is shown anyway */
const SHOW_WITHIN = 4000;
/* The avatars waiting to be shown, each with whether it is ready. The
   React library holds every one of them back until all are ready and no
   bake is still under way, so a page comes in at once; with a few dozen
   on a page that meant the first waited on the last, several seconds.
   Here each is shown as soon as its own material is made. Bakes run in
   the order avatars mount, so the top of a page comes in first. */
const waiters = new Map<object, { ready: () => boolean; show: () => void }>();
function showReady() {
  for (const [key, w] of [...waiters]) {
    if (!w.ready()) continue;
    waiters.delete(key);
    w.show();
  }
}

/* how far the pointer's pull reaches, in head widths */
const REACH = 3;

/* ── what the options come to ─────────────────────────────────────────── */

const typeOf = (o: BotAvatarOptions): BotAvatarType => (o.type && o.type in botAvatarPresets ? o.type : 'clover');
const stateOf = (o: BotAvatarOptions): BotAvatarState => (o.state && o.state in stateLabels ? o.state : 'default');
const sizeOf = (o: BotAvatarOptions): number | string => o.size ?? 64;
const shadingOf = (o: BotAvatarOptions): BotAvatarShading =>
  o.shading === true ? 'crisp' : o.shading === false ? 'flat' : (o.shading ?? 'fabric');
const baked = (shading: BotAvatarShading) => shading === 'plastic' || shading === 'fabric';
const frozenOf = (o: BotAvatarOptions) => !!o.paused || !((o.speed ?? 1) > 0);

/** What a bot avatar's canvas looks like. */
export interface BotAvatarView {
  /** Inline style of the canvas: its size, and the margins that pull its overscan back in. */
  style: Style;
  /** The default accessible name, such as "Clover bot, working". */
  label: string;
  type: BotAvatarType;
  face: BotAvatarFace;
  state: BotAvatarState;
}

/**
 * The canvas of a bot avatar for these options. `shown` is whether the
 * avatar's material is made: a fabric or plastic avatar is transparent
 * until then, and fades in; the flat ones are shown from the start.
 */
export function botAvatarView(options: BotAvatarOptions, shown = false): BotAvatarView {
  const type = typeOf(options), state = stateOf(options), size = sizeOf(options);
  const preset = botAvatarPresets[type];
  /* The canvas overscans its box (see draw.ts) and pulls itself back in
     with negative margins, so it lays out at `size` and still has room
     to hop and flip. */
  const dim = typeof size === 'number' ? `${size * OVERSCAN}px` : `calc(${size} * ${OVERSCAN})`;
  const pull = (k: number) => (typeof size === 'number' ? `${-size * k}px` : `calc(${size} * ${-k})`);
  const side = (OVERSCAN - 1) / 2;
  return {
    style: {
      display: 'inline-block',
      'vertical-align': 'middle',
      width: dim,
      height: dim,
      'margin-left': pull(side),
      'margin-right': pull(side),
      'margin-top': pull(side + RISE),
      'margin-bottom': pull(side - RISE),
      flex: 'none',
      opacity: shown || !baked(shadingOf(options)) ? '1' : '0',
      transition: 'opacity 0.3s ease-out',
    },
    label: `${preset.label} bot, ${stateLabels[state]}`,
    type,
    face: options.face ?? preset.face,
    state,
  };
}

export interface BotAvatarHooks {
  /** The avatar's material is made and it has been drawn in it: time to show the canvas. */
  onshown?: () => void;
}

export interface BotAvatarHandle {
  /** Give the avatar new options. Each call replaces the last set whole. */
  update(options: BotAvatarOptions): void;
  /** What a click does: a hop and a turn right round. */
  poke(): void;
  /** Stop everything and let go of the canvas. */
  destroy(): void;
}

/* a new set of options that says what the last one said is no work */
function sameOptions(a: BotAvatarOptions, b: BotAvatarOptions): boolean {
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof BotAvatarOptions>) {
    /* a pose is made afresh by most callers: it is the same if its angles are */
    if (k !== 'pose' && !Object.is(a[k], b[k])) return false;
  }
  const pa = a.pose, pb = b.pose;
  if (!pa || !pb) return !pa && !pb;
  return pa.yaw === pb.yaw && pa.pitch === pb.pitch && pa.roll === pb.roll;
}

/**
 * Bring a bot avatar to life on an existing canvas, styled as
 * `botAvatarView` says. A fabric or plastic avatar builds its material on
 * idle time, once it is near the screen, and asks to be shown when it is
 * made; all of them animate only while on screen, and hop when clicked.
 */
export function attachBotAvatar(canvas: HTMLCanvasElement, options: BotAvatarOptions = {}, hooks: BotAvatarHooks = {}): BotAvatarHandle {
  let o = options;
  const seed = Math.min(1, Math.max(0, o.seed ?? nextSeed()));
  const fx = new Effects();

  /* the sim lives across updates; everything else reaches the draw through
     the config below, rebuilt whenever the options change */
  let sim: Sim | null = null;
  let cssSize = 0;
  let cfg!: DrawConfig;
  let shading: BotAvatarShading = 'fabric';
  let material = true;
  let outlineKey = '';
  let fur!: FurStyle;
  let furId = '';
  let lookKey = '';
  let jumpKey = '';

  /* the pile's style, rounded so a slider does not bake a pile per pixel */
  const q = (v: number, lo: number, hi: number) => Math.round(clamp(v, lo, hi) * 20) / 20;

  const derive = () => {
    const type = typeOf(o);
    const preset = botAvatarPresets[type];
    const faceKind = o.face ?? preset.face;
    /* the type's own brightness and saturation where the options leave them out */
    const brightness = o.brightness ?? preset.brightness ?? 1;
    const saturation = o.saturation ?? preset.saturation ?? 1.5;
    /* past 1.5 the colour itself is as saturated as it goes for most of the
       palette: the rest deepens it and makes the light keep more of it */
    const vivid = clamp(saturation, 1.5, 2.5) - 1.5;
    const picked = o.color ?? preset.color;
    const body = richer(
      brightness === 1 && saturation === 1
        ? picked
        : shade(picked, (Math.min(2, Math.max(0, brightness)) - 1) * 0.35, (Math.min(1.5, Math.max(0, saturation)) - 1) * 0.5),
      vivid,
    );
    shading = shadingOf(o);
    material = baked(shading);
    /* A custom outline replaces the type's (and its thin parts); the material
       caches are keyed by the outline itself, so two avatars with the same
       path share one bake and a changed path never reuses the old one. */
    const customPath = typeof o.path === 'string' && o.path.trim() ? o.path.trim() : null;
    outlineKey = customPath ? `path:${hashText(customPath)}:${customPath.length}` : type;
    /* the light a material looks its best in, where an option leaves it */
    const lit = LIGHT_DEFAULTS[shading === 'fabric' ? 'fabric' : 'other'];
    fur = {
      length: q(o.furLength ?? 1, 0.3, 2.5),
      density: q(o.furDensity ?? 1.6, 0.3, 2),
      fuzz: q(o.furFuzz ?? 0.9, 0, 1),
      clumps: q(o.furClumps ?? 0.4, 0, 1),
      curl: q(o.furCurl ?? 0.7, 0, 1),
      gravity: q(o.furGravity ?? 0.9, 0, 1),
    };
    furId = `${fur.length},${fur.density},${fur.fuzz},${fur.clumps},${fur.curl},${fur.gravity}`;
    const hasPath = typeof Path2D !== 'undefined';
    cfg = {
      path: hasPath ? bodyPath(customPath ?? SHAPE_PATHS[type] ?? SHAPE_PATHS.clover) : (null as unknown as Path2D),
      face: faceKind === 'none' ? 'eyes' : faceKind,
      faceless: faceKind === 'none',
      faceX: preset.faceX,
      faceY: preset.faceY,
      faceScale: preset.faceScale,
      color: body,
      ink: o.ink ?? autoInk(body),
      shading,
      shadow: clamp(o.shadow ?? lit.shadow, 0, 2),
      highlight: clamp(o.highlight ?? lit.highlight, 0, 2),
      depth: clamp(o.depth ?? 0.65, 0.2, 2),
      roundness: clamp(o.roundness ?? 1, 0, 1),
      fur,
      vivid,
      backLight: o.backLight,
      lightFront: o.lightFront,
      shine: o.shine,
      sheen: o.sheen,
      backSoftness: o.backSoftness,
      light: o.light ?? lit.light,
      rim: clamp(o.rim ?? lit.rim, 0, 2),
      spread: clamp(o.spread ?? lit.spread, 0.4, 2.5),
      typeKey: outlineKey,
      still: frozenOf(o) || reducedMotion(),
      furOnIdle: true,
      whirl: {
        strength: clamp(o.whirl ?? 0, 0, 2),
        size: clamp(o.whirlSize ?? 1, 0.6, 1.6),
        width: clamp(o.whirlWidth ?? 1, 0.4, 2),
        length: clamp(o.whirlLength ?? 1, 0.4, 1.6),
        tilt: clamp(o.whirlTilt ?? 1, 0.5, 1.8),
      },
      parts: hasPath && !customPath && SHAPE_PARTS[type] ? partPaths(SHAPE_PARTS[type] as string) : undefined,
      wear: {
        hat: o.hat ?? 'none',
        glasses: o.glasses ?? 'none',
        headphones: o.headphones ?? false,
        bowTie: o.bowTie ?? false,
        color: o.accessoryColor ?? '#27272b',
        fabric: shading === 'fabric',
      },
    };
    lookKey = `${shading}|${outlineKey}|${sizeOf(o)}`;
    jumpKey = [o.jumpHeight, o.jumpTime, o.jumpStretch, o.jumpSpin, o.jumpLean, o.jumpEvery, o.jumpLand, o.jumpSquash, o.jumpSquashTime, o.jumpSquashEase, o.jumpGroundTime, o.jumpGroundEase, o.jumpRiseTime, o.jumpRiseEase, o.jumpClickSquashTime].join('|');
  };
  derive();

  const fallbackSize = () => {
    const size = sizeOf(o);
    return typeof size === 'number' ? size : 64;
  };

  /* the surface: an ancestor's say, else the system's */
  const resolveTheme = (): 'dark' | 'light' => {
    const theme = o.theme ?? 'auto';
    if (theme !== 'auto') return theme;
    const host = closestAcross(canvas, '[data-theme], .dark, .light');
    if (host) {
      const v = host.getAttribute('data-theme');
      if (v === 'dark' || v === 'light') return v;
      if (host.classList.contains('dark')) return 'dark';
      if (host.classList.contains('light')) return 'light';
    }
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  /* An avatar in a baked material is not shown until it can be drawn in
     it: no flat stand-in first and the fur a few seconds later. */
  let shown = !material;
  /* A Runeglow addition: a baked material is not made until its avatar is
     on screen or close to it. A long page of avatars otherwise bakes every
     one at load, and the ones in view queue behind the ones far below. */
  let near = false;
  let redrawTick = 0;
  const show = () => {
    if (shown) return;
    shown = true;
    hooks.onshown?.();
    fx.touch();
  };

  /* paint the current pose, sizing the backing store to the element */
  const paint = () => {
    const c = cfg;
    if (!c || !c.path) return;
    /* a hidden ancestor measures 0: keep the last size rather than
       wiping the backing store */
    const px = canvas.clientWidth / OVERSCAN || cssSize || fallbackSize();
    if (!px) return;
    const dpr = pixelRatio();
    const want = Math.round(px * OVERSCAN * dpr);
    if (canvas.width !== want || canvas.height !== want) {
      canvas.width = want;
      canvas.height = want;
    }
    cssSize = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.dpr = dpr;
    /* a held pose: the state's rest with the head turned as given — the
       body seen from any side, with nothing of a hop or a glance in it */
    const held = o.pose;
    const rest0 = restPose(stateOf(o));
    const pose = held ? { ...rest0, yaw: held.yaw ?? 0, pitch: held.pitch ?? rest0.pitch, roll: held.roll ?? rest0.roll } : sim ? sim.pose : rest0;
    draw(ctx, px, pose, c);
  };

  /* A still avatar's pile bakes on idle time like any other (made at once
     it would hold the page): while it draws a stand-in it is drawn again
     each time a bake lands, until a draw needs none — no animation frame
     will come to show it. */
  let stillPaint: (() => void) | null = null;
  let waiting: (() => void) | null = null;
  const stopWaiting = () => {
    if (waiting) waiting();
    waiting = null;
  };
  const settle = (paintNow: () => void) => {
    takeMissed();
    paintNow();
    if (!takeMissed()) stopWaiting();
    else if (!waiting)
      waiting = onLanded(() => {
        const p = stillPaint;
        if (alive && p) settle(p);
        else stopWaiting();
      });
  };

  /* It waits with its bakes hurried (see plastic.ts), drawn again as each
     lands, and comes in once it needs no stand-in, or after SHOW_WITHIN at
     most. */
  let alive = true;
  let showPaint: (() => void) | null = null;
  let watch: (() => void) | null = null;
  const stopWatch = () => {
    if (watch) watch();
    watch = null;
  };
  const me = {};
  let ready = false;
  const showWhenBaked = (paintNow: () => void) => {
    showPaint = paintNow;
    takeMissed();
    paintNow();
    ready = !takeMissed();
    if (ready) {
      showReady();
      return;
    }
    if (!watch)
      watch = onLanded(() => {
        const p = showPaint;
        if (alive && p && !shown) showWhenBaked(p);
        else stopWatch();
        showReady();
      });
  };

  /* the material's bakes, queued now */
  const warm = () => {
    const c = cfg;
    if (!material || !c?.path) return;
    const dev = fallbackSize() * pixelRatio();
    const lightAt = c.light ?? 295;
    const a = (lightAt * Math.PI) / 180, b = ((o.backLight ?? 0) * Math.PI) / 180;
    const lights = stockLights(Math.sin(a), -Math.cos(a));
    if (o.backLight !== undefined) [lights.bx, lights.by] = [Math.sin(b), -Math.cos(b)];
    if (o.lightFront !== undefined) lights.front = (Math.min(85, Math.max(0, o.lightFront)) * Math.PI) / 180;
    warmPlastic(outlineKey, c.path, dev, o.depth ?? 0.65, shading === 'fabric', fur, lightAt, lights);
  };

  /* Shown, a new shape, material or size keeps the picture it has until
     the new one is made (its bakes hurried), rather than standing in with
     the flat look meanwhile. The pile's style and light are not held: a
     slider dragged through them draws as it goes. */
  let lastLook: string | null = null;
  let holding: (() => void) | null = null;
  const hold = () => {
    warm();
    if (!bakesPending()) return;
    hurry(true);
    const release = () => {
      if (!holding) return;
      holding();
      redrawTick++;
      fx.touch();
    };
    const off = onLanded(() => {
      if (!bakesPending()) release();
    });
    const t = setTimeout(release, SHOW_WITHIN);
    holding = () => {
      off();
      clearTimeout(t);
      hurry(false);
      holding = null;
    };
  };

  /* near the screen yet? Checked once: after that the avatar is kept. */
  fx.add(
    () => [near],
    () => {
      if (near) return;
      return whenNear(canvas, 600, () => {
        near = true;
        fx.touch();
      });
    },
  );

  /* Whenever anything the picture is made from changes: the config (so
     every option that shapes it), the state, the jump, and the two switches
     that ask for a fresh paint, `shown` and `redrawTick`. */
  fx.add(
    () => [cfg, shown, near, redrawTick, o.pose?.yaw, o.pose?.pitch, o.pose?.roll, !o.pose, o.theme, stateOf(o), o.turn, lookKey, jumpKey, frozenOf(o)],
    () => {
      const state = stateOf(o);
      if (!sim) sim = new Sim(seed, state);
      else sim.setState(state);
      sim.setTurn(clamp(o.turn ?? 1, 0, 2));
      if (shown && material && lastLook !== null && lastLook !== lookKey && !holding) hold();
      lastLook = lookKey;
      sim.setJump({
        height: o.jumpHeight ?? 26,
        time: Math.max(0.2, o.jumpTime ?? 0.68),
        stretch: o.jumpStretch ?? 1,
        spin: Math.max(0, Math.round(o.jumpSpin ?? 1)),
        lean: o.jumpLean ?? 6,
        every: o.jumpEvery ?? 8,
        land: o.jumpLand ?? 0,
        squash: o.jumpSquash ?? 1.15,
        squashTime: Math.max(0.05, o.jumpSquashTime ?? 0.37),
        squashEase: o.jumpSquashEase ?? 'pulse',
        groundTime: Math.max(0, o.jumpGroundTime ?? 0.11),
        groundEase: o.jumpGroundEase ?? 'pulse',
        riseTime: Math.max(0.05, o.jumpRiseTime ?? 0.33),
        riseEase: o.jumpRiseEase ?? 'pulse',
        clickSquashTime: Math.max(0.05, o.jumpClickSquashTime ?? 0.24),
      });
      if (holding) return;
      /* not yet near the screen and not yet shown: nothing to draw or bake */
      if (!shown && !near) return;
      const frozen = frozenOf(o);
      if (reducedMotion()) {
        /* the still pose of the state, no loop */
        const still = () => {
          const cur = cfg;
          if (!cur || !cur.path) return;
          const px = canvas.clientWidth / OVERSCAN || cssSize || fallbackSize();
          if (!px) return;
          cssSize = px;
          const dpr = pixelRatio();
          canvas.width = canvas.height = Math.round(px * OVERSCAN * dpr);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            cur.theme = resolveTheme();
            cur.dpr = dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            draw(ctx, px, restPose(stateOf(o)), cur);
          }
        };
        stillPaint = still;
        if (shown) settle(still);
        else showWhenBaked(still);
        return;
      }
      /* the surface's theme, read once per update rather than per frame */
      cfg.theme = resolveTheme();
      if (!shown) {
        stillPaint = frozen ? paint : null;
        showWhenBaked(paint);
      } else if (frozen) {
        stillPaint = paint;
        settle(paint);
      } else {
        stillPaint = null;
        stopWaiting();
        paint();
      }
    },
  );

  /* waiting to be shown: in the queue, its bakes hurried, and shown anyway after a while */
  fx.add(
    () => [shown, near],
    () => {
      if (shown || !near) return;
      waiters.set(me, { ready: () => ready, show });
      showReady();
      hurry(true);
      const t = setTimeout(show, SHOW_WITHIN);
      return () => {
        hurry(false);
        clearTimeout(t);
        stopWatch();
        waiters.delete(me);
        showReady();
      };
    },
  );

  /* plastic bakes its form per type; start that on idle time so the first
     frames do not stand in with the smooth look for long */
  fx.add(
    () => [shading, outlineKey, sizeOf(o), o.depth, furId, o.light, o.backLight, o.lightFront, near, material],
    () => {
      if (!near || !material || !cfg.path) return;
      if (typeof requestIdleCallback === 'function') {
        const id = requestIdleCallback(warm);
        return () => cancelIdleCallback(id);
      }
      const id = setTimeout(warm, 1);
      return () => clearTimeout(id);
    },
  );

  /* the loop: only while visible, animated and not reduced */
  fx.add(
    () => [frozenOf(o), reducedMotion()],
    () => {
      if (frozenOf(o) || reducedMotion()) return;
      let unsub: (() => void) | null = null;
      const tick = (dt: number) => {
        const s = sim;
        if (!s) return;
        if ((o.interactive ?? true) && !o.pose && !Number.isNaN(pointer.x)) {
          const r = canvas.getBoundingClientRect();
          const box = r.width / OVERSCAN || 1;
          const dx = (pointer.x - (r.left + r.width / 2)) / box;
          const dy = (pointer.y - (r.top + r.height / 2 + RISE * box)) / box;
          const d = Math.hypot(dx, dy);
          /* full pull up close, gone by REACH */
          const strength = d < 1 ? 1 : d > REACH ? 0 : 1 - (d - 1) / (REACH - 1);
          s.setPointer(dx / Math.max(1, d), dy / Math.max(1, d), strength);
        } else s.setPointer(0, 0, 0);
        s.update(dt * (o.speed ?? 1));
        /* not drawn while it waits to be shown: the frames go to its bakes */
        if (shown && !holding) paint();
      };
      return whileOnScreen(
        canvas,
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
    if ((o.interactive ?? true) && !frozenOf(o) && !o.pose) sim?.poke();
  };
  canvas.addEventListener('click', poke);

  fx.flush();
  /* a flat avatar is shown from the start: say so, as the baked ones do later */
  if (shown) hooks.onshown?.();

  return {
    update(next) {
      if (sameOptions(o, next)) return;
      o = next;
      derive();
      fx.flush();
    },
    poke,
    destroy() {
      alive = false;
      canvas.removeEventListener('click', poke);
      fx.destroy();
      stopWaiting();
      holding?.();
    },
  };
}

/** What `mountBotAvatar` takes on top of the avatar's own options. */
export interface BotAvatarMountOptions extends BotAvatarOptions {
  /** A class for the canvas. */
  class?: string;
  /** The accessible name. Default: the type and the state, as in "Clover bot, working". */
  label?: string;
}

export interface MountedBotAvatar {
  /** The canvas: lay it out and listen on it like any element. */
  element: HTMLCanvasElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes back to its default. */
  update(options: BotAvatarMountOptions): void;
  poke(): void;
  /** Stop the avatar and take its canvas out of the page. */
  destroy(): void;
}

/**
 * Put a bot avatar inside `parent`, with no framework: the canvas is made
 * here, kept in step with the options, and removed by `destroy`.
 *
 *   const bot = mountBotAvatar(document.querySelector('#agent'), { type: 'cat' });
 *   bot.update({ state: 'working' });
 */
export function mountBotAvatar(parent: Element | ShadowRoot, options: BotAvatarMountOptions = {}): MountedBotAvatar {
  const doc = parent.ownerDocument ?? document;
  const element = doc.createElement('canvas');
  element.setAttribute('role', 'img');

  let o = { ...options };
  let shown = false;
  let style: Style | null = null;
  const render = () => {
    const view = botAvatarView(o, shown);
    applyStyle(element, view.style, style);
    style = view.style;
    element.className = o.class ?? '';
    element.setAttribute('aria-label', o.label ?? view.label);
    element.dataset.botAvatar = view.type;
    element.dataset.face = view.face;
    element.dataset.state = view.state;
  };
  render();
  parent.appendChild(element);
  const handle = attachBotAvatar(element, o, {
    onshown: () => {
      shown = true;
      render();
    },
  });
  return {
    element,
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
