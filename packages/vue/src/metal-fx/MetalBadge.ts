import { defineComponent, h } from 'vue';
import { attachMetalBadge, metalBadgeOptionKinds, metalBadgeView, type MetalBadgeOptions } from 'runeglow/metal-fx';
import { metalProps, renderFrame, resolveTargets, useMetal, type MetalFxTarget } from './frame.js';

/** The badge's options as Vue takes them: a reflection target may be a template ref. */
export type MetalBadgeProps = Omit<MetalBadgeOptions, 'reflectionTargets'> & {
  /** As on MetalFx: elements or template refs to them, or `{ el, strength }`. */
  reflectionTargets?: ReadonlyArray<MetalFxTarget>;
};

/**
 * The "New" badge: a white pill with a metal rim and a clean core under the
 * label. A template ref gives `element`, the wrapper.
 *
 *   <MetalBadge text="New" />
 */
export const MetalBadge = defineComponent(
  (props: MetalBadgeProps, { expose }) => {
    const options = (): MetalBadgeOptions => ({
      ...props,
      core: props.core && { ...props.core },
      reflectionTargets: resolveTargets(props.reflectionTargets),
    });
    /* the core runs the ring; the badge's own layers below are still */
    const { refs, state } = useMetal(options, attachMetalBadge);
    expose({ element: refs.root });

    return () => {
      const view = metalBadgeView({ ...props, reflectionTargets: undefined }, state.value);
      return renderFrame(
        view.fx,
        refs,
        {},
        /* Inline layout only — no utility classes, so the badge renders the
           same with or without a CSS framework on the host page. */
        h('div', { style: view.box }, [
          h('div', { 'aria-hidden': 'true', style: view.core }),
          h('div', { 'aria-hidden': 'true', style: view.wash }),
          h('span', { style: view.label.style, 'aria-label': view.label.label }, view.label.text),
        ]),
      );
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'MetalBadge', inheritAttrs: false, props: metalProps(metalBadgeOptionKinds) as never },
);
