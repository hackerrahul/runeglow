import '@runeglow/elements/distortion-waves';
import { CSS, TYPES, status } from './demo';

export default function page(app: HTMLElement) {
  // the tags as a page would write them: each view is a child, named by `slot`
  app.innerHTML = `
    <style>${CSS}</style>
    <div class="row">
      <runeglow-distortion-wave id="card" class="dw-card">
        <div class="dw-view"><b>Send $240.00</b><span>To Maya Chen, today</span></div>
        <div slot="revealed" class="dw-view done"><b>Sent</b><span>$240.00 to Maya Chen</span></div>
        <div slot="overlay"><button id="send" class="dw-go" type="button">Confirm</button></div>
      </runeglow-distortion-wave>
      <runeglow-distortion-wave id="inbox" class="dw-card" type="horizontal" palette="mono" source="#refresh">
        <div class="dw-view"><b>Inbox</b><span>3 new messages</span></div>
        <div slot="overlay"><button id="refresh" class="dw-go" type="button">Refresh</button></div>
      </runeglow-distortion-wave>
    </div>
    <p><button id="next" type="button">Next type</button> <output id="state"></output></p>`;
  const card = app.querySelector('#card') as HTMLElementTagNameMap['runeglow-distortion-wave'];
  const inbox = app.querySelector('#inbox') as HTMLElementTagNameMap['runeglow-distortion-wave'];
  const send = app.querySelector('#send') as HTMLButtonElement;

  let step = 0, revealed = false, finished = 0, last: boolean | null = null;
  const output = app.querySelector('#state') as HTMLOutputElement;
  const say = () => {
    output.textContent = status(TYPES[step % TYPES.length], revealed, finished, last);
    send.textContent = revealed ? 'Done' : 'Confirm';
  };
  card.addEventListener('finish', (e) => {
    finished++;
    last = (e as CustomEvent<{ revealed: boolean }>).detail.revealed;
    say();
  });
  // one option by property, one by attribute: both have to work
  send.addEventListener('click', () => {
    revealed = !revealed;
    card.revealed = revealed;
    say();
  });
  (app.querySelector('#next') as HTMLButtonElement).addEventListener('click', () => {
    step++;
    card.setAttribute('type', TYPES[step % TYPES.length]);
    say();
  });
  (app.querySelector('#refresh') as HTMLButtonElement).addEventListener('click', () => inbox.play());
  say();
}
