import { StrictMode, createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceBeam, useMicrophone } from '@runeglow/react/voice-glow';
import { PALETTES, styles, summary, voice } from './demo';

function App() {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(true);
  const mic = useMicrophone();
  const colorVariant = PALETTES[step % PALETTES.length];
  return h(
    'div',
    null,
    h(
      'div',
      { className: 'row' },
      // the composer hears the microphone once there is one; a stream wins over the level
      h(VoiceBeam, { id: 'composer', level: voice, stream: mic.stream, colorVariant, active }, h('div', { className: 'vg-box' }, 'Ask anything…')),
      h(VoiceBeam, { id: 'pill', type: 'pill', level: voice, colorVariant, active, className: 'mine' }, h('div', { className: 'vg-pill' }, '00:04')),
    ),
    h(
      'p',
      { className: 'vg-controls' },
      h('button', { id: 'next', type: 'button', onClick: () => setStep(step + 1) }, 'Next palette'),
      h('button', { id: 'active', type: 'button', onClick: () => setActive(!active) }, 'Toggle active'),
      h('button', { id: 'listen', type: 'button', onClick: () => (mic.stream ? mic.stop() : void mic.start()) }, 'Listen'),
      h('output', { id: 'state' }, summary(colorVariant, active, mic.state)),
    ),
  );
}

// StrictMode mounts every effect twice in development: the adapters have to survive that.
export default function page(app: HTMLElement) {
  styles();
  createRoot(app).render(h(StrictMode, null, h(App)));
}
