/* Bot avatars as HTML tags. Importing this file registers them:

     <runeglow-bot-avatar type="cat" state="working"></runeglow-bot-avatar>
     <runeglow-robot-head state="thinking" size="160"></runeglow-robot-head>

   Every option is an attribute and a property; see `optionsElement`. */

import { botAvatarOptionKinds, mountBotAvatar, mountRobotHead, robotHeadOptionKinds, type BotAvatarOptions, type RobotHeadOptions } from 'runeglow/bot-avatars';
import { define, optionsElement } from '../internal/element.js';

/** `<runeglow-bot-avatar>`: an animated face for an AI agent. */
export const BotAvatarElement = optionsElement<BotAvatarOptions>(botAvatarOptionKinds, mountBotAvatar);
export type BotAvatarElement = InstanceType<typeof BotAvatarElement>;

/** `<runeglow-robot-head>`: a TV-headed robot with an LED face. */
export const RobotHeadElement = optionsElement<RobotHeadOptions>(robotHeadOptionKinds, mountRobotHead);
export type RobotHeadElement = InstanceType<typeof RobotHeadElement>;

define('runeglow-bot-avatar', BotAvatarElement);
define('runeglow-robot-head', RobotHeadElement);

declare global {
  interface HTMLElementTagNameMap {
    'runeglow-bot-avatar': BotAvatarElement;
    'runeglow-robot-head': RobotHeadElement;
  }
}

/* The lists, the palettes, the option types and the engine are the core's,
   the same in every framework. */
export * from 'runeglow/bot-avatars';
