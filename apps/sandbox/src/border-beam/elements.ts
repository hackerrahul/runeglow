import '@runeglow/elements/border-beam';
import { COLORS, CSS, status } from './demo';

export default function page(app: HTMLElement) {
  // the tags as a page would write them
  app.innerHTML = `
    <style>${CSS}</style>
    <div class="row">
      <runeglow-border-beam id="one" size="md"><div class="bb-card">md</div></runeglow-border-beam>
      <runeglow-border-beam size="md"><div class="bb-card">md again</div></runeglow-border-beam>
      <runeglow-border-beam size="pulse-outside"><div class="bb-card">pulse-outside</div></runeglow-border-beam>
      <runeglow-border-beam id="by-property" size="line"><div class="bb-card bb-pill">line</div></runeglow-border-beam>
    </div>
    <p><button id="next" type="button">Next colour</button> <button id="toggle" type="button">On / off</button> <output id="state"></output></p>`;

  let step = 0, active = true, on = 0, off = 0;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const say = () => (output.textContent = status(COLORS[step % COLORS.length], active, on, off));
  const one = app.querySelector('#one') as HTMLElement;
  one.addEventListener('activate', () => (on++, say()));
  one.addEventListener('deactivate', () => (off++, say()));

  const show = () => {
    const colorVariant = COLORS[step % COLORS.length];
    for (const el of app.querySelectorAll('runeglow-border-beam')) {
      // one by property, the rest by attribute: both have to work
      if (el.id === 'by-property') {
        el.colorVariant = colorVariant;
        el.active = active;
      } else {
        el.setAttribute('color-variant', colorVariant);
        el.setAttribute('active', String(active));
      }
    }
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
