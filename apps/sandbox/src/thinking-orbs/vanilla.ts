import { mountThinkingOrb } from 'runeglow/thinking-orbs';
import { STATES } from './states';

export default function page(app: HTMLElement) {
  app.innerHTML = '<div class="row"></div><p><button id="next" type="button">Next state</button> <output id="state"></output></p>';
  const row = app.querySelector('.row') as HTMLElement;

  const orbs = [
    mountThinkingOrb(row, { size: 64 }),
    mountThinkingOrb(row, { size: 32, color: '#7aa2ff' }),
    mountThinkingOrb(row, { size: 20, theme: 'dark' }),
    mountThinkingOrb(row, { size: 64, dots: 0.5, dotSize: 1.5, speed: 0.5 }),
  ];

  let step = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => {
    const state = STATES[step % STATES.length];
    for (const orb of orbs) orb.update({ state });
    output.textContent = state;
  };
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    show();
  });
  show();
}
