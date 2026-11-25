/* Bot avatars, with no framework: animated faces for AI agents on a canvas.
   `mountBotAvatar` and `mountRobotHead` put one on a page; the `attach…`
   and `…View` pairs are what the framework adapters are built on. */

export { attachBotAvatar, botAvatarView, mountBotAvatar } from './avatar';
export type { BotAvatarHandle, BotAvatarHooks, BotAvatarMountOptions, BotAvatarView, MountedBotAvatar } from './avatar';

export { attachRobotHead, mountRobotHead, robotHeadView } from './robot/head';
export type { MountedRobotHead, RobotHeadHandle, RobotHeadHooks, RobotHeadMountOptions, RobotHeadView } from './robot/head';

export { botAvatarOptionKinds } from './types';
export { robotHeadOptionKinds } from './robot/types';

export { botAvatarPresets, botAvatarPalette, botAvatarTypes, botAvatarFaces, botAvatarStates } from './presets';
export { SHAPE_PATHS as botAvatarShapes, SHAPE_PARTS as botAvatarParts } from './shapes';
export { autoInk, luminance, parseColor, shade } from './color';

export {
  robotHeadShapes,
  robotHeadStates,
  robotHeadFinishes,
  robotHeadPixels,
  robotHeadColorways,
  robotHeadColorwayNames,
} from './robot/presets';

/* the engine itself, for renderers on other canvases (a React Native port
   bakes forms with these and lights them in a shader) */
export { Sim as BotAvatarSim, restPose, JUMP_DEFAULTS as botAvatarJumpDefaults } from './engine';
export { draw as drawBotAvatarFrame, OVERSCAN as BOT_AVATAR_OVERSCAN, RISE as BOT_AVATAR_RISE } from './draw';
export { warmPlastic as warmBotAvatarPlastic, buildForm as bakeBotAvatarForm, buildMatcap as buildBotAvatarMatcap, shadeTexels as shadeBotAvatarTexels, capFrame as botAvatarCapFrame, tierFor as botAvatarTier, PAD as BOT_AVATAR_PAD, SPAN as BOT_AVATAR_SPAN, MATCAP_SIZE as BOT_AVATAR_MATCAP_SIZE } from './plastic';
export type { Form as BotAvatarForm, Frame as BotAvatarFrame, Material as BotAvatarMaterial, Rig as BotAvatarRig } from './plastic';
export type { JumpConfig as BotAvatarJumpConfig, Pose as BotAvatarPose } from './engine';
export type { DrawConfig as BotAvatarDrawConfig } from './draw';

export type {
  BotAvatarOptions,
  BotAvatarType,
  BotAvatarFace,
  BotAvatarState,
  BotAvatarShading,
  BotAvatarSquashEase,
  BotAvatarPreset,
  BotAvatarHat,
  BotAvatarGlasses,
} from './types';
export type {
  RobotHeadOptions,
  RobotHeadShape,
  RobotHeadState,
  RobotHeadFinish,
  RobotHeadPixels,
  RobotHeadColorway,
  RobotHeadColorwayName,
} from './robot/types';
