import { BEND, type BendConfig } from './engine/bend/config';
import { attachMetalBend } from './bend';
import { attachMetalTextReflection } from './textReflection';

/**
 * Cursor-driven liquid dent of a MetalFx ring, for the lifetime of the
 * component that calls this.
 *
 * ```svelte
 * <script>
 *   let ring = $state(null);
 *   useMetalBend(() => ring);
 * </script>
 *
 * <MetalFx bind:ref={ring}><button>Upgrade</button></MetalFx>
 * ```
 *
 * Call it while a component is being set up, as you would a rune. It takes a
 * function returning the element, so it attaches once the element exists and
 * re-attaches if it is replaced.
 */
export function useMetalBend(getElement: () => HTMLElement | null | undefined, getCfg: () => BendConfig = () => BEND): void {
  $effect(() => {
    const el = getElement();
    if (!el) return;
    return attachMetalBend(el, getCfg);
  });
}

/**
 * Confine a proximity reflection to an element's glyphs, for the lifetime of
 * the component that calls this. Pass a function returning a text element
 * that is also one of a MetalFx's `reflectionTargets`.
 */
export function useMetalTextReflection(getElement: () => HTMLElement | null | undefined): void {
  $effect(() => {
    const el = getElement();
    if (!el) return;
    return attachMetalTextReflection(el);
  });
}
