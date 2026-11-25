import '@runeglow/elements/bot-avatars';
import { AVATAR, ROBOT } from './states';

export default function page(app: HTMLElement) {
  // the tags as a page would write them
  app.innerHTML = `
    <div class="row">
      <runeglow-bot-avatar type="cat" size="96" headphones></runeglow-bot-avatar>
      <runeglow-bot-avatar type="hexagon" shading="crisp" size="96" interactive="false"></runeglow-bot-avatar>
      <runeglow-robot-head shape="circle" colorway="tangerine" size="140" floor-shadow="false"></runeglow-robot-head>
      <runeglow-robot-head id="by-property" size="140"></runeglow-robot-head>
    </div>
    <p><button id="next" type="button">Next state</button> <output id="state"></output></p>`;
  let step = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => {
    const robot = ROBOT[step % ROBOT.length], avatar = AVATAR[step % AVATAR.length];
    for (const el of app.querySelectorAll('runeglow-bot-avatar')) el.setAttribute('state', avatar);
    for (const el of app.querySelectorAll('runeglow-robot-head')) {
      // one by attribute, one by property: both have to work
      if (el.id === 'by-property') el.state = robot;
      else el.setAttribute('state', robot);
    }
    output.textContent = `${robot} / ${avatar}`;
  };
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    show();
  });
  show();
}
