import { attributeName, parseOption, type OptionKinds } from 'runeglow/kit';

/* what a mounted component gives back, whichever one it is */
interface Mounted<Options> {
  update(options: Options): void;
  destroy(): void;
}

/* where there is no DOM (a server rendering the page), the classes below
   still have to be defined, for the import to work at all */
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/**
 * How an option is read from its attribute where the table's kind does not
 * say it all: a function from the attribute's text to the value, or `null`
 * for an option that has no attribute at all (a function, a live object
 * such as a MediaStream) and is set as a property only.
 */
export type AttributeReaders<Options> = { [K in keyof Options]?: ((text: string) => unknown) | null };

/**
 * A custom element round one of the core's components, for the ones
 * `optionsElement` (see ../internal/element.ts) does not fit: components
 * that take options no attribute can carry, that are not poked, and that
 * may live on the element itself rather than in a shadow root. Every option
 * is a property, in JavaScript's spelling (`el.dotSize = 2`), and every one
 * that text can say is an attribute too, in HTML's (`dot-size="2"`);
 * whichever was set last wins. `mount` is given the element and its options
 * when it enters a page, and what it returns is told of every change and
 * destroyed when the element leaves. `extras` are further properties that
 * are not options of the component, such as `label`.
 */
export function hostElement<Options extends object, Extras extends object = object>(
  kinds: OptionKinds<Options>,
  mount: (host: HTMLElement, options: Options & Extras) => Mounted<Options & Extras>,
  readers: AttributeReaders<Options> = {},
  extras: (keyof Extras & string)[] = [],
) {
  type All = Options & Extras;
  const keys = Object.keys(kinds) as (keyof Options & string)[];
  const byAttribute = new Map<string, keyof Options & string>(keys.filter((key) => readers[key] !== null).map((key) => [attributeName(key), key]));

  class HostElement extends Base {
    static observedAttributes = [...byAttribute.keys(), ...extras];

    /* the options as last set, and the component while the element is in a page */
    private options: Record<string, unknown> = {};
    private mounted: Mounted<All> | null = null;

    connectedCallback() {
      /* a property set before the element was defined sits on the instance,
         in front of the accessor: take it through the accessor instead */
      const own = this as unknown as Record<string, unknown>;
      for (const key of [...keys, ...extras]) {
        if (Object.prototype.hasOwnProperty.call(this, key)) {
          const value = own[key];
          delete own[key];
          own[key] = value;
        }
      }
      this.mounted = mount(this, this.options as All);
    }

    disconnectedCallback() {
      this.mounted?.destroy();
      this.mounted = null;
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      if ((extras as string[]).includes(name)) return this.setOption(name, value ?? undefined);
      const key = byAttribute.get(name);
      if (!key) return;
      const read = readers[key];
      this.setOption(key, read && value !== null ? read(value) : parseOption(kinds[key], value));
    }

    getOption(key: string): unknown {
      return this.options[key];
    }

    setOption(key: string, value: unknown) {
      if (Object.is(this.options[key], value)) return;
      this.options = { ...this.options, [key]: value };
      this.mounted?.update(this.options as All);
    }
  }

  for (const key of [...keys, ...extras]) {
    Object.defineProperty(HostElement.prototype, key, {
      configurable: true,
      enumerable: true,
      get(this: HostElement) {
        return this.getOption(key);
      },
      set(this: HostElement, value: unknown) {
        this.setOption(key, value ?? undefined);
      },
    });
  }

  return HostElement as unknown as {
    new (): HTMLElement & Options & Extras;
    prototype: HTMLElement & Options & Extras;
    observedAttributes: string[];
  };
}

/** What every orb element has on top of its component's options. */
export interface OrbElementExtras {
  /** The accessible name, in place of the component's own. */
  label?: string;
}

/**
 * A custom element round one of the core's canvas orbs: the thinking orb
 * and the voice orbs. The orb is drawn in the element's shadow root, so the
 * page's styles do not reach it, and the element lays out like an image.
 */
export function orbElement<Options extends object>(
  kinds: OptionKinds<Options>,
  mount: (root: ShadowRoot, options: Options & OrbElementExtras) => Mounted<Options & OrbElementExtras>,
  readers: AttributeReaders<Options> = {},
) {
  return hostElement<Options, OrbElementExtras>(
    kinds,
    (host, options) => {
      const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
      if (!root.firstChild) {
        const style = document.createElement('style');
        style.textContent = ':host{display:inline-block;vertical-align:middle;line-height:0}:host([hidden]){display:none}';
        root.appendChild(style);
      }
      return mount(root, options);
    },
    readers,
    ['label'],
  );
}

/** A record written as JSON, or a bare attribute (or `true`) for `true`. */
export const flagOrRecord = (text: string): unknown => (text === '' || text === 'true' ? true : text === 'false' ? false : parseOption('object', text));
