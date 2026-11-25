import { defineComponent, h, onBeforeUnmount, provide, ref, watchEffect } from 'vue';
import { LiquidGroup, attachLiquid, liquidOptionKinds, liquidView, type LiquidHandle, type LiquidOptions } from 'runeglow/liquid-gooey';
import { propsFrom } from '../internal/props.js';
import { LIQUID, pageId } from './context.js';
import { LiquidItem } from './LiquidItem.js';

const LAYER = { 'aria-hidden': 'true', focusable: 'false' };

/**
 * The liquid group: renders the silhouette SVG layer (goo filter + shadow
 * chain) behind its slot. The content stays crisp; each `LiquidItem`
 * mirrors its piece's geometry into the liquid layer. `class`, `style` and
 * other attributes fall through to the group element; a template ref gives
 * `element` (that element) and `group` (the core's group object).
 *
 *   <Liquid fill="#202020">
 *     <LiquidItem><button>One</button></LiquidItem>
 *     <LiquidItem><button>Two</button></LiquidItem>
 *   </Liquid>
 */
const LiquidRoot = defineComponent(
  (props: LiquidOptions, { slots, expose }) => {
    const element = ref<HTMLDivElement | null>(null);
    const id = pageId();
    /* The pieces reach the group through this object. It is made before the
       element below exists: a piece attached first draws itself once the
       group is attached, and one attached later draws itself at once. */
    const group = new LiquidGroup();
    provide(LIQUID, group);
    let liquid: LiquidHandle | null = null;

    /* The core measures the group, runs the engine and draws a melting
       pair, in the layers below. It gets a plain copy of the props:
       started once the element exists, then told whenever one changes. */
    watchEffect(
      () => {
        const options: LiquidOptions = { ...props };
        if (liquid) liquid.update(options);
        else if (element.value) liquid = attachLiquid(element.value, options, group);
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      liquid?.destroy();
      liquid = null;
    });
    expose({ element, group });

    return () => {
      const view = liquidView(props, id);
      return h('div', { ref: element, style: view.style }, [
        /* The silhouette: every piece draws its blob in the filtered group.
           The core sizes the filter's region to the group's measured box. */
        h('svg', { ...LAYER, 'data-gooey-svg': '', style: view.surfaceStyle }, [
          h('defs', [
            h('filter', { id: view.filterId, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB', innerHTML: view.primitives }),
          ]),
          h('g', { id: view.silhouetteId, filter: `url(#${view.filterId})`, style: { fill: view.fill } }),
        ]),
        /* the melt overlay, above the content, masked to where liquid exists */
        h('svg', { ...LAYER, 'data-gooey-overlay': '', style: view.overlayStyle }, [
          h('defs', [h('mask', { id: view.maskId, maskUnits: 'userSpaceOnUse' }, [h('use', { href: `#${view.silhouetteId}` })])]),
          h('g', { mask: `url(#${view.maskId})` }, [h('g')]),
        ]),
        slots.default?.(),
      ]);
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'Liquid', props: propsFrom(liquidOptionKinds) as never },
);

/** The liquid group: renders the merged silhouette (goo + real shadows) behind
 *  your crisp content. Put `Liquid.Item`s (or `LiquidItem`s) inside. */
export const Liquid = Object.assign(LiquidRoot, { Item: LiquidItem });
