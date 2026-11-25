'use client';

import {
  Fragment,
  createElement,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
} from 'react';
import {
  attachVoiceBeam,
  voiceBeamOptionKinds,
  voiceBeamState,
  voiceBeamView,
  type VoiceBeamHandle,
  type VoiceBeamLayer,
  type VoiceBeamOptions,
} from 'runeglow/voice-glow';
import { cssProps, splitProps } from '../internal/props.js';

/**
 * The beam's own options (see `VoiceBeamOptions`), and any attribute of a
 * div: `className`, `style`, `onClick` and the rest go on the wrapper
 * element, and `children` inside it. A `ref` reaches the wrapper.
 */
export interface VoiceBeamProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof VoiceBeamOptions>, VoiceBeamOptions {}

/* A layer's attributes as React names them: the one SVG attribute it does
   not take in SVG's own spelling. */
const named = (attributes: Record<string, string>) => {
  const out: Record<string, string> = {};
  for (const name in attributes) out[name === 'color-interpolation-filters' ? 'colorInterpolationFilters' : name] = attributes[name];
  return out;
};

function layer(l: VoiceBeamLayer): ReactElement {
  return createElement(l.tag, { key: l.key, ...named(l.attributes), style: l.style && cssProps(l.style) }, ...(l.children ?? []).map(layer));
}

/**
 * A sound-reactive glow along the bottom edge of what it wraps, that rises
 * and blooms with the level of a voice. Feed it a microphone stream, or
 * drive it yourself with `level`.
 *
 *   const mic = useMicrophone();
 *   <VoiceBeam stream={mic.stream}><ChatInput /></VoiceBeam>
 */
export const VoiceBeam = forwardRef<HTMLDivElement, VoiceBeamProps>(function VoiceBeam(props, ref) {
  const [options, rest] = splitProps<VoiceBeamOptions>(props as Record<string, unknown>, voiceBeamOptionKinds);
  const { style, children, ...attributes } = rest as HTMLAttributes<HTMLDivElement>;

  // Stable across server and client, so the generated stylesheet hydrates.
  const id = useId();
  const host = useRef<HTMLDivElement>(null);
  const beam = useRef<VoiceBeamHandle | null>(null);
  /* what the core is started with, should the host be mounted again */
  const latest = useRef(options);
  latest.current = options;
  /* What the page has told the beam since it was attached. The server has
     none of it to ask, so both sides start on the same values and the
     client corrects itself once mounted. */
  const [state, setState] = useState(() => voiceBeamState(options));
  const shown = useRef(state);
  shown.current = state;

  useImperativeHandle(ref, () => host.current as HTMLDivElement, []);

  /* the core does the listening and the motion, on the elements below */
  useEffect(() => {
    const handle = attachVoiceBeam(host.current as HTMLDivElement, latest.current, id, { state: shown.current, onstate: setState });
    beam.current = handle;
    return () => {
      handle.destroy();
      beam.current = null;
    };
  }, [id]);
  /* after every render, once the elements show the state: the core itself
     does nothing when the options and the state say what they said */
  useEffect(() => {
    beam.current?.update(options, state);
  });

  const view = voiceBeamView(options, id, state);
  /* the custom property goes in as it is: React takes those by their own names */
  const hostStyle = { ...view.style, ...style } as CSSProperties;
  return createElement(
    Fragment,
    null,
    createElement('style', { dangerouslySetInnerHTML: { __html: view.css } }),
    createElement('div', { ...attributes, ...view.attributes, ref: host, style: hostStyle }, children, ...view.layers.map(layer)),
  );
});
