import { defineComponent, h, ref } from 'vue';
import { attachMetalText, metalTextOptionKinds, metalTextView, type MetalTextOptions } from 'runeglow/metal-fx';
import { metalProps, renderFrame, resolveTargets, useMetal, type MetalFxTarget } from './frame.js';

/** The text's options as Vue takes them: a reflection target may be a template ref. */
export type MetalTextProps = Omit<MetalTextOptions, 'reflectionTargets'> & {
  /** As on MetalFx: elements or template refs to them, or `{ el, strength }`. */
  reflectionTargets?: ReadonlyArray<MetalFxTarget>;
};

/**
 * Bare metal-filled text: the word is drawn in flowing metal over its own
 * colour, with the live span kept for layout and for readers. A `class`
 * goes on the text span; a template ref gives `element`, the wrapper.
 *
 *   <MetalText text="Pro" font="600 24px/1 Inter, sans-serif" color="#d8d8d8" />
 */
export const MetalText = defineComponent(
  (props: MetalTextProps, { attrs, expose }) => {
    const text = ref<HTMLSpanElement | null>(null);
    const options = (): MetalTextOptions => ({
      ...props,
      innerShadow: props.innerShadow && { ...props.innerShadow },
      reflectionTargets: resolveTargets(props.reflectionTargets),
    });
    /* the core masks the metal to the span's glyphs and draws their inner shadow */
    const { refs, state } = useMetal(options, (parts, o, hooks) => attachMetalText({ ...parts, text: text.value as HTMLSpanElement }, o, hooks));
    expose({ element: refs.root });

    return () => {
      const view = metalTextView({ ...props, reflectionTargets: undefined }, state.value);
      return renderFrame(view.fx, refs, {}, h('span', { ref: text, class: attrs.class, style: view.text.style, 'aria-label': view.text.label }, view.text.text));
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'MetalText', inheritAttrs: false, props: metalProps(metalTextOptionKinds) as never },
);
