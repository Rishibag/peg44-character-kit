// MOLLY (scene doc "Tempered Glass"): slim woman, late 20s, peach skin, copper-red high ponytail, freckles, amber eyes,
// round tortoiseshell glasses, butter-yellow knee-length lab coat with a cobalt pen in the chest pocket, teal jeans,
// coral sneakers with white soles.
import type { CharacterSpec } from "../spec";
import { variant, FABRIC, METAL } from "../outfits";

export const MOLLY: CharacterSpec = {
  name: "Molly",
  body: { type: "slim", build: "female", age: "adult" },
  skin: "#f0c4a0",
  face: { eyeColor: "#b8752a", freckles: true, browColor: "#8a3a24", lips: "#a8484a" },
  hair: { style: "ponytail", color: "#a8442a", tie: "#24407a" },
  glasses: { style: "round", color: METAL.tortoise },
  outfit: {
    top: { type: "tshirt", color: "#f4f1ea" },
    outer: { type: "labcoat", color: "#e8c86a", length: "knee", pens: ["#24407a"] },
    bottom: { type: "jeans", color: "#2d6a6e" },
    shoes: { type: "sneakers", color: "#d8503c", sole: "#f4f2ee" },
  },
};

/** 4 outfit variations: lab (default) / weekend / field day / conference. The butter-yellow + teal + coral anchors stay. */
export const MOLLY_VARIANTS: Record<string, CharacterSpec> = {
  lab: MOLLY,
  weekend: variant(MOLLY, { name: "Molly (weekend)", outfit: {
    top: { type: "hoodie", color: "#e8c86a", trim: "#f4f1ea" }, bottom: { type: "jeans", color: "#2d6a6e", cuffs: true }, shoes: { type: "sneakers", color: "#d8503c", sole: "#f4f2ee" } } }),
  field: variant(MOLLY, { name: "Molly (field day)", outfit: {
    top: { type: "workshirt", color: "#2d6a6e", sleeves: "rolled", snaps: METAL.silver }, outer: { type: "hivis", color: FABRIC.hiVisYellow, trim: "#dfe3e6" },
    bottom: { type: "cargo", color: FABRIC.khaki }, shoes: { type: "boots", color: "#5a3a26" }, hat: { type: "hardhat", color: "#f2f0ea" } } }),
  conference: variant(MOLLY, { name: "Molly (conference)", accessories: [{ type: "idBadge", color: "#24407a" }, { type: "earrings", color: METAL.gold }], outfit: {
    top: { type: "blouse", color: "#e8c86a" }, outer: { type: "blazer", color: "#2d6a6e" },
    bottom: { type: "skirt", color: "#3b4150", length: "knee", tights: "#e3b896" }, shoes: { type: "shoes", color: "#d8503c" } } }),
};
