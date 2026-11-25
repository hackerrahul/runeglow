import { createApp, ref } from 'vue';
import { BorderBeam } from '@runeglow/vue/border-beam';
import { COLORS, CSS, status } from './demo';

export default function page(app: HTMLElement) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  createApp({
    components: { BorderBeam },
    setup() {
      const step = ref(0), active = ref(true), on = ref(0), off = ref(0);
      return { step, active, on, off, COLORS, status };
    },
    // A template, so the props are passed the way an app passes them.
    template: `
      <div class="row">
        <BorderBeam size="md" :color-variant="COLORS[step % COLORS.length]" :active="active" @activate="on++" @deactivate="off++"><div class="bb-card">md</div></BorderBeam>
        <BorderBeam size="md" :color-variant="COLORS[step % COLORS.length]" :active="active" class="mine"><div class="bb-card">md again</div></BorderBeam>
        <BorderBeam size="pulse-outside" :color-variant="COLORS[step % COLORS.length]" :active="active"><div class="bb-card">pulse-outside</div></BorderBeam>
        <BorderBeam size="line" :color-variant="COLORS[step % COLORS.length]" :active="active"><div class="bb-card bb-pill">line</div></BorderBeam>
      </div>
      <p><button id="next" type="button" @click="step++">Next colour</button> <button id="toggle" type="button" @click="active = !active">On / off</button> <output id="state">{{ status(COLORS[step % COLORS.length], active, on, off) }}</output></p>
    `,
  }).mount(app);
}
