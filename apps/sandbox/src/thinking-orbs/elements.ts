import '@runeglow/elements/thinking-orbs';
import { STATES } from './states';

export default function page(app: HTMLElement) {
  // the tags as a page would write them
  app.innerHTML = `
    <div class="row">
      <runeglow-thinking-orb size="64"></runeglow-thinking-orb>
      <runeglow-thinking-orb size="32" color="#7aa2ff"></runeglow-thinking-orb>
      <runeglow-thinking-orb size="20" theme="dark"></runeglow-thinking-orb>
      <runeglow-thinking-orb id="by-property" size="64" dots="0.5" dot-size="1.5" speed="0.5"></runeglow-thinking-orb>
    </div>
    <p><button id="next" type="button">Next state</button> <output id="state"></output></p>`;
  let step = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => {
    const state = STATES[step % STATES.length];
    for (const el of app.querySelectorAll('runeglow-thinking-orb')) {
      // one by property, the rest by attribute: both have to work
      if (el.id === 'by-property') el.state = state;
      else el.setAttribute('state', state);
    }
    output.textContent = state;
  };
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    show();
  });
  show();
}
