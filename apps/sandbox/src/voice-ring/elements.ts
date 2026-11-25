import { createMicrophone } from '@runeglow/elements/voice-ring';
import { EMOTIONS, STATES, summary, voice } from './demo';

export default function page(app: HTMLElement) {
  // the tags as a page would write them; the second ring hears a voice from
  // the right, leans that way, and its canvas reaches out for the room
  app.innerHTML = `
    <div class="row">
      <runeglow-voice-ring id="ring" size="200"></runeglow-voice-ring>
      <runeglow-voice-ring type="mono" size="160" direction="0.8"></runeglow-voice-ring>
      <runeglow-voice-orb type="swell" size="140" accent="green"></runeglow-voice-orb>
      <runeglow-voice-orb type="pixel" size="96" theme="dark"></runeglow-voice-orb>
    </div>
    <p>
      <button id="next" type="button">Next state</button>
      <button id="feel" type="button">Next emotion</button>
      <button id="listen" type="button">Listen</button>
      <output id="state"></output>
    </p>`;
  const mic = createMicrophone();
  const ring = app.querySelector('#ring') as HTMLElementTagNameMap['runeglow-voice-ring'];
  const orbs = [...app.querySelectorAll('runeglow-voice-ring, runeglow-voice-orb')] as HTMLElementTagNameMap['runeglow-voice-orb'][];
  // a getter is a property: no attribute can carry it
  for (const orb of orbs) orb.level = voice;

  let step = 0;
  let feel = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => {
    const state = STATES[step % STATES.length], emotion = EMOTIONS[feel % EMOTIONS.length];
    for (const orb of orbs) {
      // one by property, the rest by attribute: both have to work
      if (orb === ring) {
        ring.state = state;
        ring.emotion = emotion;
      } else {
        orb.setAttribute('state', state);
        if (emotion) orb.setAttribute('emotion', emotion);
        else orb.removeAttribute('emotion');
      }
    }
    // the ring hears the microphone once there is one; a stream wins over the level
    ring.stream = mic.stream;
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
