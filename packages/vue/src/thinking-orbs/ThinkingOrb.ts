import { defineComponent, h, onBeforeUnmount, ref, watchEffect } from 'vue';
import { attachThinkingOrb, thinkingOrbOptionKinds, thinkingOrbView, type ThinkingOrbHandle, type ThinkingOrbOptions } from 'runeglow/thinking-orbs';
import { propsFrom } from '../internal/props.js';

/**
 * A dotted sphere that shows what an AI is doing, drawn on a canvas.
 * `class`, `style`, `aria-label`, `@click` and other attributes fall
 * through to the canvas; a template ref gives `element` (the canvas).
 *
 *   <ThinkingOrb state="searching" :size="64" />
 */
export const ThinkingOrb = defineComponent(
  (props: ThinkingOrbOptions, { expose }) => {
    const canvas = ref<HTMLCanvasElement | null>(null);
    let orb: ThinkingOrbHandle | null = null;

    /* The core does the drawing and the motion, on the canvas below. It
       gets a plain copy of the props: started once the canvas exists, then
       told whenever any of them changes. */
    watchEffect(
      () => {
        const options: ThinkingOrbOptions = { ...props };
        if (orb) orb.update(options);
        else if (canvas.value) orb = attachThinkingOrb(canvas.value, options);
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      orb?.destroy();
      orb = null;
    });
    expose({ element: canvas });

    return () => {
      const view = thinkingOrbView(props);
      return h('canvas', { ref: canvas, role: 'img', 'aria-label': view.label, style: view.style });
    };
  },
  {
    name: 'ThinkingOrb',
    // The table is typed by the core; Vue's own typing of this option only knows a list of names.
    props: {
      ...propsFrom(thinkingOrbOptionKinds),
      /* the two the table cannot say: a function, and a record that may also be `true` */
      frame: { type: Function, default: undefined },
      gravity: { type: [Boolean, Object], default: undefined },
    } as never,
  },
);
