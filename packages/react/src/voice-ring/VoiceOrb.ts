'use client';

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState, type CanvasHTMLAttributes, type CSSProperties } from 'react';
import {
  attachVoiceOrb,
  voiceOrbOptionKinds,
  voiceOrbView,
  type VoiceOrbHandle,
  type VoiceOrbOptions,
  type VoiceOrbRoom,
} from 'runeglow/voice-ring';
import { cssProps, splitProps } from '../internal/props.js';

/**
 * The orb's own options (see `VoiceOrbOptions`), and any attribute of a
 * canvas: `className`, `style`, `aria-label`, `onClick` and the rest are
 * forwarded to it. A `ref` reaches the canvas.
 */
export interface VoiceOrbProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, keyof VoiceOrbOptions>, VoiceOrbOptions {}

/* before the orb has measured, and on a server, there is all the room in the world */
const OPEN: VoiceOrbRoom = [Infinity, Infinity];

/**
 * A shape on a canvas that moves with a voice: it follows a stream, an
 * AnalyserNode or a level, and leans toward where the voice comes from.
 *
 *   <VoiceOrb type="aura" size={240} state="listening" stream={mic.stream} />
 */
export const VoiceOrb = forwardRef<HTMLCanvasElement, VoiceOrbProps>(function VoiceOrb(props, ref) {
  const [options, rest] = splitProps<VoiceOrbOptions>(props as Record<string, unknown>, voiceOrbOptionKinds);
  const { style, 'aria-label': ariaLabel, ...attributes } = rest as { style?: CSSProperties; 'aria-label'?: string };

  const canvas = useRef<HTMLCanvasElement>(null);
  const orb = useRef<VoiceOrbHandle | null>(null);
  /* what the core is started with, should the canvas be mounted again */
  const latest = useRef(options);
  latest.current = options;
  /* The room the orb has to lean into, which the core measures once the
     canvas is on the page: the canvas reaches that far past the orb's box. */
  const [room, setRoom] = useState(OPEN);

  useImperativeHandle(ref, () => canvas.current as HTMLCanvasElement, []);

  /* the core does the listening, the drawing and the motion, on the canvas below */
  useEffect(() => {
    const handle = attachVoiceOrb(canvas.current as HTMLCanvasElement, latest.current, { onroom: setRoom });
    orb.current = handle;
    return () => {
      handle.destroy();
      orb.current = null;
    };
  }, []);
  /* after every render: the core restarts its loop only for what it is built from */
  useEffect(() => {
    orb.current?.update(options, room);
  });

  const view = voiceOrbView(options, room);
  return createElement('canvas', {
    role: 'img',
    'aria-label': ariaLabel ?? view.label,
    ...attributes,
    ref: canvas,
    style: { ...cssProps(view.style), ...style },
  });
});
