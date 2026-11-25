/* Liquid metal as HTML tags. Importing this file registers them:

     <runeglow-metal-fx variant="circle" inner-shadow bend reflection-targets="#tools">
       <button>Send</button>
     </runeglow-metal-fx>
     <runeglow-metal-text text="Pro" font="600 24px/1 Inter, sans-serif" color="#d8d8d8"></runeglow-metal-text>
     <runeglow-metal-badge text="New"></runeglow-metal-badge>

   Every option is an attribute and a property; see `metalElement` for the
   three that are more than a plain value (`reflection-targets` is a CSS
   selector). The ring is drawn in the element's shadow root, round what is
   slotted into it: style the wrapper from the page as
   `runeglow-metal-fx::part(root)`. */

import {
  attachMetalBend,
  metalBadgeOptionKinds,
  metalFxOptionKinds,
  metalTextOptionKinds,
  mountMetalBadge,
  mountMetalFx,
  mountMetalText,
  type MetalBadgeOptions,
  type MetalFxOptions,
  type MetalTextOptions,
} from 'runeglow/metal-fx';
import { define } from '../internal/element.js';
import { metalElement } from './element.js';

/** What `<runeglow-metal-fx>` takes on top of the ring's own options. */
interface MetalFxElementOptions extends MetalFxOptions {
  /** The ring dents like liquid under the cursor: what `useMetalBend` does in a framework. */
  bend?: boolean;
}

/** `<runeglow-metal-fx>`: a ring of flowing metal round the element inside it. */
export const MetalFxElement = metalElement<MetalFxElementOptions>({ ...metalFxOptionKinds, bend: 'boolean' }, (root, { bend, ...options }) => {
  /* what the page puts inside the tag shows through a slot, which the ring wraps */
  const slot = root.querySelector('slot') ?? root.appendChild(document.createElement('slot'));
  const ring = mountMetalFx(slot, options);
  ring.element.setAttribute('part', 'root');
  let unbend: (() => void) | null = bend ? attachMetalBend(ring.element) : null;
  return {
    update({ bend: next, ...rest }: MetalFxElementOptions) {
      ring.update(rest);
      if (!!next !== !!unbend) {
        unbend?.();
        unbend = next ? attachMetalBend(ring.element) : null;
      }
    },
    destroy() {
      unbend?.();
      ring.destroy();
    },
  };
});
export type MetalFxElement = InstanceType<typeof MetalFxElement>;

/** `<runeglow-metal-text>`: a word filled with flowing metal. */
export const MetalTextElement = metalElement<MetalTextOptions>(metalTextOptionKinds, (root, options) => {
  /* a bare `inner-shadow` asks for the shadow the text has anyway */
  const given = (o: MetalTextOptions): MetalTextOptions => ({ ...o, innerShadow: (o.innerShadow as unknown) === true ? undefined : o.innerShadow });
  const text = mountMetalText(root, given(options));
  text.element.setAttribute('part', 'root');
  return { update: (next: MetalTextOptions) => text.update(given(next)), destroy: text.destroy };
});
export type MetalTextElement = InstanceType<typeof MetalTextElement>;

/** `<runeglow-metal-badge>`: a white pill with a metal rim. */
export const MetalBadgeElement = metalElement<MetalBadgeOptions>(metalBadgeOptionKinds, (root, options) => {
  const badge = mountMetalBadge(root, options);
  badge.element.setAttribute('part', 'root');
  return badge;
});
export type MetalBadgeElement = InstanceType<typeof MetalBadgeElement>;

define('runeglow-metal-fx', MetalFxElement);
define('runeglow-metal-text', MetalTextElement);
define('runeglow-metal-badge', MetalBadgeElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-metal-fx': MetalFxElement;
    'runeglow-metal-text': MetalTextElement;
    'runeglow-metal-badge': MetalBadgeElement;
  }
}

/* The plain functions (`attachMetalTextReflection` among them), the
   defaults, the option types, the live tuning and the engine are the
   core's, the same in every framework. */
export * from 'runeglow/metal-fx';
