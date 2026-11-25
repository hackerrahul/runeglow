/* Border beams, with no framework: an animated beam of light round any
   element, drawn by generated CSS. `attachBorderBeam` runs one on a wrapper
   the page already has and `mountBorderBeam` makes the wrapper too;
   `borderBeamView` is what the framework adapters render from. */

export { attachBorderBeam, borderBeamState, borderBeamView, mountBorderBeam } from './beam';
export type { BorderBeamHandle, BorderBeamHooks, BorderBeamMountOptions, BorderBeamState, BorderBeamView, MountedBorderBeam } from './beam';

export { borderBeamOptionKinds } from './types';
export type { BorderBeamOptions, BorderBeamSize, BorderBeamTheme, BorderBeamColorVariant, SizeConfig, ThemeColors } from './types';

export { sizePresets, sizeThemePresets, themeColors } from './styles';
