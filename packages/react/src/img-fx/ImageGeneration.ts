'use client';

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import {
  attachImageGeneration,
  ensureStylesInjected,
  imageGenerationOptionKinds,
  imageGenerationView,
  type AttachedImageGeneration,
  type ImageGenerationCallback,
  type ImageGenerationHandle,
  type ImageGenerationOptions,
  type ImageGenerationState
} from 'runeglow/img-fx';
import type { Style } from 'runeglow/kit';
import { splitProps } from '../internal/props.js';

/* the stylesheet is in the page before the first card is drawn, not an effect later */
ensureStylesInjected();

/**
 * The card's own options (see `ImageGenerationOptions`), and any attribute
 * of the wrapper element: `className`, `style`, `onClick` and the rest are
 * forwarded to it. The children are the card: a single element, which the
 * wrapper sizes itself to and whose border-radius it takes.
 */
export interface ImageGenerationProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof ImageGenerationOptions>, ImageGenerationOptions {
  children?: ReactNode;
}

/**
 * What a `ref` on `<ImageGeneration>` holds: the reveal functions, and the
 * wrapper element as `element`.
 */
export interface ImageGenerationRef extends ImageGenerationHandle {
  /** The wrapper element; `null` while the component is not mounted. */
  readonly element: HTMLDivElement | null;
}

/* a style record from the core as React takes one: `border-radius` as
   `borderRadius`, a custom property under the name it has */
function reactStyle(style: Style): CSSProperties {
  const out: Record<string, string> = {};
  for (const key in style) out[key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = style[key];
  return out as CSSProperties;
}

/**
 * An animated WebGL "image generation" loader. Wrap a card and it gets a
 * shader-driven mosaic that can resolve into an image from a pool you
 * provide, hold it, and dissolve back.
 *
 *   const card = useRef<ImageGenerationRef>(null);
 *
 *   <ImageGeneration ref={card} preset="pixels-organic" images={['/a.jpg', '/b.jpg']} autoReveal>
 *     <div style={{ width: 320, height: 320, borderRadius: 20 }} />
 *   </ImageGeneration>
 *
 *   card.current.triggerReveal({ hold: 'manual' });
 */
export const ImageGeneration = forwardRef<ImageGenerationRef, ImageGenerationProps>(function ImageGeneration(props, ref) {
  const [values, rest] = splitProps<Omit<ImageGenerationOptions, ImageGenerationCallback>>(props as Record<string, unknown>, imageGenerationOptionKinds);
  /* the two options that are functions have no place in the table of kinds */
  const { onCycle, excludeSrcs, children, className, style, ...attributes } = rest as Pick<ImageGenerationProps, 'onCycle' | 'excludeSrcs' | 'children' | 'className' | 'style'>;
  const options: ImageGenerationOptions = { ...values, onCycle, excludeSrcs };

  const root = useRef<HTMLDivElement>(null);
  const card = useRef<AttachedImageGeneration | null>(null);
  /* what the core is started with, should the wrapper be mounted again */
  const latest = useRef(options);
  latest.current = options;
  /* what the running card has found out: the page's theme, the card's corner
     radius, the surface of a regenerate churn. The wrapper is drawn from it. */
  const [found, setFound] = useState<ImageGenerationState | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      get element() {
        return root.current;
      },
      triggerReveal: (opts) => card.current?.triggerReveal(opts),
      triggerHide: () => card.current?.triggerHide(),
      triggerRegenerate: (opts) => card.current?.triggerRegenerate(opts),
      isImageActive: () => card.current?.isImageActive() ?? false
    }),
    []
  );

  /* the core does the measuring, the drawing and the reveal cycle, on the wrapper below */
  useEffect(() => {
    const handle = attachImageGeneration(root.current as HTMLDivElement, latest.current, { onstate: setFound });
    card.current = handle;
    return () => {
      handle.destroy();
      card.current = null;
    };
  }, []);
  /* after every render: the core itself does nothing for options that say what they said */
  useEffect(() => {
    card.current?.update(options);
  });

  const view = imageGenerationView(options, found);
  return createElement(
    'div',
    {
      ...attributes,
      ref: root,
      className: className ? `${view.class} ${className}` : view.class,
      'data-preset': view.preset,
      'data-theme': view.theme,
      'data-paused': view.paused ? 'true' : undefined,
      /* the caller's style may change the surface; the card's radius is the wrapper's whatever it says */
      style: { ...reactStyle(view.style), ...style, ...reactStyle(view.radiusStyle) }
    },
    createElement('canvas', { className: view.shaderClass, 'aria-hidden': true }),
    createElement('canvas', { className: view.overlayClass, 'aria-hidden': true }),
    createElement('div', { className: view.contentClass }, children)
  );
});
