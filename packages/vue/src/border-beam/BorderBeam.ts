import * as vue from 'vue';
import { defineComponent, h, mergeProps, onBeforeUnmount, ref, shallowRef, watchEffect } from 'vue';
import { attachBorderBeam, borderBeamOptionKinds, borderBeamState, borderBeamView, type BorderBeamHandle, type BorderBeamOptions } from 'runeglow/border-beam';
import { propsFrom } from '../internal/props.js';

/* Vue 3.5 has an id that is the same on a server and in the browser, which
   a server-rendered beam needs (its rules are named by it). Before 3.5
   there is none: a counter does for a page rendered in the browser. */
const useId = (vue as { useId?: () => string | undefined }).useId;
let count = 0;

/**
 * An animated beam of light round its default slot. It renders one wrapper
 * `<div>` and reads the corner radius of the first element in the slot.
 * `class`, `style`, `@click` and other attributes fall through to the
 * wrapper; `@activate` and `@deactivate` tell when a fade has finished; a
 * template ref gives `element`.
 *
 *   <BorderBeam size="md"><Card>Content</Card></BorderBeam>
 */
export const BorderBeam = defineComponent(
  (props: BorderBeamOptions, { attrs, slots, emit, expose }) => {
    const id = (useId?.() ?? `rgv${++count}`).replace(/[^a-zA-Z0-9_-]/g, '-');
    const wrapper = ref<HTMLDivElement | null>(null);
    /* What the core has found out in the browser (the system's theme, the
       content's radius, whether the beam is on screen, where it is in a
       fade). It starts as a server would have it, so the markup hydrates. */
    const state = shallowRef(borderBeamState(props));
    let beam: BorderBeamHandle | null = null;

    /* The core watches the wrapper below and drives the pulse; this
       component does the rendering, so the stylesheet is in the server's
       HTML too. The core gets a plain copy of the props: started once the
       wrapper exists, then told whenever any of them changes. */
    watchEffect(
      () => {
        const options: BorderBeamOptions = { ...props };
        if (beam) beam.update(options);
        else if (wrapper.value) {
          beam = attachBorderBeam(wrapper.value, options, {
            onActivate: () => emit('activate'),
            onDeactivate: () => emit('deactivate'),
            rendered: { id, onstate: (next) => (state.value = next) },
          });
        }
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      beam?.destroy();
      beam = null;
    });
    expose({ element: wrapper });

    return () => {
      const view = borderBeamView(props, id, state.value);
      return [
        h('style', { innerHTML: view.css }),
        h('div', mergeProps(attrs, { ref: wrapper, ...view.attributes, style: view.style }), [slots.default?.(), h('div', { 'data-beam-bloom': '' })]),
      ];
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'BorderBeam', inheritAttrs: false, props: propsFrom(borderBeamOptionKinds) as never, emits: ['activate', 'deactivate'] },
);
