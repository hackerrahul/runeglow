import { createApp, ref } from 'vue';
import { ImageGeneration, type ImageGenerationCycleEvent, type ImageGenerationHandle } from '@runeglow/vue/img-fx';
import { CARD, IMAGES, PRESET_NAMES, SMALL_CARD } from './demo';

export default function page(app: HTMLElement) {
  createApp({
    components: { ImageGeneration },
    setup() {
      const step = ref(0);
      const paused = ref(false);
      const phase = ref<ImageGenerationCycleEvent['phase']>('idle');
      // the template ref holds the reveal functions, and the wrapper as `element`
      const cover = ref<ImageGenerationHandle | null>(null);
      const toggle = () => (cover.value?.isImageActive() ? cover.value.triggerHide() : cover.value?.triggerReveal({ hold: 'manual' }));
      const regenerate = () => cover.value?.triggerRegenerate({ durationMs: 1500 });
      return { step, paused, phase, cover, toggle, regenerate, PRESET_NAMES, IMAGES, CARD, SMALL_CARD };
    },
    // A template, so the props are passed the way an app passes them:
    // a bare `auto-reveal`, `:reveal-delay-range="[1, 2]"`, `@cycle`.
    template: `
      <div class="row">
        <ImageGeneration ref="cover" id="cover" class="mine" :preset="PRESET_NAMES[step % PRESET_NAMES.length]" theme="dark" :paused="paused" :images="IMAGES" @cycle="phase = $event.phase">
          <div :style="CARD" />
        </ImageGeneration>
        <ImageGeneration id="auto" preset="sweep-gradient" theme="dark" :paused="paused" :images="IMAGES" auto-reveal :reveal-delay-range="[1, 2]" :reveal-hold-ms="1500">
          <div :style="SMALL_CARD" />
        </ImageGeneration>
      </div>
      <p>
        <button id="reveal" type="button" @click="toggle">Reveal or hide</button>
        <button id="regen" type="button" @click="regenerate">Regenerate</button>
        <button id="next" type="button" @click="step++">Next preset</button>
        <button id="pause" type="button" @click="paused = !paused">Pause</button>
        <output id="state">{{ PRESET_NAMES[step % PRESET_NAMES.length] }} / {{ phase }}{{ paused ? ' / paused' : '' }}</output>
      </p>
    `,
  }).mount(app);
}
