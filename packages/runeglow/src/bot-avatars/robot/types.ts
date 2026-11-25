import type { OptionKinds } from '../../internal/options';

/**
 * What the robot is doing: each state has its own face on the screen, its
 * own motion and its own antenna light. `waiting` and `success` are
 * Runeglow additions; the rest are the React library's.
 */
export type RobotHeadState =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'listening'
  | 'speaking'
  | 'working'
  | 'waiting'
  | 'success'
  | 'happy'
  | 'error'
  | 'sleeping';

/**
 * The outline of the head, seen from the front. Every shape carries the
 * same screen, ears and antenna. `capsule` and `octagon` are Runeglow
 * additions.
 */
export type RobotHeadShape = 'rectangle' | 'square' | 'circle' | 'hexagon' | 'capsule' | 'octagon';

/**
 * What the shell is made of. `gloss`: a moulded plastic under a clear
 * coat, with a hot spot and the studio's window in it. `matte`: a
 * soft-touch shell, the light spread wide and nothing reflected. `metal`:
 * anodised aluminium, the reflections taking the shell's own colour.
 */
export type RobotHeadFinish = 'gloss' | 'matte' | 'metal';

/** The shape of each LED on the screen. */
export type RobotHeadPixels = 'square' | 'round';

/** A named set of colours: the shell, the trim and the LEDs. */
export interface RobotHeadColorway {
  /** Display name, for labels. */
  label: string;
  /** The shell. */
  color: string;
  /** The ears and the antenna's collar. */
  trimColor: string;
  /** The LEDs. */
  screenColor: string;
}

export type RobotHeadColorwayName =
  | 'cobalt'
  | 'graphite'
  | 'snow'
  | 'cream'
  | 'tangerine'
  | 'cherry'
  | 'bubblegum'
  | 'grape'
  | 'mint'
  | 'lemon';

/**
 * Everything a robot head can be told. The same in every framework; each
 * adapter adds its own element attributes on top.
 */
export interface RobotHeadOptions {
  /** The head's outline: `rectangle` (default), `square`, `circle`, `hexagon`, `capsule` or `octagon`. */
  shape?: RobotHeadShape;
  /** What it is doing. Default `idle`. */
  state?: RobotHeadState;
  /** The box the robot rests in, in px; hops and the glow reach past it. Default `160`. */
  size?: number;
  /**
   * A named set of colours for the shell, the trim and the LEDs. `color`,
   * `trimColor` and `screenColor` each override their part of it. Default
   * `cobalt`.
   */
  colorway?: RobotHeadColorwayName;
  /** Colour of the shell. Default: the colourway's. */
  color?: string;
  /** Colour of the ears and the antenna's collar. Default: the colourway's. */
  trimColor?: string;
  /** Colour of the LEDs on the screen. Default: the colourway's. */
  screenColor?: string;
  /** What the shell is made of: `gloss` (default), `matte` or `metal`. */
  finish?: RobotHeadFinish;
  /** The shape of each LED: `square` (default) or `round`. */
  pixels?: RobotHeadPixels;
  /** Multiplier on every animation's speed. Default `1`. */
  speed?: number;
  /** Freeze every animation on its current frame. */
  paused?: boolean;
  /** Follow the pointer with the eyes and head, and hop and spin on a click. Default `true`. */
  interactive?: boolean;
  /**
   * Show the antenna's stem and its light. Default `true`. Turn it off for
   * small sizes, such as avatars in a list: the knob on top stays, and the
   * head grows to fill the room the antenna took.
   */
  antenna?: boolean;
  /** Draw the soft shadow on the floor under the head. Default `true`. */
  floorShadow?: boolean;
  /**
   * 0–1. Offsets the blinks and glances so a row of heads does not move in
   * unison. Defaults to a value derived from the instance id.
   */
  seed?: number;
  /**
   * Holds the head at this orientation, in radians — `yaw` turns it to the
   * viewer's right, `pitch` tips it to look up, `roll` tilts it — in place
   * of its own turns, hops and glances. The screen and the antenna keep
   * going. For turning a head round by hand, as a 3D viewer does.
   */
  pose?: { yaw?: number; pitch?: number; roll?: number };
}

/** What kind of value each option takes, for the adapters. */
export const robotHeadOptionKinds = {
  shape: 'string',
  state: 'string',
  size: 'number',
  colorway: 'string',
  color: 'string',
  trimColor: 'string',
  screenColor: 'string',
  finish: 'string',
  pixels: 'string',
  speed: 'number',
  paused: 'boolean',
  interactive: 'boolean',
  antenna: 'boolean',
  floorShadow: 'boolean',
  seed: 'number',
  pose: 'object',
} as const satisfies OptionKinds<RobotHeadOptions>;
