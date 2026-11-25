import { defineComponent, h, onBeforeUnmount, ref, shallowRef, watchEffect } from 'vue';
import {
  attachImageGeneration,
  ensureStylesInjected,
  imageGenerationOptionKinds,
  imageGenerationView,
  type AttachedImageGeneration,
  type ImageGenerationHandle,
  type ImageGenerationOptions,
  type ImageGenerationState
} from 'runeglow/img-fx';
import { propsFrom } from '../internal/props.js';

/* the stylesheet is in the page before the first card is drawn, not an effect later */
ensureStylesInjected();

/* The options the core's table calls a record are, here, a list or a
   single value; and the two that are functions are not in the table at all.
   `onCycle` being a prop, `@cycle="…"` reaches it as well. */
const props = {
  ...propsFrom(imageGenerationOptionKinds),
  images: { type: [String, Array], default: undefined },
  colors: { type: Array, default: undefined },
  revealDelayRange: { type: Array, default: undefined },
  revealInitialDelay: { type: [Number, Array], default: undefined },
  revealHoldMs: { type: [Number, Array], default: undefined },
  onCycle: { type: Function, default: undefined },
  excludeSrcs: { type: Function, default: undefined }
};

const copy = <T>(value: T): T => (Array.isArray(value) ? ([...value] as T) : value);

/**
 * An animated WebGL "image generation" loader. Wrap a card and it gets a
 * shader-driven mosaic that can resolve into an image from a pool you
 * provide, hold it, and dissolve back. The default slot is the card: a
 * single element, which the wrapper sizes itself to and whose border-radius
 * it takes. `class`, `style`, `@click` and other attributes fall through to
 * the wrapper; a template ref gives `element` (the wrapper) and the reveal
 * functions: `triggerReveal`, `triggerHide`, `triggerRegenerate`,
 * `isImageActive`.
 *
 *   <ImageGeneration ref="card" preset="pixels-organic" :images="['/a.jpg', '/b.jpg']" auto-reveal>
 *     <div style="width: 320px; height: 320px; border-radius: 20px" />
 *   </ImageGeneration>
 */
export const ImageGeneration = defineComponent(
  (props: ImageGenerationOptions, { attrs, slots, expose }) => {
    const root = ref<HTMLDivElement | null>(null);
    /* what the running card has found out: the page's theme, the card's corner
       radius, the surface of a regenerate churn. The wrapper is drawn from it. */
    const found = shallowRef<ImageGenerationState | null>(null);
    let card: AttachedImageGeneration | null = null;

    /* The core does the measuring, the drawing and the reveal cycle, on the
       wrapper below. It gets a plain copy of the props, lists included, so
       that a list changed in place is seen: started once the wrapper exists,
       then told whenever any of them changes. */
    const sync = () => {
      const options: ImageGenerationOptions = {
        ...props,
        images: copy(props.images),
        colors: copy(props.colors),
        revealDelayRange: copy(props.revealDelayRange),
        revealInitialDelay: copy(props.revealInitialDelay),
        revealHoldMs: copy(props.revealHoldMs)
      };
      if (card) card.update(options);
      else if (root.value) card = attachImageGeneration(root.value, options, { onstate: (next) => (found.value = next) });
    };
    watchEffect(sync, { flush: 'post' });
    onBeforeUnmount(() => {
      card?.destroy();
      card = null;
    });

    /* The props reach the core after Vue has rendered. A parent that sets
       `:images` and calls `triggerReveal()` in the same breath would reveal
       from the old list, so each call first hands over the props as they
       stand now. */
    const handle: ImageGenerationHandle = {
      triggerReveal: (opts) => {
        sync();
        return card?.triggerReveal(opts);
      },
      triggerHide: () => card?.triggerHide(),
      triggerRegenerate: (opts) => {
        sync();
        return card?.triggerRegenerate(opts);
      },
      isImageActive: () => card?.isImageActive() ?? false
    };
    expose({ element: root, ...handle });

    return () => {
      const view = imageGenerationView(props, found.value);
      const { class: className, style, ...rest } = attrs;
      return h(
        'div',
        {
          ...rest,
          ref: root,
          class: [view.class, className],
          'data-preset': view.preset,
          'data-theme': view.theme,
          'data-paused': view.paused ? 'true' : undefined,
          /* the caller's style may change the surface; the card's radius is the wrapper's whatever it says */
          style: [view.style, style, view.radiusStyle]
        },
        [
          h('canvas', { class: view.shaderClass, 'aria-hidden': 'true' }),
          h('canvas', { class: view.overlayClass, 'aria-hidden': 'true' }),
          h('div', { class: view.contentClass }, slots.default?.())
        ]
      );
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  // The attributes are placed by hand above, so that the wrapper's style is put together in order.
  { name: 'ImageGeneration', inheritAttrs: false, props: props as never }
);
