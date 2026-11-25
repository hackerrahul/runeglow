import { h, mergeProps, normalizeStyle, onBeforeUnmount, ref, shallowRef, unref, watchEffect, type Ref, type VNode, type VNodeChild } from 'vue';
import { METAL_FX_INITIAL_STATE, type MetalFxHooks, type MetalFxParts, type MetalFxReflectionTarget, type MetalFxState, type MetalFxView } from 'runeglow/metal-fx';
import type { OptionKinds } from 'runeglow/kit';
import { propsFrom } from '../internal/props.js';

/* What MetalFx, MetalText and MetalBadge share: the elements of a ring as
   the core's view describes them, and the engine kept running on them. */

type Maybe<T> = T | null | undefined;
type ElementLike = Maybe<HTMLElement> | { $el: unknown };

/**
 * A reflection target, as Vue hands elements about: the element itself, a
 * template ref to it (or to a component, whose root element is taken), or
 * either as `{ el, strength }` for a surface that should only catch a faint
 * echo of the metal.
 */
export type MetalFxTarget = ElementLike | Ref<ElementLike> | { el: ElementLike | Ref<ElementLike>; strength?: number };

/** The element a template ref came to: itself, or the root of the component it holds. */
export function elementOf(target: unknown): HTMLElement | null {
  const value = unref(target) as Maybe<HTMLElement | { $el?: unknown }>;
  if (!value) return null;
  if ('nodeType' in value) return value;
  return value.$el && typeof value.$el === 'object' && 'nodeType' in value.$el ? (value.$el as HTMLElement) : null;
}

/** The targets as the core takes them: each ref read for the element it holds now. */
export function resolveTargets(targets: ReadonlyArray<MetalFxTarget> | undefined): MetalFxReflectionTarget[] | undefined {
  return targets?.map((t) => {
    const value = unref(t);
    if (value && typeof value === 'object' && !('nodeType' in value) && 'el' in value) return { el: elementOf(value.el), strength: value.strength };
    return elementOf(value);
  });
}

/**
 * A component's props from the core's table, with the three the table
 * cannot say right for Vue: a bare `inner-shadow` has to read as `true`,
 * `mask` is a function and the targets are a list.
 */
export function metalProps<Options>(kinds: OptionKinds<Options>): Record<string, { type: unknown; default: undefined }> {
  const props = propsFrom(kinds);
  if ('innerShadow' in props) props.innerShadow = { type: [Boolean, Object], default: undefined };
  if ('mask' in props) props.mask = { type: Function, default: undefined };
  if ('reflectionTargets' in props) props.reflectionTargets = { type: Array, default: undefined };
  return props;
}

export interface MetalRefs {
  root: Ref<HTMLDivElement | null>;
  canvas: Ref<HTMLCanvasElement | null>;
  glow: Ref<HTMLDivElement | null>;
  rim: Ref<HTMLDivElement | null>;
  content: Ref<HTMLDivElement | null>;
  /**
   * A style for one of the elements, as the same object for as long as it
   * says the same. Vue writes a style out again whenever it is handed a new
   * object; the engine and the bend write on these elements too (the
   * canvas's overscan, the wrapper's fill while it dents), and a render in
   * between must not take that back.
   */
  keep(part: string, style: unknown): unknown;
}

interface Engine<Options> {
  update(options: Options, rim?: HTMLElement | null): void;
  destroy(): void;
}

/**
 * The refs of a ring's elements and what its engine has reported, with the
 * engine attached to those elements for as long as they are rendered.
 * `options` is called in an effect, so whatever it reads is watched: the
 * engine is started once the elements exist, then told whenever a prop or
 * a ref among the targets changes.
 */
export function useMetal<Options>(options: () => Options, attach: (parts: MetalFxParts, options: Options, hooks: MetalFxHooks) => Engine<Options>): { refs: MetalRefs; state: Ref<MetalFxState> } {
  const kept = new Map<string, { text: string; style: unknown }>();
  const refs: MetalRefs = {
    root: ref(null),
    canvas: ref(null),
    glow: ref(null),
    rim: ref(null),
    content: ref(null),
    keep(part, style) {
      const next = normalizeStyle(style);
      const text = JSON.stringify(next);
      const last = kept.get(part);
      if (last && last.text === text) return last.style;
      kept.set(part, { text, style: next });
      return next;
    },
  };
  const state = shallowRef<MetalFxState>(METAL_FX_INITIAL_STATE);
  let engine: Engine<Options> | null = null;
  let on: HTMLCanvasElement | null = null;

  watchEffect(
    () => {
      const next = options();
      const root = refs.root.value, canvas = refs.canvas.value, glow = refs.glow.value, content = refs.content.value, rim = refs.rim.value;
      if (engine && on === canvas) {
        engine.update(next, rim);
        return;
      }
      /* the elements are new, or gone: without WebGL2 only the fallback is rendered */
      engine?.destroy();
      engine = null;
      on = canvas;
      if (root && canvas && glow && content) engine = attach({ root, canvas, glow, content, rim }, next, { onstate: (s) => (state.value = s) });
    },
    { flush: 'post' },
  );
  onBeforeUnmount(() => {
    engine?.destroy();
    engine = null;
  });

  return { refs, state };
}

/**
 * The elements of a ring. `attrs` are the component's fallthrough
 * attributes, for the wrapper: its class and listeners are merged in, and
 * the engine's own values go on top of its style.
 */
export function renderFrame(view: MetalFxView, refs: MetalRefs, attrs: Record<string, unknown>, children: VNodeChild): VNode {
  const { class: className, style, ...others } = attrs;
  const root = mergeProps(others, {
    ...view.root.attrs,
    ref: refs.root,
    class: [view.root.class, className],
    style: refs.keep('root', [view.root.base, style, view.root.style]),
  });
  /* Graceful degradation: the wrapped element with its own styling intact —
     no normalisation, no canvas, no glow. */
  if (!view.supported) return h('div', root, [children]);
  return h('div', root, [
    h('canvas', { ref: refs.canvas, class: view.canvas.class, style: refs.keep('canvas', view.canvas.style) }),
    h('div', { class: view.inner.class, 'aria-hidden': 'true', style: refs.keep('inner', view.inner.style) }),
    h('div', { ref: refs.glow, 'aria-hidden': 'true', style: refs.keep('glow', view.glow.hidden ? { ...view.glow.style, display: 'none' } : view.glow.style) }),
    /* Rim sits above the metal and the glow, below the content. */
    view.rim ? h('div', { ref: refs.rim, 'aria-hidden': 'true', style: refs.keep('rim', view.rim.style) }) : null,
    h('div', { ref: refs.content, class: view.content.class }, [children]),
  ]);
}
