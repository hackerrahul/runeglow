'use client';

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState, type CanvasHTMLAttributes, type CSSProperties } from 'react';
import { attachBotAvatar, botAvatarOptionKinds, botAvatarView, type BotAvatarHandle, type BotAvatarOptions } from 'runeglow/bot-avatars';
import { cssProps, splitProps } from '../internal/props.js';

/**
 * The avatar's own options (see `BotAvatarOptions`), and any attribute of a
 * canvas: `className`, `style`, `aria-label`, `onClick` and the rest are
 * forwarded to it. A `ref` reaches the canvas.
 */
export interface BotAvatarProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, keyof BotAvatarOptions>, BotAvatarOptions {}

/**
 * An animated face for an AI agent, drawn on a canvas.
 *
 *   <BotAvatar type="clover" state="working" />
 */
export const BotAvatar = forwardRef<HTMLCanvasElement, BotAvatarProps>(function BotAvatar(props, ref) {
  const [options, rest] = splitProps<BotAvatarOptions>(props as Record<string, unknown>, botAvatarOptionKinds);
  const { style, 'aria-label': ariaLabel, ...attributes } = rest as { style?: CSSProperties; 'aria-label'?: string };

  const canvas = useRef<HTMLCanvasElement>(null);
  const avatar = useRef<BotAvatarHandle | null>(null);
  /* what the core is started with, should the canvas be mounted again */
  const latest = useRef(options);
  latest.current = options;
  /* a fabric or plastic avatar is transparent until its material is made */
  const [shown, setShown] = useState(false);

  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);

  /* the core does the drawing and the motion, on the canvas below */
  useEffect(() => {
    const handle = attachBotAvatar(canvas.current as HTMLCanvasElement, latest.current, { onshown: () => setShown(true) });
    avatar.current = handle;
    return () => {
      handle.destroy();
      avatar.current = null;
    };
  }, []);
  /* after every render: the core itself does nothing when the options say what they said */
  useEffect(() => {
    avatar.current?.update(options);
  });

  const view = botAvatarView(options, shown);
  return createElement('canvas', {
    role: 'img',
    'aria-label': ariaLabel ?? view.label,
    'data-bot-avatar': view.type,
    'data-face': view.face,
    'data-state': view.state,
    ...attributes,
    ref: canvas,
    style: { ...cssProps(view.style), ...style },
  });
});
