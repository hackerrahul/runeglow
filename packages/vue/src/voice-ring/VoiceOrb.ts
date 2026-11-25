import { defineComponent, h, onBeforeUnmount, ref, shallowRef, watchEffect } from 'vue';
import {
  attachVoiceOrb,
  voiceOrbOptionKinds,
  voiceOrbView,
  type VoiceOrbHandle,
  type VoiceOrbOptions,
  type VoiceOrbRoom,
} from 'runeglow/voice-ring';
import { propsFrom } from '../internal/props.js';

/* before the orb has measured, and on a server, there is all the room in the world */
const OPEN: VoiceOrbRoom = [Infinity, Infinity];

/** The orb's props: the core's table, and what it cannot say. Shared with the ring. */
export const voiceOrbProps = {
  ...propsFrom(voiceOrbOptionKinds),
  /* the ones that are, or may be, functions, and the one that may be `true` or a number */
  level: { type: [Number, Function], default: undefined },
  direction: { type: [Number, Function], default: undefined },
  hoverBend: { type: [Boolean, Number], default: undefined },
  frame: { type: Function, default: undefined },
  onLevel: { type: Function, default: undefined },
};

/**
 * A shape on a canvas that moves with a voice: it follows a stream, an
 * AnalyserNode or a level, and leans toward where the voice comes from.
 * `class`, `style`, `aria-label`, `@click` and other attributes fall
 * through to the canvas; a template ref gives `element` (the canvas).
 *
 *   <VoiceOrb type="aura" :size="240" state="listening" :stream="mic.stream" />
 */
export const VoiceOrb = defineComponent(
  (props: VoiceOrbOptions, { expose }) => {
    const canvas = ref<HTMLCanvasElement | null>(null);
    /* The room the orb has to lean into, which the core measures once the
       canvas is on the page: the canvas reaches that far past the orb's box. */
    const room = shallowRef(OPEN);
    let orb: VoiceOrbHandle | null = null;

    /* The core does the listening, the drawing and the motion, on the
       canvas below. It gets a plain copy of the props: started once the
       canvas exists, then told whenever any of them changes, or the room
       the canvas is laid out with does. */
    watchEffect(
      () => {
        const options: VoiceOrbOptions = { ...props };
        if (orb) orb.update(options, room.value);
        else if (canvas.value) orb = attachVoiceOrb(canvas.value, options, { onroom: (next) => (room.value = next) });
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      orb?.destroy();
      orb = null;
    });
    expose({ element: canvas });

    return () => {
      const view = voiceOrbView(props, room.value);
      return h('canvas', { ref: canvas, role: 'img', 'aria-label': view.label, style: view.style });
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'VoiceOrb', props: voiceOrbProps as never },
);
