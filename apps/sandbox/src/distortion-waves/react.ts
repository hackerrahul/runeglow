import { StrictMode, createElement as h, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DistortionWave, type DistortionWaveRef } from '@runeglow/react/distortion-waves';
import { CSS, TYPES, status } from './demo';

function App() {
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState<{ count: number; last: boolean | null }>({ count: 0, last: null });
  const inbox = useRef<DistortionWaveRef>(null);
  const type = TYPES[step % TYPES.length];
  return h(
    'div',
    null,
    h('style', null, CSS),
    h(
      'div',
      { className: 'row' },
      h(
        DistortionWave,
        {
          className: 'dw-card',
          type,
          revealed,
          onFinish: (now) => setFinished((f) => ({ count: f.count + 1, last: now })),
          revealedContent: h('div', { className: 'dw-view done' }, h('b', null, 'Sent'), h('span', null, '$240.00 to Maya Chen')),
          overlay: h('button', { id: 'send', className: 'dw-go', type: 'button', onClick: () => setRevealed(!revealed) }, revealed ? 'Done' : 'Confirm'),
        },
        h('div', { className: 'dw-view' }, h('b', null, 'Send $240.00'), h('span', null, 'To Maya Chen, today')),
      ),
      h(
        DistortionWave,
        {
          ref: inbox,
          className: 'dw-card',
          type: 'horizontal',
          palette: 'mono',
          overlay: h('button', { id: 'refresh', className: 'dw-go', type: 'button', onClick: (e) => inbox.current?.play({ source: e.currentTarget }) }, 'Refresh'),
        },
        h('div', { className: 'dw-view' }, h('b', null, 'Inbox'), h('span', null, '3 new messages')),
      ),
    ),
    h(
      'p',
      null,
      h('button', { id: 'next', type: 'button', onClick: () => setStep(step + 1) }, 'Next type'),
      ' ',
      h('output', { id: 'state' }, status(type, revealed, finished.count, finished.last)),
    ),
  );
}

// StrictMode mounts every effect twice in development: the adapters have to survive that.
export default function page(app: HTMLElement) {
  createRoot(app).render(h(StrictMode, null, h(App)));
}
