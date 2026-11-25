import * as vue from 'vue';
import { defineComponent, h, mergeProps, onBeforeUnmount, onUpdated, ref, shallowRef, watchEffect, type VNode } from 'vue';
import {
  attachVoiceBeam,
  voiceBeamOptionKinds,
  voiceBeamState,
  voiceBeamView,
  type VoiceBeamHandle,
  type VoiceBeamLayer,
  type VoiceBeamOptions,
} from 'runeglow/voice-glow';
import { propsFrom } from '../internal/props.js';

/* An id that is the same on the server and in the browser, where Vue has
   one to give (3.5 and later); before that, a count, which is right for a
   page rendered in the browser only. */
let count = 0;
const useId = (): string => (vue as { useId?: () => string }).useId?.() ?? `v${++count}`;

const layer = (l: VoiceBeamLayer): VNode => h(l.tag, { key: l.key, ...l.attributes, style: l.style }, (l.children ?? []).map(layer));

/**
 * A sound-reactive glow along the bottom edge of what it wraps, that rises
 * and blooms with the level of a voice. Feed it a microphone stream, or
 * drive it yourself with `level`. The default slot is the content; `class`,
 * `style`, `@click` and other attributes go on the wrapper element; a
 * template ref gives `element` (the wrapper).
 *
 *   <VoiceBeam :stream="mic.stream"><ChatInput /></VoiceBeam>
 */
export const VoiceBeam = defineComponent(
  (props: VoiceBeamOptions, { attrs, slots, expose }) => {
    const id = useId();
    const host = ref<HTMLDivElement | null>(null);
    /* What the page has told the beam since it was attached. The server has
       none of it to ask, so both sides start on the same values and the
       client corrects itself once mounted. */
    const state = shallowRef(voiceBeamState(props));
    let beam: VoiceBeamHandle | null = null;

    /* The core does the listening and the motion, on the elements below.
       It gets a plain copy of the props: started once the host exists,
       then told whenever any of them changes, or the state the elements
       show does. */
    watchEffect(
      () => {
        const options: VoiceBeamOptions = { ...props };
        if (beam) beam.update(options, state.value);
        else if (host.value) beam = attachVoiceBeam(host.value, options, id, { state: state.value, onstate: (next) => (state.value = next) });
      },
      { flush: 'post' },
    );
    /* A state the core reports while the effect above is running does not
       run it again (Vue does not let an effect set itself off), but it does
       render the elements again: that is when the core is told they show it. */
    onUpdated(() => beam?.update({ ...props }, state.value));
    onBeforeUnmount(() => {
      beam?.destroy();
      beam = null;
    });
    expose({ element: host });

    return () => {
      const view = voiceBeamView(props, id, state.value);
      return [
        h('style', { innerHTML: view.css }),
        h('div', mergeProps(attrs, view.attributes, { ref: host, style: view.style }), [slots.default?.(), ...view.layers.map(layer)]),
      ];
    };
  },
  {
    name: 'VoiceBeam',
    /* two elements are rendered, so the attributes are put on the wrapper by hand */
    inheritAttrs: false,
    // The table is typed by the core; Vue's own typing of this option only knows a list of names.
    props: {
      ...propsFrom(voiceBeamOptionKinds),
      /* what the table cannot say: the ones that are, or may be, functions, and a list */
      level: { type: [Number, Function], default: undefined },
      motion: { type: [Object, Function], default: undefined },
      colors: { type: Array, default: undefined },
      onLevel: { type: Function, default: undefined },
      onActivate: { type: Function, default: undefined },
      onDeactivate: { type: Function, default: undefined },
    } as never,
  },
);
