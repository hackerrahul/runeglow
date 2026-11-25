/* Gooey as HTML tags. Importing this file registers them:

     <runeglow-liquid fill="#202020">
       <runeglow-liquid-item y="-64" transition="bouncy"><button>…</button></runeglow-liquid-item>
       <runeglow-liquid-item><button>+</button></runeglow-liquid-item>
     </runeglow-liquid>

   Every option is an attribute and a property; see `lightElement`. A
   record is written as JSON in an attribute: morph='{"shape":true}'. */

import {
  attachLiquidItem,
  liquidGroupOf,
  liquidItemOptionKinds,
  liquidItemView,
  liquidOptionKinds,
  mountLiquid,
  type LiquidItemOptions,
  type LiquidOptions,
} from 'runeglow/liquid-gooey';
import { define } from '../internal/element.js';
import { lightElement, styleRootOf } from './light.js';

const GROUP = 'runeglow-liquid';
const ITEM = 'runeglow-liquid-item';

/* A group is a block and a piece a wrapper with no box of its own, as the
   div and the span of the other frameworks are; a piece the library moves
   needs a box to move. */
const CSS =
  `:where(${GROUP}){display:block}` +
  `:where(${ITEM}){display:contents}` +
  `:where(${ITEM}[data-liquid-item="mirrored"]){display:inline-block;will-change:transform}`;

/**
 * `<runeglow-liquid>`: the liquid group. It draws one merged surface behind
 * its children, in two layers it puts in front of them. `blur` is an
 * attribute only: an element's `blur()` is already something else.
 */
export const LiquidElement = lightElement<LiquidOptions>(liquidOptionKinds, (element, options) => {
  styleRootOf(element, CSS);
  return mountLiquid(element, options);
});
export type LiquidElement = InstanceType<typeof LiquidElement>;

/* the group an element is inside, looking out through any shadow roots on the way */
function groupElementOf(element: Element): Element | null {
  let from: Element | null = element.parentElement ?? hostOf(element);
  while (from) {
    const hit = from.closest(GROUP);
    if (hit) return hit;
    from = hostOf(from);
  }
  return null;
}
const hostOf = (element: Element): Element | null => {
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
};

/**
 * `<runeglow-liquid-item>`: one piece of the group it is inside. Its first
 * child element is the piece. It finds its group by tag, not by what that
 * element has become: the core keeps a group object for the element from
 * the first time one is asked for, so a piece that is upgraded before its
 * `<runeglow-liquid>` waits for it, and one upgraded after joins at once.
 */
export const LiquidItemElement = lightElement<LiquidItemOptions>(liquidItemOptionKinds, (element, options) => {
  styleRootOf(element, CSS);
  const host = groupElementOf(element);
  if (!host) {
    console.warn(`[runeglow/liquid-gooey] <${ITEM}> must be inside a <${GROUP}>.`);
    return null;
  }
  /* which of the styles above the element takes */
  const show = (o: LiquidItemOptions) => (element.dataset.liquidItem = liquidItemView(o).kind);
  show(options);
  const item = attachLiquidItem(liquidGroupOf(host), element, options);
  return {
    update(next) {
      show(next);
      item.update(next);
    },
    destroy: () => item.destroy(),
  };
});
export type LiquidItemElement = InstanceType<typeof LiquidItemElement>;

define(GROUP, LiquidElement);
define(ITEM, LiquidItemElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-liquid': LiquidElement;
    'runeglow-liquid-item': LiquidItemElement;
  }
}

/* The option types, the defaults, the springs and the functions that run a
   group with no framework are the core's, the same in every framework. */
export * from 'runeglow/liquid-gooey';
