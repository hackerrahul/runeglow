'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { BEND, attachMetalBend, attachMetalTextReflection, type BendConfig } from 'runeglow/metal-fx';

type Target = RefObject<HTMLElement | null | undefined> | HTMLElement | null | undefined;

/* Keep something attached to the element a ref holds: attached once the
   element exists, again if it is replaced, and let go with the component.
   A ref changes without a render of its own, so it is looked at after
   each one. */
function useAttached(target: Target, attach: (el: HTMLElement) => () => void): void {
  const latest = useRef(attach);
  latest.current = attach;
  const held = useRef<{ el: HTMLElement; detach: () => void } | null>(null);
  useEffect(() => {
    const el = !target ? null : 'nodeType' in target ? target : (target.current ?? null);
    if (held.current?.el === el) return;
    held.current?.detach();
    held.current = el ? { el, detach: latest.current(el) } : null;
  });
  useEffect(
    () => () => {
      held.current?.detach();
      held.current = null;
    },
    [],
  );
}

/**
 * Cursor-driven liquid dent of a MetalFx ring, for the lifetime of the
 * component that calls this.
 *
 *   const ring = useRef(null);
 *   useMetalBend(ring);
 *   return <MetalFx ref={ring}><button>Upgrade</button></MetalFx>;
 *
 * Takes a ref to the MetalFx element (or the element itself): it attaches
 * once the element exists and re-attaches if it is replaced. `getCfg` is
 * read on every frame; the default is the shared `BEND` config.
 */
export function useMetalBend(target: Target, getCfg: () => BendConfig = () => BEND): void {
  const cfg = useRef(getCfg);
  cfg.current = getCfg;
  useAttached(target, (el) => attachMetalBend(el, () => cfg.current()));
}

/**
 * Confine a proximity reflection to an element's glyphs, for the lifetime of
 * the component that calls this. Pass a ref to a text element (or the
 * element itself) that is also one of a MetalFx's `reflectionTargets`.
 */
export function useMetalTextReflection(target: Target): void {
  useAttached(target, attachMetalTextReflection);
}
