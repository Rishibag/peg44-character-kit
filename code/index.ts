// peg44-character-kit public API. Import everything from here:
//   import { createCharacter, Acting, PRESETS, createStudio, lightAll, setupRenderer } from "../code";
export { createCharacter, PegChar } from "./rig";
export { resolveSpec } from "./spec";
export type { CharacterSpec, TopSpec, OuterSpec, BottomSpec, ShoeSpec, HatSpec, Accessory, AccessoryType, HairStyle, HatType, TopType, OuterType, BottomType, ShoeType, Sleeves, Collar, Build, Age } from "./spec";
export { BODY, SKIN, HAIR, EXPR, MOUTHS, HAND, face, restPose, handMix } from "./kit";
export type { BodyType, SkinTone, ExprName, MouthKind, EyeKind, FaceState, PegPose, ArmPose, HandKind, HandShape, Prop } from "./kit";
export { Acting, walkPath } from "./acting";
export type { Channel, Ease } from "./acting";
export { OUTFITS, FABRIC, SHOE, METAL, variant } from "./outfits";
export type { OutfitRecipe } from "./outfits";
export { makeExtra, makeCrowd } from "./extras";
export { createStudio, lightAll, setupRenderer, LIGHT } from "./studio";
export type { LightPreset } from "./studio";
export { PRESETS, PRESET_LIST, VIC_VARIANTS, MOLLY_VARIANTS } from "./presets";
