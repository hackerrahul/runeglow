import { attachMetalBend, attachMetalTextReflection, mountMetalBadge, mountMetalFx, mountMetalText } from 'runeglow/metal-fx';
import { FONT, LOOKS, demoStyles, say } from './demo';

export default function page(app: HTMLElement) {
  demoStyles();
  // the page as it would be without metal: the rings go round the two buttons where they stand
  app.innerHTML = `
    <div class="row mfx-row">
      <div class="mfx-chip" id="chip">Tools</div>
      <button class="mfx-send" id="send" type="button" aria-label="Send">↑</button>
      <button class="mfx-pill" id="upgrade" type="button">Upgrade to Pro</button>
      <span class="mfx-line"><span id="plan">Plan</span><span id="word"></span></span>
      <span class="mfx-line">Live mode <span id="badge"></span></span>
    </div>
    <p><button id="next" type="button">Next look</button> <button id="toggle" type="button">Remove</button> <output id="state"></output></p>`;
  const find = <T extends HTMLElement>(id: string) => app.querySelector(`#${id}`) as T;
  const chip = find('chip'), plan = find('plan');

  let step = 0;
  let undo: (() => void) | null = null;
  const mount = () => {
    const look = LOOKS[step % LOOKS.length];
    const send = mountMetalFx(find('send'), { variant: 'circle', theme: 'dark', preset: look.preset, innerShadow: true, reflectionTargets: [chip] });
    const unbend = attachMetalBend(send.element);
    const upgrade = mountMetalFx(find('upgrade'), { theme: 'dark', preset: look.preset, strength: 0.63, class: 'mine' });
    const word = mountMetalText(find('word'), { text: look.word, font: FONT, color: '#e2e2e2', theme: 'dark', strength: 0.9, reflectionTargets: [{ el: plan, strength: 0.64 }] });
    const unreflect = attachMetalTextReflection(plan);
    const badge = mountMetalBadge(find('badge'), { theme: 'dark', strength: 0.9, scale: look.scale });
    show = () => {
      const next = LOOKS[step % LOOKS.length];
      send.update({ preset: next.preset });
      upgrade.update({ preset: next.preset });
      word.update({ text: next.word });
      badge.update({ scale: next.scale });
    };
    return () => {
      unbend();
      unreflect();
      for (const mounted of [send, upgrade, word, badge]) mounted.destroy();
    };
  };
  let show = () => {};
  undo = mount();

  const output = find<HTMLOutputElement>('state');
  const toggle = find<HTMLButtonElement>('toggle');
  const tell = () => {
    output.textContent = say(step, !!undo);
    toggle.textContent = undo ? 'Remove' : 'Put back';
  };
  find('next').addEventListener('click', () => {
    step++;
    if (undo) show();
    tell();
  });
  // every ring gone and then back: the shared renderer is torn down and has to start again
  toggle.addEventListener('click', () => {
    if (undo) {
      undo();
      undo = null;
    } else undo = mount();
    tell();
  });
  tell();
}
