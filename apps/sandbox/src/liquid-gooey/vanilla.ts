import { liquidGroupOf, mountLiquid } from 'runeglow/liquid-gooey';
import { APART, BLURS, BUTTONS, FILL, PICTURES, SATELLITES, SHADOW, SLIDE, TOUCHING, styles, summary } from './demo';

export default function page(app: HTMLElement) {
  styles();
  // The page's own elements: the liquid is drawn behind them, where they are.
  app.innerHTML = `
    <div class="lg">
      <div class="lg-panel"><div class="lg-menu" id="menu">
        ${SATELLITES.map((s) => `<button class="lg-slot lg-btn lg-sat" type="button" aria-label="${s.label}">${s.label[0]}</button>`).join('')}
        <button class="lg-slot lg-btn" id="plus" type="button" aria-label="Menu">+</button>
      </div></div>
      <div class="lg-panel"><div class="lg-track" id="track"><div class="lg-thumb" id="thumb"></div></div></div>
      <div class="lg-panel"><div class="lg-stage" id="stage">
        ${PICTURES.map((src, i) => `<div class="lg-card" style="left: ${APART[i]}px"><img src="${src}" alt=""></div>`).join('')}
      </div></div>
    </div>
    <p>${BUTTONS} <output id="state"></output></p>`;
  const $ = <T extends HTMLElement>(selector: string) => app.querySelector(selector) as T;

  // One piece is made before its group is, through the group object the
  // element will have: it waits, and joins when the group is mounted.
  const menuElement = $('#menu');
  liquidGroupOf(menuElement).item($('#plus'));
  const menu = mountLiquid(menuElement, { fill: FILL, shadow: SHADOW, blur: BLURS[0] });
  const satellites = [...menuElement.querySelectorAll<HTMLElement>('.lg-sat')].map((button, i) =>
    menu.item(button, { transition: 'bouncy', delay: i * 40 }),
  );

  const track = mountLiquid($('#track'), { fill: '#5a5a5a' });
  const thumb = $('#thumb');
  track.item(thumb, { effect: 'move', move: { stretch: 0.6, trail: 0.5 } });

  const stage = mountLiquid($('#stage'));
  const cards = [...app.querySelectorAll<HTMLElement>('.lg-card')];
  for (const card of cards) stage.item(card, { effect: 'melt' });

  let open = false, blur = 0, slid = false, touching = false;
  const show = () => {
    satellites.forEach((item, i) => item.update({ x: open ? SATELLITES[i].x : 0, y: open ? SATELLITES[i].y : 0 }));
    menuElement.classList.toggle('open', open);
    menu.update({ blur: BLURS[blur] });
    thumb.style.transform = `translateX(${slid ? SLIDE : 0}px)`;
    cards.forEach((card, i) => (card.style.left = `${(touching ? TOUCHING : APART)[i]}px`));
    $('#state').textContent = summary(open, BLURS[blur], slid, touching);
  };
  const on = (id: string, act: () => void) =>
    $(id).addEventListener('click', () => {
      act();
      show();
    });
  on('#toggle', () => (open = !open));
  on('#plus', () => (open = !open));
  on('#blur', () => (blur = (blur + 1) % BLURS.length));
  on('#slide', () => (slid = !slid));
  on('#touch', () => (touching = !touching));
  show();
}
