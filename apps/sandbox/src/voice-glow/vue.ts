import { createApp, ref } from 'vue';
import { VoiceBeam, useMicrophone } from '@runeglow/vue/voice-glow';
import { PALETTES, styles, summary, voice } from './demo';

export default function page(app: HTMLElement) {
  styles();
  createApp({
    components: { VoiceBeam },
    setup() {
      const step = ref(0);
      const active = ref(true);
      const mic = useMicrophone();
      return { step, active, mic, PALETTES, summary, voice };
    },
    // A template, so the props are passed the way an app passes them. The
    // composer hears the microphone once there is one; a stream wins over the level.
    template: `
      <div class="row">
        <VoiceBeam id="composer" :level="voice" :stream="mic.stream" :color-variant="PALETTES[step % PALETTES.length]" :active="active">
          <div class="vg-box">Ask anything…</div>
        </VoiceBeam>
        <VoiceBeam id="pill" type="pill" :level="voice" :color-variant="PALETTES[step % PALETTES.length]" :active="active" class="mine">
          <div class="vg-pill">00:04</div>
        </VoiceBeam>
      </div>
      <p class="vg-controls">
        <button id="next" type="button" @click="step++">Next palette</button>
        <button id="active" type="button" @click="active = !active">Toggle active</button>
        <button id="listen" type="button" @click="mic.stream ? mic.stop() : mic.start()">Listen</button>
        <output id="state">{{ summary(PALETTES[step % PALETTES.length], active, mic.state) }}</output>
      </p>
    `,
  }).mount(app);
}
