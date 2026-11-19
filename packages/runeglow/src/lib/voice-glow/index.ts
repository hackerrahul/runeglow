import { VOICE_SURFACE } from './flags';

export { default as VoiceBeam } from './VoiceBeam.svelte';
export { default } from './VoiceBeam.svelte';

/** Whether this build carries the surface looks (`look="dots"` / `"lines"`) — not released yet. */
export const VOICE_SURFACE_LOOKS: boolean = VOICE_SURFACE;

export { useMicrophone } from './useMicrophone.svelte';
export type { UseMicrophoneOptions, UseMicrophoneResult, MicrophoneState } from './useMicrophone.svelte';

export { getAudioContext, isAudioSupported } from './audio';
export { parseRgb } from './color';

export { voiceDefaults, voiceTypePresets, voiceTypeStyle, resolveVoiceDefaults, resolveVoiceStyle } from './presets';
export type { VoiceGeometry, VoiceTypeStyle } from './presets';

export type {
  VoiceBeamProps,
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
