import '@runeglow/elements/img-fx';
import type { ImageGenerationCycleEvent } from '@runeglow/elements/img-fx';
import { CARD, CONTROLS, IMAGES, PRESET_NAMES, SMALL_CARD } from './demo';

export default function page(app: HTMLElement) {
  // the tags as a page would write them, each round its card
  app.innerHTML = `
    <div class="row">
      <runeglow-image-generation id="cover" theme="dark"><div style="${CARD}"></div></runeglow-image-generation>
      <runeglow-image-generation id="auto" preset="sweep-gradient" theme="dark" auto-reveal reveal-delay-range="[1, 2]" reveal-hold-ms="1500"><div style="${SMALL_CARD}"></div></runeglow-image-generation>
    </div>${CONTROLS}`;
  const [cover, auto] = app.querySelectorAll('runeglow-image-generation');
  // one list by property, one by attribute: both have to work
  cover.images = IMAGES;
  auto.setAttribute('images', JSON.stringify(IMAGES));

  let step = 0, paused = false;
  let phase: ImageGenerationCycleEvent['phase'] = 'idle';
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => (output.textContent = `${PRESET_NAMES[step % PRESET_NAMES.length]} / ${phase}${paused ? ' / paused' : ''}`);
  cover.addEventListener('cycle', (event) => {
    phase = event.detail.phase;
    show();
  });

  const on = (id: string, run: () => void) => (app.querySelector(id) as HTMLButtonElement).addEventListener('click', run);
  on('#reveal', () => (cover.isImageActive() ? cover.triggerHide() : cover.triggerReveal({ hold: 'manual' })));
  on('#regen', () => cover.triggerRegenerate({ durationMs: 1500 }));
  on('#next', () => {
    step++;
    cover.setAttribute('preset', PRESET_NAMES[step % PRESET_NAMES.length]);
    show();
  });
  on('#pause', () => {
    paused = !paused;
    cover.paused = paused;
    if (paused) auto.setAttribute('paused', '');
    else auto.removeAttribute('paused');
    show();
  });
  show();
}
