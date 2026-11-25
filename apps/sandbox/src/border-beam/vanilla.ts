import { attachBorderBeam, mountBorderBeam, type BorderBeamOptions } from 'runeglow/border-beam';
import { COLORS, CSS, status } from './demo';

export default function page(app: HTMLElement) {
  // the wrappers as a page would write them: the beam is attached to each
  app.innerHTML = `
    <style>${CSS}</style>
    <div class="row">
      <div id="one"><div class="bb-card">md</div></div>
      <div id="two"><div class="bb-card">md again</div></div>
      <div id="pulse"><div class="bb-card">pulse-outside</div></div>
    </div>
    <p><button id="next" type="button">Next colour</button> <button id="toggle" type="button">On / off</button> <output id="state"></output></p>`;
  const row = app.querySelector('.row') as HTMLElement;
  const el = (id: string) => app.querySelector(`#${id}`) as HTMLElement;

  let step = 0, active = true, on = 0, off = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const say = () => (output.textContent = status(COLORS[step % COLORS.length], active, on, off));
  const hooks = { onActivate: () => (on++, say()), onDeactivate: () => (off++, say()) };

  // the first two say the same thing, so they share one stylesheet
  const md: BorderBeamOptions = { size: 'md' };
  const one = attachBorderBeam(el('one'), md, hooks);
  const two = attachBorderBeam(el('two'), md);
  const pulse = attachBorderBeam(el('pulse'), { size: 'pulse-outside' });

  // and one whose wrapper the library makes
  const pill = document.createElement('div');
  pill.className = 'bb-card bb-pill';
  pill.textContent = 'line';
  const line = mountBorderBeam(row, { content: pill, size: 'line' });

  const show = () => {
    const colorVariant = COLORS[step % COLORS.length];
    // attach takes the whole set each time; mount takes what changed
    one.update({ size: 'md', colorVariant, active });
    two.update({ size: 'md', colorVariant, active });
    pulse.update({ size: 'pulse-outside', colorVariant, active });
    line.update({ colorVariant, active });
    say();
  };
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    show();
  });
  (app.querySelector('#toggle') as HTMLButtonElement).addEventListener('click', () => {
    active = !active;
    show();
  });
  show();
}
