import { defineComponent, h, ref } from 'vue';
import type { VoiceRingOptions } from 'runeglow/voice-ring';
import { VoiceOrb, voiceOrbProps } from './VoiceOrb.js';

const ORB_TYPE = { ring: 'aura', mono: 'aura-mono' } as const;

/* every prop of the orb's but `frame`; `type` is one of the two rings */
const { frame: _frame, ...voiceRingProps } = voiceOrbProps;

/**
 * The aura types of the voice orbs, on their own. `ring`: rings drawn in
 * light, a blooming spectrum with chromatic fringes that bends with the
 * voice and leans toward where it comes from. `mono`: the same rings as two
 * loops of grey tube, which a voice opens into a turning globe. Attributes
 * fall through to the canvas; a template ref gives `element` (the canvas).
 *
 *   <VoiceRing :size="240" state="listening" :stream="mic.stream" />
 */
export const VoiceRing = defineComponent(
  (props: VoiceRingOptions, { expose }) => {
    const orb = ref<{ element: HTMLCanvasElement | null } | null>(null);
    expose({
      get element() {
        return orb.value?.element ?? null;
      },
    });
    // A voice-reactive ring: VoiceOrb with its type fixed to one of the two aura types.
    return () => h(VoiceOrb, { ...props, type: ORB_TYPE[props.type ?? 'ring'] ?? ORB_TYPE.ring, ref: orb });
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'VoiceRing', props: voiceRingProps as never },
);
