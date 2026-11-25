'use client';

import { createElement, forwardRef, useId, useImperativeHandle, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { LiquidGroup, attachLiquid, liquidOptionKinds, liquidView, type LiquidHandle, type LiquidOptions } from 'runeglow/liquid-gooey';
import { cssProps, splitProps } from '../internal/props.js';
import { LiquidContext, useBeforePaint } from './context.js';
import { LiquidItem } from './LiquidItem.js';

/**
 * The group's own options (see `LiquidOptions`), and any attribute of a
 * div: `className`, `style` and the rest are forwarded to the group
 * element. A `ref` reaches that element.
 */
export interface LiquidProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof LiquidOptions>, LiquidOptions {}

/**
 * The liquid group: renders the silhouette SVG layer (goo filter + shadow
 * chain) behind its children. Children stay crisp; each `Liquid.Item`
 * mirrors its piece's geometry into the liquid layer.
 *
 *   <Liquid fill="#202020">
 *     <Liquid.Item><button>One</button></Liquid.Item>
 *     <Liquid.Item><button>Two</button></Liquid.Item>
 *   </Liquid>
 */
const LiquidRoot = forwardRef<HTMLDivElement, LiquidProps>(function Liquid(props, ref) {
  const [options, rest] = splitProps<LiquidOptions>(props as Record<string, unknown>, liquidOptionKinds);
  const { style, children, ...attributes } = rest as { style?: CSSProperties; children?: ReactNode };

  const id = useId();
  /* The pieces reach the group through this object. It is made before the
     element below exists, and a piece's effects run before its parent's: a
     piece attached first draws itself once the group is attached. */
  const [group] = useState(() => new LiquidGroup());
  const element = useRef<HTMLDivElement>(null);
  const liquid = useRef<LiquidHandle | null>(null);
  /* what the core is started with, should the element be mounted again */
  const latest = useRef(options);
  latest.current = options;

  useImperativeHandle(ref, () => element.current as HTMLDivElement, []);

  /* the core measures the group, runs the engine and draws a melting pair, in the layers below */
  useBeforePaint(() => {
    const handle = attachLiquid(element.current as HTMLDivElement, latest.current, group);
    liquid.current = handle;
    return () => {
      handle.destroy();
      liquid.current = null;
    };
  }, [group]);
  /* after every render: the core itself does nothing when the options say what they said */
  useBeforePaint(() => {
    liquid.current?.update(options);
  });

  const view = liquidView(options, id);
  const layer = { 'aria-hidden': true, focusable: 'false' } as const;
  return createElement(
    LiquidContext.Provider,
    { value: group },
    createElement(
      'div',
      { ...attributes, ref: element, style: { ...cssProps(view.style), ...style } },
      /* The silhouette: every piece draws its blob in the filtered group.
         The core sizes the filter's region to the group's measured box. */
      createElement(
        'svg',
        { ...layer, 'data-gooey-svg': '', style: cssProps(view.surfaceStyle) },
        createElement(
          'defs',
          null,
          createElement('filter', {
            id: view.filterId,
            filterUnits: 'userSpaceOnUse',
            colorInterpolationFilters: 'sRGB',
            dangerouslySetInnerHTML: { __html: view.primitives },
          }),
        ),
        createElement('g', { id: view.silhouetteId, filter: `url(#${view.filterId})`, style: { fill: view.fill } }),
      ),
      /* the melt overlay, above the content, masked to where liquid exists */
      createElement(
        'svg',
        { ...layer, 'data-gooey-overlay': '', style: cssProps(view.overlayStyle) },
        createElement(
          'defs',
          null,
          createElement('mask', { id: view.maskId, maskUnits: 'userSpaceOnUse' }, createElement('use', { href: `#${view.silhouetteId}` })),
        ),
        createElement('g', { mask: `url(#${view.maskId})` }, createElement('g')),
      ),
      children,
    ),
  );
});

/** The liquid group: renders the merged silhouette (goo + real shadows) behind
 *  your crisp content. Put `Liquid.Item`s inside. */
export const Liquid = Object.assign(LiquidRoot, { Item: LiquidItem });
