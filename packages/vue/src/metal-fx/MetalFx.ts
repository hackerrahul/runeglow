import { defineComponent } from 'vue';
import { attachMetalFx, metalFxOptionKinds, metalFxView, type MetalFxOptions } from 'runeglow/metal-fx';
import { metalProps, renderFrame, resolveTargets, useMetal, type MetalFxTarget } from './frame.js';

/** The ring's options as Vue takes them: a reflection target may be a template ref. */
export type MetalFxProps = Omit<MetalFxOptions, 'reflectionTargets'> & {
  /**
   * Neighbour elements that should receive a soft proximity reflection of
   * the metal (dark theme only). Each is an element or a template ref to
   * one, or `{ el, strength }` to keep one subtle.
   */
  reflectionTargets?: ReadonlyArray<MetalFxTarget>;
};

/**
 * Wraps the element in its default slot with an animated metallic ring,
 * drawn by a WebGL renderer that every ring on the page shares. `class`,
 * `style`, `@click` and other attributes go on the wrapper element; a
 * template ref gives `element`, the wrapper.
 *
 *   <MetalFx variant="button">
 *     <button class="upgrade-pill">Upgrade to Pro</button>
 *   </MetalFx>
 */
export const MetalFx = defineComponent(
  (props: MetalFxProps, { attrs, slots, expose }) => {
    /* a plain copy of the props, for the core: every one is read, so a change to any is seen */
    const options = (): MetalFxOptions => ({
      ...props,
      innerShadow: props.innerShadow && typeof props.innerShadow === 'object' ? { ...props.innerShadow } : props.innerShadow,
      reflectionTargets: resolveTargets(props.reflectionTargets),
    });
    const { refs, state } = useMetal(options, attachMetalFx);
    expose({ element: refs.root });

    return () => renderFrame(metalFxView({ ...props, reflectionTargets: undefined }, state.value), refs, attrs, slots.default?.());
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'MetalFx', inheritAttrs: false, props: metalProps(metalFxOptionKinds) as never },
);
