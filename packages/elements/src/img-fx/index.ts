/* Image generation as an HTML tag. Importing this file registers it:

     <runeglow-image-generation preset="pixels-organic" images='["/a.jpg", "/b.jpg"]' auto-reveal>
       <div style="width: 320px; height: 320px; border-radius: 20px"></div>
     </runeglow-image-generation>

   The element's own child is the card. Every option is an attribute, in
   HTML's spelling, and a property, in JavaScript's; the two that are
   functions (`onCycle`, `excludeSrcs`) are properties only, and each phase
   of the reveal cycle is also a `cycle` event. The reveal functions are
   methods of the element. */

import {
  attachImageGeneration,
  imageGenerationCallbacks,
  imageGenerationOptionKinds,
  type AttachedImageGeneration,
  type ImageGenerationCycleEvent,
  type ImageGenerationHandle,
  type ImageGenerationOptions
} from 'runeglow/img-fx';
import { attributeName, parseOption } from 'runeglow/kit';
import { define } from '../internal/element.js';

type Key = keyof typeof imageGenerationOptionKinds;
const keys = Object.keys(imageGenerationOptionKinds) as Key[];
const byAttribute = new Map<string, Key>(keys.map((key) => [attributeName(key), key]));
const properties = [...keys, ...imageGenerationCallbacks];

/* `images` may be one address as it stands, or a list of them as JSON */
const parse = (key: Key, text: string | null): unknown =>
  key === 'images' && text !== null && !text.trim().startsWith('[') ? text : parseOption(imageGenerationOptionKinds[key], text);

/* where there is no DOM (a server rendering the page), the class below
   still has to be defined, for the import to work at all */
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

class ImageGeneration extends Base implements ImageGenerationHandle {
  static observedAttributes = [...byAttribute.keys()];

  /* the options as last set, and the card while the element is in a page */
  private options: Record<string, unknown> = {};
  private card: AttachedImageGeneration | null = null;
  private wrapper: HTMLElement | null = null;

  connectedCallback() {
    const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    if (!this.wrapper) {
      const style = document.createElement('style');
      style.textContent = ':host{display:inline-block;vertical-align:top;line-height:0}:host([hidden]){display:none}';
      /* The wrapper is drawn in the shadow root, where the page's styles do
         not reach it; the card stays the element's own child and shows
         through the slot, so the page styles it as it would anywhere. */
      this.wrapper = document.createElement('div');
      this.wrapper.setAttribute('part', 'wrapper');
      this.wrapper.appendChild(document.createElement('slot'));
      shadow.append(style, this.wrapper);
    }
    /* a property set before the element was defined sits on the instance,
       in front of the accessor: take it through the accessor instead */
    const own = this as unknown as Record<string, unknown>;
    for (const key of properties) {
      if (Object.prototype.hasOwnProperty.call(this, key)) {
        const value = own[key];
        delete own[key];
        own[key] = value;
      }
    }
    this.card = attachImageGeneration(this.wrapper, this.told());
  }

  disconnectedCallback() {
    this.card?.destroy();
    this.card = null;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    const key = byAttribute.get(name);
    if (key) this.setOption(key, parse(key, value));
  }

  getOption(key: string): unknown {
    return this.options[key];
  }

  setOption(key: string, value: unknown) {
    if (Object.is(this.options[key], value)) return;
    this.options = { ...this.options, [key]: value };
    this.card?.update(this.told());
  }

  /* what the card is told: the options, and each phase passed on as an event too */
  private told(): ImageGenerationOptions {
    const options = this.options as ImageGenerationOptions;
    return {
      ...options,
      onCycle: (event) => {
        options.onCycle?.(event);
        /* a phase of the reveal cycle: `idle`, `reveal`, `visible`, `hide` */
        this.dispatchEvent(new CustomEvent<ImageGenerationCycleEvent>('cycle', { detail: event }));
      }
    };
  }

  triggerReveal(opts?: Parameters<ImageGenerationHandle['triggerReveal']>[0]) {
    this.card?.triggerReveal(opts);
  }

  triggerHide() {
    this.card?.triggerHide();
  }

  triggerRegenerate(opts?: Parameters<ImageGenerationHandle['triggerRegenerate']>[0]) {
    this.card?.triggerRegenerate(opts);
  }

  isImageActive() {
    return this.card?.isImageActive() ?? false;
  }
}

for (const key of properties) {
  Object.defineProperty(ImageGeneration.prototype, key, {
    configurable: true,
    enumerable: true,
    get(this: ImageGeneration) {
      return this.getOption(key);
    },
    set(this: ImageGeneration, value: unknown) {
      this.setOption(key, value ?? undefined);
    }
  });
}

/** The `cycle` event of `<runeglow-image-generation>`: its `detail` is the phase and the image's address. */
export type ImageGenerationCycleDomEvent = CustomEvent<ImageGenerationCycleEvent>;

/* The event is typed on the element itself rather than for every element
   of a page: `cycle` is too plain a name to claim in the global map. */
interface CycleListening {
  addEventListener(type: 'cycle', listener: (event: ImageGenerationCycleDomEvent) => void, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: 'cycle', listener: (event: ImageGenerationCycleDomEvent) => void, options?: boolean | EventListenerOptions): void;
}

/** What `<runeglow-image-generation>` has on top of an element: its options as properties, the reveal functions, and the `cycle` event. */
type ImageGenerationInstance = CycleListening & HTMLElement & ImageGenerationOptions & ImageGenerationHandle;

/** `<runeglow-image-generation>`: a WebGL mosaic over the card inside it, that resolves into an image. */
export const ImageGenerationElement = ImageGeneration as unknown as {
  new (): ImageGenerationInstance;
  prototype: ImageGenerationInstance;
  observedAttributes: string[];
};
export type ImageGenerationElement = ImageGenerationInstance;

define('runeglow-image-generation', ImageGenerationElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-image-generation': ImageGenerationElement;
  }
}

/* The presets, the option and event types, the reveal functions' type
   (`ImageGenerationHandle`) and the engine are the core's, the same in
   every framework. */
export * from 'runeglow/img-fx';
