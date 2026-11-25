'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createMicrophone, type Microphone, type MicrophoneOptions, type MicrophoneState } from 'runeglow/voice-glow';

export type UseMicrophoneOptions = MicrophoneOptions;

export interface UseMicrophoneResult {
  /** The live stream to hand to `<VoiceBeam stream={…}>`, or null. */
  readonly stream: MediaStream | null;
  readonly state: MicrophoneState;
  /** The error behind a 'denied' / 'error' state, if any. */
  readonly error: Error | null;
  /** True when this browser can capture audio at all. */
  readonly supported: boolean;
  /** Request the microphone. Call it from a click so Safari lets audio start. */
  start: () => Promise<MediaStream | null>;
  /** Stop every track and drop the stream. */
  stop: () => void;
}

/* what a component is given of the microphone: a new one each time it changes */
const snapshot = (mic: Microphone) => ({ stream: mic.stream, state: mic.state, error: mic.error, supported: mic.supported });
/* A server has no microphone, and says so; the first render in the browser
   has to say what the server said, and is put right straight after. */
const SERVER = { stream: null, state: 'unsupported' as MicrophoneState, error: null, supported: false };

/**
 * Microphone access for VoiceBeam.
 *
 *   const mic = useMicrophone();
 *
 *   <button onClick={mic.start}>Listen</button>
 *   <VoiceBeam stream={mic.stream}>…</VoiceBeam>
 *
 * The component renders again whenever `stream`, `state` or `error`
 * changes; `start` and `stop` stay the same functions throughout. The
 * stream is stopped when the component unmounts, and when the browser ends
 * the track (device unplugged, permission revoked) the state falls back to
 * 'idle'.
 */
export function useMicrophone(options: UseMicrophoneOptions = {}): UseMicrophoneResult {
  /* the constraints are read when the microphone is asked for, so the latest are the ones used */
  const latest = useRef(options);
  latest.current = options;
  const [mic] = useState(() =>
    createMicrophone({
      get constraints() {
        return latest.current.constraints;
      },
    }),
  );

  const store = useMemo(() => {
    let last = snapshot(mic);
    return {
      subscribe: (listener: () => void) =>
        mic.subscribe(() => {
          last = snapshot(mic);
          listener();
        }),
      get: () => {
        /* a change made before anything subscribed is still to be seen */
        if (last.stream !== mic.stream || last.state !== mic.state || last.error !== mic.error) last = snapshot(mic);
        return last;
      },
    };
  }, [mic]);
  const now = useSyncExternalStore(store.subscribe, store.get, () => SERVER);

  const autoStart = !!options.autoStart;
  useEffect(() => {
    if (autoStart) void mic.start();
  }, [mic, autoStart]);
  useEffect(() => () => mic.destroy(), [mic]);

  return useMemo(() => ({ ...now, start: mic.start, stop: mic.stop }), [mic, now]);
}
