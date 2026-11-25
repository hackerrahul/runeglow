/* Thinking orbs as an HTML tag. Importing this file registers it:

     <runeglow-thinking-orb state="searching" size="64"></runeglow-thinking-orb>

   Every option is a property, and an attribute too wherever text can say
   it: `opts` and `gravity` are written as JSON (`gravity` alone, with no
   value, takes the defaults), and `frame`, a function, is a property only.
   See `orbElement`. */

import { mountThinkingOrb, thinkingOrbOptionKinds, type ThinkingOrbOptions } from 'runeglow/thinking-orbs';
import { define } from '../internal/element.js';
import { flagOrRecord, orbElement } from './element.js';

/** `<runeglow-thinking-orb>`: a dotted sphere that shows what an AI is doing. */
export const ThinkingOrbElement = orbElement<ThinkingOrbOptions>(thinkingOrbOptionKinds, mountThinkingOrb, { frame: null, gravity: flagOrRecord });
export type ThinkingOrbElement = InstanceType<typeof ThinkingOrbElement>;

define('runeglow-thinking-orb', ThinkingOrbElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-thinking-orb': ThinkingOrbElement;
  }
}

/* The option types, the presets, the frame painters, the geometry toolkit
   and gravity are the core's, the same in every framework. */
export * from 'runeglow/thinking-orbs';
