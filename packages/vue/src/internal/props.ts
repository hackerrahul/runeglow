import type { OptionKinds } from 'runeglow/kit';

const TYPES = {
  string: String,
  number: Number,
  boolean: Boolean,
  length: [Number, String],
  flag: [String, Boolean],
  object: Object,
} as const;

/**
 * A component's props, declared from the core's table of its options. Every
 * one defaults to `undefined`, which leaves the default to the core — and
 * keeps Vue from reading an absent boolean prop as `false`.
 */
export function propsFrom<Options>(kinds: OptionKinds<Options>): Record<string, { type: unknown; default: undefined }> {
  const out: Record<string, { type: unknown; default: undefined }> = {};
  for (const key in kinds) out[key] = { type: TYPES[kinds[key]], default: undefined };
  return out;
}
