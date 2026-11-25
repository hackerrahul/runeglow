import { createApp, ref } from 'vue';
import { Liquid, LiquidItem } from '@runeglow/vue/liquid-gooey';
import { APART, BLURS, FILL, PICTURES, SATELLITES, SHADOW, SLIDE, TOUCHING, styles, summary } from './demo';

export default function page(app: HTMLElement) {
  styles();
  createApp({
    components: { Liquid, LiquidItem },
    setup() {
      const open = ref(false), blur = ref(0), slid = ref(false), touching = ref(false);
      return { open, blur, slid, touching, APART, BLURS, FILL, PICTURES, SATELLITES, SHADOW, SLIDE, TOUCHING, summary };
    },
    // A template, so the props are passed the way an app passes them.
    template: `
      <div class="lg">
        <div class="lg-panel">
          <Liquid :class="['lg-menu', { open }]" :fill="FILL" :shadow="SHADOW" :blur="BLURS[blur]">
            <LiquidItem v-for="(s, i) in SATELLITES" :key="s.label" class="lg-slot" :x="open ? s.x : 0" :y="open ? s.y : 0" transition="bouncy" :delay="i * 40">
              <button class="lg-btn lg-sat" type="button" :aria-label="s.label">{{ s.label[0] }}</button>
            </LiquidItem>
            <LiquidItem class="lg-slot">
              <button id="plus" class="lg-btn" type="button" aria-label="Menu" @click="open = !open">+</button>
            </LiquidItem>
          </Liquid>
        </div>
        <div class="lg-panel">
          <Liquid class="lg-track" fill="#5a5a5a">
            <LiquidItem effect="move" :move="{ stretch: 0.6, trail: 0.5 }">
              <div id="thumb" class="lg-thumb" :style="{ transform: 'translateX(' + (slid ? SLIDE : 0) + 'px)' }"></div>
            </LiquidItem>
          </Liquid>
        </div>
        <div class="lg-panel">
          <Liquid class="lg-stage">
            <LiquidItem v-for="(src, i) in PICTURES" :key="src" effect="melt">
              <div class="lg-card" :style="{ left: (touching ? TOUCHING : APART)[i] + 'px' }"><img :src="src" alt=""></div>
            </LiquidItem>
          </Liquid>
        </div>
      </div>
      <p>
        <button id="toggle" type="button" @click="open = !open">Open menu</button>
        <button id="blur" type="button" @click="blur = (blur + 1) % BLURS.length">Goo blur</button>
        <button id="slide" type="button" @click="slid = !slid">Slide</button>
        <button id="touch" type="button" @click="touching = !touching">Touch</button>
        <output id="state">{{ summary(open, BLURS[blur], slid, touching) }}</output>
      </p>
    `,
  }).mount(app);
}
