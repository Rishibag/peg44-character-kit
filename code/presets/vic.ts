// VIC (scene doc "Tempered Glass"): stocky male, tan skin, short dark-brown hair standing up at the front + sideburns,
// thick brows, scar through his LEFT eyebrow, stubble shadow, rust-orange work shirt with sleeves rolled to the elbow and
// brass-snap chest pockets, olive work trousers, dark brown boots, gloves in his back pocket.
import type { CharacterSpec } from "../spec";
import { variant, OUTFITS, FABRIC, SHOE } from "../outfits";

export const VIC: CharacterSpec = {
  name: "Vic",
  body: { type: "stocky", build: "male", age: "adult" },
  skin: "#c98d64",
  face: { eyeColor: "#4a3524", brows: "thick", browColor: "#33241b", scar: "leftBrow", stubble: "#6a5a4e", nose: "wide" },
  hair: { style: "quiff", color: "#3b2a20", sideburns: true },
  outfit: {
    top: { type: "workshirt", color: "#b35a2e", sleeves: "rolled", pockets: 2, pocketFlaps: true, snaps: "#c9a14a" },
    bottom: { type: "trousers", color: "#4e5a33", belt: "#3d2b23" },
    shoes: { type: "boots", color: "#3d2b23" },
  },
  accessories: [{ type: "glovesBackPocket", color: "#5a3d2c" }],
};

/** 4 outfit variations: work (default) / after the accident (soot) / winter / Sunday best */
export const VIC_VARIANTS: Record<string, CharacterSpec> = {
  work: VIC,
  sooty: variant(VIC, { name: "Vic (after the blast)", wear: { grime: 0.75 } }),
  winter: variant(VIC, { name: "Vic (winter)", accessories: [{ type: "scarf", color: FABRIC.mustard }],
    outfit: OUTFITS.winter({ top: { color: "#b35a2e" }, outer: { color: "#4e5a33", trim: "#d9c49a" }, bottom: { color: "#3b4150" }, shoes: { color: "#3d2b23" }, hat: { color: "#3b4150", band: "#4e5a33" } }) }),
  sunday: variant(VIC, { name: "Vic (Sunday best)", accessories: [],
    outfit: OUTFITS.suit({ top: { color: "#eef0f0", tie: "#b35a2e" }, outer: { color: "#2f3a5a" }, bottom: { color: "#2f3a5a" }, shoes: { color: SHOE.darkBrown } }) }),
};
