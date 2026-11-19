<!--
  @component
  BotAvatar - an animated face for an AI agent, drawn on a canvas.

  @example
  ```svelte
  <BotAvatar type="clover" state="working" />
  ```
-->
<script lang="ts" module>
  import { bakesPending } from './plastic';

  /* A 0–1 seed from the instance id, so two avatars side by side never blink
     in step unless asked to. */
  function hashSeed(id: string): number {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    return ((h >>> 0) % 1000) / 1000;
  }

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 1));

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

  const reducedMotion = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { BotAvatarProps, BotAvatarShading, BotAvatarState } from './types';
  import { botAvatarPresets, stateLabels } from './presets';
  import { SHAPE_PATHS, SHAPE_PARTS } from './shapes';
  import { autoInk, richer, shade } from './color';
  import { Sim, restPose } from './engine';
  import { draw, LIGHT_DEFAULTS, OVERSCAN, RISE, type DrawConfig } from './draw';
  import { hurry, onLanded, stockLights, takeMissed, warmPlastic, type FurStyle } from './plastic';
  import { subscribe, pointer } from './ticker';

  // The prop is called `state`, as in the React library; it is renamed on
  // the way in because a local of that name would shadow the `$state` rune.
  let {
    type = 'clover',
    path,
    face,
    state: botState = 'default',
    size = 64,
    color,
    ink,
    brightness: brightnessProp,
    saturation: saturationProp,
    speed = 1,
    paused = false,
    seed,
    shading = 'fabric',
    hat = 'none',
    glasses = 'none',
    headphones = false,
    bowTie = false,
    accessoryColor = '#27272b',
    shadow,
    highlight,
    depth = 0.65,
    roundness = 1,
    furLength = 1,
    furDensity = 1.6,
    furFuzz = 0.9,
    furClumps = 0.4,
    furCurl = 0.7,
    furGravity = 0.9,
    light,
    rim,
    spread,
    backLight,
    lightFront,
    shine,
    sheen,
    backSoftness,
    pose: heldPose,
    interactive = true,
    turn = 1,
    theme = 'auto',
    whirl = 0,
    whirlSize = 1,
    whirlWidth = 1,
    whirlLength = 1,
    whirlTilt = 1,
    jumpHeight = 26,
    jumpTime = 0.68,
    jumpStretch = 1,
    jumpSpin = 1,
    jumpLean = 6,
    jumpEvery = 8,
    jumpLand = 0,
    jumpSquash = 1.15,
    jumpSquashTime = 0.37,
    jumpSquashEase = 'pulse',
    jumpGroundTime = 0.11,
    jumpGroundEase = 'pulse',
    jumpRiseTime = 0.33,
    jumpRiseEase = 'pulse',
    jumpClickSquashTime = 0.24,
    class: className,
    style,
    'aria-label': ariaLabel,
    ref = $bindable(null),
    onclick,
    ...rest
  }: BotAvatarProps = $props();

  const uid = $props.id();

  const preset = $derived(botAvatarPresets[type] ?? botAvatarPresets.clover);
  const faceKind = $derived(face ?? preset.face);
  /* the type's own brightness and saturation where the props leave them out */
  const brightness = $derived(brightnessProp ?? preset.brightness ?? 1);
  const saturation = $derived(saturationProp ?? preset.saturation ?? 1.5);
  /* past 1.5 the colour itself is as saturated as it goes for most of the
     palette: the rest deepens it and makes the light keep more of it */
  const vivid = $derived(clamp(saturation, 1.5, 2.5) - 1.5);
  const body = $derived.by(() => {
    const picked = color ?? preset.color;
    return richer(
      brightness === 1 && saturation === 1
        ? picked
        : shade(picked, (Math.min(2, Math.max(0, brightness)) - 1) * 0.35, (Math.min(1.5, Math.max(0, saturation)) - 1) * 0.5),
      vivid
    );
  });
  const inkColor = $derived(ink ?? autoInk(body));
  const seedValue = $derived(Math.min(1, Math.max(0, seed ?? hashSeed(uid))));
  const stateKey = $derived<BotAvatarState>(botState in stateLabels ? botState : 'default');
  const frozen = $derived(paused || !(speed > 0));
  const shadingMode = $derived<BotAvatarShading>(
    shading === true ? 'crisp' : shading === false ? 'flat' : shading
  );
  /* A custom outline replaces the type's (and its thin parts); the material
     caches are keyed by the outline itself, so two avatars with the same
     path share one bake and a changed path never reuses the old one. */
  const customPath = $derived(typeof path === 'string' && path.trim() ? path.trim() : null);
  const outlineKey = $derived(customPath ? `path:${hashSeed(customPath)}:${customPath.length}` : type);
  /* the light a material looks its best in, where a prop leaves it */
  const lit = $derived(LIGHT_DEFAULTS[shadingMode === 'fabric' ? 'fabric' : 'other']);
  /* the pile's style, rounded so a slider does not bake a pile per pixel */
  const q = (v: number, lo: number, hi: number) => Math.round(clamp(v, lo, hi) * 20) / 20;
  const fur = $derived<FurStyle>({
    length: q(furLength, 0.3, 2.5),
    density: q(furDensity, 0.3, 2),
    fuzz: q(furFuzz, 0, 1),
    clumps: q(furClumps, 0, 1),
    curl: q(furCurl, 0, 1),
    gravity: q(furGravity, 0, 1),
  });
  const furId = $derived(`${fur.length},${fur.density},${fur.fuzz},${fur.clumps},${fur.curl},${fur.gravity}`);

  /* the sim lives across updates; everything else reaches the draw through
     the config below, rebuilt whenever a prop it reads changes */
  let sim: Sim | null = null;
  let cssSize = 0;

  const cfg = $derived.by<DrawConfig>(() => ({
    path: typeof Path2D === 'undefined' ? (null as unknown as Path2D) : bodyPath(customPath ?? SHAPE_PATHS[type] ?? SHAPE_PATHS.clover),
    face: faceKind === 'none' ? 'eyes' : faceKind,
    faceless: faceKind === 'none',
    faceX: preset.faceX,
    faceY: preset.faceY,
    faceScale: preset.faceScale,
    color: body,
    ink: inkColor,
    shading: shadingMode,
    shadow: clamp(shadow ?? lit.shadow, 0, 2),
    highlight: clamp(highlight ?? lit.highlight, 0, 2),
    depth: clamp(depth, 0.2, 2),
    roundness: clamp(roundness, 0, 1),
    fur: fur,
    vivid,
    backLight,
    lightFront,
    shine,
    sheen,
    backSoftness,
    light: light ?? lit.light,
    rim: clamp(rim ?? lit.rim, 0, 2),
    spread: clamp(spread ?? lit.spread, 0.4, 2.5),
    typeKey: outlineKey,
    still: frozen || reducedMotion(),
    furOnIdle: true,
    whirl: { strength: clamp(whirl, 0, 2), size: clamp(whirlSize, 0.6, 1.6), width: clamp(whirlWidth, 0.4, 2), length: clamp(whirlLength, 0.4, 1.6), tilt: clamp(whirlTilt, 0.5, 1.8) },
    parts: typeof Path2D !== 'undefined' && !customPath && SHAPE_PARTS[type] ? partPaths(SHAPE_PARTS[type] as string) : undefined,
    wear: { hat, glasses, headphones, bowTie, color: accessoryColor, fabric: shadingMode === 'fabric' },
  }));

  /* the surface: an ancestor's say, else the system's */
  const resolveTheme = (el: HTMLElement | null): 'dark' | 'light' => {
    if (theme !== 'auto') return theme;
    const host = el?.closest('[data-theme], .dark, .light') as HTMLElement | null;
    if (host) {
      const v = host.getAttribute('data-theme');
      if (v === 'dark' || v === 'light') return v;
      if (host.classList.contains('dark')) return 'dark';
      if (host.classList.contains('light')) return 'light';
    }
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  /* paint the current pose, sizing the backing store to the element */
  const paint = () => {
    const canvas = ref;
    const c = cfg;
    if (!canvas || !c || !c.path) return;
    /* a hidden ancestor measures 0: keep the last size rather than
       wiping the backing store */
    const px = canvas.clientWidth / OVERSCAN || cssSize || (typeof size === 'number' ? size : 64);
    if (!px) return;
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
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
    const held = heldPose;
    const rest0 = restPose(stateKey);
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
        if (ref && p) settle(p);
        else stopWaiting();
      });
  };

  /* An avatar in a baked material is not shown until it can be drawn in
     it: no flat stand-in first and the fur a few seconds later. It waits
     with its bakes hurried (see plastic.ts), drawn again as each lands,
     and comes in once it needs no stand-in, or after SHOW_WITHIN at most. */
  const material = $derived(shadingMode === 'plastic' || shadingMode === 'fabric');
  let shown = $state(untrack(() => !material));
  /* A Runeglow addition: a baked material is not made until its avatar is
     on screen or close to it. A long page of avatars otherwise bakes every
     one at load, and the ones in view queue behind the ones far below. */
  let near = $state(typeof IntersectionObserver !== 'function');
  $effect(() => {
    const canvas = ref;
    if (!canvas || near) return;
    const seen = (entries: IntersectionObserverEntry[]) => {
      if (entries.some((e) => e.isIntersecting)) near = true;
    };
    /* Inside an iframe the margin only counts when the document itself is
       named as the root; browsers too old to take a document fall back to
       the plain viewport, where the margin still counts at the top level. */
    let io: IntersectionObserver;
    try {
      io = new IntersectionObserver(seen, { root: canvas.ownerDocument, rootMargin: '600px' });
    } catch {
      io = new IntersectionObserver(seen, { rootMargin: '600px' });
    }
    io.observe(canvas);
    return () => io.disconnect();
  });
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
        if (ref && p && !shown) showWhenBaked(p);
        else stopWatch();
        showReady();
      });
  };

  /* the material's bakes, queued now */
  const warm = () => {
    const c = cfg;
    if (!material || !c?.path) return;
    const dev = (typeof size === 'number' ? size : 64) * Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    const lightAt = c.light ?? 295;
    const a = (lightAt * Math.PI) / 180, b = ((backLight ?? 0) * Math.PI) / 180;
    const lights = stockLights(Math.sin(a), -Math.cos(a));
    if (backLight !== undefined) [lights.bx, lights.by] = [Math.sin(b), -Math.cos(b)];
    if (lightFront !== undefined) lights.front = (Math.min(85, Math.max(0, lightFront)) * Math.PI) / 180;
    warmPlastic(outlineKey, c.path, dev, depth, shadingMode === 'fabric', fur, lightAt, lights);
  };

  /* Shown, a new shape, material or size keeps the picture it has until
     the new one is made (its bakes hurried), rather than standing in with
     the flat look meanwhile. The pile's style and light are not held: a
     slider dragged through them draws as it goes. */
  let redrawTick = $state(0);
  const lookKey = $derived(`${shadingMode}|${outlineKey}|${size}`);
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

  onDestroy(() => {
    stopWaiting();
    holding?.();
  });

  /* The React component did this after every render. Here it runs whenever
     anything it reads changes: the config (so every prop that shapes the
     picture), the state, the jump, and the two switches that ask for a
     fresh paint, `shown` and `redrawTick`. */
  $effect(() => {
    const canvas = ref;
    const c = cfg;
    const isShown = shown;
    const isNear = near;
    redrawTick;
    heldPose;
    theme;
    if (!sim) sim = new Sim(untrack(() => seedValue), stateKey);
    else sim.setState(stateKey);
    sim.setTurn(clamp(turn, 0, 2));
    if (isShown && material && lastLook !== null && lastLook !== lookKey && !holding) untrack(hold);
    lastLook = lookKey;
    sim.setJump({ height: jumpHeight, time: Math.max(0.2, jumpTime), stretch: jumpStretch, spin: Math.max(0, Math.round(jumpSpin)), lean: jumpLean, every: jumpEvery, land: jumpLand, squash: jumpSquash, squashTime: Math.max(0.05, jumpSquashTime), squashEase: jumpSquashEase, groundTime: Math.max(0, jumpGroundTime), groundEase: jumpGroundEase, riseTime: Math.max(0.05, jumpRiseTime), riseEase: jumpRiseEase, clickSquashTime: Math.max(0.05, jumpClickSquashTime) });
    if (holding) return;
    /* not yet near the screen and not yet shown: nothing to draw or bake */
    if (!isShown && !isNear) return;
    const isFrozen = frozen;
    untrack(() => {
      if (reducedMotion()) {
        /* the still pose of the state, no loop */
        const still = () => {
          const el = ref;
          const cur = cfg;
          if (!el || !cur || !cur.path) return;
          const px = el.clientWidth / OVERSCAN || cssSize || (typeof size === 'number' ? size : 64);
          if (!px) return;
          cssSize = px;
          const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
          el.width = el.height = Math.round(px * OVERSCAN * dpr);
          const ctx = el.getContext('2d');
          if (ctx) {
            cur.theme = resolveTheme(el);
            cur.dpr = dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            draw(ctx, px, restPose(stateKey), cur);
          }
        };
        stillPaint = still;
        if (isShown) settle(still);
        else showWhenBaked(still);
        return;
      }
      /* the surface's theme, read once per update rather than per frame */
      if (c && canvas) c.theme = resolveTheme(canvas);
      if (!isShown) {
        stillPaint = isFrozen ? paint : null;
        showWhenBaked(paint);
      } else if (isFrozen) {
        stillPaint = paint;
        settle(paint);
      } else {
        stillPaint = null;
        stopWaiting();
        paint();
      }
    });
  });

  $effect(() => {
    if (shown || !near) return;
    waiters.set(me, { ready: () => ready, show: () => (shown = true) });
    showReady();
    hurry(true);
    const t = setTimeout(() => (shown = true), SHOW_WITHIN);
    return () => {
      hurry(false);
      clearTimeout(t);
      stopWatch();
      waiters.delete(me);
      showReady();
    };
  });

  /* plastic bakes its form per type; start that on idle time at mount so
     the first frames do not stand in with the smooth look for long */
  $effect(() => {
    shadingMode;
    outlineKey;
    size;
    depth;
    furId;
    light;
    backLight;
    lightFront;
    if (!near || !material || !untrack(() => cfg).path) return;
    const ric = (typeof requestIdleCallback === 'function' ? requestIdleCallback : (fn: () => void) => setTimeout(fn, 1)) as (fn: () => void) => number;
    const id = ric(warm);
    return () => {
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id);
      else clearTimeout(id);
    };
  });

  /* the loop: only while visible, animated and not reduced */
  $effect(() => {
    if (frozen || reducedMotion()) return;
    const canvas = ref;
    if (!canvas) return;
    let onScreen = true;
    let unsub: (() => void) | null = null;
    /* how far the pointer's pull reaches, in head widths */
    const REACH = 3;
    const tick = (dt: number) => {
      const s = sim;
      if (!s) return;
      if (interactive && !heldPose && !Number.isNaN(pointer.x)) {
        const r = canvas.getBoundingClientRect();
        const box = r.width / OVERSCAN || 1;
        const dx = (pointer.x - (r.left + r.width / 2)) / box;
        const dy = (pointer.y - (r.top + r.height / 2 + RISE * box)) / box;
        const d = Math.hypot(dx, dy);
        /* full pull up close, gone by REACH */
        const strength = d < 1 ? 1 : d > REACH ? 0 : 1 - (d - 1) / (REACH - 1);
        s.setPointer(dx / Math.max(1, d), dy / Math.max(1, d), strength);
      } else s.setPointer(0, 0, 0);
      s.update(dt * speed);
      /* not drawn while it waits to be shown: the frames go to its bakes */
      if (shown && !holding) paint();
    };
    const run = () => {
      if (!unsub) unsub = subscribe(tick);
    };
    const stop = () => {
      if (unsub) unsub();
      unsub = null;
    };
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver((entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
        if (onScreen) run();
        else stop();
      });
      io.observe(canvas);
    } else run();
    return () => {
      stop();
      if (io) io.disconnect();
    };
  });

  /* The canvas overscans its box (see draw.ts) and pulls itself back in
     with negative margins, so it lays out at `size` and still has room
     to hop and flip. */
  const css = $derived.by(() => {
    const dim = typeof size === 'number' ? `${size * OVERSCAN}px` : `calc(${size} * ${OVERSCAN})`;
    const pull = (k: number) => (typeof size === 'number' ? `${-size * k}px` : `calc(${size} * ${-k})`);
    const side = (OVERSCAN - 1) / 2;
    return (
      `display: inline-block; vertical-align: middle; width: ${dim}; height: ${dim}; ` +
      `margin-left: ${pull(side)}; margin-right: ${pull(side)}; margin-top: ${pull(side + RISE)}; margin-bottom: ${pull(side - RISE)}; ` +
      `flex: none; opacity: ${shown ? 1 : 0}; transition: opacity 0.3s ease-out;${style ? ` ${style}` : ''}`
    );
  });

  const onClick = (e: MouseEvent & { currentTarget: EventTarget & HTMLCanvasElement }) => {
    if (interactive && !frozen && !heldPose) sim?.poke();
    onclick?.(e);
  };
</script>

<canvas
  bind:this={ref}
  class={['ba', className]}
  data-bot-avatar={type}
  data-face={faceKind}
  data-state={stateKey}
  role="img"
  aria-label={ariaLabel ?? `${preset.label} bot, ${stateLabels[stateKey]}`}
  style={css}
  {...rest}
  onclick={onClick}
></canvas>
