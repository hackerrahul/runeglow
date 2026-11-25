'use client';

import { createElement, forwardRef, useImperativeHandle } from 'react';
import { attachMetalBadge, metalBadgeView, type MetalBadgeOptions } from 'runeglow/metal-fx';
import { renderFrame, resolveTargets, styleProps, useMetal, type MetalFxTarget } from './frame.js';

/** The badge's own options (see `MetalBadgeOptions`). A `ref` reaches the wrapper element. */
export interface MetalBadgeProps extends Omit<MetalBadgeOptions, 'reflectionTargets'> {
  /** As on MetalFx: elements or refs to them, or `{ el, strength }`. */
  reflectionTargets?: ReadonlyArray<MetalFxTarget>;
}

/**
 * The "New" badge: a white pill with a metal rim and a clean core under the
 * label.
 *
 *   <MetalBadge text="New" />
 */
export const MetalBadge = forwardRef<HTMLDivElement, MetalBadgeProps>(function MetalBadge({ reflectionTargets, ...rest }, ref) {
  const options: MetalBadgeOptions = rest;

  /* the core runs the ring; the badge's own layers below are still */
  const [refs, state] = useMetal<MetalBadgeOptions>(() => ({ ...options, reflectionTargets: resolveTargets(reflectionTargets) }), attachMetalBadge);
  useImperativeHandle(ref, () => refs.root.current as HTMLDivElement, []);

  const view = metalBadgeView(options, state);
  return renderFrame(
    view.fx,
    refs,
    {},
    /* Inline layout only — no utility classes, so the badge renders the
       same with or without a CSS framework on the host page. */
    createElement(
      'div',
      { style: styleProps(view.box) },
      createElement('div', { 'aria-hidden': true, style: styleProps(view.core) }),
      createElement('div', { 'aria-hidden': true, style: styleProps(view.wash) }),
      createElement('span', { style: styleProps(view.label.style), 'aria-label': view.label.label }, view.label.text),
    ),
  );
});
