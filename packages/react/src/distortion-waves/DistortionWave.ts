'use client';

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import {
  attachDistortionWave,
  distortionWaveOptionKinds,
  distortionWaveView,
  type AttachedDistortionWave,
  type DistortionWaveHandle,
  type DistortionWaveOptions,
} from 'runeglow/distortion-waves';
import { cssProps, splitProps } from '../internal/props.js';

/**
 * The wave's own options (see `DistortionWaveOptions`), the views, and any
 * attribute of a `<div>`: `className`, `style` and the rest go on the
 * wave's element.
 */
export interface DistortionWaveProps extends DistortionWaveOptions, Omit<HTMLAttributes<HTMLDivElement>, keyof DistortionWaveOptions | 'children'> {
  /** What the wave passes over: the view that shows first. Give it an
      opaque background, or one behind the whole element. */
  children?: ReactNode;
  /** The view the wave leaves behind it. Without one the wave passes over
      `children` and leaves them as they were. */
  revealedContent?: ReactNode;
  /** What stays above the wave, as it is: the button that starts it, a
      close control. The wave neither bends nor colours it, and it shows over
      both views. Its own children take clicks; the rest of it lets them
      through to the view below. */
  overlay?: ReactNode;
  /** Called when a wave ends, with the view now showing. Not called for a
      wave that was turned around before it got there. */
  onFinish?: (revealed: boolean) => void;
}

/** What a `ref` on a `<DistortionWave>` holds: the wave's functions and its element. */
export interface DistortionWaveRef extends DistortionWaveHandle {
  /** The wave's element. */
  readonly element: HTMLDivElement | null;
}

/**
 * A wave that leaves a button, an edge or a point and crosses the element,
 * bending what is there and carrying one view into another. A `ref` gives
 * `play()`, `reverse()`, `reset()` and `prepare()`.
 *
 *   <DistortionWave revealed={sent} revealedContent={<Receipt />}>
 *     <Review onSend={() => setSent(true)} />
 *   </DistortionWave>
 */
export const DistortionWave = forwardRef<DistortionWaveRef, DistortionWaveProps>(function DistortionWave(props, ref) {
  const [options, rest] = splitProps<DistortionWaveOptions>(props as Record<string, unknown>, distortionWaveOptionKinds);
  const { children, revealedContent, overlay, onFinish, style, ...attributes } = rest as Omit<DistortionWaveProps, keyof DistortionWaveOptions>;
  const two = revealedContent != null;

  const root = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const second = useRef<HTMLDivElement>(null);
  const wave = useRef<AttachedDistortionWave | null>(null);
  /* what the core is started with, should the elements be mounted again,
     and the callback as it now stands */
  const latest = useRef({ options, onFinish });
  latest.current = { options, onFinish };

  /* The two views share one grid cell. Which one the markup starts on is
     read once: after that the controller decides, and these styles never
     change, so React never writes over what the controller sets on the
     layers as it runs. */
  const [view] = useState(() => {
    const made = distortionWaveView(options, two);
    return {
      made,
      root: cssProps(made.root.style),
      content: cssProps(made.content.style),
      revealed: cssProps(made.revealed.style),
      overlay: cssProps(made.overlay.style),
    };
  });

  useImperativeHandle(
    ref,
    () => ({
      play: (playOptions) => wave.current?.play(playOptions),
      reverse: () => wave.current?.reverse(),
      reset: () => wave.current?.reset(),
      prepare: () => wave.current?.prepare() ?? Promise.resolve(),
      getController: () => wave.current?.getController() ?? null,
      get element() {
        return root.current;
      },
    }),
    [],
  );

  /* the core runs the wave, on the element and the layers below */
  useEffect(() => {
    const made = attachDistortionWave(root.current as HTMLDivElement, { content: first.current as HTMLDivElement, revealed: second.current }, latest.current.options, {
      onFinish: (now) => latest.current.onFinish?.(now),
      rendered: true,
    });
    wave.current = made;
    return () => {
      made.destroy();
      wave.current = null;
    };
  }, []);
  /* after every render: the second view may have come or gone, and the core
     does nothing for options that have not changed */
  useEffect(() => {
    wave.current?.setRevealedLayer(second.current);
    wave.current?.update(options);
  });

  return createElement(
    'div',
    { ...view.made.root.attributes, ...attributes, ref: root, style: { ...view.root, ...style } },
    createElement('div', { ...view.made.content.attributes, ref: first, style: view.content }, children),
    two ? createElement('div', { ...view.made.revealed.attributes, ref: second, style: view.revealed }, revealedContent) : null,
    overlay != null
      ? createElement(
          'div',
          { ...view.made.overlay.attributes, style: view.overlay },
          createElement('style', { 'data-dw-skip': '', dangerouslySetInnerHTML: { __html: view.made.overlay.rule } }),
          overlay,
        )
      : null,
  );
});
