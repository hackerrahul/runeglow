import type { BotAvatarState, RobotHeadState } from 'runeglow/bot-avatars';

/* the same walk through the states on every page */
export const ROBOT: RobotHeadState[] = ['idle', 'thinking', 'searching', 'working', 'waiting', 'success', 'error', 'sleeping'];
export const AVATAR: BotAvatarState[] = ['default', 'working', 'sleeping'];
