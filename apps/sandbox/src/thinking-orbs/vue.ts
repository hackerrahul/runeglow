import { createApp, ref } from 'vue';
import { ThinkingOrb } from '@runeglow/vue/thinking-orbs';
import { STATES } from './states';

export default function page(app: HTMLElement) {
  createApp({
    components: { ThinkingOrb },
    setup() {
      const step = ref(0);
      return { step, STATES };
    },
    // A template, so the props are passed the way an app passes them.
    template: `
      <div class="row">
        <ThinkingOrb :size="64" :state="STATES[step % STATES.length]" />
        <ThinkingOrb :size="32" color="#7aa2ff" :state="STATES[step % STATES.length]" />
        <ThinkingOrb :size="20" theme="dark" :state="STATES[step % STATES.length]" />
        <ThinkingOrb :size="64" :dots="0.5" :dot-size="1.5" :speed="0.5" :state="STATES[step % STATES.length]" class="mine" />
      </div>
      <p><button id="next" type="button" @click="step++">Next state</button> <output id="state">{{ STATES[step % STATES.length] }}</output></p>
    `,
  }).mount(app);
}
