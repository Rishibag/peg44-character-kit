// All ready-made characters. PRESETS.vic, PRESETS.molly, ... or PRESET_LIST for a lineup.
import type { CharacterSpec } from "../spec";
import { VIC, VIC_VARIANTS } from "./vic";
import { MOLLY, MOLLY_VARIANTS } from "./molly";
import { LEO, ROSA, MARCO, DANA, PRIYA, JOE, OKAFOR, KAI, WALT, ZOE } from "./cast";

export const PRESETS = { vic: VIC, molly: MOLLY, leo: LEO, rosa: ROSA, marco: MARCO, dana: DANA, priya: PRIYA, joe: JOE, okafor: OKAFOR, kai: KAI, walt: WALT, zoe: ZOE } satisfies Record<string, CharacterSpec>;
export type PresetId = keyof typeof PRESETS;
export const PRESET_LIST: CharacterSpec[] = Object.values(PRESETS);
export { VIC, VIC_VARIANTS, MOLLY, MOLLY_VARIANTS, LEO, ROSA, MARCO, DANA, PRIYA, JOE, OKAFOR, KAI, WALT, ZOE };
