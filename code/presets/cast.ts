// Ten more ready-made characters showing the range (ages, bodies, skin tones, genders, jobs).
import type { CharacterSpec } from "../spec";
import { OUTFITS, FABRIC, SHOE, METAL } from "../outfits";
import { HAIR } from "../kit";

/** LEO, 8, schoolkid: child body, brown skin, curly hair, striped red tee, denim shorts, white socks, backpack */
export const LEO: CharacterSpec = {
  name: "Leo", body: { type: "child", age: "child", build: "male" }, skin: "brown",
  face: { eyeColor: "#3b2617" }, hair: { style: "curly", color: "#24180f" },
  outfit: OUTFITS.schoolkid(), accessories: [{ type: "backpack", color: FABRIC.teal }],
};
/** ROSA, 70s, grandma: soft round body, silver bun, round gold glasses, sage cardigan, plum skirt, pearls */
export const ROSA: CharacterSpec = {
  name: "Rosa", body: { type: "average", build: "female", age: "senior", girth: 1.12, height: 0.97 }, skin: "light",
  face: { eyeColor: "#4d6d8c", lips: "#a0505a", blush: 0.3 }, hair: { style: "bun", color: HAIR.silver },
  glasses: { style: "round", color: "#b08a3e" },
  outfit: { top: { type: "blouse", color: FABRIC.cream }, outer: { type: "cardigan", color: FABRIC.sage, buttons: METAL.brass },
    bottom: { type: "skirt", color: FABRIC.plum, length: "knee", tights: "#e8c4a8" }, shoes: { type: "shoes", color: SHOE.brown } },
  accessories: [{ type: "necklace", color: "#f2ece0" }, { type: "earrings", color: METAL.gold }],
};
/** MARCO, chef: round body, olive skin, slick black hair, walrus moustache, white double-breasted jacket + toque */
export const MARCO: CharacterSpec = {
  name: "Marco", body: { type: "round", build: "male", height: 0.97 }, skin: "olive",
  face: { eyeColor: "#3b2617", moustache: "walrus", nose: "long", brows: "thick" }, hair: { style: "slick", color: HAIR.black },
  outfit: OUTFITS.chef({ outer: { trim: FABRIC.red } }),
};
/** DANA, police officer: tall woman, dark skin, bun, navy uniform with silver buttons, badge, peaked cap */
export const DANA: CharacterSpec = {
  name: "Dana", body: { type: "tall", build: "female" }, skin: "dark",
  face: { eyeColor: "#3b2617", brows: "normal" }, hair: { style: "bun", color: HAIR.black },
  outfit: OUTFITS.police({ top: { tie: "#1a2238" }, outer: { trim: METAL.gold } }), accessories: ["badge", "watch"],
};
/** PRIYA, office worker: slim woman, medium skin, long black hair, coral blouse under a charcoal blazer, ID lanyard */
export const PRIYA: CharacterSpec = {
  name: "Priya", body: { type: "slim", build: "female" }, skin: "medium",
  face: { eyeColor: "#3b2617", lips: "#9a3a40" }, hair: { style: "long", color: HAIR.black },
  outfit: { top: { type: "blouse", color: FABRIC.coral }, outer: { type: "blazer", color: FABRIC.charcoal },
    bottom: { type: "trousers", color: FABRIC.charcoal }, shoes: { type: "shoes", color: FABRIC.burgundy } },
  accessories: [{ type: "idBadge", color: FABRIC.cobalt }, { type: "earrings", color: METAL.gold }],
};
/** BIG JOE, construction: big round man, brown skin, buzz cut, goatee, hi-vis vest, hard hat, tool belt */
export const JOE: CharacterSpec = {
  name: "Big Joe", body: { type: "round", build: "male", height: 1.05, girth: 1.08 }, skin: "brown",
  face: { eyeColor: "#3b2617", goatee: true, brows: "thick" }, hair: { style: "buzz", color: HAIR.black },
  outfit: OUTFITS.construction(), accessories: [{ type: "toolBelt", color: "#7a5230" }, "watch"],
};
/** DR. OKAFOR, doctor: tall man, deep skin, short greying hair, square glasses, white coat, stethoscope */
export const OKAFOR: CharacterSpec = {
  name: "Dr. Okafor", body: { type: "tall", build: "male", height: 1.02 }, skin: "deep",
  face: { eyeColor: "#3b2617", moustache: "pencil" }, hair: { style: "crew", color: "#4a4440" },
  glasses: { style: "square", color: METAL.gunmetal },
  outfit: OUTFITS.doctor(), accessories: ["stethoscope"],
};
/** KAI, rock climber: slim woman, tan skin, black bob, climbing helmet, tank top, harness, rope coil, chalk bag */
export const KAI: CharacterSpec = {
  name: "Kai", body: { type: "slim", build: "female" }, skin: "tan",
  face: { eyeColor: "#4f6b3a" }, hair: { style: "bob", color: HAIR.espresso },
  outfit: OUTFITS.climber(), accessories: [{ type: "harness", color: FABRIC.coral }, { type: "ropeCoil", color: "#3d8fd0" }, { type: "chalkBag", color: FABRIC.mustard }],
};
/** WALT, grandpa: senior man, porcelain skin, balding white hair, walrus moustache, brown cardigan (no hat so the balding reads) */
export const WALT: CharacterSpec = {
  name: "Walt", body: { type: "average", build: "male", age: "senior", girth: 0.95 }, skin: "porcelain",
  face: { eyeColor: "#4d6d8c", moustache: "walrus", nose: "long" }, hair: { style: "balding", color: HAIR.white },
  outfit: OUTFITS.retiree(), accessories: [{ type: "watch", color: METAL.gold }],
};
/** ZOE, 15, teen: slim girl, brown skin, afro, plum hoodie, light jeans, white sneakers with coral accents */
export const ZOE: CharacterSpec = {
  name: "Zoe", body: { type: "slim", build: "female", age: "teen" }, skin: "#8a5536",
  face: { eyeColor: "#3b2617" }, hair: { style: "afro", color: HAIR.espresso },
  outfit: { top: { type: "hoodie", color: FABRIC.plum, trim: FABRIC.cream }, bottom: { type: "jeans", color: FABRIC.lightDenim, cuffs: true },
    shoes: { type: "sneakers", color: SHOE.white, accent: FABRIC.coral, sole: "#f4f2ee" } },
  accessories: [{ type: "earrings", color: METAL.silver }],
};
