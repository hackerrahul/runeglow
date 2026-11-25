import { createMicrophone, type MicrophoneOptions, type MicrophoneState } from 'runeglow/voice-glow';

export type { MicrophoneState };

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
  /* the core's microphone does the asking; the runes below make what it
     knows reactive */
  const mic = createMicrophone(options);
  let stream = $state.raw<MediaStream | null>(mic.stream);
  let state = $state<MicrophoneState>(mic.state);
  let error = $state.raw<Error | null>(mic.error);
  mic.subscribe(() => {
    stream = mic.stream;
    state = mic.state;
    error = mic.error;
  });

  $effect(() => {
    if (options.autoStart) void mic.start();
  });

  $effect(() => () => mic.destroy());

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
      return mic.supported;
    },
    start: mic.start,
    stop: mic.stop,
  };
}
