'use client';

import { Fragment, createElement, forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { attachBorderBeam, borderBeamOptionKinds, borderBeamState, borderBeamView, type BorderBeamHandle, type BorderBeamOptions } from 'runeglow/border-beam';
import { splitProps } from '../internal/props.js';

/**
 * The beam's own options (see `BorderBeamOptions`), and any attribute of a
 * `<div>`: `className`, `style`, `onClick` and the rest go on the wrapper
 * round the children. A `ref` reaches that wrapper.
 */
export interface BorderBeamProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof BorderBeamOptions>, BorderBeamOptions {
  /** Callback when fade-in animation completes */
  onActivate?: () => void;
  /** Callback when fade-out animation completes */
  onDeactivate?: () => void;
}

/**
 * An animated beam of light round its children. It renders one wrapper
 * `<div>` and reads the corner radius of the first child.
 *
 *   <BorderBeam size="md"><Card>Content</Card></BorderBeam>
 */
export const BorderBeam = forwardRef<HTMLDivElement, BorderBeamProps>(function BorderBeam(props, ref) {
  const [options, rest] = splitProps<BorderBeamOptions>(props as Record<string, unknown>, borderBeamOptionKinds);
  const { children, style, onActivate, onDeactivate, ...attributes } = rest as Omit<BorderBeamProps, keyof BorderBeamOptions>;

  // Stable across server and client, so the generated stylesheet hydrates.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '-');

  const wrapper = useRef<HTMLDivElement>(null);
  const beam = useRef<BorderBeamHandle | null>(null);
  /* what the core is started with, should the wrapper be mounted again, and
     the callbacks as they now stand */
  const latest = useRef({ options, onActivate, onDeactivate });
  latest.current = { options, onActivate, onDeactivate };
  /* What the core has found out in the browser (the system's theme, the
     content's radius, whether the beam is on screen, where it is in a
     fade). It starts as a server would have it, so the markup hydrates. */
  const [state, setState] = useState(() => borderBeamState(options));

  useImperativeHandle(ref, () => wrapper.current as HTMLDivElement, []);

  /* the core watches the wrapper below and drives the pulse; this component
     does the rendering, so the stylesheet is in the server's HTML too */
  useEffect(() => {
    const handle = attachBorderBeam(wrapper.current as HTMLDivElement, latest.current.options, {
      onActivate: () => latest.current.onActivate?.(),
      onDeactivate: () => latest.current.onDeactivate?.(),
      rendered: { id, onstate: setState },
    });
    beam.current = handle;
    return () => {
      handle.destroy();
      beam.current = null;
    };
  }, [id]);
  /* after every render: the core does nothing for options that have not changed */
  useEffect(() => {
    beam.current?.update(options);
  });

  const view = borderBeamView(options, id, state);
  return createElement(
    Fragment,
    null,
    createElement('style', { dangerouslySetInnerHTML: { __html: view.css } }),
    createElement(
      'div',
      /* the beam's own variables last: what it measured wins over a style the caller passed, as in the other adapters */
      { ...attributes, ref: wrapper, ...view.attributes, style: { ...style, ...(view.style as CSSProperties) } },
      children,
      createElement('div', { 'data-beam-bloom': '' }),
    ),
  );
});
