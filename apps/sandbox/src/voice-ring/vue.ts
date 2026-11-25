import { createApp, ref } from 'vue';
import { VoiceOrb, VoiceRing, useMicrophone } from '@runeglow/vue/voice-ring';
import { EMOTIONS, STATES, summary, voice } from './demo';

export default function page(app: HTMLElement) {
  createApp({
    components: { VoiceOrb, VoiceRing },
    setup() {
      const step = ref(0);
      const feel = ref(0);
      const mic = useMicrophone();
      return { step, feel, mic, STATES, EMOTIONS, summary, voice };
    },
    // A template, so the props are passed the way an app passes them. The
    // first ring hears the microphone once there is one; the second hears a
    // voice from the right, leans that way, and its canvas reaches out for the room.
    template: `
      <div class="row">
        <VoiceRing :size="200" :level="voice" :stream="mic.stream" :state="STATES[step % STATES.length]" :emotion="EMOTIONS[feel % EMOTIONS.length]" />
        <VoiceRing type="mono" :size="160" :level="voice" :direction="0.8" :state="STATES[step % STATES.length]" :emotion="EMOTIONS[feel % EMOTIONS.length]" />
        <VoiceOrb type="swell" :size="140" :level="voice" accent="green" :state="STATES[step % STATES.length]" :emotion="EMOTIONS[feel % EMOTIONS.length]" />
        <VoiceOrb type="pixel" :size="96" :level="voice" theme="dark" :state="STATES[step % STATES.length]" :emotion="EMOTIONS[feel % EMOTIONS.length]" class="mine" />
      </div>
      <p>
        <button id="next" type="button" @click="step++">Next state</button>
        <button id="feel" type="button" @click="feel++">Next emotion</button>
        <button id="listen" type="button" @click="mic.stream ? mic.stop() : mic.start()">Listen</button>
        <output id="state">{{ summary(STATES[step % STATES.length], EMOTIONS[feel % EMOTIONS.length], mic.state) }}</output>
      </p>
    `,
  }).mount(app);
}
