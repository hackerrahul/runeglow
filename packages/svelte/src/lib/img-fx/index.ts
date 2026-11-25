export { default as ImageGeneration } from './ImageGeneration.svelte';
export { default } from './ImageGeneration.svelte';

export type { ImageGenerationProps } from './types';

/* The presets, the option and event types, the reveal functions' type
   (`ImageGenerationHandle`) and the engine are the core's, the same in
   every framework. */
export * from 'runeglow/img-fx';
