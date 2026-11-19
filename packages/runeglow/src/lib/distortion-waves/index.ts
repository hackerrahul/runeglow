/* Distortion waves for Svelte.

   <DistortionWave> is the component. WaveController is the same wave
   without a component, for any element. The model and the renderer are exported
   for those who want to draw the wave themselves. */

export { default as DistortionWave } from "./DistortionWave.svelte";
export { default } from "./DistortionWave.svelte";
export type { DistortionWaveHandle, DistortionWaveProps } from "./types";

export { WaveController } from "./controller";
export type { PaletteLike, PlayOptions, SourceLike, WaveOptions, WaveStyleInput } from "./controller";

export {
  bezierEase,
  COVER_ZONE,
  defaultStyle,
  duration,
  hexToRgb,
  LUMPS,
  makeParticles,
  newFront,
  PALETTES,
  particleAt,
  rgbToHex,
  rimLumps,
  singlePalette,
  smooth,
  waveFront,
} from "./model";
export type { Front, Palette, PaletteName, Particle, Point, Rect, RGB, Spot, WaveStyle, WaveType } from "./model";

export { WaveRenderer } from "./renderer";
export type { DotBuffer, FrameOptions, RendererOptions, ScreenSlot } from "./renderer";

export { backgroundOf, snapshot } from "./capture";
export type { CaptureFunction, CaptureRequest, Snapshot, SnapshotOptions } from "./capture";
