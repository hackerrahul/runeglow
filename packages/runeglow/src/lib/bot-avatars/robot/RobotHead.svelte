<!--
  @component
  RobotHead - a TV-headed robot for an AI agent: a moulded shell with knob
  ears and an antenna, and an LED matrix for a face that shows what the
  agent is doing. Drawn on a 2D canvas.

  The element is a `size` × `size` box with the robot at rest centred in
  it. Its canvas reaches past the box, so hops, the antenna's glow and the
  floor's shadow draw outside it without taking part in layout.

  @example
  ```svelte
  <RobotHead state="thinking" size={160} />
  ```
-->
<script lang="ts" module>
  /* A 0–1 seed from the instance id, so two heads side by side never blink
     in step unless asked to. */
  function hashSeed(id: string): number {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    return ((h >>> 0) % 1000) / 1000;
  }

  /* asked once and then kept up to date: it is read on every frame */
  let reduced: boolean | null = null;
  const reducedMotion = () => {
    if (reduced === null) {
      if (typeof matchMedia !== 'function') return false;
      const query = matchMedia('(prefers-reduced-motion: reduce)');
      reduced = query.matches;
      query.addEventListener?.('change', (e) => (reduced = e.matches));
    }
    return reduced;
  };

  /* how far a pointer is followed from, in CSS px */
  const REACH = 700;
  /* the switching-on of the screen, in seconds: a head frozen before it is
     over shows the state's still frame instead */
  const WARM = 0.6;
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { RobotHeadProps, RobotHeadShape, RobotHeadState } from './types';
  import { robotHeadColorways, robotHeadShapes, robotStateLabels } from './presets';
  import { getShape } from './geometry';
  import { RobotSim, restPose, type RobotPose } from './sim';
  import { RobotRenderer, frameFor, type Palette } from './render';
  import { shellMaterial, trimMaterial } from './light';
  import { parseColor } from '../color';
  import { subscribe, pointer } from '../ticker';

  // The prop is called `state`, as in the React library; it is renamed on
  // the way in because a local of that name would shadow the `$state` rune.
  let {
    shape = 'rectangle',
    state: headState = 'idle',
    size = 160,
    colorway = 'cobalt',
    color,
    trimColor,
    screenColor,
    finish = 'gloss',
    pixels = 'square',
    speed = 1,
    paused = false,
    interactive = true,
    antenna = true,
    floorShadow = true,
    seed,
    pose: heldPose,
    class: className,
    style,
    'aria-label': ariaLabel,
    ref = $bindable(null),
    onclick,
    ...rest
  }: RobotHeadProps = $props();

  const uid = $props.id();

  const stateKey = $derived<RobotHeadState>(headState in robotStateLabels ? headState : 'idle');
  const shapeKey = $derived<RobotHeadShape>(robotHeadShapes.includes(shape) ? shape : 'rectangle');
  const px = $derived(Number.isFinite(size) && size > 0 ? size : 160);
  const seedValue = $derived(Math.min(1, Math.max(0, seed ?? hashSeed(uid))));
  const frozen = $derived(paused || !(speed > 0));

  const ways = $derived(robotHeadColorways[colorway] ?? robotHeadColorways.cobalt);
  const palette = $derived.by<Palette>(() => {
    const fallback = robotHeadColorways.cobalt;
    const pick = (given: string | undefined, own: string, base: string) =>
      (given && parseColor(given)) || parseColor(own) || (parseColor(base) as [number, number, number]);
    return {
      shell: shellMaterial(pick(color, ways.color, fallback.color), finish === 'matte' || finish === 'metal' ? finish : 'gloss'),
      trim: trimMaterial(pick(trimColor, ways.trimColor, fallback.trimColor)),
      led: pick(screenColor, ways.screenColor, fallback.screenColor),
    };
  });

  /* where the head sits in its box, and how far its canvas reaches past it */
  const frame = $derived(frameFor(getShape(shapeKey), antenna, px));

  let box = $state<HTMLSpanElement | null>(null);
  /* nothing is drawn, and so nothing baked, until the head is near the
     screen; then it fades in on its first frame */
  let near = $state(typeof IntersectionObserver !== 'function');
  let shown = $state(false);

  let sim: RobotSim | null = null;
  let renderer: RobotRenderer | null = null;

  const paint = () => {
    const canvas = ref;
    const s = sim;
    if (!canvas || !s) return;
    const f = frame;
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    const w = Math.round((f.box + 2 * f.padSide) * dpr);
    const h = Math.round((f.box + f.padTop + f.padBottom) * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!renderer) renderer = new RobotRenderer();
    /* the live frame while it runs, and when frozen part-way; the state's
       still frame under reduced motion, or frozen before it ever ran */
    const live = !reducedMotion() && (!frozen || (s.age > WARM && s.shown === stateKey));
    const still = restPose(stateKey);
    let p: RobotPose = live ? s.pose : still;
    const held = heldPose;
    if (held) {
      /* turned by hand: no hop, no squash; the antenna keeps its own sway */
      p = { ...still, yaw: held.yaw ?? 0, pitch: held.pitch ?? still.pitch, roll: held.roll ?? still.roll, antennaX: live ? s.pose.antennaX : 0, antennaZ: live ? s.pose.antennaZ : 0 };
    }
    renderer.draw(ctx, f, dpr, p, live ? s : null, stateKey, getShape(shapeKey), palette, { floorShadow, antenna, pixels: pixels === 'round' ? 'round' : 'square' });
    shown = true;
  };

  /* near the screen yet? Checked once: after that the head is kept. */
  $effect(() => {
    const el = box;
    if (!el || near) return;
    const seen = (entries: IntersectionObserverEntry[]) => {
      if (entries.some((e) => e.isIntersecting)) near = true;
    };
    /* Inside an iframe the margin only counts when the document itself is
       named as the root; browsers too old to take a document fall back to
       the plain viewport. */
    let io: IntersectionObserver;
    try {
      io = new IntersectionObserver(seen, { root: el.ownerDocument, rootMargin: '400px' });
    } catch {
      io = new IntersectionObserver(seen, { rootMargin: '400px' });
    }
    io.observe(el);
    return () => io.disconnect();
  });

  /* Runs whenever anything the picture is made from changes: it keeps the
     sim on the state and draws at once, so a change shows on a head that
     has no loop running (paused, or under reduced motion). */
  $effect(() => {
    const s = stateKey;
    if (!sim) sim = new RobotSim(untrack(() => seedValue), s);
    else sim.setState(s);
    shapeKey;
    frame;
    palette;
    pixels;
    antenna;
    floorShadow;
    frozen;
    heldPose?.yaw;
    heldPose?.pitch;
    heldPose?.roll;
    if (!ref || !near) return;
    untrack(paint);
  });

  /* the loop: only while on screen, animated and not reduced */
  $effect(() => {
    if (frozen || !near || reducedMotion()) return;
    const el = box;
    if (!el) return;
    let unsub: (() => void) | null = null;
    const tick = (dt: number) => {
      const s = sim;
      if (!s) return;
      if (interactive && !heldPose && !Number.isNaN(pointer.x)) {
        /* measured from the resting head's centre */
        const r = el.getBoundingClientRect();
        const f = frame;
        const dx = pointer.x - (r.left + r.width / 2);
        const dy = pointer.y - (r.top + f.cy - f.padTop);
        s.pointer = Math.hypot(dx, dy) < REACH ? { x: dx, y: dy } : null;
      } else s.pointer = null;
      s.update(dt * speed);
      paint();
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
        if (entries[entries.length - 1]?.isIntersecting ?? true) run();
        else stop();
      });
      io.observe(el);
    } else run();
    return () => {
      stop();
      if (io) io.disconnect();
    };
  });

  const boxCss = $derived(
    `position: relative; display: inline-block; vertical-align: middle; flex: none; width: ${px}px; height: ${px}px;` +
      `${interactive ? ' cursor: pointer;' : ''}${style ? ` ${style}` : ''}`
  );
  const canvasCss = $derived(
    `position: absolute; left: ${-frame.padSide}px; top: ${-frame.padTop}px; ` +
      `width: ${frame.box + 2 * frame.padSide}px; height: ${frame.box + frame.padTop + frame.padBottom}px; ` +
      `display: block; max-width: none; pointer-events: none; opacity: ${shown ? 1 : 0}; transition: opacity 0.3s ease-out;`
  );

  const onClick = (e: MouseEvent & { currentTarget: EventTarget & HTMLSpanElement }) => {
    if (interactive && !frozen && !heldPose) sim?.poke();
    onclick?.(e);
  };
</script>

<span
  bind:this={box}
  class={['rh', className]}
  data-robot-head={shapeKey}
  data-state={stateKey}
  role="img"
  aria-label={ariaLabel ?? `Robot, ${robotStateLabels[stateKey]}`}
  style={boxCss}
  {...rest}
  onclick={onClick}
>
  <canvas bind:this={ref} aria-hidden="true" style={canvasCss}></canvas>
</span>
