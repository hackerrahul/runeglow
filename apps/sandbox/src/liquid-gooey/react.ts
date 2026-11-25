import { StrictMode, createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Liquid, LiquidItem } from '@runeglow/react/liquid-gooey';
import { APART, BLURS, FILL, PICTURES, SATELLITES, SHADOW, SLIDE, TOUCHING, styles, summary } from './demo';

function App() {
  const [open, setOpen] = useState(false);
  const [blur, setBlur] = useState(0);
  const [slid, setSlid] = useState(false);
  const [touching, setTouching] = useState(false);
  const toggle = () => setOpen(!open);
  return h(
    'div',
    null,
    h(
      'div',
      { className: 'lg' },
      h(
        'div',
        { className: 'lg-panel' },
        h(
          Liquid,
          { className: open ? 'lg-menu open' : 'lg-menu', fill: FILL, shadow: SHADOW, blur: BLURS[blur] },
          SATELLITES.map((s, i) =>
            h(
              Liquid.Item,
              { key: s.label, className: 'lg-slot', x: open ? s.x : 0, y: open ? s.y : 0, transition: 'bouncy', delay: i * 40 },
              h('button', { className: 'lg-btn lg-sat', type: 'button', 'aria-label': s.label }, s.label[0]),
            ),
          ),
          h(Liquid.Item, { className: 'lg-slot' }, h('button', { id: 'plus', className: 'lg-btn', type: 'button', 'aria-label': 'Menu', onClick: toggle }, '+')),
        ),
      ),
      h(
        'div',
        { className: 'lg-panel' },
        h(
          Liquid,
          { className: 'lg-track', fill: '#5a5a5a' },
          h(LiquidItem, { effect: 'move', move: { stretch: 0.6, trail: 0.5 } }, h('div', { id: 'thumb', className: 'lg-thumb', style: { transform: `translateX(${slid ? SLIDE : 0}px)` } })),
        ),
      ),
      h(
        'div',
        { className: 'lg-panel' },
        h(
          Liquid,
          { className: 'lg-stage' },
          PICTURES.map((src, i) =>
            h(LiquidItem, { key: src, effect: 'melt' }, h('div', { className: 'lg-card', style: { left: (touching ? TOUCHING : APART)[i] } }, h('img', { src, alt: '' }))),
          ),
        ),
      ),
    ),
    h(
      'p',
      null,
      h('button', { id: 'toggle', type: 'button', onClick: toggle }, 'Open menu'),
      ' ',
      h('button', { id: 'blur', type: 'button', onClick: () => setBlur((blur + 1) % BLURS.length) }, 'Goo blur'),
      ' ',
      h('button', { id: 'slide', type: 'button', onClick: () => setSlid(!slid) }, 'Slide'),
      ' ',
      h('button', { id: 'touch', type: 'button', onClick: () => setTouching(!touching) }, 'Touch'),
      ' ',
      h('output', { id: 'state' }, summary(open, BLURS[blur], slid, touching)),
    ),
  );
}

// StrictMode mounts every effect twice in development: the group and its
// pieces are attached, let go and attached again, in React's order (pieces first).
export default function page(app: HTMLElement) {
  styles();
  createRoot(app).render(h(StrictMode, null, h(App)));
}
