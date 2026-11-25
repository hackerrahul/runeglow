import '@runeglow/elements/voice-glow';
import { createMicrophone } from '@runeglow/elements/voice-glow';
import { PALETTES, styles, summary, voice } from './demo';

export default function page(app: HTMLElement) {
  styles();
  // the tags as a page would write them
  app.innerHTML = `
    <div class="row">
      <runeglow-voice-beam id="composer"><div class="vg-box">Ask anything…</div></runeglow-voice-beam>
      <runeglow-voice-beam id="pill" type="pill"><div class="vg-pill">00:04</div></runeglow-voice-beam>
    </div>
    <p class="vg-controls">
      <button id="next" type="button">Next palette</button>
      <button id="active" type="button">Toggle active</button>
      <button id="listen" type="button">Listen</button>
      <output id="state"></output>
    </p>`;
  const mic = createMicrophone();
  const composer = app.querySelector('#composer') as HTMLElementTagNameMap['runeglow-voice-beam'];
  const pill = app.querySelector('#pill') as HTMLElementTagNameMap['runeglow-voice-beam'];
  // a getter and a stream are properties: no attribute can carry them
  composer.level = voice;
  pill.level = voice;

  let step = 0;
  let active = true;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => {
    const colorVariant = PALETTES[step % PALETTES.length];
    // one by property, one by attribute: both have to work
    composer.colorVariant = colorVariant;
    composer.active = active;
    composer.stream = mic.stream;
    pill.setAttribute('color-variant', colorVariant);
    pill.setAttribute('active', String(active));
    output.textContent = summary(colorVariant, active, mic.state);
  };
  mic.subscribe(show);
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    show();
  });
  (app.querySelector('#active') as HTMLButtonElement).addEventListener('click', () => {
    active = !active;
    show();
  });
  (app.querySelector('#listen') as HTMLButtonElement).addEventListener('click', () => (mic.stream ? mic.stop() : void mic.start()));
  show();
}
