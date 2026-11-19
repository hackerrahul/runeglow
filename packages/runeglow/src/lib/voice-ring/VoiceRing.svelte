<!--
  @component
  VoiceRing: the aura types of the voice orbs, on their own. `ring`: rings
  drawn in light, a blooming spectrum with chromatic fringes that bends with
  the voice and leans toward where it comes from. `mono`: the same rings as
  two loops of grey tube, which a voice opens into a turning globe.

  @example
  ```svelte
  <script>
    import { VoiceRing, useMicrophone } from 'runeglow/voice-ring';
    const mic = useMicrophone();
  </script>

  <VoiceRing size={240} state="listening" stream={mic.stream} />
  <button onclick={mic.start}>Listen</button>
  ```
-->
<script lang="ts" module>
  const ORB_TYPE = { ring: 'aura', mono: 'aura-mono' } as const;
</script>

<script lang="ts">
  import VoiceOrb from './VoiceOrb.svelte';
  import type { VoiceRingProps } from './types';

  let { type = 'ring', ref = $bindable(null), ...props }: VoiceRingProps = $props();
</script>

<!-- A voice-reactive ring: VoiceOrb with its type fixed to one of the two aura types. -->
<VoiceOrb {...props} type={ORB_TYPE[type]} bind:ref />
