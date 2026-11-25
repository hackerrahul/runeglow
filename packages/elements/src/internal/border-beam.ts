import { attributeName, parseOption, type OptionKinds } from 'runeglow/kit';

/* An element for a component that works on the page's own content: a
   border beam round a card, a wave over two views. Unlike `optionsElement`
   (element.ts) it has no shadow root. The content stays the element's
   ordinary children and the core is attached to the element itself, so the
   page's styles and scripts reach the content as before. First written for
   the border beam, hence the file's name; the distortion wave uses it too. */

/* where there is no DOM (a server rendering the page), the classes below
   still have to be defined, for the import to work at all */
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

/* what the core gives back for an element it has been attached to */
interface Attached<Options> {
  update(options: Options): void;
  destroy(): void;
}

export interface HostElementSetup<Options> {
  /**
   * An option whose attribute is read some other way than its kind says:
   * given the attribute's text (or null, when it is taken away) and the
   * element, it returns the option's value.
   */
  parse?: { [K in keyof Options]?: (text: string | null, host: HTMLElement) => Options[K] | undefined };
  /** An option whose property cannot have the option's name, because every element already has one of that name. */
  rename?: { [K in keyof Options]?: string };
}

/** What a host element has on top of its component's options. */
export interface HostElementExtras<Handle> {
  /** The core's handle while the element is in a page; null before and after. */
  readonly attached: Handle | null;
}

/**
 * A custom element that is itself the element its component runs on. Every
 * option is both an attribute, in HTML's spelling (`color-variant="ocean"`),
 * and a property, in JavaScript's (`el.colorVariant = 'ocean'`); whichever
 * was set last wins. `attach` starts the component when the element enters
 * a page; what it returns is told of every change and destroyed when the
 * element leaves.
 */
export function hostElement<Options extends object, Handle extends Attached<Options>>(
  kinds: OptionKinds<Options>,
  attach: (host: HTMLElement, options: Options) => Handle,
  setup: HostElementSetup<Options> = {},
) {
  const keys = Object.keys(kinds) as (keyof Options & string)[];
  const byAttribute = new Map<string, keyof Options & string>(keys.map((key) => [attributeName(key), key]));
  const parsers = (setup.parse ?? {}) as Record<string, ((text: string | null, host: HTMLElement) => unknown) | undefined>;
  const renames = (setup.rename ?? {}) as Record<string, string | undefined>;
  const propertyOf = (key: string) => renames[key] ?? key;

  class HostElement extends Base {
    static observedAttributes = [...byAttribute.keys()];

    /* the options as last set, and the component while the element is in a page */
    private options: Record<string, unknown> = {};
    attached: Handle | null = null;

    connectedCallback() {
      /* a property set before the element was defined sits on the instance,
         in front of the accessor: take it through the accessor instead */
      const own = this as unknown as Record<string, unknown>;
      for (const key of keys) {
        const property = propertyOf(key);
        if (Object.prototype.hasOwnProperty.call(this, property)) {
          const value = own[property];
          delete own[property];
          own[property] = value;
        }
      }
      this.attached = attach(this, this.options as Options);
    }

    disconnectedCallback() {
      this.attached?.destroy();
      this.attached = null;
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      const key = byAttribute.get(name);
      if (!key) return;
      const parse = parsers[key];
      this.setOption(key, parse ? parse(value, this) : parseOption(kinds[key], value));
    }

    getOption(key: string): unknown {
      return this.options[key];
    }

    setOption(key: string, value: unknown) {
      if (Object.is(this.options[key], value)) return;
      this.options = { ...this.options, [key]: value };
      this.attached?.update(this.options as Options);
    }
  }

  for (const key of keys) {
    Object.defineProperty(HostElement.prototype, propertyOf(key), {
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
    new (): HTMLElement & Options & HostElementExtras<Handle>;
    prototype: HTMLElement & Options & HostElementExtras<Handle>;
    observedAttributes: string[];
  };
}

/* A rule every element of a kind needs, such as its `display`: written
   once into the document or the shadow root the element is in, inside
   `:where()` so that any rule of the page's own overrides it. */
const ruled = new WeakMap<Node, Set<string>>();
export function baseRule(host: HTMLElement, rule: string) {
  const root = host.getRootNode();
  const into = root instanceof ShadowRoot ? root : host.ownerDocument.head;
  if (!into) return;
  let rules = ruled.get(into);
  if (!rules) ruled.set(into, (rules = new Set()));
  if (rules.has(rule)) return;
  rules.add(rule);
  const style = host.ownerDocument.createElement('style');
  style.textContent = rule;
  into.insertBefore(style, into.firstChild);
}
