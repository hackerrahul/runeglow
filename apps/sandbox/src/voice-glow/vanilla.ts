import { createMicrophone, mountVoiceBeam } from 'runeglow/voice-glow';
import { PALETTES, styles, summary, voice } from './demo';

export default function page(app: HTMLElement) {
  styles();
  // the elements are the page's own: the beams are mounted on them
  app.innerHTML = `
    <div class="row">
      <div id="composer"><div class="vg-box">Ask anything…</div></div>
      <div id="pill"><div class="vg-pill">00:04</div></div>
    </div>
    <p class="vg-controls">
      <button id="next" type="button">Next palette</button>
      <button id="active" type="button">Toggle active</button>
      <button id="listen" type="button">Listen</button>
      <output id="state"></output>
    </p>`;
  const mic = createMicrophone();
  const composer = mountVoiceBeam(app.querySelector('#composer') as HTMLElement, { level: voice });
  const pill = mountVoiceBeam(app.querySelector('#pill') as HTMLElement, { type: 'pill', level: voice });

  let step = 0;
  let active = true;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => {
    const colorVariant = PALETTES[step % PALETTES.length];
    // the composer hears the microphone once there is one; a stream wins over the level
    composer.update({ colorVariant, active, stream: mic.stream });
    pill.update({ colorVariant, active });
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
