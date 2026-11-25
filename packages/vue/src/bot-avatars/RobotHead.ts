import { defineComponent, h, onBeforeUnmount, ref, watchEffect } from 'vue';
import { attachRobotHead, robotHeadOptionKinds, robotHeadView, type RobotHeadHandle, type RobotHeadOptions } from 'runeglow/bot-avatars';
import { propsFrom } from '../internal/props.js';

/**
 * A TV-headed robot for an AI agent, with an LED face that shows what the
 * agent is doing. `class`, `style`, `aria-label`, `@click` and other
 * attributes fall through to the element, the `size` × `size` box the robot
 * rests in; a template ref gives `element`, `canvas` and `poke()`.
 *
 *   <RobotHead state="thinking" :size="160" />
 */
export const RobotHead = defineComponent(
  (props: RobotHeadOptions, { expose }) => {
    const box = ref<HTMLSpanElement | null>(null);
    const canvas = ref<HTMLCanvasElement | null>(null);
    /* the head has drawn its first frame: until then the canvas is transparent */
    const shown = ref(false);
    let head: RobotHeadHandle | null = null;

    /* The core does the drawing and the motion, on the two elements below.
       It gets a plain copy of the props: started once the elements exist,
       then told whenever any of them changes. */
    watchEffect(
      () => {
        const options: RobotHeadOptions = { ...props, pose: props.pose && { ...props.pose } };
        if (head) head.update(options);
        else if (box.value && canvas.value) head = attachRobotHead(box.value, canvas.value, options, { onshown: () => (shown.value = true) });
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      head?.destroy();
      head = null;
    });
    expose({ element: box, canvas, poke: () => head?.poke() });

    return () => {
      const view = robotHeadView(props, shown.value);
      return h(
        'span',
        {
          ref: box,
          role: 'img',
          'aria-label': view.label,
          'data-robot-head': view.shape,
          'data-state': view.state,
          style: view.box,
        },
        [h('canvas', { ref: canvas, 'aria-hidden': 'true', style: view.canvas })],
      );
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'RobotHead', props: propsFrom(robotHeadOptionKinds) as never },
);
