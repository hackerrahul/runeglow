'use client';

import { createElement, useContext, useRef, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { attachLiquidItem, liquidItemOptionKinds, liquidItemView, type LiquidItemHandle, type LiquidItemOptions } from 'runeglow/liquid-gooey';
import { cssProps, splitProps } from '../internal/props.js';
import { LiquidContext, useBeforePaint } from './context.js';

/** A piece's own options (see `LiquidItemOptions`), and what goes on its wrapper. */
export interface LiquidItemProps extends LiquidItemOptions {
  className?: string;
  style?: CSSProperties;
  /** The piece: one element. The liquid takes its box and its border radius. */
  children?: ReactNode;
}

/**
 * One piece of a liquid group. Wrap an element in it and the group draws
 * that element's share of the merged surface.
 *
 *   <Liquid.Item effect="move"><div className="thumb" /></Liquid.Item>
 */
export function LiquidItem(props: LiquidItemProps): ReactElement {
  const [options, rest] = splitProps<LiquidItemOptions>(props as unknown as Record<string, unknown>, liquidItemOptionKinds);
  const { className, style, children } = rest as Pick<LiquidItemProps, 'className' | 'style' | 'children'>;

  const group = useContext(LiquidContext);
  if (!group) throw new Error('<Liquid.Item> must be rendered inside a <Liquid> group.');

  const wrap = useRef<HTMLElement>(null);
  const item = useRef<LiquidItemHandle | null>(null);
  /* what the core is started with, should the wrapper be mounted again */
  const latest = useRef(options);
  latest.current = options;

  /* which wrapper the piece gets: a box the library moves, or a holder for content you move */
  const view = liquidItemView(options);

  /* The core draws the piece's share of the liquid and keeps it with the
     content. A change of effect starts the piece afresh, wrapper and
     content: the key below makes React do that, and this follows it. */
  useBeforePaint(() => {
    const handle = attachLiquidItem(group, wrap.current as HTMLElement, latest.current);
    item.current = handle;
    return () => {
      handle.destroy();
      item.current = null;
    };
  }, [group, view.key]);
  /* after every render: the core itself does nothing when the options say what they said */
  useBeforePaint(() => {
    item.current?.update(options);
  });

  return createElement(
    view.tag,
    view.styled
      ? { key: view.key, ref: wrap, className, style: { ...cssProps(view.style), ...style, ...cssProps(view.lastStyle) } }
      : { key: view.key, ref: wrap, style: cssProps(view.style) },
    children,
  );
}
