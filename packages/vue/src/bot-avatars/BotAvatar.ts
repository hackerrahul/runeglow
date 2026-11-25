import { defineComponent, h, onBeforeUnmount, ref, watchEffect } from 'vue';
import { attachBotAvatar, botAvatarOptionKinds, botAvatarView, type BotAvatarHandle, type BotAvatarOptions } from 'runeglow/bot-avatars';
import { propsFrom } from '../internal/props.js';

/**
 * An animated face for an AI agent, drawn on a canvas. `class`, `style`,
 * `aria-label`, `@click` and other attributes fall through to the canvas;
 * a template ref gives `element` (the canvas) and `poke()`.
 *
 *   <BotAvatar type="clover" state="working" />
 */
export const BotAvatar = defineComponent(
  (props: BotAvatarOptions, { expose }) => {
    const canvas = ref<HTMLCanvasElement | null>(null);
    /* a fabric or plastic avatar is transparent until its material is made */
    const shown = ref(false);
    let avatar: BotAvatarHandle | null = null;

    /* The core does the drawing and the motion, on the canvas below. It
       gets a plain copy of the props: started once the canvas exists, then
       told whenever any of them changes. */
    watchEffect(
      () => {
        const options: BotAvatarOptions = { ...props, pose: props.pose && { ...props.pose } };
        if (avatar) avatar.update(options);
        else if (canvas.value) avatar = attachBotAvatar(canvas.value, options, { onshown: () => (shown.value = true) });
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      avatar?.destroy();
      avatar = null;
    });
    expose({ element: canvas, poke: () => avatar?.poke() });

    return () => {
      const view = botAvatarView(props, shown.value);
      return h('canvas', {
        ref: canvas,
        role: 'img',
        'aria-label': view.label,
        'data-bot-avatar': view.type,
        'data-face': view.face,
        'data-state': view.state,
        style: view.style,
      });
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'BotAvatar', props: propsFrom(botAvatarOptionKinds) as never },
);
