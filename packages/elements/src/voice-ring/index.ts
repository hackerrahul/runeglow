/* The voice ring and the voice orbs as HTML tags. Importing this file
   registers them:

     <runeglow-voice-ring size="240" state="listening"></runeglow-voice-ring>
     <runeglow-voice-orb type="swell" size="160" accent="green"></runeglow-voice-orb>

   Every option is a property, and an attribute too wherever text can say
   it: `level` and `direction` as numbers, `hover-bend` alone or as a
   number, `emotion-colors` and `opts` as JSON. A stream, an analyser, the
   element to lean within, a getter for `level` or `direction`, `frame` and
   the `onLevel` callback are properties only. See `orbElement`. */

import { mountVoiceOrb, mountVoiceRing, voiceOrbOptionKinds, voiceRingOptionKinds, type VoiceOrbOptions, type VoiceRingOptions } from 'runeglow/voice-ring';
import { define } from '../internal/element.js';
import { flagOrRecord, orbElement, type AttributeReaders } from '../thinking-orbs/element.js';

/* what no attribute can carry, and the one that is a flag or a number */
const READERS: AttributeReaders<VoiceRingOptions> = {
  stream: null,
  analyser: null,
  directionBounds: null,
  onLevel: null,
  hoverBend: flagOrRecord,
};

/** `<runeglow-voice-ring>`: a ring of light that bends with a voice. */
export const VoiceRingElement = orbElement<VoiceRingOptions>(voiceRingOptionKinds, mountVoiceRing, READERS);
export type VoiceRingElement = InstanceType<typeof VoiceRingElement>;

/** `<runeglow-voice-orb>`: any of the voice orbs, by `type`. */
export const VoiceOrbElement = orbElement<VoiceOrbOptions>(voiceOrbOptionKinds, mountVoiceOrb, { ...READERS, frame: null });
export type VoiceOrbElement = InstanceType<typeof VoiceOrbElement>;

define('runeglow-voice-ring', VoiceRingElement);
define('runeglow-voice-orb', VoiceOrbElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-voice-ring': VoiceRingElement;
    'runeglow-voice-orb': VoiceOrbElement;
  }
}

/* The option types, the presets, the followers, the audio plumbing and the
   microphone are the core's, the same in every framework. */
export * from 'runeglow/voice-ring';
