/* Thinking orbs, with no framework: dotted spheres that show what an AI is
   doing, on a canvas. `mountThinkingOrb` puts one on a page; the
   `attachThinkingOrb` and `thinkingOrbView` pair is what the framework
   adapters are built on. */

export { attachThinkingOrb, mountThinkingOrb, thinkingOrbView } from './orb';
export type { MountedThinkingOrb, ThinkingOrbHandle, ThinkingOrbMountOptions, ThinkingOrbView } from './orb';

export { thinkingOrbOptionKinds } from './types';
export type { ThinkingOrbOptions, OrbState, OrbSize, OrbTheme } from './types';

// Power-user surface: the resolved presets + raw frame painters, for
// consumers driving their own canvas outside the component.
export { resolvePreset, STATE_TO_MODE, type ModeKey, type Resolved } from './presets';
export { MODE_DRAWS, MODE_FRAMES } from './engine/registry';
export { countDots, scaleCounts, scaleRadii } from './engine/profiles';
// The geometry toolkit the built-in modes are written with, so a custom
// `frame` can be built from the same parts.
export {
  finalizeFrame, makeProj, radiusScale, fibDir, hashD, vnoise, lerp, frac, angleDelta,
} from './engine/core';
export type { ModeFrame, ModeOpts, OrbFrame, Dot, Line } from './engine/index';
// Gravity: the orb pulls the pointer in. The sprite has to be the
// platform's real pointer, so the consumer supplies it.
export { attachGravity, setGravitySprite, setGravityConfig, getGravityConfig, getGravityStatus, resetGravity, GRAVITY_DEFAULTS } from './gravity';
export type { GravityOptions, CursorSprite } from './gravity';
