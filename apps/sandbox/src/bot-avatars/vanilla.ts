import { mountBotAvatar, mountRobotHead } from 'runeglow/bot-avatars';
import { AVATAR, ROBOT } from './states';

export default function page(app: HTMLElement) {
  app.innerHTML = '<div class="row"></div><p><button id="next" type="button">Next state</button> <output id="state"></output></p>';
  const row = app.querySelector('.row') as HTMLElement;

  const cat = mountBotAvatar(row, { type: 'cat', size: 96, headphones: true });
  const hex = mountBotAvatar(row, { type: 'hexagon', shading: 'crisp', size: 96, interactive: false });
  const circle = mountRobotHead(row, { shape: 'circle', colorway: 'tangerine', size: 140, floorShadow: false });
  const head = mountRobotHead(row, { size: 140 });

  let step = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => {
    cat.update({ state: AVATAR[step % AVATAR.length] });
    hex.update({ state: AVATAR[step % AVATAR.length] });
    circle.update({ state: ROBOT[step % ROBOT.length] });
    head.update({ state: ROBOT[step % ROBOT.length] });
    output.textContent = `${ROBOT[step % ROBOT.length]} / ${AVATAR[step % AVATAR.length]}`;
  };
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    show();
  });
  show();
}
