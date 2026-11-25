'use client';

import { createContext, useEffect, useLayoutEffect } from 'react';
import type { LiquidGroup } from 'runeglow/liquid-gooey';

/* The group and its pieces share one object from the core (the filtered
   layer the pieces draw in, the measurement engine, the melt registry).
   React's part is only how a piece finds it: through context. */
export const LiquidContext = createContext<LiquidGroup | null>(null);

/* The liquid is drawn in effects, and has to be there before the browser
   paints the content it sits behind: a layout effect. A server has no
   layout to wait for, and older Reacts warn when asked for one there. */
export const useBeforePaint = typeof document === 'undefined' ? useEffect : useLayoutEffect;
