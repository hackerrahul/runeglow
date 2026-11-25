import { defineComponent, h, inject, onBeforeUnmount, ref, watchEffect } from 'vue';
import { attachLiquidItem, liquidItemOptionKinds, liquidItemView, type LiquidItemHandle, type LiquidItemOptions } from 'runeglow/liquid-gooey';
import { propsFrom } from '../internal/props.js';
import { LIQUID, plain } from './context.js';

/* Three options take more than the record their kind says: a preset's name,
   `true` or a strength, one number or four. Vue checks what it is given
   against the declared types, so these are declared in full. */
const PROPS = {
  ...propsFrom(liquidItemOptionKinds),
  transition: { type: [String, Object], default: undefined },
  dissolve: { type: [Boolean, Number, Object], default: undefined },
  radius: { type: [Number, Array], default: undefined },
};

/**
 * One piece of a liquid group. Wrap an element in it and the group draws
 * that element's share of the merged surface. `class` and `style` go on the
 * piece's wrapper; a template ref gives `element` (the wrapper).
 *
 *   <LiquidItem effect="move"><div class="thumb" /></LiquidItem>
 */
export const LiquidItem = defineComponent(
  (props: LiquidItemOptions, { slots, attrs, expose }) => {
    const found = inject(LIQUID, null);
    if (!found) throw new Error('<LiquidItem> must be rendered inside a <Liquid> group.');
    const group = found;

    const wrap = ref<HTMLElement | null>(null);
    let item: LiquidItemHandle | null = null;
    let on: HTMLElement | null = null;

    /* The core draws the piece's share of the liquid and keeps it with the
       content. A change of effect starts the piece afresh, wrapper and
       content (the key below makes Vue do that): the piece is then
       attached again, on the new wrapper. */
    watchEffect(
      () => {
        const options = plain(props) as LiquidItemOptions;
        const el = wrap.value;
        if (item && el === on) {
          item.update(options);
          return;
        }
        item?.destroy();
        item = null;
        on = el;
        if (el) item = attachLiquidItem(group, el, options);
      },
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      item?.destroy();
      item = null;
    });
    expose({ element: wrap });

    return () => {
      /* which wrapper the piece gets: a box the library moves, or a holder for content you move */
      const view = liquidItemView(props);
      return h(
        view.tag,
        view.styled
          ? { ...attrs, key: view.key, ref: wrap, style: [view.style, attrs.style, view.lastStyle] }
          : { key: view.key, ref: wrap, style: view.style },
        slots.default?.(),
      );
    };
  },
  // The table is typed by the core; Vue's own typing of this option only knows a list of names.
  { name: 'LiquidItem', inheritAttrs: false, props: PROPS as never },
);
