import type { CSSProperties } from 'react';
import type { OptionKinds, Style } from 'runeglow/kit';

/** A component's own options, taken out of its props; the rest are the element's attributes. */
export function splitProps<Options extends object>(props: Record<string, unknown>, kinds: OptionKinds<Options>): [Options, Record<string, unknown>] {
  const options: Record<string, unknown> = {}, rest: Record<string, unknown> = {};
  for (const key in props) (key in kinds ? options : rest)[key] = props[key];
  return [options as Options, rest];
}

/** A style record from the core, with its property names as React writes them. */
export function cssProps(style: Style): CSSProperties {
  const out: Record<string, string> = {};
  /* a custom property (`--radius`) keeps its name; the rest are camel-cased */
  for (const key in style) out[key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = style[key];
  return out as CSSProperties;
}
