import type {
  RobotHeadColorway,
  RobotHeadColorwayName,
  RobotHeadFinish,
  RobotHeadPixels,
  RobotHeadShape,
  RobotHeadState,
} from './types';

export const robotHeadShapes: RobotHeadShape[] = ['rectangle', 'square', 'circle', 'hexagon', 'capsule', 'octagon'];

export const robotHeadStates: RobotHeadState[] = [
  'idle',
  'thinking',
  'searching',
  'listening',
  'speaking',
  'working',
  'waiting',
  'success',
  'happy',
  'error',
  'sleeping',
];

export const robotHeadFinishes: RobotHeadFinish[] = ['gloss', 'matte', 'metal'];
export const robotHeadPixels: RobotHeadPixels[] = ['square', 'round'];

/**
 * The colourways: a shell, the trim that goes with it, and LEDs that read
 * on the dark glass. `cobalt` is the React library's own blue.
 */
export const robotHeadColorways: Record<RobotHeadColorwayName, RobotHeadColorway> = {
  cobalt: { label: 'Cobalt', color: '#2b49a3', trimColor: '#93a6c8', screenColor: '#e8f2ff' },
  graphite: { label: 'Graphite', color: '#2c2f36', trimColor: '#8a919e', screenColor: '#7dffb0' },
  snow: { label: 'Snow', color: '#e9ecf2', trimColor: '#a7b1c2', screenColor: '#8fd0ff' },
  cream: { label: 'Cream', color: '#e4dac4', trimColor: '#b3a281', screenColor: '#ffb347' },
  tangerine: { label: 'Tangerine', color: '#e8622c', trimColor: '#f0d6b4', screenColor: '#fff1dc' },
  cherry: { label: 'Cherry', color: '#c22f3a', trimColor: '#e6c5c5', screenColor: '#ffe6e2' },
  bubblegum: { label: 'Bubblegum', color: '#e56aa6', trimColor: '#f4d0e0', screenColor: '#fff0f7' },
  grape: { label: 'Grape', color: '#6a45d4', trimColor: '#c2b5ec', screenColor: '#f0eaff' },
  mint: { label: 'Mint', color: '#35b592', trimColor: '#d3ece3', screenColor: '#e8fff7' },
  lemon: { label: 'Lemon', color: '#e6bd2a', trimColor: '#f3e8be', screenColor: '#fff9df' },
};

export const robotHeadColorwayNames = Object.keys(robotHeadColorways) as RobotHeadColorwayName[];

/** How each state is named in the default `aria-label`. */
export const robotStateLabels: Record<RobotHeadState, string> = {
  idle: 'idle',
  thinking: 'thinking',
  searching: 'searching',
  listening: 'listening',
  speaking: 'speaking',
  working: 'working',
  waiting: 'waiting for you',
  success: 'done',
  happy: 'happy',
  error: 'error',
  sleeping: 'sleeping',
};
