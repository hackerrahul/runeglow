import { StrictMode, createElement as h, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ImageGeneration, type ImageGenerationCycleEvent, type ImageGenerationRef } from '@runeglow/react/img-fx';
import { IMAGES, PRESET_NAMES } from './demo';

function App() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<ImageGenerationCycleEvent['phase']>('idle');
  // the ref holds the reveal functions, and the wrapper as `element`
  const cover = useRef<ImageGenerationRef>(null);
  const preset = PRESET_NAMES[step % PRESET_NAMES.length];
  return h(
    'div',
    null,
    h(
      'div',
      { className: 'row' },
      // the lists are written out afresh on every render, as an app would: that must not count as a change
      h(ImageGeneration, { ref: cover, id: 'cover', className: 'mine', preset, theme: 'dark', paused, images: [...IMAGES], onCycle: (event) => setPhase(event.phase) }, h('div', { style: { width: 240, height: 240, borderRadius: 24 } })),
      h(ImageGeneration, { id: 'auto', preset: 'sweep-gradient', theme: 'dark', paused, images: [...IMAGES], autoReveal: true, revealDelayRange: [1, 2], revealHoldMs: 1500 }, h('div', { style: { width: 140, height: 140, borderRadius: 40 } })),
    ),
    h(
      'p',
      null,
      h('button', { id: 'reveal', type: 'button', onClick: () => (cover.current?.isImageActive() ? cover.current.triggerHide() : cover.current?.triggerReveal({ hold: 'manual' })) }, 'Reveal or hide'),
      ' ',
      h('button', { id: 'regen', type: 'button', onClick: () => cover.current?.triggerRegenerate({ durationMs: 1500 }) }, 'Regenerate'),
      ' ',
      h('button', { id: 'next', type: 'button', onClick: () => setStep(step + 1) }, 'Next preset'),
      ' ',
      h('button', { id: 'pause', type: 'button', onClick: () => setPaused(!paused) }, 'Pause'),
      ' ',
      h('output', { id: 'state' }, `${preset} / ${phase}${paused ? ' / paused' : ''}`),
    ),
  );
}

// StrictMode mounts every effect twice in development: the adapters have to survive that.
export default function page(app: HTMLElement) {
  createRoot(app).render(h(StrictMode, null, h(App)));
}
