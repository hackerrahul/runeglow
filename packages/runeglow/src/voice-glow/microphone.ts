import { getAudioContext } from './audio';

export type MicrophoneState = 'idle' | 'requesting' | 'live' | 'denied' | 'unsupported' | 'error';

export interface MicrophoneOptions {
  /**
   * Extra `getUserMedia` audio constraints. The defaults turn the browser's
   * voice processing off (echo cancellation, noise suppression, auto gain)
   * so the beam sees the real dynamics of the voice rather than a levelled
   * signal; pass `{}` to keep the browser defaults.
   */
  constraints?: MediaTrackConstraints;
  /**
   * Ask for the microphone at once rather than waiting for `start()`. The
   * framework hooks (`useMicrophone`) act on this when their component
   * mounts; `createMicrophone` itself does not, so with no framework call
   * `start()` when the page is ready.
   */
  autoStart?: boolean;
}

/**
 * A microphone outside any framework: the stream, where the request for it
 * stands, and a way to be told when either changes. The Svelte hook, the
 * React hook and the Vue composable are this object with each framework's
 * own reactivity round it.
 */
export interface Microphone {
  /** The live stream to hand to a voice beam or a voice ring, or null. */
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
  /** Be told whenever `stream`, `state` or `error` changes. Returns the function that stops telling. */
  subscribe: (listener: () => void) => () => void;
  /**
   * Stop every track, as whatever owned the microphone goes away. Nothing
   * is told and the state is left as it was; a request still in the air is
   * dropped when it lands. The microphone can be started again afterwards.
   */
  destroy: () => void;
}

const DEFAULT_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

function isSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Microphone access for the voice components.
 *
 *   const mic = createMicrophone();
 *   button.addEventListener('click', mic.start);
 *   mic.subscribe(() => beam.update({ stream: mic.stream }));
 *
 * `options.constraints` is read when the microphone is asked for, so the
 * object may change in between. `autoStart` is left to the caller, who
 * knows when its page is ready: call `start()`. When the browser ends the
 * track (device unplugged, permission revoked) the state falls back to
 * 'idle'.
 */
export function createMicrophone(options: MicrophoneOptions = {}): Microphone {
  let stream: MediaStream | null = null;
  let state: MicrophoneState = isSupported() ? 'idle' : 'unsupported';
  let error: Error | null = null;
  // The current stream, kept apart from the one that is told about so
  // `start` and the teardown can read it whatever was last announced.
  let current: MediaStream | null = null;
  // One request at a time: a second `start` while the first is in the air
  // waits for the same stream instead of opening the microphone twice.
  let pending: Promise<MediaStream | null> | null = null;
  // Counts the teardowns, so a request that lands after one knows it is not wanted.
  let life = 0;

  const listeners = new Set<() => void>();
  const tell = () => {
    for (const listener of [...listeners]) listener();
  };

  const stop = () => {
    const live = current;
    current = null;
    if (live) live.getTracks().forEach((t) => t.stop());
    stream = null;
    state = isSupported() ? 'idle' : 'unsupported';
    tell();
  };

  const request = async (): Promise<MediaStream | null> => {
    const born = life;
    // Create (and resume) the shared context inside the gesture that
    // triggered this, while the browser still allows it.
    getAudioContext();

    state = 'requesting';
    error = null;
    tell();
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: { ...DEFAULT_CONSTRAINTS, ...(options.constraints ?? {}) },
      });
      if (born !== life) {
        next.getTracks().forEach((t) => t.stop());
        return null;
      }
      current = next;
      stream = next;
      state = 'live';
      const onEnded = () => {
        if (current !== next) return;
        current = null;
        stream = null;
        state = 'idle';
        tell();
      };
      next.getAudioTracks().forEach((t) => t.addEventListener('ended', onEnded));
      tell();
      return next;
    } catch (e) {
      if (born !== life) return null;
      const err = e instanceof Error ? e : new Error(String(e));
      error = err;
      state = err.name === 'NotAllowedError' || err.name === 'SecurityError' ? 'denied' : 'error';
      tell();
      return null;
    }
  };

  const start = (): Promise<MediaStream | null> => {
    if (!isSupported()) {
      if (state !== 'unsupported') {
        state = 'unsupported';
        tell();
      }
      return Promise.resolve(null);
    }
    if (current) return Promise.resolve(current);
    if (pending) return pending;
    const mine = (pending = request().finally(() => {
      if (pending === mine) pending = null;
    }));
    return mine;
  };

  return {
    get stream() {
      return stream;
    },
    get state() {
      return state;
    },
    get error() {
      return error;
    },
    get supported() {
      return isSupported();
    },
    start,
    stop,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      life++;
      pending = null;
      const live = current;
      current = null;
      if (live) live.getTracks().forEach((t) => t.stop());
    },
  };
}
