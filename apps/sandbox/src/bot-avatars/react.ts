import { StrictMode, createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BotAvatar, RobotHead } from '@runeglow/react/bot-avatars';
import { AVATAR, ROBOT } from './states';

function App() {
  const [step, setStep] = useState(0);
  const robot = ROBOT[step % ROBOT.length], avatar = AVATAR[step % AVATAR.length];
  return h(
    'div',
    null,
    h(
      'div',
      { className: 'row' },
      h(BotAvatar, { type: 'cat', size: 96, headphones: true, state: avatar }),
      h(BotAvatar, { type: 'hexagon', shading: 'crisp', size: 96, interactive: false, state: avatar }),
      h(RobotHead, { shape: 'circle', colorway: 'tangerine', size: 140, floorShadow: false, state: robot }),
      h(RobotHead, { size: 140, state: robot, className: 'mine', onClick: () => console.info('clicked') }),
    ),
    h('p', null, h('button', { id: 'next', type: 'button', onClick: () => setStep(step + 1) }, 'Next state'), ' ', h('output', { id: 'state' }, `${robot} / ${avatar}`)),
  );
}

// StrictMode mounts every effect twice in development: the adapters have to survive that.
export default function page(app: HTMLElement) {
  createRoot(app).render(h(StrictMode, null, h(App)));
}
