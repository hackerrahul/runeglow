import { getAudioContext } from './audio';

export type MicrophoneState = 'idle' | 'requesting' | 'live' | 'denied' | 'unsupported' | 'error';

export interface UseMicrophoneOptions {
  /**
   * Extra `getUserMedia` audio constraints. The defaults turn the browser's
   * voice processing off (echo cancellation, noise suppression, auto gain)
   * so the beam sees the real dynamics of the voice rather than a levelled
   * signal; pass `{}` to keep the browser defaults.
   */
  constraints?: MediaTrackConstraints;
  /** Ask for the microphone on mount rather than waiting for `start()`. */
  autoStart?: boolean;
}

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
 * Microphone access for VoiceBeam.
 *
 * ```svelte
 * <script>
 *   const mic = useMicrophone();
 * </script>
 *
 * <button onclick={mic.start}>Listen</button>
 * <VoiceBeam stream={mic.stream}>…</VoiceBeam>
 * ```
 *
 * Call it while a component is being set up, as you would a rune: the
 * returned object's `stream`, `state` and `error` are reactive, so read
 * them from it rather than destructuring. The stream is stopped when the
 * component is destroyed, and when the browser ends the track (device
 * unplugged, permission revoked) the state falls back to 'idle'.
 */
export function useMicrophone(options: UseMicrophoneOptions = {}): UseMicrophoneResult {
  let stream = $state.raw<MediaStream | null>(null);
  let state = $state<MicrophoneState>(isSupported() ? 'idle' : 'unsupported');
  let error = $state.raw<Error | null>(null);
  // The current stream, kept apart from the reactive one so `start` and the
  // teardown can read it without subscribing to anything.
  let current: MediaStream | null = null;

  const stop = () => {
    const live = current;
    current = null;
    if (live) live.getTracks().forEach((t) => t.stop());
    stream = null;
    state = isSupported() ? 'idle' : 'unsupported';
  };

  const start = async (): Promise<MediaStream | null> => {
    if (!isSupported()) {
      state = 'unsupported';
      return null;
    }
    if (current) return current;

    // Create (and resume) the shared context inside the gesture that
    // triggered this, while the browser still allows it.
    getAudioContext();

    state = 'requesting';
    error = null;
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: { ...DEFAULT_CONSTRAINTS, ...(options.constraints ?? {}) },
      });
      current = next;
      stream = next;
      state = 'live';
      const onEnded = () => {
        if (current !== next) return;
        current = null;
        stream = null;
        state = 'idle';
      };
      next.getAudioTracks().forEach((t) => t.addEventListener('ended', onEnded));
      return next;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      error = err;
      state = err.name === 'NotAllowedError' || err.name === 'SecurityError' ? 'denied' : 'error';
      return null;
    }
  };

  $effect(() => {
    if (options.autoStart) void start();
  });

  $effect(() => () => {
    const live = current;
    current = null;
    if (live) live.getTracks().forEach((t) => t.stop());
  });

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
  };
}
