import { StrictMode, createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BorderBeam } from '@runeglow/react/border-beam';
import { COLORS, CSS, status } from './demo';

function App() {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(true);
  const [faded, setFaded] = useState({ on: 0, off: 0 });
  const colorVariant = COLORS[step % COLORS.length];
  return h(
    'div',
    null,
    h('style', null, CSS),
    h(
      'div',
      { className: 'row' },
      h(
        BorderBeam,
        {
          size: 'md',
          colorVariant,
          active,
          onActivate: () => setFaded((f) => ({ ...f, on: f.on + 1 })),
          onDeactivate: () => setFaded((f) => ({ ...f, off: f.off + 1 })),
        },
        h('div', { className: 'bb-card' }, 'md'),
      ),
      h(BorderBeam, { size: 'md', colorVariant, active, className: 'mine' }, h('div', { className: 'bb-card' }, 'md again')),
      h(BorderBeam, { size: 'pulse-outside', colorVariant, active }, h('div', { className: 'bb-card' }, 'pulse-outside')),
      h(BorderBeam, { size: 'line', colorVariant, active }, h('div', { className: 'bb-card bb-pill' }, 'line')),
    ),
    h(
      'p',
      null,
      h('button', { id: 'next', type: 'button', onClick: () => setStep(step + 1) }, 'Next colour'),
      ' ',
      h('button', { id: 'toggle', type: 'button', onClick: () => setActive(!active) }, 'On / off'),
      ' ',
      h('output', { id: 'state' }, status(colorVariant, active, faded.on, faded.off)),
    ),
  );
}

// StrictMode mounts every effect twice in development: the adapters have to survive that.
export default function page(app: HTMLElement) {
  createRoot(app).render(h(StrictMode, null, h(App)));
}
