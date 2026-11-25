import { StrictMode, createElement as h, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MetalBadge, MetalFx, MetalText, useMetalBend, useMetalTextReflection } from '@runeglow/react/metal-fx';
import { FONT, LOOKS, demoStyles, say } from './demo';

function App() {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(true);
  const look = LOOKS[step % LOOKS.length];

  const chip = useRef<HTMLDivElement>(null);
  const plan = useRef<HTMLSpanElement>(null);
  const send = useRef<HTMLDivElement>(null);
  useMetalBend(send);
  useMetalTextReflection(plan);

  return h(
    'div',
    null,
    h(
      'div',
      { className: 'row mfx-row' },
      h('div', { className: 'mfx-chip', ref: chip }, 'Tools'),
      // the targets as refs: they are read once the chip is in the page
      shown && h(MetalFx, { ref: send, variant: 'circle', theme: 'dark', preset: look.preset, innerShadow: true, reflectionTargets: [chip] }, h('button', { className: 'mfx-send', type: 'button', 'aria-label': 'Send' }, '↑')),
      shown && h(MetalFx, { theme: 'dark', preset: look.preset, strength: 0.63, className: 'mine', onClick: () => console.info('clicked') }, h('button', { className: 'mfx-pill', type: 'button' }, 'Upgrade to Pro')),
      h(
        'span',
        { className: 'mfx-line' },
        h('span', { ref: plan }, 'Plan'),
        shown && h(MetalText, { text: look.word, font: FONT, color: '#e2e2e2', theme: 'dark', strength: 0.9, reflectionTargets: [{ el: plan, strength: 0.64 }] }),
      ),
      h('span', { className: 'mfx-line' }, 'Live mode ', shown && h(MetalBadge, { theme: 'dark', strength: 0.9, scale: look.scale })),
    ),
    h(
      'p',
      null,
      h('button', { id: 'next', type: 'button', onClick: () => setStep(step + 1) }, 'Next look'),
      ' ',
      // every ring gone and then back: the shared renderer is torn down and has to start again
      h('button', { id: 'toggle', type: 'button', onClick: () => setShown(!shown) }, shown ? 'Remove' : 'Put back'),
      ' ',
      h('output', { id: 'state' }, say(step, shown)),
    ),
  );
}

// StrictMode mounts every effect twice in development: the adapters have to survive that.
export default function page(app: HTMLElement) {
  demoStyles();
  createRoot(app).render(h(StrictMode, null, h(App)));
}
