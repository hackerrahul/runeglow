import { computed, createApp, ref } from 'vue';
import { MetalBadge, MetalFx, MetalText, useMetalBend, useMetalTextReflection } from '@runeglow/vue/metal-fx';
import { FONT, LOOKS, demoStyles, say } from './demo';

export default function page(app: HTMLElement) {
  demoStyles();
  createApp({
    components: { MetalFx, MetalText, MetalBadge },
    setup() {
      const step = ref(0);
      const shown = ref(true);
      const look = computed(() => LOOKS[step.value % LOOKS.length]);

      const chip = ref<HTMLElement | null>(null);
      const plan = ref<HTMLElement | null>(null);
      // a template ref on the component: the composable takes its wrapper element
      const send = ref(null);
      useMetalBend(send);
      useMetalTextReflection(plan);

      return { step, shown, look, chip, plan, send, FONT, say };
    },
    // A template, so the props are passed the way an app passes them:
    // a bare `inner-shadow`, the targets as the elements the refs hold.
    template: `
      <div class="row mfx-row">
        <div class="mfx-chip" ref="chip">Tools</div>
        <MetalFx v-if="shown" ref="send" variant="circle" theme="dark" :preset="look.preset" inner-shadow :reflection-targets="[chip]">
          <button class="mfx-send" type="button" aria-label="Send">↑</button>
        </MetalFx>
        <MetalFx v-if="shown" theme="dark" :preset="look.preset" :strength="0.63" class="mine">
          <button class="mfx-pill" type="button">Upgrade to Pro</button>
        </MetalFx>
        <span class="mfx-line">
          <span ref="plan">Plan</span>
          <MetalText v-if="shown" :text="look.word" :font="FONT" color="#e2e2e2" theme="dark" :strength="0.9" :reflection-targets="[{ el: plan, strength: 0.64 }]" />
        </span>
        <span class="mfx-line">Live mode <MetalBadge v-if="shown" theme="dark" :strength="0.9" :scale="look.scale" /></span>
      </div>
      <p>
        <button id="next" type="button" @click="step++">Next look</button>
        <button id="toggle" type="button" @click="shown = !shown">{{ shown ? 'Remove' : 'Put back' }}</button>
        <output id="state">{{ say(step, shown) }}</output>
      </p>
    `,
  }).mount(app);
}
