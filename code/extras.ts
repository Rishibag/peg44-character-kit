// Seeded background extras. makeExtra(seed) always returns the same person for the same seed; makeCrowd(n, seed)
// returns n people whose silhouettes are guaranteed different (body + hair style + hair colour + main garment colour +
// glasses / hat signature never repeats). Never reuse a seed for two extras in the same scene.
import type { CharacterSpec, HairStyle, TopType, OuterType, BottomType, HatType } from "./spec";
import type { BodyType } from "./kit";
import { HAIR, SKIN } from "./kit";
import { FABRIC, SHOE } from "./outfits";

const R = (seed: number) => (k: number) => { const x = Math.sin((seed + 1) * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const pick = <T,>(a: readonly T[], u: number) => a[Math.floor(u * a.length) % a.length];

export type ExtraBase = Partial<Omit<CharacterSpec, "outfit">> & { outfit?: Partial<CharacterSpec["outfit"]>; gender?: "male" | "female"; age?: "teen" | "adult" | "senior" | "child" };

export const makeExtra = (seed: number, base: ExtraBase = {}): CharacterSpec => {
  const r = R(seed);
  const female = base.gender ? base.gender === "female" : r(1) < 0.5;
  const age = base.age ?? (r(2) < 0.15 ? "senior" : r(2) < 0.22 ? "teen" : "adult");
  const body: BodyType = age === "child" ? "child" : pick(female ? (["slim", "average", "average", "round", "tall"] as const) : (["tall", "average", "stocky", "round", "average", "slim"] as const), r(3));
  const skin = pick(Object.keys(SKIN) as (keyof typeof SKIN)[], r(4));
  const hairStyle: HairStyle = pick(female ? (["ponytail", "bob", "long", "bun", "curly", "afro", "side"] as const) : (["side", "crew", "quiff", "slick", "curly", "buzz", "balding", "bald", "afro"] as const), r(5));
  const hairCol = age === "senior" ? pick([HAIR.grey, HAIR.silver, HAIR.white], r(6)) : pick([HAIR.black, HAIR.espresso, HAIR.darkBrown, HAIR.brown, HAIR.chestnut, HAIR.auburn, HAIR.caramel, HAIR.blonde, HAIR.ginger], r(6));
  const fabrics = [FABRIC.rust, FABRIC.teal, FABRIC.mustard, FABRIC.forest, FABRIC.brick, FABRIC.sky, FABRIC.plum, FABRIC.sage, FABRIC.coral, FABRIC.denim, FABRIC.butter, FABRIC.slate, FABRIC.burgundy, FABRIC.olive];
  const topType: TopType = pick(female ? (["blouse", "tshirt", "sweater", "turtleneck", "hoodie", "polo"] as const) : (["tshirt", "shirt", "polo", "sweater", "hoodie", "workshirt"] as const), r(7));
  const topCol = pick(fabrics, r(8));
  const outerType: OuterType | undefined = r(9) < 0.35 ? pick(["cardigan", "jacket", "blazer", "vest"] as const, r(10)) : undefined;
  const bottomType: BottomType = female && r(11) < 0.3 ? "skirt" : pick(["jeans", "trousers", "cargo", "jeans"] as const, r(12));
  const hatType: HatType | undefined = r(13) < 0.14 ? pick(["cap", "beanie", "fedora"] as const, r(14)) : undefined;
  const spec: CharacterSpec = {
    name: `extra-${seed}`,
    body: { type: body, build: female ? "female" : "male", age: age === "child" ? "child" : age, height: 0.95 + r(15) * 0.1, girth: 0.93 + r(16) * 0.14 },
    skin,
    face: {
      eyeColor: pick(["#5a3a26", "#3b2617", "#4d6d8c", "#4f6b3a", "#6b4a2a"], r(17)), nose: pick(["button", "long", "wide", "small"] as const, r(18)),
      moustache: !female && r(19) < 0.2 ? pick(["brush", "walrus", "pencil"] as const, r(20)) : undefined,
      stubble: !female && r(21) < 0.25 ? true : undefined, freckles: r(22) < 0.12, brows: pick(["thin", "normal", "thick"] as const, r(23)),
    },
    hair: { style: hairStyle, color: hairCol },
    glasses: r(24) < 0.25 ? { style: pick(["round", "square"] as const, r(25)) } : undefined,
    outfit: {
      top: { type: topType, color: topCol, stripe: topType === "sweater" && r(26) < 0.5 ? FABRIC.cream : undefined },
      outer: outerType ? { type: outerType, color: pick([FABRIC.charcoal, FABRIC.navy, FABRIC.tan, FABRIC.stone, FABRIC.brown, FABRIC.olive], r(27)) } : undefined,
      bottom: { type: bottomType, color: pick([FABRIC.denim, FABRIC.charcoal, FABRIC.khaki, FABRIC.navy, FABRIC.stone, FABRIC.lightDenim], r(28)) },
      shoes: { type: pick(["shoes", "sneakers", "boots"] as const, r(29)), color: pick(Object.values(SHOE), r(30)) },
      hat: hatType ? { type: hatType, color: pick([FABRIC.navy, FABRIC.rust, FABRIC.charcoal, FABRIC.olive], r(31)) } : undefined,
    },
  };
  return {
    ...spec, ...base, body: { ...spec.body, ...base.body }, face: { ...spec.face, ...base.face }, hair: { ...spec.hair, ...base.hair },
    outfit: { ...spec.outfit, ...base.outfit } as CharacterSpec["outfit"],
  } as CharacterSpec;
};

const signature = (s: CharacterSpec) => [s.body?.type, s.body?.build, s.hair.style, s.hair.color, s.outfit.top.color, s.outfit.outer?.type ?? "-", s.outfit.hat?.type ?? "-"].join("|");
const silhouette = (s: CharacterSpec) => [s.body?.type, s.hair.style, s.outfit.top.color].join("|");

/** n distinct extras from one seed. Re-rolls any extra whose silhouette or signature repeats an earlier one. */
export const makeCrowd = (n: number, seed: number, base: ExtraBase = {}): CharacterSpec[] => {
  const out: CharacterSpec[] = [], sig = new Set<string>(), sil = new Set<string>();
  let s = seed * 1000;
  while (out.length < n && s < seed * 1000 + n * 60) {
    const e = makeExtra(s++, base);
    if (sig.has(signature(e)) || (sil.has(silhouette(e)) && out.length < 40)) continue;
    sig.add(signature(e)); sil.add(silhouette(e)); out.push(e);
  }
  return out;
};
