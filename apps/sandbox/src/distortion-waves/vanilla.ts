import { attachDistortionWave, mountDistortionWave, type DistortionWaveOptions } from 'runeglow/distortion-waves';
import { CSS, TYPES, status } from './demo';

export default function page(app: HTMLElement) {
  // the first card as a page would write it: the wave is attached to it
  app.innerHTML = `
    <style>${CSS}</style>
    <div class="row">
      <div id="card" class="dw-card">
        <div class="dw-view"><b>Send $240.00</b><span>To Maya Chen, today</span></div>
        <div class="dw-view done"><b>Sent</b><span>$240.00 to Maya Chen</span></div>
        <div><button id="send" class="dw-go" type="button">Confirm</button></div>
      </div>
    </div>
    <p><button id="next" type="button">Next type</button> <output id="state"></output></p>`;
  const row = app.querySelector('.row') as HTMLElement;
  const card = app.querySelector('#card') as HTMLElement;
  const send = app.querySelector('#send') as HTMLButtonElement;
  const [first, second, over] = card.children as unknown as HTMLElement[];

  let step = 0, revealed = false, finished = 0, last: boolean | null = null;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const say = () => {
    output.textContent = status(TYPES[step % TYPES.length], revealed, finished, last);
    send.textContent = revealed ? 'Done' : 'Confirm';
  };
  // attach takes the whole set of options each time
  const options = (): DistortionWaveOptions => ({ type: TYPES[step % TYPES.length], revealed });
  const wave = attachDistortionWave(card, { content: first, revealed: second, overlay: over }, options(), {
    onFinish: (now) => {
      finished++;
      last = now;
      say();
    },
  });
  send.addEventListener('click', () => {
    revealed = !revealed;
    wave.update(options());
    say();
  });
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    wave.update(options());
    say();
  });

  // the second card is made by the library, round a view it is handed
  const view = document.createElement('div');
  view.className = 'dw-view';
  view.innerHTML = '<b>Inbox</b><span>3 new messages</span>';
  const refresh = document.createElement('button');
  refresh.id = 'refresh';
  refresh.className = 'dw-go';
  refresh.type = 'button';
  refresh.textContent = 'Refresh';
  const inbox = mountDistortionWave(row, { content: view, overlay: refresh, class: 'dw-card', type: 'horizontal', palette: 'mono' });
  refresh.addEventListener('click', () => inbox.play({ source: refresh }));
  say();
}
