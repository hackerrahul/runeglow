'use client';

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { attachRobotHead, robotHeadOptionKinds, robotHeadView, type RobotHeadHandle, type RobotHeadOptions } from 'runeglow/bot-avatars';
import { cssProps, splitProps } from '../internal/props.js';

/**
 * The head's own options (see `RobotHeadOptions`), and any attribute of the
 * element: `className`, `style`, `aria-label`, `onClick` and the rest go on
 * the `size` × `size` box the robot rests in. A `ref` reaches the canvas
 * inside it.
 */
export interface RobotHeadProps extends Omit<HTMLAttributes<HTMLSpanElement>, keyof RobotHeadOptions>, RobotHeadOptions {}

/**
 * A TV-headed robot for an AI agent, with an LED face that shows what the
 * agent is doing. Its hops, glow and shadow draw past its box without
 * taking part in layout.
 *
 *   <RobotHead state="thinking" size={160} />
 */
export const RobotHead = forwardRef<HTMLCanvasElement, RobotHeadProps>(function RobotHead(props, ref) {
  const [options, rest] = splitProps<RobotHeadOptions>(props as Record<string, unknown>, robotHeadOptionKinds);
  const { style, 'aria-label': ariaLabel, ...attributes } = rest as { style?: CSSProperties; 'aria-label'?: string };

  const box = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const head = useRef<RobotHeadHandle | null>(null);
  /* what the core is started with, should the elements be mounted again */
  const latest = useRef(options);
  latest.current = options;
  /* the head has drawn its first frame: until then the canvas is transparent */
  const [shown, setShown] = useState(false);

  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);

  /* the core does the drawing and the motion, on the two elements below */
  useEffect(() => {
    const handle = attachRobotHead(box.current as HTMLSpanElement, canvas.current as HTMLCanvasElement, latest.current, { onshown: () => setShown(true) });
    head.current = handle;
    return () => {
      handle.destroy();
      head.current = null;
    };
  }, []);
  /* after every render: the core redraws only for what has changed */
  useEffect(() => {
    head.current?.update(options);
  });

  const view = robotHeadView(options, shown);
  return createElement(
    'span',
    {
      role: 'img',
      'aria-label': ariaLabel ?? view.label,
      'data-robot-head': view.shape,
      'data-state': view.state,
      ...attributes,
      ref: box,
      style: { ...cssProps(view.box), ...style },
    },
    createElement('canvas', { ref: canvas, 'aria-hidden': true, style: cssProps(view.canvas) }),
  );
});
