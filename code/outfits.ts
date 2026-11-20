// Ready-made outfit recipes + colour palettes + the variation helper. Recipes return a full outfit object you can
// pass to a CharacterSpec, or spread and override:  outfit: { ...OUTFITS.chef(), bottom: { type: "trousers", color: FABRIC.navy } }
import type { CharacterSpec, OuterSpec, TopSpec, BottomSpec, ShoeSpec, HatSpec, Accessory } from "./spec";

/** tested fabric colours (value 0.25-0.92, saturation <= 0.65). Mix one or two saturated pieces with muted ones. */
export const FABRIC = {
  // neutrals (no pure black / white)
  offWhite: "#eceeea", cream: "#efe6d2", stone: "#a39a88", khaki: "#8a7a55", grey: "#7d7f84", slate: "#5d6b7a", charcoal: "#3b4150", ink: "#2a2e3a",
  // blues / greens
  sky: "#9cb7d4", denim: "#3f5f8e", lightDenim: "#6f8fb8", navy: "#2f3a5a", cobalt: "#24407a", teal: "#2d6a6e", sage: "#8fa58a", forest: "#3f6a4a", olive: "#4e5a33",
  // warms
  butter: "#e8c86a", mustard: "#c9a14a", rust: "#b35a2e", brick: "#9b4f3f", coral: "#d8503c", red: "#c4453c", burgundy: "#7d2a35", plum: "#6a3f5c", tan: "#b08a5a", brown: "#5a3d2c",
  // safety
  hiVisOrange: "#e8742a", hiVisYellow: "#d9d23a",
} as const;
export const SHOE = { black: "#241c1a", darkBrown: "#3d2b23", brown: "#5a3a26", tan: "#8a5a2b", navy: "#2c3a63", white: "#ecebe6", grey: "#6d7078", coral: "#d8503c" } as const;
export const METAL = { brass: "#c9a14a", gold: "#d8b04a", silver: "#c9ccd0", gunmetal: "#4a4d55", tortoise: "#6b3f22" } as const;

type Outfit = CharacterSpec["outfit"];
type O = Partial<{ top: Partial<TopSpec>; outer: Partial<OuterSpec>; bottom: Partial<BottomSpec>; shoes: Partial<ShoeSpec>; hat: Partial<HatSpec> | null }>;
const merge = (base: Outfit, o: O = {}): Outfit => ({
  top: { ...base.top, ...o.top } as TopSpec,
  outer: o.outer === undefined ? base.outer : ({ ...base.outer, ...o.outer } as OuterSpec),
  bottom: { ...base.bottom, ...o.bottom } as BottomSpec,
  shoes: { ...base.shoes, ...o.shoes } as ShoeSpec,
  hat: o.hat === null ? undefined : o.hat === undefined ? base.hat : ({ ...base.hat, ...o.hat } as HatSpec),
});

/** profession / era recipes. Each takes optional overrides (deep-merged per garment). */
export const OUTFITS = {
  scientist: (o?: O) => merge({ top: { type: "shirt", color: FABRIC.sky, tie: FABRIC.burgundy }, outer: { type: "labcoat", color: FABRIC.offWhite, pens: ["#2f5fa8", "#b23a3a"] },
    bottom: { type: "trousers", color: FABRIC.charcoal }, shoes: { type: "shoes", color: SHOE.brown } }, o),
  doctor: (o?: O) => merge({ top: { type: "shirt", color: FABRIC.sky, tie: FABRIC.navy }, outer: { type: "labcoat", color: "#f4f6f2" },
    bottom: { type: "trousers", color: FABRIC.slate }, shoes: { type: "shoes", color: SHOE.brown } }, o),
  nurse: (o?: O) => merge({ top: { type: "scrubs", color: "#5f9ea0", pockets: 1, pens: ["#2f5fa8"] }, bottom: { type: "trousers", color: "#5f9ea0" }, shoes: { type: "sneakers", color: SHOE.white, sole: "#d8dcdf" } }, o),
  surgeon: (o?: O) => merge({ top: { type: "scrubs", color: "#9fb4c2" }, outer: { type: "gown", color: "#f4f6f2", length: "knee" }, bottom: { type: "trousers", color: "#545a66" }, shoes: { type: "shoes", color: "#3a3530" } }, o),
  chef: (o?: O) => merge({ top: { type: "tshirt", color: FABRIC.offWhite }, outer: { type: "chef", color: "#f4f2ec" }, bottom: { type: "trousers", color: FABRIC.charcoal },
    shoes: { type: "shoes", color: SHOE.black }, hat: { type: "chef" } }, o),
  cook: (o?: O) => merge({ top: { type: "tshirt", color: FABRIC.charcoal }, outer: { type: "apron", color: FABRIC.cream, trim: FABRIC.rust }, bottom: { type: "jeans", color: FABRIC.denim }, shoes: { type: "sneakers", color: SHOE.black } }, o),
  police: (o?: O) => merge({ top: { type: "shirt", color: FABRIC.sky }, outer: { type: "police", color: "#22314f", buttons: METAL.silver }, bottom: { type: "trousers", color: "#22314f", belt: "#1e1a1c" },
    shoes: { type: "boots", color: SHOE.black }, hat: { type: "police" } }, o),
  office: (o?: O) => merge({ top: { type: "shirt", color: FABRIC.sky, tie: FABRIC.burgundy }, bottom: { type: "trousers", color: FABRIC.charcoal, belt: "#2a2220" }, shoes: { type: "shoes", color: SHOE.darkBrown } }, o),
  suit: (o?: O) => merge({ top: { type: "shirt", color: "#eef0f0", tie: "#8a2f3a" }, outer: { type: "blazer", color: "#3e4a5e" }, bottom: { type: "trousers", color: "#3e4a5e" }, shoes: { type: "shoes", color: SHOE.black } }, o),
  construction: (o?: O) => merge({ top: { type: "tshirt", color: FABRIC.grey }, outer: { type: "hivis", color: FABRIC.hiVisOrange }, bottom: { type: "cargo", color: FABRIC.khaki, stripe: "#dfe3e6" },
    shoes: { type: "boots", color: SHOE.tan }, hat: { type: "hardhat", color: "#e8b330" } }, o),
  mechanic: (o?: O) => merge({ top: { type: "workshirt", color: FABRIC.navy, sleeves: "rolled", snaps: METAL.silver }, bottom: { type: "cargo", color: FABRIC.navy }, shoes: { type: "boots", color: SHOE.black } }, o),
  soldier: (o?: O) => merge({ top: { type: "workshirt", color: "#6d6c41", snaps: "#4a4a2c", pocketFlaps: true }, bottom: { type: "cargo", color: "#5f5e38", belt: "#a99d6c" },
    shoes: { type: "boots", color: "#4a3424" }, hat: { type: "helmet" } }, o),
  climber: (o?: O) => merge({ top: { type: "tank", color: FABRIC.teal }, bottom: { type: "cargo", color: FABRIC.slate }, shoes: { type: "sneakers", color: SHOE.grey, accent: FABRIC.coral, sole: "#2a2224" },
    hat: { type: "climbing", color: FABRIC.coral } }, o),
  winter: (o?: O) => merge({ top: { type: "sweater", color: FABRIC.red }, outer: { type: "parka", color: "#4c5a46", trim: "#d9c49a" }, bottom: { type: "trousers", color: "#333b40" },
    shoes: { type: "boots", color: "#2a2622" }, hat: { type: "beanie", color: FABRIC.rust } }, o),
  casual: (o?: O) => merge({ top: { type: "tshirt", color: FABRIC.forest }, bottom: { type: "jeans", color: FABRIC.denim }, shoes: { type: "sneakers", color: SHOE.white } }, o),
  weekend: (o?: O) => merge({ top: { type: "hoodie", color: FABRIC.slate }, bottom: { type: "jeans", color: FABRIC.lightDenim }, shoes: { type: "sneakers", color: SHOE.navy } }, o),
  schoolkid: (o?: O) => merge({ top: { type: "tshirt", color: FABRIC.red, stripe: FABRIC.cream }, bottom: { type: "shorts", color: FABRIC.denim }, shoes: { type: "sneakers", color: SHOE.navy } }, o),
  retiree: (o?: O) => merge({ top: { type: "shirt", color: FABRIC.cream }, outer: { type: "cardigan", color: FABRIC.brown, buttons: METAL.brass }, bottom: { type: "trousers", color: FABRIC.tan },
    shoes: { type: "shoes", color: SHOE.brown } }, o),
  sporty: (o?: O) => merge({ top: { type: "rugby", color: FABRIC.forest, stripe: FABRIC.butter }, bottom: { type: "shorts", color: FABRIC.navy },
    shoes: { type: "sneakers", color: SHOE.white, socks: FABRIC.forest } }, o),
  // eras
  lab1940s: (o?: O) => merge({ top: { type: "shirt", color: "#eef0f0", tie: "#5a2a30" }, outer: { type: "labcoat", color: FABRIC.offWhite }, bottom: { type: "trousers", color: "#4a4438" },
    shoes: { type: "shoes", color: SHOE.darkBrown }, hat: { type: "fedora", color: "#5a4a3c" } }, o),
  office1950s: (o?: O) => merge({ top: { type: "shirt", color: "#eef0f0", tie: "#2f3a5a" }, outer: { type: "blazer", color: "#5a5448" }, bottom: { type: "trousers", color: "#5a5448", cuffs: true },
    shoes: { type: "shoes", color: SHOE.darkBrown }, hat: { type: "fedora", color: "#3e3a34" } }, o),
  seventies: (o?: O) => merge({ top: { type: "turtleneck", color: FABRIC.mustard }, outer: { type: "blazer", color: FABRIC.brick }, bottom: { type: "trousers", color: FABRIC.brown }, shoes: { type: "shoes", color: SHOE.tan } }, o),
} satisfies Record<string, (o?: O) => Outfit>;
export type OutfitRecipe = keyof typeof OUTFITS;

/**
 * Variation of a character: same identity (body, skin, face, hair, glasses) with a different outfit and / or wear.
 * Accessories are replaced only when given. `hat: null` in the outfit override removes the hat.
 */
export const variant = (base: CharacterSpec, change: { outfit?: Outfit; accessories?: Accessory[]; wear?: CharacterSpec["wear"]; hair?: Partial<CharacterSpec["hair"]>; face?: CharacterSpec["face"]; name?: string }): CharacterSpec => ({
  ...base, name: change.name ?? base.name, outfit: change.outfit ?? base.outfit, accessories: change.accessories ?? base.accessories,
  wear: change.wear ?? base.wear, hair: { ...base.hair, ...change.hair }, face: { ...base.face, ...change.face },
});
