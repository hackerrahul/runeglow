import { StrictMode, createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceOrb, VoiceRing, useMicrophone } from '@runeglow/react/voice-ring';
import { EMOTIONS, STATES, summary, voice } from './demo';

function App() {
  const [step, setStep] = useState(0);
  const [feel, setFeel] = useState(0);
  const mic = useMicrophone();
  const state = STATES[step % STATES.length], emotion = EMOTIONS[feel % EMOTIONS.length];
  return h(
    'div',
    null,
    h(
      'div',
      { className: 'row' },
      // the ring hears the microphone once there is one; a stream wins over the level
      h(VoiceRing, { size: 200, level: voice, stream: mic.stream, state, emotion }),
      // a voice from the right: the ring leans that way, and its canvas reaches out for the room
      h(VoiceRing, { type: 'mono', size: 160, level: voice, direction: 0.8, state, emotion }),
      h(VoiceOrb, { type: 'swell', size: 140, level: voice, accent: 'green', state, emotion }),
      h(VoiceOrb, { type: 'pixel', size: 96, level: voice, theme: 'dark', state, emotion, className: 'mine' }),
    ),
    h(
      'p',
      null,
      h('button', { id: 'next', type: 'button', onClick: () => setStep(step + 1) }, 'Next state'),
      ' ',
      h('button', { id: 'feel', type: 'button', onClick: () => setFeel(feel + 1) }, 'Next emotion'),
      ' ',
      h('button', { id: 'listen', type: 'button', onClick: () => (mic.stream ? mic.stop() : void mic.start()) }, 'Listen'),
      ' ',
      h('output', { id: 'state' }, summary(state, emotion, mic.state)),
    ),
  );
}

// StrictMode mounts every effect twice in development: the adapters have to survive that.
export default function page(app: HTMLElement) {
  createRoot(app).render(h(StrictMode, null, h(App)));
}
