'use client';

import { createElement, forwardRef } from 'react';
import type { VoiceRingType } from 'runeglow/voice-ring';
import { VoiceOrb, type VoiceOrbProps } from './VoiceOrb.js';

export type VoiceRingProps = Omit<VoiceOrbProps, 'type' | 'frame'> & {
  /**
   * How the ring is drawn: `ring`, a glassy ribbon with a spectrum running
   * round it, or `mono`, two loops of grey tube that a voice opens into a
   * turning globe, an emotion colouring the tube. @default 'ring'
   */
  type?: VoiceRingType;
};

const ORB_TYPE = { ring: 'aura', mono: 'aura-mono' } as const;

/**
 * The aura types of the voice orbs, on their own. `ring`: rings drawn in
 * light, a blooming spectrum with chromatic fringes that bends with the
 * voice and leans toward where it comes from. `mono`: the same rings as two
 * loops of grey tube, which a voice opens into a turning globe.
 *
 *   const mic = useMicrophone();
 *   <VoiceRing size={240} state="listening" stream={mic.stream} />
 */
export const VoiceRing = forwardRef<HTMLCanvasElement, VoiceRingProps>(function VoiceRing({ type = 'ring', ...props }, ref) {
  // A voice-reactive ring: VoiceOrb with its type fixed to one of the two aura types.
  return createElement(VoiceOrb, { ...props, type: ORB_TYPE[type] ?? ORB_TYPE.ring, ref });
});
