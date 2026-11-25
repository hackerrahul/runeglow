import { attachMetalTextReflection } from '@runeglow/elements/metal-fx';
import { FONT, LOOKS, demoStyles, say } from './demo';

export default function page(app: HTMLElement) {
  demoStyles();
  // the tags as a page would write them: the targets are named by a selector
  app.innerHTML = `
    <div class="row mfx-row">
      <div class="mfx-chip" id="chip">Tools</div>
      <runeglow-metal-fx variant="circle" theme="dark" inner-shadow bend reflection-targets="#chip">
        <button class="mfx-send" type="button" aria-label="Send">↑</button>
      </runeglow-metal-fx>
      <runeglow-metal-fx id="by-property" theme="dark" strength="0.63">
        <button class="mfx-pill" type="button">Upgrade to Pro</button>
      </runeglow-metal-fx>
      <span class="mfx-line"><span id="plan" data-metal-fx-strength="0.64">Plan</span><runeglow-metal-text text="Pro" font="${FONT}" color="#e2e2e2" theme="dark" strength="0.9" reflection-targets="#plan"></runeglow-metal-text></span>
      <span class="mfx-line">Live mode <runeglow-metal-badge theme="dark" strength="0.9"></runeglow-metal-badge></span>
    </div>
    <p><button id="next" type="button">Next look</button> <button id="toggle" type="button">Remove</button> <output id="state"></output></p>`;
  // "Plan" catches the metal on its letters only: a plain function, as in every framework
  attachMetalTextReflection(app.querySelector('#plan') as HTMLElement);

  let step = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const toggle = app.querySelector('#toggle') as HTMLButtonElement;
  const rings = [...app.querySelectorAll('runeglow-metal-fx')];
  const word = app.querySelector('runeglow-metal-text') as HTMLElementTagNameMap['runeglow-metal-text'];
  const badge = app.querySelector('runeglow-metal-badge') as HTMLElementTagNameMap['runeglow-metal-badge'];
  const all = [...rings, word, badge];
  /* where each one stands, to put it back there */
  const places = all.map((el) => ({ el, parent: el.parentNode as Node, before: el.nextSibling }));

  const show = () => {
    const look = LOOKS[step % LOOKS.length];
    for (const el of rings) {
      // one by attribute, one by property: both have to work
      if (el.id === 'by-property') el.preset = look.preset;
      else el.setAttribute('preset', look.preset);
    }
    word.setAttribute('text', look.word);
    badge.scale = look.scale;
    const shown = all[0].isConnected;
    output.textContent = say(step, shown);
    toggle.textContent = shown ? 'Remove' : 'Put back';
  };
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    show();
  });
  // every ring gone and then back: the shared renderer is torn down and has to start again
  toggle.addEventListener('click', () => {
    if (all[0].isConnected) for (const el of all) el.remove();
    else for (const { el, parent, before } of places) parent.insertBefore(el, before);
    show();
  });
  show();
}
