/* Distortion waves for Svelte.

   <DistortionWave> is the component. WaveController is the same wave
   without a component, for any element. The model and the renderer are exported
   for those who want to draw the wave themselves. */

export { default as DistortionWave } from "./DistortionWave.svelte";
export { default } from "./DistortionWave.svelte";
export type { DistortionWaveHandle, DistortionWaveProps } from "./types";

/* The engine, the model, the renderer and the capture are the core's, the
   same in every framework. */
export * from "runeglow/distortion-waves";
