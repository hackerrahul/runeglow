export { default as VoiceBeam } from './VoiceBeam.svelte';
export { default } from './VoiceBeam.svelte';

export { useMicrophone } from './useMicrophone.svelte';
export type { UseMicrophoneOptions, UseMicrophoneResult, MicrophoneState } from './useMicrophone.svelte';

export type { VoiceBeamProps } from './types';

/* The option types, the presets, the palettes, the audio plumbing and the
   microphone behind `useMicrophone` are the core's, the same in every
   framework. */
export * from 'runeglow/voice-glow';
