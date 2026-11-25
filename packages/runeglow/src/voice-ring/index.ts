/* The voice ring and the voice orbs, with no framework: shapes on a canvas
   that move with a voice. `mountVoiceRing` and `mountVoiceOrb` put one on a
   page; the `attach…` and `…View` pairs are what the framework adapters are
   built on. */

export { attachVoiceOrb, attachVoiceRing, mountVoiceOrb, mountVoiceRing, voiceOrbView, voiceRingView } from './orb';
export type {
  MountedVoiceOrb,
  MountedVoiceRing,
  VoiceOrbHandle,
  VoiceOrbHooks,
  VoiceOrbMountOptions,
  VoiceOrbRoom,
  VoiceOrbView,
  VoiceRingHandle,
  VoiceRingHooks,
  VoiceRingMountOptions,
  VoiceRingView,
} from './orb';

export { voiceOrbOptionKinds, voiceRingOptionKinds } from './types';

// One microphone helper for the whole package: a stream opened for a voice
// glow can drive a ring too.
export { createMicrophone } from '../voice-glow/microphone';
export type { Microphone, MicrophoneOptions, MicrophoneState } from '../voice-glow/microphone';
export { acquireAnalyser, getAudioContext, isAudioSupported } from './audio';
export type { AnalyserLease } from './audio';
export { VoiceFollower, SPECTRUM_N } from './voice';
export { ACCENT_COLORS, EMOTION_COLORS, type VoiceOrbAccent, type VoiceOrbEmotion } from './emotion';
export { PRESETS, resolvePreset } from './presets';
export { VOICE_ORB_TYPES, type VoiceOrbType } from './engine/registry';
export type { OrbTheme, VoiceOrbOptions, VoiceOrbState, VoiceRingOptions, VoiceRingType } from './types';
export type { VoiceInput, TypeFrame, TypeOpts } from './engine/types';
export type { OrbTint } from './engine/paint';
