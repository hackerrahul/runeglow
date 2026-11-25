/* What the framework adapters share, whatever the library: the shape of a
   style, the table of a component's options, and how the text of an HTML
   attribute becomes an option's value. Apps have no use for this entry. */

export { styleText, applyStyle, closestAcross } from '../internal/view';
export type { Style } from '../internal/view';
export { attributeName, parseOption } from '../internal/options';
export type { OptionKind, OptionKinds } from '../internal/options';
