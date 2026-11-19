<!--
  @component
  The VoiceOrb component. Each instance runs its own rAF loop (capped near
  60 fps), paused while offscreen or on a hidden tab. Every frame the
  follower reads the voice source (a stream, an AnalyserNode or a level),
  shapes and smooths it, and the type's geometry is painted with the shared
  depth-shaded painter. Sources are read when the loop asks for them, so a
  new level getter or sensitivity never restarts the loop or resets the
  envelope.

  @example
  ```svelte
  <VoiceOrb type="aura" size={240} state="listening" stream={mic.stream} />
  ```
-->
<script lang="ts" module>
  import type { OrbTint } from './engine/paint';

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

  const LABELS: Record<string, string> = {
    idle: 'Waiting',
    listening: 'Listening',
    speaking: 'Speaking',
    processing: 'Thinking'
  };

  // The hover bend's strength when it is simply on.
  const HOVER_BEND = 0.55;

  // 120 Hz displays would double the paint work for no visible gain.
  const FRAME_MS = 1000 / 62;
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { watchReducedMotion, watchResolvedDark } from '../thinking-orbs/theme';
  import { acquireAnalyser } from './audio';
  import { ACCENT_COLORS, EMOTION_COLORS, GlowFollower } from './emotion';
  import { bendFrame, bendRadius, bendReach } from './engine/bend';
  import { EdgeBounce, LEAN_DEFAULTS, leanFrame, leanReach } from './engine/lean';
  import { paintFrame, type OrbGlow } from './engine/paint';
  import type { VoiceInput } from './engine/types';
  import { PRESETS, resolvePreset } from './presets';
  import type { VoiceOrbProps } from './types';
  import { VoiceFollower } from './voice';

  // The prop is called `state`, as in the React library; it is renamed on
  // the way in because a local of that name would shadow the `$state` rune.
  let {
    type = 'orbit',
    state: orbState = 'listening',
    size = 160,
    stream = null,
    analyser = null,
    level,
    sensitivity = 0.85,
    threshold = 0.04,
    attack: attackProp,
    release = 0.32,
    idle = 0.1,
    calm = 0.4,
    voiceSpeed: voiceSpeedProp,
    emotion = null,
    emotionColors,
    saturation = 2,
    accent = null,
    gradientAngle = 99,
    gradientSpin = 12,
    neutral = 1,
    colorBrightness = 1.02,
    colorHue = 0,
    gradientStart = 0.1,
    gradientWidth = 0.6,
    direction,
    directionMove,
    directionPull,
    directionDeform,
    directionSquash,
    directionLens,
    directionStretch,
    directionSplit,
    directionBlur,
    directionBounce,
    directionMargin: marginProp,
    directionBounds = null,
    hoverBend = false,
    theme = 'auto',
    speed = 1,
    paused = false,
    color,
    dots = 1,
    dotSize: dotSizeProp,
    opts: optsOverride,
    frame: customFrame,
    onLevel,
    style,
    'aria-label': ariaLabel,
    ref = $bindable(null),
    ...rest
  }: VoiceOrbProps = $props();

  let dark = $state(true);
  let reduced = $state(false);

  $effect(() => watchResolvedDark(theme, ref, (v) => (dark = v)));
  $effect(() => watchReducedMotion((v) => (reduced = v)));

  // Compared by content, so an inline options literal does not restart the
  // loop every time the parent re-renders.
  const optsKey = $derived(optsOverride ? JSON.stringify(optsOverride) : '');
  // processing moves on its own, so it needs the loop even with no source
  const hasSource = $derived(Boolean(stream || analyser || level != null || orbState === 'processing'));

  // The followers outlive every prop change, so the envelope never drops to
  // silence mid-sentence when a prop moves.
  const follower = new VoiceFollower();
  const glower = new GlowFollower();

  const preset = $derived(PRESETS[type in PRESETS ? type : 'orbit']);
  const emotionTint = $derived(emotion ? (emotionColors?.[emotion] ?? EMOTION_COLORS[emotion]) : null);

  // Live inputs, read by the loop every frame.
  // saturation past 1 is vividness: the colour itself purer and deeper
  const colors = $derived({
    saturation: Math.min(1, saturation),
    vivid: Math.max(0, Math.min(1, saturation - 1)),
    brightness: colorBrightness,
    hue: colorHue,
    start: gradientStart,
    width: gradientWidth,
    accent: accent ? ACCENT_COLORS[accent] : null,
    angle: gradientAngle,
    spin: gradientSpin,
    neutral,
    size
  });
  const dotSize = $derived(dotSizeProp ?? preset.dotSize ?? 1);
  // how far short of the screen's edge the lean stops: the prop, else the type's own
  const directionMargin = $derived(marginProp ?? preset.margin ?? 32);
  const attack = $derived(attackProp ?? preset.attack ?? 0.06);
  const voiceSpeed = $derived(voiceSpeedProp ?? preset.voiceSpeed ?? 1);
  const bendStrength = $derived(
    hoverBend === true ? HOVER_BEND : typeof hoverBend === 'number' ? Math.max(0, Math.min(1, hoverBend)) : 0
  );
  // each amount: the prop, else the type's own, else the shared default
  const lean = $derived.by(() => {
    const own = preset.lean ?? {};
    return {
      move: directionMove ?? own.move ?? LEAN_DEFAULTS.move,
      pull: directionPull ?? own.pull ?? LEAN_DEFAULTS.pull,
      deform: directionDeform ?? own.deform ?? LEAN_DEFAULTS.deform,
      squash: directionSquash ?? own.squash ?? LEAN_DEFAULTS.squash,
      lens: directionLens ?? own.lens ?? LEAN_DEFAULTS.lens,
      stretch: directionStretch ?? own.stretch ?? LEAN_DEFAULTS.stretch,
      split: directionSplit ?? own.split ?? LEAN_DEFAULTS.split,
      blur: directionBlur ?? own.blur ?? LEAN_DEFAULTS.blur,
      bounce: directionBounce ?? own.bounce ?? LEAN_DEFAULTS.bounce
    };
  });

  // The canvas reaches past the orb's box by as far as the lean can carry
  // it — but no further than the edge of the screen, where the lean stops —
  // so a leaning orb is never cut off and never overflows; negative margins
  // keep the layout at `size`. No direction, no lean, no reach.
  const reach = $derived(direction == null ? 0 : leanReach(lean, size));
  let room = $state.raw<[number, number]>([Infinity, Infinity]);
  // the lean's bounds: up to the margin short of the screen's edge…
  const left = $derived(Math.min(reach, room[0]));
  const right = $derived(Math.min(reach, room[1]));
  // …but the canvas reaches on into the margin, so a glow or a squashed
  // side fades out there instead of being cut at the bound
  const padL = $derived(reach ? left + directionMargin : 0);
  const padR = $derived(reach ? right + directionMargin : 0);

  // Where the pointer is, for the hover bend, in the orb's own CSS px:
  // desktop only (a fine pointer that hovers), never with reduced motion.
  const pointer = { x: 0, y: 0, over: false };
  const bendOn = $derived(bendStrength > 0 && !reduced);
  $effect(() => {
    const canvas = ref;
    if (!bendOn || !canvas || typeof matchMedia !== 'function') return;
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const full = size + padL + padR;
    const pad = padL;
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
  });

  // A stream gets its own analyser, released when the stream goes.
  let ownAnalyser: AnalyserNode | null = null;
  $effect(() => {
    const source = stream;
    if (!source) return;
    const lease = acquireAnalyser(source);
    ownAnalyser = lease?.analyser ?? null;
    return () => {
      ownAnalyser = null;
      lease?.release();
    };
  });

  // What the loop is built from. Reading these here, and nothing else, is
  // what decides when the loop restarts: everything it reads every frame
  // (the level, the state, the lean amounts, the colours) is read live and
  // left out, so moving one of those never tears the loop down.
  const still = $derived(paused || reduced);
  // The emotion and the colours join in only while the orb is still, so a
  // still frame repaints with them.
  const stillKey = $derived(
    still
      ? `${emotion}|${saturation}|${accent}|${gradientAngle}|${gradientSpin}|${neutral}|${colorBrightness}|${colorHue}|${gradientStart}|${gradientWidth}`
      : ''
  );

  $effect(() => {
    const canvas = ref;
    if (!canvas) return;
    const cfg = {
      type,
      size,
      reach,
      left,
      right,
      padL,
      padR,
      margin: directionMargin,
      dark,
      speed,
      paused,
      reduced,
      hasSource,
      tint: parseTint(color),
      dots,
      dotSize,
      frame: customFrame
    };
    optsKey;
    stillKey;
    return untrack(() => run(canvas, cfg, optsOverride));
  });

  interface LoopConfig {
    type: NonNullable<VoiceOrbProps['type']>;
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
    frame: VoiceOrbProps['frame'];
  }

  function run(canvas: HTMLCanvasElement, cfg: LoopConfig, override: VoiceOrbProps['opts']): (() => void) | void {
    const { size, reach, left, right, padL, padR, paused, reduced, dark } = cfg;
    const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
    canvas.width = Math.round((size + padL + padR) * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolved = resolvePreset(cfg.type, size, cfg.dots, cfg.dotSize);
    // raw overrides land last, over everything the preset and multipliers set
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
      ctx.setTransform(dpr, 0, 0, dpr, padL * dpr, 0);
      ctx.clearRect(-padL, 0, size + padL + padR, size);
      // lean toward where the voice comes from, after the geometry
      const hit = paused || reduced ? 0 : bounce.step(press, dt);
      let frame = leanFrame(frameFn(size, follower.t, voice, opts), voice.pan, size, lean, [left, right], hit);
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
      const box = canvas.getBoundingClientRect().left + padL;
      // the screen's edges, or the bounding element's
      const within = directionBounds?.getBoundingClientRect();
      const lo = within ? within.left : 0;
      const hi = within ? within.right : document.documentElement.clientWidth;
      // the lean stops short of those edges by the margin
      const next: [number, number] = [
        Math.max(0, Math.floor(box - lo - cfg.margin)),
        Math.max(0, Math.floor(hi - box - size - cfg.margin))
      ];
      const was = room;
      if (Math.abs(was[0] - next[0]) > 1 || Math.abs(was[1] - next[1]) > 1) room = next;
    };

    let lastStep = 0;
    const step = (now: number) => {
      measure(now);
      const dt = lastStep ? Math.min(0.05, (now - lastStep) / 1000) : 1 / 60;
      lastStep = now;
      // waiting and processing do not listen, whatever is attached
      const hears = orbState === 'listening' || orbState === 'speaking';
      const node = ownAnalyser ?? analyser ?? null;
      if (!hears) follower.readSilence();
      else if (node) follower.readAnalyser(node, sensitivity * resolved.gain, dt);
      else if (level != null) {
        follower.readLevel(typeof level === 'function' ? level() : level, sensitivity * resolved.gain);
      } else follower.readSilence();
      const voice = follower.step(
        dt,
        {
          sensitivity,
          threshold,
          attack,
          release,
          idle,
          driveGain: resolved.driveGain * voiceSpeed,
          calm,
          rate: resolved.speed * cfg.speed,
          processing: orbState === 'processing',
          direction: typeof direction === 'function' ? direction() : (direction ?? 0)
        },
        reduced
      );
      onLevel?.(voice.level);
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
</script>

<canvas
  bind:this={ref}
  role="img"
  aria-label={ariaLabel ?? LABELS[orbState]}
  style="width: {size + padL + padR}px; height: {size}px; display: block; margin-left: {-padL}px; margin-right: {-padR}px;{style
    ? ` ${style}`
    : ''}"
  {...rest}
></canvas>
