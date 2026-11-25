/* The voice glow as an HTML tag. Importing this file registers it:

     <runeglow-voice-beam type="pill" color-variant="ocean">
       <button>Recording…</button>
     </runeglow-voice-beam>

   The element is the beam's host: what is written inside it is the content
   the glow wraps, and the beam adds its layers and its stylesheet after it,
   in the page's own DOM (the glow's stylesheet registers custom properties,
   which a shadow root cannot). Every option is a property, and an attribute
   too wherever text can say it: `colors`, `band-colors` and `motion` are
   written as JSON, `level` as a number. `stream`, a getter for `level` or
   `motion`, and the `onLevel` / `onActivate` / `onDeactivate` callbacks are
   properties only; the end of a fade is also an `activate` or `deactivate`
   event on the element. */

import { mountVoiceBeam, voiceBeamOptionKinds, type VoiceBeamOptions } from 'runeglow/voice-glow';
import { define } from '../internal/element.js';
import { hostElement } from '../thinking-orbs/element.js';

/* The element is a block, as the wrapper is in every framework; `:where`
   keeps that out of the way of the page's own rule for it. One sheet per
   document or shadow root the element is used in. */
const styled = new WeakSet<Node>();
function layOut(host: HTMLElement) {
  const root = host.getRootNode();
  if (styled.has(root)) return;
  styled.add(root);
  const style = host.ownerDocument.createElement('style');
  style.textContent = ':where(runeglow-voice-beam){display:block}:where(runeglow-voice-beam[hidden]){display:none}';
  (root instanceof Document ? root.head : root).appendChild(style);
}

/** `<runeglow-voice-beam>`: a sound-reactive glow along the bottom edge of its content. */
export const VoiceBeamElement = hostElement<VoiceBeamOptions>(
  voiceBeamOptionKinds,
  (host, options) => {
    layOut(host);
    /* the fades' ends are events as well as callbacks */
    const told = (o: VoiceBeamOptions): VoiceBeamOptions => ({
      ...o,
      onActivate() {
        o.onActivate?.();
        host.dispatchEvent(new CustomEvent('activate'));
      },
      onDeactivate() {
        o.onDeactivate?.();
        host.dispatchEvent(new CustomEvent('deactivate'));
      },
    });
    const beam = mountVoiceBeam(host, told(options));
    return { update: (next) => beam.update(told(next)), destroy: beam.destroy };
  },
  { stream: null, onLevel: null, onActivate: null, onDeactivate: null },
);
export type VoiceBeamElement = InstanceType<typeof VoiceBeamElement>;

define('runeglow-voice-beam', VoiceBeamElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-voice-beam': VoiceBeamElement;
  }
}

/* The option types, the presets, the palettes, the audio plumbing and the
   microphone are the core's, the same in every framework. */
export * from 'runeglow/voice-glow';
