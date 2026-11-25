import { attachImageGeneration, mountImageGeneration, type ImageGenerationCycleEvent, type ImageGenerationOptions } from 'runeglow/img-fx';
import { CARD, CONTROLS, IMAGES, PRESET_NAMES, SMALL_CARD } from './demo';

export default function page(app: HTMLElement) {
  // the wrappers are elements the page already has, each round its card
  app.innerHTML = `
    <div class="row">
      <div id="cover"><div style="${CARD}"></div></div>
      <div id="auto"><div style="${SMALL_CARD}"></div></div>
    </div>${CONTROLS}`;

  let step = 0, paused = false;
  let phase: ImageGenerationCycleEvent['phase'] = 'idle';
  const output = app.querySelector('#state') as HTMLOutputElement;
  const show = () => (output.textContent = `${PRESET_NAMES[step % PRESET_NAMES.length]} / ${phase}${paused ? ' / paused' : ''}`);

  // `mount…` takes only what changes; `attach…` the whole set each time
  const cover = mountImageGeneration(app.querySelector('#cover') as HTMLElement, {
    theme: 'dark',
    images: IMAGES,
    onCycle: (event) => {
      phase = event.phase;
      show();
    },
  });
  const auto: ImageGenerationOptions = { preset: 'sweep-gradient', theme: 'dark', images: IMAGES, autoReveal: true, revealDelayRange: [1, 2], revealHoldMs: 1500 };
  const small = attachImageGeneration(app.querySelector('#auto') as HTMLElement, auto);

  const on = (id: string, run: () => void) => (app.querySelector(id) as HTMLButtonElement).addEventListener('click', run);
  on('#reveal', () => (cover.isImageActive() ? cover.triggerHide() : cover.triggerReveal({ hold: 'manual' })));
  on('#regen', () => cover.triggerRegenerate({ durationMs: 1500 }));
  on('#next', () => {
    step++;
    cover.update({ preset: PRESET_NAMES[step % PRESET_NAMES.length] });
    show();
  });
  on('#pause', () => {
    paused = !paused;
    cover.update({ paused });
    small.update({ ...auto, paused });
    show();
  });
  show();
}
