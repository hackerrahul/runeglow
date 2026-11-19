/**
 * The surface looks (`look="dots"` and `look="lines"`) are in the source
 * but not released: the React library compiles them out of its published
 * build with a build-time switch, and this is that switch. While it is
 * false every look is the glow.
 */
export const VOICE_SURFACE: boolean = false;
