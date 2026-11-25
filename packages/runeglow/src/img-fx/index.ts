/* Image generation, with no framework: a WebGL mosaic over a card that
   resolves into an image, holds it and dissolves back. `attachImageGeneration`
   and `mountImageGeneration` run one on an element of the page; the `attach…`
   and `…View` pair is what the framework adapters are built on. `three` is
   needed alongside. */

export { attachImageGeneration, imageGenerationView, mountImageGeneration } from './generation';
export type {
  AttachedImageGeneration,
  ImageGenerationHooks,
  ImageGenerationState,
  ImageGenerationView,
  MountedImageGeneration
} from './generation';

export { imageGenerationCallbacks, imageGenerationOptionKinds } from './types';
export type {
  ImageGenerationCallback,
  ImageGenerationCycleEvent,
  ImageGenerationHandle,
  ImageGenerationOptions,
  ImageGenerationPreset,
  ImageGenerationTheme
} from './types';

/* the card's stylesheet: one for the page, however many cards there are */
export { ensureStylesInjected } from './styles';

export {
  PRESETS,
  hexToRgb,
  parseCssColor,
  type EasingKey,
  type MaskShape,
  type MosaicConfig,
  type Preset,
  type PresetMode,
  type PresetName,
  type PresetTheme,
  type RevealConfig
} from './presets';

// Power-user surface: expose the engine primitives so consumers can drive the
// renderer + reveal pipeline outside a component.
export {
  createCycle,
  createInstance,
  createReveal,
  destroyInstance,
  ease,
  effectiveCardBg,
  getFrameRate,
  getMaxDpr,
  loadImage,
  pickRandomImage,
  samplePaletteFromCanvas,
  setFrameRate,
  setInstanceCardBg,
  setInstanceColors,
  setInstancePaused,
  setInstancePreset,
  setInstanceStrength,
  setInstanceVisible,
  setMaxDpr,
  setSharedFragmentShader,
  IMAGE_FRAGMENT_SHADER,
  updateInstanceSize,
  type CreateInstanceOptions,
  type CreateRevealOptions,
  type Cycle,
  type CycleEvent,
  type CycleOptions,
  type CyclePhase,
  type EaseFn,
  type Instance,
  type RevealState,
  type RevealStartOptions,
  type SampledPalette
} from './engine';
