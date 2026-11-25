import { createApp, ref } from 'vue';
import { DistortionWave } from '@runeglow/vue/distortion-waves';
import type { DistortionWaveHandle } from 'runeglow/distortion-waves';
import { CSS, TYPES, status } from './demo';

export default function page(app: HTMLElement) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  createApp({
    components: { DistortionWave },
    setup() {
      const step = ref(0), revealed = ref(false), finished = ref(0), last = ref<boolean | null>(null);
      const inbox = ref<DistortionWaveHandle | null>(null);
      const done = (now: boolean) => {
        finished.value++;
        last.value = now;
      };
      const refresh = (e: MouseEvent) => inbox.value?.play({ source: e.currentTarget as Element });
      return { step, revealed, finished, last, inbox, done, refresh, TYPES, status };
    },
    // A template, so the props and the slots are passed the way an app passes them.
    template: `
      <div class="row">
        <DistortionWave class="dw-card" :type="TYPES[step % TYPES.length]" :revealed="revealed" @finish="done">
          <div class="dw-view"><b>Send $240.00</b><span>To Maya Chen, today</span></div>
          <template #revealedContent><div class="dw-view done"><b>Sent</b><span>$240.00 to Maya Chen</span></div></template>
          <template #overlay><button id="send" class="dw-go" type="button" @click="revealed = !revealed">{{ revealed ? 'Done' : 'Confirm' }}</button></template>
        </DistortionWave>
        <DistortionWave ref="inbox" class="dw-card" type="horizontal" palette="mono">
          <div class="dw-view"><b>Inbox</b><span>3 new messages</span></div>
          <template #overlay><button id="refresh" class="dw-go" type="button" @click="refresh">Refresh</button></template>
        </DistortionWave>
      </div>
      <p><button id="next" type="button" @click="step++">Next type</button> <output id="state">{{ status(TYPES[step % TYPES.length], revealed, finished, last) }}</output></p>
    `,
  }).mount(app);
}
