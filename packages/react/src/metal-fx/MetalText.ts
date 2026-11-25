'use client';

import { createElement, forwardRef, useImperativeHandle, useRef } from 'react';
import { attachMetalText, metalTextView, type MetalTextOptions } from 'runeglow/metal-fx';
import { renderFrame, resolveTargets, styleProps, useMetal, type MetalFxTarget } from './frame.js';

/** The text's own options (see `MetalTextOptions`). A `ref` reaches the wrapper element. */
export interface MetalTextProps extends Omit<MetalTextOptions, 'reflectionTargets'> {
  /** As on MetalFx: elements or refs to them, or `{ el, strength }`. */
  reflectionTargets?: ReadonlyArray<MetalFxTarget>;
  /** Class for the text span. */
  className?: string;
}

/**
 * Bare metal-filled text: the word is drawn in flowing metal over its own
 * colour, with the live span kept for layout and for readers.
 *
 *   <MetalText text="Pro" font="600 24px/1 Inter, sans-serif" color="#d8d8d8" />
 */
export const MetalText = forwardRef<HTMLDivElement, MetalTextProps>(function MetalText({ className, reflectionTargets, ...rest }, ref) {
  const options: MetalTextOptions = rest;
  const text = useRef<HTMLSpanElement>(null);

  /* the core masks the metal to the span's glyphs and draws their inner shadow */
  const [refs, state] = useMetal<MetalTextOptions>(
    () => ({ ...options, reflectionTargets: resolveTargets(reflectionTargets) }),
    (parts, o, hooks) => attachMetalText({ ...parts, text: text.current as HTMLSpanElement }, o, hooks),
  );
  useImperativeHandle(ref, () => refs.root.current as HTMLDivElement, []);

  const view = metalTextView(options, state);
  return renderFrame(view.fx, refs, {}, createElement('span', { ref: text, className, style: styleProps(view.text.style), 'aria-label': view.text.label }, view.text.text));
});
