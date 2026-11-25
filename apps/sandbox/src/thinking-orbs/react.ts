import { StrictMode, createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThinkingOrb } from '@runeglow/react/thinking-orbs';
import { STATES } from './states';

function App() {
  const [step, setStep] = useState(0);
  const state = STATES[step % STATES.length];
  return h(
    'div',
    null,
    h(
      'div',
      { className: 'row' },
      h(ThinkingOrb, { size: 64, state }),
      h(ThinkingOrb, { size: 32, color: '#7aa2ff', state }),
      h(ThinkingOrb, { size: 20, theme: 'dark', state }),
      h(ThinkingOrb, { size: 64, dots: 0.5, dotSize: 1.5, speed: 0.5, state, className: 'mine' }),
    ),
    h('p', null, h('button', { id: 'next', type: 'button', onClick: () => setStep(step + 1) }, 'Next state'), ' ', h('output', { id: 'state' }, state)),
  );
}

// StrictMode mounts every effect twice in development: the adapters have to survive that.
export default function page(app: HTMLElement) {
  createRoot(app).render(h(StrictMode, null, h(App)));
}
