import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode, type RefObject } from 'react';
import { METAL_FX_INITIAL_STATE, type MetalFxHooks, type MetalFxParts, type MetalFxReflectionTarget, type MetalFxState, type MetalFxView } from 'runeglow/metal-fx';
import type { Style } from 'runeglow/kit';

/* What MetalFx, MetalText and MetalBadge share: the elements of a ring as
   the core's view describes them, and the engine kept running on them. */

/** A style record from the core as React writes one. Custom properties (`--mfx-radius`) keep their names. */
export function styleProps(style: Style): CSSProperties {
  const out: Record<string, string> = {};
  for (const key in style) out[key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = style[key];
  return out as CSSProperties;
}

type ElementOrRef = HTMLElement | null | undefined | RefObject<HTMLElement | null | undefined>;

/**
 * A reflection target, as React hands elements about: the element itself
 * or a ref to it, or either with a per-target `strength` (0..1+) for a
 * surface that should only catch a faint echo of the metal.
 */
export type MetalFxTarget = ElementOrRef | { el: ElementOrRef; strength?: number };

const elementOf = (t: ElementOrRef): HTMLElement | null => (!t ? null : 'nodeType' in t ? t : (t.current ?? null));

/** The targets as the core takes them: each ref read for the element it holds now. */
export function resolveTargets(targets: ReadonlyArray<MetalFxTarget> | undefined): MetalFxReflectionTarget[] | undefined {
  return targets?.map((t) => (t && 'el' in t ? { el: elementOf(t.el), strength: t.strength } : elementOf(t)));
}

export interface MetalRefs {
  root: RefObject<HTMLDivElement | null>;
  canvas: RefObject<HTMLCanvasElement | null>;
  glow: RefObject<HTMLDivElement | null>;
  rim: RefObject<HTMLDivElement | null>;
  content: RefObject<HTMLDivElement | null>;
}

interface Engine<Options> {
  update(options: Options, rim?: HTMLElement | null): void;
  destroy(): void;
}

/**
 * The refs of a ring's elements and what its engine has reported, with the
 * engine attached to those elements for as long as they are rendered.
 * `options` is called after a render, when the refs among them are set.
 */
export function useMetal<Options>(options: () => Options, attach: (parts: MetalFxParts, options: Options, hooks: MetalFxHooks) => Engine<Options>): [MetalRefs, MetalFxState] {
  const refs: MetalRefs = {
    root: useRef<HTMLDivElement>(null),
    canvas: useRef<HTMLCanvasElement>(null),
    glow: useRef<HTMLDivElement>(null),
    rim: useRef<HTMLDivElement>(null),
    content: useRef<HTMLDivElement>(null),
  };
  const [state, setState] = useState<MetalFxState>(METAL_FX_INITIAL_STATE);
  const engine = useRef<Engine<Options> | null>(null);
  /* what the core is started with, should the elements be mounted again */
  const latest = useRef({ options, attach });
  latest.current = { options, attach };

  /* the core runs the engine, on the elements below; without WebGL2 only
     the fallback is rendered and there is nothing to run */
  useEffect(() => {
    const root = refs.root.current, canvas = refs.canvas.current, glow = refs.glow.current, content = refs.content.current;
    if (!root || !canvas || !glow || !content) return;
    const handle = latest.current.attach({ root, canvas, glow, content, rim: refs.rim.current }, latest.current.options(), { onstate: setState });
    engine.current = handle;
    return () => {
      handle.destroy();
      engine.current = null;
    };
  }, [state.supported]);
  /* after every render: the core does nothing when the options say what they said */
  useEffect(() => {
    engine.current?.update(options(), refs.rim.current);
  });

  return [refs, state];
}

/** The elements of a ring. `className` and `style` are the caller's, for the wrapper, with its other attributes. */
export function renderFrame(
  view: MetalFxView,
  refs: MetalRefs,
  outer: { className?: string; style?: CSSProperties; attributes?: Record<string, unknown> },
  children: ReactNode,
): ReactElement {
  const root = {
    ...outer.attributes,
    ...view.root.attrs,
    ref: refs.root,
    className: outer.className ? `${view.root.class} ${outer.className}` : view.root.class,
    /* the engine's own values go on top of the caller's style */
    style: { ...styleProps(view.root.base), ...outer.style, ...styleProps(view.root.style) },
  };
  /* Graceful degradation: the wrapped element with its own styling intact —
     no normalisation, no canvas, no glow. */
  if (!view.supported) return createElement('div', root, children);
  return createElement(
    'div',
    root,
    createElement('canvas', { ref: refs.canvas, className: view.canvas.class, style: styleProps(view.canvas.style) }),
    createElement('div', { className: view.inner.class, 'aria-hidden': true, style: styleProps(view.inner.style) }),
    createElement('div', { ref: refs.glow, 'aria-hidden': true, style: { ...styleProps(view.glow.style), display: view.glow.hidden ? 'none' : undefined } }),
    /* Rim sits above the metal and the glow, below the content. */
    view.rim ? createElement('div', { ref: refs.rim, 'aria-hidden': true, style: styleProps(view.rim.style) }) : null,
    createElement('div', { ref: refs.content, className: view.content.class }, children),
  );
}
