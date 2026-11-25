/* Liquid metal, with no framework: a ring of flowing metal round an element,
   in a word or on a badge. `mountMetalFx` puts a ring round an element on a
   page, `mountMetalText` and `mountMetalBadge` put the other two inside one;
   the `attach…` and `…View` pairs are what the framework adapters are built
   on. `attachMetalBend` and `attachMetalTextReflection` are the two extras,
   each a plain function that returns its own undoing. */

export { METAL_FX_INITIAL_STATE, attachMetalFx, metalFxView, mountMetalFx } from './metal';
export type { MetalFxHandle, MetalFxHooks, MetalFxMountOptions, MetalFxParts, MetalFxState, MetalFxView, MountedMetalFx } from './metal';

export { METAL_TEXT_DEFAULTS, attachMetalText, metalTextView, mountMetalText } from './text';
export type { MetalTextHandle, MetalTextMountOptions, MetalTextParts, MetalTextView, MountedMetalText } from './text';

export { METAL_BADGE_DEFAULTS, attachMetalBadge, metalBadgeView, mountMetalBadge } from './badge';
export type { MetalBadgeHandle, MetalBadgeView, MountedMetalBadge } from './badge';

export { metalFxOptionKinds, metalTextOptionKinds, metalBadgeOptionKinds } from './types';

export { attachMetalBend } from './bend';
export { attachMetalTextReflection } from './textReflection';
export { BEND, BEND_DEFAULTS, setBendConfig, resetBendConfig, type BendConfig } from './engine/bend/config';
export { paintTextRun, textMaskDataUrl } from './engine/textMask';

export type {
  MetalFxOptions,
  MetalFxVariant,
  MetalFxTheme,
  MetalFxPreset,
  MetalFxReflectionTarget,
  MetalTextOptions,
  MetalBadgeOptions,
  MetalBadgeCore,
  TextInnerShadow,
} from './types';

// Power-user surface: expose the engine primitives so consumers building
// integrations outside a component can drive the same renderer.
export {
  PRESETS,
  SHAPE_NONE,
  SHAPE_CIRCLE,
  SHAPE_DAISY,
  SHAPE_DIAMOND,
  SHAPE_METABALLS,
  FIT_NONE,
  FIT_CONTAIN,
  FIT_COVER,
  hexToRgb,
  hexToRgba,
  type Preset,
  type PresetMode,
  type PresetName,
  type PresetTheme,
} from './engine/presets';

export {
  createInstance,
  destroyInstance,
  updateInstance,
  setSharedPreset,
  setSharedPresetMode,
  getSharedPreset,
  setInstanceDeform,
  redrawInstance,
  pauseShared,
  resumeShared,
} from './engine/renderer/loop';

export type { MetalFxInstance, DeformFn, DeformLayers, MaskFn } from './engine/renderer/core';
export { RIM_DEFAULTS, type RimOptions } from './engine/rim';
export { isMetalFxSupported } from './engine/renderer/core';

// Live glow tuning — mutable singleton read by the glow engine every frame.
export {
  GLOW,
  GLOW_DEFAULTS,
  GLOW_MARKUP_KEYS,
  setGlowConfig,
  resetGlowConfig,
  subscribeGlowConfig,
  type GlowConfig,
} from './engine/glow/config';

// Cursor light: glint under the pointer + catch-light facing it.
export {
  CURSOR_LIGHT,
  CURSOR_LIGHT_DEFAULTS,
  setCursorLightConfig,
  resetCursorLightConfig,
  setCursorSprite,
  type CursorLightConfig,
  type CursorSprite,
} from './engine/cursor/light';

// Cursor-as-occluder for proximity reflections.
export {
  REFLECTION_OCCLUDER,
  REFLECTION_OCCLUDER_DEFAULTS,
  setReflectionOccluderConfig,
  resetReflectionOccluderConfig,
  type ReflectionOccluderConfig,
} from './engine/reflection/paint';
