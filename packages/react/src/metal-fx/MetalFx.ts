'use client';

import { forwardRef, useImperativeHandle, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { attachMetalFx, metalFxOptionKinds, metalFxView, type MetalFxOptions } from 'runeglow/metal-fx';
import type { OptionKinds } from 'runeglow/kit';
import { splitProps } from '../internal/props.js';
import { renderFrame, resolveTargets, useMetal, type MetalFxTarget } from './frame.js';

/** The ring's options as React takes them: a reflection target may be a ref. */
type Options = Omit<MetalFxOptions, 'reflectionTargets'> & {
  /**
   * Neighbour elements that should receive a soft proximity reflection of
   * the metal (dark theme only). Each is an element or a ref to one, or
   * `{ el, strength }` to keep one subtle.
   */
  reflectionTargets?: ReadonlyArray<MetalFxTarget>;
};

/**
 * The ring's own options (see `MetalFxOptions`), and any attribute of the
 * wrapper element: `className`, `style`, `onClick` and the rest are
 * forwarded to it. The single child is the element to wrap; a `ref` reaches
 * the wrapper.
 */
export interface MetalFxProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof Options>, Options {}

/**
 * Wraps any element with an animated metallic ring, drawn by a WebGL
 * renderer that every ring on the page shares.
 *
 *   <MetalFx variant="button">
 *     <button className="upgrade-pill">Upgrade to Pro</button>
 *   </MetalFx>
 */
export const MetalFx = forwardRef<HTMLDivElement, MetalFxProps>(function MetalFx(props, ref) {
  const [options, rest] = splitProps<Options>(props as Record<string, unknown>, metalFxOptionKinds as OptionKinds<Options>);
  const { className, style, children, ...attributes } = rest as { className?: string; style?: CSSProperties; children?: ReactNode };
  const ring: MetalFxOptions = { ...options, reflectionTargets: undefined };

  const [refs, state] = useMetal<MetalFxOptions>(() => ({ ...ring, reflectionTargets: resolveTargets(options.reflectionTargets) }), attachMetalFx);
  useImperativeHandle(ref, () => refs.root.current as HTMLDivElement, []);

  return renderFrame(metalFxView(ring, state), refs, { className, style, attributes }, children);
});
