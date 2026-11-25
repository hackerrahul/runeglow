import { toValue, watchEffect, type MaybeRefOrGetter } from 'vue';
import { BEND, attachMetalBend, attachMetalTextReflection, type BendConfig } from 'runeglow/metal-fx';
import { elementOf } from './frame.js';

/** An element, or a template ref on one or on a component (a `<MetalFx ref="ring">`, say), or a function returning either. */
type Target = MaybeRefOrGetter<unknown>;

/**
 * Cursor-driven liquid dent of a MetalFx ring, for the lifetime of the
 * component that calls this.
 *
 *   const ring = ref(null);
 *   useMetalBend(ring);
 *
 *   <MetalFx ref="ring"><button>Upgrade</button></MetalFx>
 *
 * Call it in `setup`. It takes a template ref on the MetalFx (or its
 * wrapper element, or a function returning either), so it attaches once
 * the element exists and re-attaches if it is replaced. `getCfg` is read on
 * every frame; the default is the shared `BEND` config.
 */
export function useMetalBend(target: Target, getCfg: () => BendConfig = () => BEND): void {
  watchEffect(
    (onCleanup) => {
      const el = elementOf(toValue(target));
      if (el) onCleanup(attachMetalBend(el, getCfg));
    },
    { flush: 'post' },
  );
}

/**
 * Confine a proximity reflection to an element's glyphs, for the lifetime of
 * the component that calls this. Pass a template ref on a text element that
 * is also one of a MetalFx's `reflectionTargets`.
 */
export function useMetalTextReflection(target: Target): void {
  watchEffect(
    (onCleanup) => {
      const el = elementOf(toValue(target));
      if (el) onCleanup(attachMetalTextReflection(el));
    },
    { flush: 'post' },
  );
}
