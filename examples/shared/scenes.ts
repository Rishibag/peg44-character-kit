// The two showcase stills: all presets, and Vic + Molly in 4 outfit variations each.
import { PRESETS, VIC_VARIANTS, MOLLY_VARIANTS, OUTFITS, FABRIC, variant } from "../../code";
import type { LineupItem } from "./lineup";

export const LINEUP: LineupItem[] = [
  { spec: PRESETS.walt, expr: "smug" },
  { spec: PRESETS.okafor, expr: "think" },
  { spec: PRESETS.rosa, expr: "happy" },
  { spec: PRESETS.joe, expr: "grin", act: (a) => a.key(0, { "armR.fwd": 0.55, "armR.out": 0.12, "armR.bend": 1.6 }, 1).hand(0, "R", "fist") },
  { spec: PRESETS.molly, expr: "happy" },
  { spec: PRESETS.vic, expr: "smug" },
  { spec: PRESETS.leo, expr: "grin", act: (a) => a.wave(10, "L", 6) },
  { spec: PRESETS.dana, expr: "neutral" },
  { spec: PRESETS.marco, expr: "grin", act: (a) => a.holdCup(0, "R") },
  { spec: PRESETS.priya, expr: "happy" },
  { spec: PRESETS.kai, expr: "talk" },
  { spec: PRESETS.zoe, expr: "smug" },
];
export const OUTFIT_LINEUP: LineupItem[] = [
  ...Object.values(VIC_VARIANTS).map((spec, i) => ({ spec, expr: (["smug", "worried", "neutral", "happy"] as const)[i] })),
  ...Object.values(MOLLY_VARIANTS).map((spec, i) => ({ spec, expr: (["happy", "grin", "think", "talk"] as const)[i] })),
];
/** the worked example from docs/OUTFITS-AND-VARIATIONS.md: the new "rugby" top on three different people */
export const GARMENT_LINEUP: LineupItem[] = [
  { spec: variant(PRESETS.leo, { outfit: OUTFITS.sporty(), accessories: [] }), expr: "grin" },
  { spec: variant(PRESETS.zoe, { outfit: OUTFITS.sporty({ top: { color: FABRIC.burgundy, stripe: FABRIC.cream }, bottom: { type: "jeans", color: FABRIC.denim } }), accessories: [] }), expr: "happy" },
  { spec: variant(PRESETS.joe, { outfit: OUTFITS.sporty({ top: { color: FABRIC.navy, stripe: FABRIC.sky }, bottom: { type: "trousers", color: FABRIC.charcoal }, shoes: { type: "boots", color: "#3d2b23" } }), accessories: [] }), expr: "smug" },
];
