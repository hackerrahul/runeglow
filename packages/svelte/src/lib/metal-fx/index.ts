export { default as MetalFx } from './MetalFx.svelte';
export { default } from './MetalFx.svelte';
export { default as MetalText } from './MetalText.svelte';
export { default as MetalBadge } from './MetalBadge.svelte';
export { useMetalBend, useMetalTextReflection } from './hooks.svelte';
export type { MetalFxProps, MetalTextProps, MetalBadgeProps } from './types';

/* The two plain functions behind the hooks, the defaults, the option types,
   the live tuning and the engine are the core's, the same in every
   framework. */
export * from 'runeglow/metal-fx';
