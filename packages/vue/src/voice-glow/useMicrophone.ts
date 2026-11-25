import { getCurrentInstance, getCurrentScope, onMounted, onScopeDispose, shallowReactive, shallowReadonly } from 'vue';
import { createMicrophone, type MicrophoneOptions, type MicrophoneState } from 'runeglow/voice-glow';

export type UseMicrophoneOptions = MicrophoneOptions;

export interface UseMicrophoneResult {
  /** The live stream to hand to `<VoiceBeam :stream="…">`, or null. */
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
 *   const mic = useMicrophone();
 *
 *   <button @click="mic.start">Listen</button>
 *   <VoiceBeam :stream="mic.stream">…</VoiceBeam>
 *
 * Call it in `setup`. What comes back is one reactive object: read
 * `stream`, `state` and `error` from it, in a template or in code, rather
 * than destructuring them. The stream is stopped when the component is
 * unmounted, and when the browser ends the track (device unplugged,
 * permission revoked) the state falls back to 'idle'.
 */
export function useMicrophone(options: UseMicrophoneOptions = {}): UseMicrophoneResult {
  /* the core's microphone does the asking; the object below makes what it
     knows reactive */
  const mic = createMicrophone(options);
  const result = shallowReactive({
    stream: mic.stream,
    state: mic.state,
    error: mic.error,
    supported: mic.supported,
    start: mic.start,
    stop: mic.stop,
  });
  mic.subscribe(() => {
    result.stream = mic.stream;
    result.state = mic.state;
    result.error = mic.error;
  });

  /* in a component: asked for once it is mounted, and let go of with it */
  if (getCurrentInstance()) {
    onMounted(() => {
      if (options.autoStart) void mic.start();
    });
  } else if (options.autoStart && typeof window !== 'undefined') void mic.start();
  if (getCurrentScope()) onScopeDispose(() => mic.destroy());

  return shallowReadonly(result);
}
