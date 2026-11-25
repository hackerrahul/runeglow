import { createMicrophone, mountVoiceOrb, mountVoiceRing } from 'runeglow/voice-ring';
import { EMOTIONS, STATES, summary, voice } from './demo';

export default function page(app: HTMLElement) {
  app.innerHTML = `
    <div class="row"></div>
    <p>
      <button id="next" type="button">Next state</button>
      <button id="feel" type="button">Next emotion</button>
      <button id="listen" type="button">Listen</button>
      <output id="state"></output>
    </p>`;
  const row = app.querySelector('.row') as HTMLElement;
  const mic = createMicrophone();

  const ring = mountVoiceRing(row, { size: 200, level: voice });
  // a voice from the right: the ring leans that way, and its canvas reaches out for the room
  const mono = mountVoiceRing(row, { type: 'mono', size: 160, level: voice, direction: 0.8 });
  const swell = mountVoiceOrb(row, { type: 'swell', size: 140, level: voice, accent: 'green' });
  const pixel = mountVoiceOrb(row, { type: 'pixel', size: 96, level: voice, theme: 'dark' });

  let step = 0;
  let feel = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => {
    const state = STATES[step % STATES.length], emotion = EMOTIONS[feel % EMOTIONS.length];
    // the ring hears the microphone once there is one; a stream wins over the level
    ring.update({ state, emotion, stream: mic.stream });
    for (const orb of [mono, swell, pixel]) orb.update({ state, emotion });
    output.textContent = summary(state, emotion, mic.state);
  };
  mic.subscribe(show);
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    show();
  });
  (app.querySelector('#feel') as HTMLButtonElement).addEventListener('click', () => {
    feel++;
    show();
  });
  (app.querySelector('#listen') as HTMLButtonElement).addEventListener('click', () => (mic.stream ? mic.stop() : void mic.start()));
  show();
}
