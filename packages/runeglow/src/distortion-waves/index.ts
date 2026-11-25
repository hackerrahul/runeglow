/* Distortion waves, with no framework.

   `mountDistortionWave` puts a wave on a page round views it is handed and
   `attachDistortionWave` runs one on elements the page already has;
   `distortionWaveView` is what the framework adapters render from.
   WaveController is the engine under them, for any element. The model and
   the renderer are exported for those who want to draw the wave themselves. */

export { attachDistortionWave, distortionWaveOptionKinds, distortionWaveView, mountDistortionWave } from "./wave";
export type {
  AttachedDistortionWave,
  DistortionWaveHandle,
  DistortionWaveHooks,
  DistortionWaveLayers,
  DistortionWaveMountOptions,
  DistortionWaveOptions,
  DistortionWavePart,
  DistortionWaveView,
  MountedDistortionWave,
} from "./wave";

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
