'use client';

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, type CanvasHTMLAttributes, type CSSProperties } from 'react';
import { attachThinkingOrb, thinkingOrbOptionKinds, thinkingOrbView, type ThinkingOrbHandle, type ThinkingOrbOptions } from 'runeglow/thinking-orbs';
import { cssProps, splitProps } from '../internal/props.js';

/**
 * The orb's own options (see `ThinkingOrbOptions`), and any attribute of a
 * canvas: `className`, `style`, `aria-label`, `onClick` and the rest are
 * forwarded to it. A `ref` reaches the canvas.
 */
export interface ThinkingOrbProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, keyof ThinkingOrbOptions>, ThinkingOrbOptions {}

/**
 * A dotted sphere that shows what an AI is doing, drawn on a canvas.
 *
 *   <ThinkingOrb state="searching" size={64} />
 */
export const ThinkingOrb = forwardRef<HTMLCanvasElement, ThinkingOrbProps>(function ThinkingOrb(props, ref) {
  const [options, rest] = splitProps<ThinkingOrbOptions>(props as Record<string, unknown>, thinkingOrbOptionKinds);
  const { style, 'aria-label': ariaLabel, ...attributes } = rest as { style?: CSSProperties; 'aria-label'?: string };

  const canvas = useRef<HTMLCanvasElement>(null);
  const orb = useRef<ThinkingOrbHandle | null>(null);
  /* what the core is started with, should the canvas be mounted again */
  const latest = useRef(options);
  latest.current = options;

  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);

  /* the core does the drawing and the motion, on the canvas below */
  useEffect(() => {
    const handle = attachThinkingOrb(canvas.current as HTMLCanvasElement, latest.current);
    orb.current = handle;
    return () => {
      handle.destroy();
      orb.current = null;
    };
  }, []);
  /* after every render: the core itself does nothing when the options say what they said */
  useEffect(() => {
    orb.current?.update(options);
  });

  const view = thinkingOrbView(options);
  return createElement('canvas', {
    role: 'img',
    'aria-label': ariaLabel ?? view.label,
    ...attributes,
    ref: canvas,
    style: { ...cssProps(view.style), ...style },
  });
});
