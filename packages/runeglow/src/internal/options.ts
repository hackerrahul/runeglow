/* What kind of value each option of a component takes. The adapters read
   it to tell a component's own options from an element's attributes, to
   declare props where a framework wants them declared, and to turn the
   text of an HTML attribute into the value it stands for. */

export type OptionKind =
  | 'string'
  | 'number'
  | 'boolean'
  /* a number of px, or any CSS length as text */
  | 'length'
  /* a name, or true / false */
  | 'flag'
  /* a record, written as JSON in an attribute */
  | 'object';

export type OptionKinds<Options> = Record<keyof Required<Options>, OptionKind>;

/** The value an HTML attribute's text stands for; `null` (no attribute) is `undefined`. */
export function parseOption(kind: OptionKind, text: string | null): unknown {
  if (text === null) return undefined;
  switch (kind) {
    case 'boolean':
      return text !== 'false';
    case 'number': {
      const n = Number.parseFloat(text);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'length':
      return /^\s*-?\d*\.?\d+\s*$/.test(text) ? Number.parseFloat(text) : text;
    case 'flag':
      return text === 'true' || text === '' ? true : text === 'false' ? false : text;
    case 'object':
      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    default:
      return text;
  }
}

/** `floorShadow` as an attribute is written: `floor-shadow`. */
export const attributeName = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
