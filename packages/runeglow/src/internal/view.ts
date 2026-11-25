/* What a component's element looks like, as plain data, so each framework
   can render it its own way — on a server too, where there is no element
   yet — and the picture is the same in all of them. */

/** Inline CSS as a record: property names as CSS writes them (`margin-left`). */
export type Style = Record<string, string>;

/** A style record as the text of a `style` attribute. */
export function styleText(style: Style): string {
  let out = '';
  for (const key in style) out += `${out ? ' ' : ''}${key}: ${style[key]};`;
  return out;
}

/** Write a style record onto an element, replacing what was there before from `last`. */
export function applyStyle(el: HTMLElement, style: Style, last?: Style | null) {
  if (last) for (const key in last) if (!(key in style)) el.style.removeProperty(key);
  for (const key in style) if (!last || last[key] !== style[key]) el.style.setProperty(key, style[key]);
}

/* A 0–1 seed for an instance that was given none, so two side by side never
   move in step unless asked to. From a counter: nothing of it is rendered,
   so a server and a browser need not agree on it. */
let instances = 0;
export function nextSeed(): number {
  let h = 2166136261;
  const id = `rg${++instances}`;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** `closest`, but carrying on out of a shadow root into the page that hosts it. */
export function closestAcross(el: Element | null, selector: string): Element | null {
  while (el) {
    const hit = el.closest(selector);
    if (hit) return hit;
    const root = el.getRootNode();
    el = root instanceof ShadowRoot ? root.host : null;
  }
  return null;
}

/* asked once and then kept up to date: components read it on every frame */
let reduced: boolean | null = null;
export function reducedMotion(): boolean {
  if (reduced === null) {
    if (typeof matchMedia !== 'function') return false;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    reduced = query.matches;
    query.addEventListener?.('change', (e) => (reduced = e.matches));
  }
  return reduced;
}

/** The pixel ratio a canvas is drawn at: the screen's, up to 2. */
export const pixelRatio = () => Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);

/** An observer that tells once when an element comes near the screen, or at once where there is none. */
export function whenNear(el: Element, margin: number, then: () => void): () => void {
  if (typeof IntersectionObserver !== 'function') {
    then();
    return () => {};
  }
  const seen = (entries: IntersectionObserverEntry[]) => {
    if (entries.some((e) => e.isIntersecting)) then();
  };
  /* Inside an iframe the margin only counts when the document itself is
     named as the root; browsers too old to take a document fall back to the
     plain viewport, where the margin still counts at the top level. */
  let io: IntersectionObserver;
  try {
    io = new IntersectionObserver(seen, { root: el.ownerDocument, rootMargin: `${margin}px` });
  } catch {
    io = new IntersectionObserver(seen, { rootMargin: `${margin}px` });
  }
  io.observe(el);
  return () => io.disconnect();
}

/** Calls `run` while an element is on screen and `stop` while it is not. */
export function whileOnScreen(el: Element, run: () => void, stop: () => void): () => void {
  if (typeof IntersectionObserver !== 'function') {
    run();
    return stop;
  }
  const io = new IntersectionObserver((entries) => {
    if (entries[entries.length - 1]?.isIntersecting ?? true) run();
    else stop();
  });
  io.observe(el);
  return () => {
    io.disconnect();
    stop();
  };
}
