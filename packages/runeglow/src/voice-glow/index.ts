/* The voice glow, with no framework: a sound-reactive beam of light along
   the bottom edge of an element. `mountVoiceBeam` puts one on an element a
   page already has; the `attachVoiceBeam` and `voiceBeamView` pair is what
   the framework adapters are built on. `createMicrophone` is the microphone
   behind every adapter's `useMicrophone`. */

import { VOICE_SURFACE } from './flags';

export { attachVoiceBeam, mountVoiceBeam, voiceBeamState, voiceBeamView } from './beam';
export type {
  MountedVoiceBeam,
  VoiceBeamHandle,
  VoiceBeamHooks,
  VoiceBeamLayer,
  VoiceBeamMountOptions,
  VoiceBeamState,
  VoiceBeamView,
} from './beam';

export { voiceBeamOptionKinds } from './types';

/** Whether this build carries the surface looks (`look="dots"` / `"lines"`) — not released yet. */
export const VOICE_SURFACE_LOOKS: boolean = VOICE_SURFACE;

export { createMicrophone } from './microphone';
export type { Microphone, MicrophoneOptions, MicrophoneState } from './microphone';

export { acquireAnalyser, getAudioContext, isAudioSupported } from './audio';
export type { AnalyserLease } from './audio';
export { parseRgb } from './color';

export { voiceDefaults, voiceTypePresets, voiceTypeStyle, resolveVoiceDefaults, resolveVoiceStyle } from './presets';
export type { VoiceGeometry, VoiceTypeStyle } from './presets';

export type {
  VoiceBeamOptions,
  VoiceBeamType,
  VoiceBeamTheme,
  VoiceBeamLook,
  VoiceBeamDotShape,
  VoiceBeamLinePattern,
  VoiceBeamColorVariant,
  VoiceBeamLevel,
  VoiceBeamMotion,
  VoiceThemeColors,
} from './types';

export { themePresets, voicePalettes, voiceLobes, LOBE_SPACING, LOBE_SPAN } from './styles';
export type { VoiceLobe } from './styles';
