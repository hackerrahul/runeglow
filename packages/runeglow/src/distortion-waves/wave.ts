/* Distortion waves — the component, outside any framework.

   The element is a grid of one cell that both views share, each in a layer
   of its own; an overlay, if there is one, is a third layer over the canvas
   the wave is drawn on. The engine (controller.ts) switches the two layers
   as the wave runs and adds the canvas itself.

   `distortionWaveView` says how the element and its layers start out, as
   plain data, so a server can render them. `attachDistortionWave` runs the
   wave on an element and its layers: given elements the page wrote it lays
   them out too, and a framework adapter, which has rendered them from the
   view, says so. `mountDistortionWave` makes the element and the layers
   round views it is handed. */

import type { OptionKinds } from "../internal/options";
import { applyStyle, type Style } from "../internal/view";
import { WaveController, type PlayOptions, type WaveOptions } from "./controller";

/** What a distortion wave can be told, in any framework. The end of a wave
    is told through a hook, an event or a callback prop, as each framework
    has it. */
export type DistortionWaveOptions = Omit<WaveOptions, "onFinish">;

/** What kind of value each option takes: the adapters read it (see
    internal/options.ts). `source`, `palette` and `capture` also take values
    that no attribute can say: an element, a set of colours, a function. */
export const distortionWaveOptionKinds = {
  revealed: "boolean",
  type: "string",
  source: "object",
  focus: "object",
  waveStyle: "object",
  palette: "string",
  scale: "length",
  cornerRadius: "number",
  scrub: "number",
  capture: "flag",
  live: "flag",
  prewarm: "boolean",
  resolution: "number",
  reducedMotion: "string",
} as const satisfies OptionKinds<DistortionWaveOptions>;

/* ── how the element starts out ───────────────────────────────────────── */

/* The two views share one grid cell. */
const LAYER: Style = { "grid-area": "1 / 1", "min-width": "0", "min-height": "0", isolation: "isolate" };
const LAYER_HIDDEN: Style = { ...LAYER, opacity: "0", "pointer-events": "none" };
/* Over the canvas, which is at 1. It covers the whole element, so it takes
   no clicks itself; the rule below gives them back to what is put in it. */
const OVERLAY: Style = { "grid-area": "1 / 1", "min-width": "0", "min-height": "0", position: "relative", "z-index": "2", "pointer-events": "none" };
const OVERLAY_RULE = ':where([data-dw-layer="overlay"])>*{pointer-events:auto}';
const ROOT: Style = { display: "grid", isolation: "isolate" };

/** One element of a distortion wave: its attributes and its inline style. */
export interface DistortionWavePart {
  attributes: Record<string, string>;
  style: Style;
}

/** What a distortion wave's element and layers look like when they are made. */
export interface DistortionWaveView {
  /** The element itself. */
  root: DistortionWavePart;
  /** The layer round the first view. */
  content: DistortionWavePart;
  /** The layer round the view the wave leaves behind it, where there is one. */
  revealed: DistortionWavePart;
  /** The layer round what stays above the wave, where there is any. `rule`
      is the text of a `<style data-dw-skip>` to put first inside it. */
  overlay: DistortionWavePart & { rule: string };
}

/**
 * The element of a distortion wave and its layers, as they start out:
 * which view shows is read from `options.revealed`, and `two` is whether
 * there is a second view at all.
 *
 * Render it once. From then on the wave itself writes on the two layers
 * (their opacity, whether they take clicks) as it runs, so a renderer must
 * not write their styles again.
 */
export function distortionWaveView(options: DistortionWaveOptions = {}, two = true): DistortionWaveView {
  const startRevealed = !!options.revealed;
  return {
    root: { attributes: { "data-distortion-wave": "" }, style: ROOT },
    content: { attributes: { "data-dw-layer": "content" }, style: two && startRevealed ? LAYER_HIDDEN : LAYER },
    revealed: { attributes: { "data-dw-layer": "revealed" }, style: startRevealed ? LAYER : LAYER_HIDDEN },
    overlay: { attributes: { "data-dw-layer": "overlay", "data-dw-skip": "" }, style: OVERLAY, rule: OVERLAY_RULE },
  };
}

/* ── the live wave ────────────────────────────────────────────────────── */

/** The elements a wave runs on, inside its own. */
export interface DistortionWaveLayers {
  /** The layer round what the wave passes over: the view that shows first. */
  content: HTMLElement;
  /** The layer round the view the wave leaves behind it. Without one the
      wave passes over the first view and leaves it as it was. */
  revealed?: HTMLElement | null;
  /** The layer round what stays above the wave. The wave itself has no use
      for it: it is here to be laid out with the rest. */
  overlay?: HTMLElement | null;
}

export interface DistortionWaveHooks {
  /** Called when a wave ends, with the view now showing. Not called for a
      wave that was turned around before it got there. */
  onFinish?: (revealed: boolean) => void;
  /** Said by a framework adapter that has rendered the element and its
      layers as `distortionWaveView` says. Without it `attachDistortionWave`
      lays them out itself. */
  rendered?: boolean;
}

/** The functions of a distortion wave, the same on a component in any
    framework and on the handles below. */
export interface DistortionWaveHandle {
  /** Runs the wave from the start. */
  play(options?: PlayOptions): void;
  /** Runs it back to the first view. */
  reverse(): void;
  /** Straight back to the first view, with no wave. */
  reset(): void;
  /** Pictures the element now, so the next wave starts with its lens. */
  prepare(): Promise<void>;
  /** The engine behind it, for benches. */
  getController(): WaveController | null;
}

export interface AttachedDistortionWave extends DistortionWaveHandle {
  /** Give the wave new options. Each call replaces the last set whole. */
  update(options: DistortionWaveOptions): void;
  /** The second view's layer, when it comes or goes. */
  setRevealedLayer(revealed: HTMLElement | null): void;
  /** Stop everything and let go of the elements. */
  destroy(): void;
}

/* A new set of options that says what the last one said is no work. The
   wave's numbers and its focus are compared by content, so an object
   written inline does not count as a change every time it is made again. */
function sameOptions(a: DistortionWaveOptions, b: DistortionWaveOptions): boolean {
  for (const k in distortionWaveOptionKinds) {
    const key = k as keyof DistortionWaveOptions;
    if (key === "waveStyle") {
      if ((a.waveStyle ? JSON.stringify(a.waveStyle) : "") !== (b.waveStyle ? JSON.stringify(b.waveStyle) : "")) return false;
    } else if (key === "focus") {
      const fa = a.focus, fb = b.focus;
      if ((fa ? `${fa.x},${fa.y}` : String(fa)) !== (fb ? `${fb.x},${fb.y}` : String(fb))) return false;
    } else if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

/* write one part of the view onto an element the page made; what comes
   back takes it off again */
function dress(el: HTMLElement, part: DistortionWavePart): () => void {
  for (const name in part.attributes) el.setAttribute(name, part.attributes[name]);
  applyStyle(el, part.style);
  return () => {
    for (const name in part.attributes) el.removeAttribute(name);
    for (const key in part.style) el.style.removeProperty(key);
    if (!el.getAttribute("style")) el.removeAttribute("style");
  };
}

/* what the engine writes on a layer as it switches the views (setLayer in
   controller.ts), cleared when a page's own element stops being a layer */
function undress(el: HTMLElement) {
  el.style.opacity = "";
  el.style.pointerEvents = "";
  el.removeAttribute("inert");
  el.removeAttribute("aria-hidden");
}

/**
 * Run a distortion wave on `root`, whose children include the layers: one
 * element round each view, and one round the overlay if there is any.
 *
 *   <div id="card">
 *     <div id="review">…<button>Send</button></div>
 *     <div id="receipt">…</div>
 *   </div>
 *
 *   const card = document.querySelector("#card");
 *   const wave = attachDistortionWave(card, { content: card.children[0], revealed: card.children[1] });
 *   wave.update({ revealed: true });
 *
 * The element is made a grid and the layers are laid over each other in
 * its one cell; `destroy` takes that away again. Give the first view an
 * opaque background, or one behind the whole element.
 */
export function attachDistortionWave(root: HTMLElement, layers: DistortionWaveLayers, options: DistortionWaveOptions = {}, hooks: DistortionWaveHooks = {}): AttachedDistortionWave {
  let o = options;
  let revealed = layers.revealed ?? null;
  const doc = root.ownerDocument;

  /* the layout, where no adapter has rendered it */
  const undo: (() => void)[] = [];
  let undoRevealed: (() => void) | null = null;
  const view = distortionWaveView(o, !!revealed);
  if (!hooks.rendered) {
    undo.push(dress(root, view.root), dress(layers.content, view.content));
    if (revealed) undoRevealed = dress(revealed, view.revealed);
    const overlay = layers.overlay;
    if (overlay) {
      undo.push(dress(overlay, view.overlay));
      const rule = doc.createElement("style");
      rule.setAttribute("data-dw-skip", "");
      rule.textContent = view.overlay.rule;
      overlay.insertBefore(rule, overlay.firstChild);
      undo.push(() => rule.remove());
    }
  }

  let controller: WaveController | null = new WaveController(root, layers.content, revealed);
  /* the hooks are read when a wave ends, so an adapter may change them as it goes */
  const onFinish = (now: boolean) => hooks.onFinish?.(now);
  controller.update({ ...o, onFinish });

  return {
    update(next) {
      if (!controller || sameOptions(o, next)) return;
      o = next;
      controller.update({ ...o, onFinish });
    },
    setRevealedLayer(next) {
      if (!controller || next === revealed) return;
      if (!hooks.rendered) {
        undoRevealed?.();
        if (revealed) undress(revealed);
        /* a view that arrives while the second one is showing arrives shown */
        undoRevealed = next ? dress(next, distortionWaveView({ revealed: controller.debug.progress >= 1 }).revealed) : null;
      }
      revealed = next;
      controller.setRevealedLayer(next);
    },
    play: (options) => controller?.play(options),
    reverse: () => controller?.reverse(),
    reset: () => controller?.reset(),
    prepare: () => controller?.prepare() ?? Promise.resolve(),
    getController: () => controller,
    destroy() {
      controller?.destroy();
      controller = null;
      if (hooks.rendered) return;
      for (const off of undo) off();
      undoRevealed?.();
      undress(layers.content);
      if (revealed) undress(revealed);
    },
  };
}

/** What `mountDistortionWave` takes on top of the wave's own options. */
export interface DistortionWaveMountOptions extends DistortionWaveOptions {
  /** What the wave passes over: the view that shows first, moved into the
      element when it is made. Give it an opaque background, or one behind
      the whole element. */
  content?: Node | null;
  /** The view the wave leaves behind it. Without one the wave passes over
      `content` and leaves it as it was. */
  revealedContent?: Node | null;
  /** What stays above the wave, as it is: the button that starts it, a
      close control. The wave neither bends nor colours it, and it shows
      over both views. Its own children take clicks; the rest of it lets
      them through to the view below. */
  overlay?: Node | null;
  /** A class for the element. */
  class?: string;
  /** Inline styles for the element, after the component's own. Read when
      the element is made. */
  style?: string;
  /** Called when a wave ends, with the view now showing. */
  onFinish?: (revealed: boolean) => void;
}

export interface MountedDistortionWave extends DistortionWaveHandle {
  /** The wave's element: lay it out and style it like any other. */
  element: HTMLDivElement;
  /** Change some options, keeping the rest. A key set to `undefined` goes
      back to its default. The views are the ones given when it was made. */
  update(options: DistortionWaveMountOptions): void;
  /** Stop the wave and take its element, with the views in it, out of the page. */
  destroy(): void;
}

/**
 * Put a distortion wave inside `parent`, with no framework: the element
 * and its layers are made here, round the views it is handed, kept in step
 * with the options, and removed by `destroy`.
 *
 *   const wave = mountDistortionWave(document.querySelector("#slot"), { content: review, revealedContent: receipt });
 *   send.addEventListener("click", () => wave.update({ revealed: true }));
 */
export function mountDistortionWave(parent: Element | ShadowRoot, options: DistortionWaveMountOptions = {}): MountedDistortionWave {
  const doc = parent.ownerDocument ?? document;
  let o = { ...options };
  const element = doc.createElement("div");
  if (o.class) element.className = o.class;
  const layer = (inside: Node | null | undefined) => {
    if (!inside) return null;
    const el = doc.createElement("div");
    el.appendChild(inside);
    element.appendChild(el);
    return el;
  };
  const content = layer(o.content ?? doc.createDocumentFragment()) as HTMLDivElement;
  const revealed = layer(o.revealedContent);
  const overlay = layer(o.overlay);
  /* in the page before the wave starts: the engine reads its place there */
  parent.appendChild(element);
  const wave = attachDistortionWave(element, { content, revealed, overlay }, o, { onFinish: (now) => o.onFinish?.(now) });
  /* after the component's own, so that it can override them */
  if (o.style) element.style.cssText += o.style;
  return {
    element,
    update(next) {
      o = { ...o, ...next };
      element.className = o.class ?? "";
      wave.update(o);
    },
    play: wave.play,
    reverse: wave.reverse,
    reset: wave.reset,
    prepare: wave.prepare,
    getController: wave.getController,
    destroy() {
      wave.destroy();
      element.remove();
    },
  };
}
