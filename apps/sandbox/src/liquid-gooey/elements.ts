import '@runeglow/elements/liquid-gooey';
import type { LiquidItemElement } from '@runeglow/elements/liquid-gooey';
import { APART, BLURS, BUTTONS, FILL, PICTURES, SATELLITES, SHADOW, SLIDE, TOUCHING, styles, summary } from './demo';

export default function page(app: HTMLElement) {
  styles();
  // the tags as a page would write them; a record is JSON in an attribute
  app.innerHTML = `
    <div class="lg">
      <div class="lg-panel">
        <runeglow-liquid class="lg-menu" id="menu" fill="${FILL}" shadow="${SHADOW}" blur="${BLURS[0]}">
          ${SATELLITES.map(
            (s, i) => `<runeglow-liquid-item class="lg-slot" transition="bouncy" delay="${i * 40}"><button class="lg-btn lg-sat" type="button" aria-label="${s.label}">${s.label[0]}</button></runeglow-liquid-item>`,
          ).join('')}
          <runeglow-liquid-item class="lg-slot"><button id="plus" class="lg-btn" type="button" aria-label="Menu">+</button></runeglow-liquid-item>
        </runeglow-liquid>
      </div>
      <div class="lg-panel">
        <runeglow-liquid class="lg-track" fill="#5a5a5a">
          <runeglow-liquid-item effect="move" move='{"stretch":0.6,"trail":0.5}'><div id="thumb" class="lg-thumb"></div></runeglow-liquid-item>
        </runeglow-liquid>
      </div>
      <div class="lg-panel">
        <runeglow-liquid class="lg-stage">
          ${PICTURES.map((src, i) => `<runeglow-liquid-item effect="melt"><div class="lg-card" style="left: ${APART[i]}px"><img src="${src}" alt=""></div></runeglow-liquid-item>`).join('')}
        </runeglow-liquid>
      </div>
    </div>
    <p>${BUTTONS} <output id="state"></output></p>`;
  const $ = <T extends HTMLElement>(selector: string) => app.querySelector(selector) as T;

  const satellites = [...app.querySelectorAll<LiquidItemElement>('#menu runeglow-liquid-item')].slice(0, SATELLITES.length);
  const cards = [...app.querySelectorAll<HTMLElement>('.lg-card')];
  let open = false, blur = 0, slid = false, touching = false;
  const show = () => {
    satellites.forEach((item, i) => {
      // one option by attribute, one by property: both have to work
      item.setAttribute('x', String(open ? SATELLITES[i].x : 0));
      item.y = open ? SATELLITES[i].y : 0;
    });
    $('#menu').classList.toggle('open', open);
    // `blur` is an attribute only: an element's blur() is already something else
    $('#menu').setAttribute('blur', String(BLURS[blur]));
    $('#thumb').style.transform = `translateX(${slid ? SLIDE : 0}px)`;
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
