import { defineComponent, h, onBeforeUnmount, ref, watchEffect } from 'vue';
import {
  attachDistortionWave,
  distortionWaveOptionKinds,
  distortionWaveView,
  type AttachedDistortionWave,
  type DistortionWaveHandle,
  type DistortionWaveOptions,
} from 'runeglow/distortion-waves';
import { styleText } from 'runeglow/kit';
import { propsFrom } from '../internal/props.js';

/* Three options take more than their kind in the core's table says, which
   is what an HTML attribute can hold: a set of colours, and a function. */
const props = {
  ...propsFrom(distortionWaveOptionKinds),
  palette: { type: [String, Object], default: undefined },
  capture: { type: [Boolean, Function], default: undefined },
};

/**
 * A wave that leaves a button, an edge or a point and crosses the element,
 * bending what is there and carrying one view into another.
 *
 * The default slot is what the wave passes over, the view that shows
 * first; `#revealedContent` is the view it leaves behind; `#overlay` stays
 * above the wave as it is. `class`, `style` and other attributes fall
 * through to the wave's element, `@finish` tells when a wave has ended, and
 * a template ref gives `play()`, `reverse()`, `reset()`, `prepare()`,
 * `getController()` and `element`.
 *
 *   <DistortionWave :revealed="sent">
 *     <Review @send="sent = true" />
 *     <template #revealedContent><Receipt /></template>
 *   </DistortionWave>
 */
export const DistortionWave = defineComponent(
  (props: DistortionWaveOptions, { slots, emit, expose }) => {
    const root = ref<HTMLDivElement | null>(null);
    const first = ref<HTMLDivElement | null>(null);
    const second = ref<HTMLDivElement | null>(null);
    let wave: AttachedDistortionWave | null = null;

    /* in a template written in the page itself the slot's name arrives in lower case */
    const revealedSlot = () => slots.revealedContent ?? slots.revealedcontent ?? slots['revealed-content'];

    /* The two views share one grid cell. Which one the markup starts on is
       read once: after that the controller decides, and these strings never
       change, so Vue never writes over what the controller sets on the
       layers as it runs. */
    const view = distortionWaveView(props, !!revealedSlot());
    const contentStyle = styleText(view.content.style);
    const revealedStyle = styleText(view.revealed.style);
    const overlayStyle = styleText(view.overlay.style);

    /* The core runs the wave, on the element and the layers below. It gets
       a plain copy of the props: started once the elements exist, then told
       whenever any of them changes or the second view comes or goes. */
    watchEffect(
      () => {
        const options: DistortionWaveOptions = { ...props };
        const layer = second.value;
        if (wave) {
          wave.setRevealedLayer(layer);
          wave.update(options);
        } else if (root.value && first.value) {
          wave = attachDistortionWave(root.value, { content: first.value, revealed: layer }, options, {
            onFinish: (now) => emit('finish', now),
            rendered: true,
          });
        }
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      wave?.destroy();
      wave = null;
    });

    const handle: DistortionWaveHandle = {
      play: (options) => wave?.play(options),
      reverse: () => wave?.reverse(),
      reset: () => wave?.reset(),
      prepare: () => wave?.prepare() ?? Promise.resolve(),
      getController: () => wave?.getController() ?? null,
    };
    expose({ ...handle, element: root });

    return () => {
      const revealed = revealedSlot();
      return h('div', { ref: root, ...view.root.attributes, style: view.root.style }, [
        h('div', { ref: first, key: 'content', ...view.content.attributes, style: contentStyle }, slots.default?.()),
        revealed ? h('div', { ref: second, key: 'revealed', ...view.revealed.attributes, style: revealedStyle }, revealed()) : null,
        slots.overlay
          ? h('div', { key: 'overlay', ...view.overlay.attributes, style: overlayStyle }, [
              h('style', { 'data-dw-skip': '', innerHTML: view.overlay.rule }),
              slots.overlay(),
            ])
          : null,
      ]);
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'DistortionWave', props: props as never, emits: ['finish'] },
);
