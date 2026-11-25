import { createApp, ref } from 'vue';
import { BotAvatar, RobotHead } from '@runeglow/vue/bot-avatars';
import { AVATAR, ROBOT } from './states';

export default function page(app: HTMLElement) {
  createApp({
    components: { BotAvatar, RobotHead },
    setup() {
      const step = ref(0);
      return { step, ROBOT, AVATAR };
    },
    // A template, so the props are passed the way an app passes them:
    // a bare `headphones`, `:floor-shadow="false"`.
    template: `
      <div class="row">
        <BotAvatar type="cat" :size="96" headphones :state="AVATAR[step % AVATAR.length]" />
        <BotAvatar type="hexagon" shading="crisp" :size="96" :interactive="false" :state="AVATAR[step % AVATAR.length]" />
        <RobotHead shape="circle" colorway="tangerine" :size="140" :floor-shadow="false" :state="ROBOT[step % ROBOT.length]" />
        <RobotHead :size="140" :state="ROBOT[step % ROBOT.length]" class="mine" />
      </div>
      <p><button id="next" type="button" @click="step++">Next state</button> <output id="state">{{ ROBOT[step % ROBOT.length] }} / {{ AVATAR[step % AVATAR.length] }}</output></p>
    `,
  }).mount(app);
}
