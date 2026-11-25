// The Web Audio plumbing is the same for every voice library in the
// package, and it has to be shared: one AudioContext for the page, and one
// source node per stream however many beams and rings listen to it.
export { acquireAnalyser, getAudioContext, isAudioSupported } from '../voice-glow/audio';
export type { AnalyserLease } from '../voice-glow/audio';
