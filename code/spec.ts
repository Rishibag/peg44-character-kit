// CharacterSpec: everything a user (or an AI) writes to describe one peg44 character. createCharacter(spec) in rig.ts
// builds it. resolveSpec() fills every default so the rig never has to guess. All colours are hex strings.
import { BODY, BodySpec, BodyType, SKIN, SkinTone } from "./kit";

export type Build = "male" | "female";
export type Age = "child" | "teen" | "adult" | "senior";
export type HairStyle = "side" | "curly" | "slick" | "crew" | "buzz" | "quiff" | "ponytail" | "bun" | "bob" | "long" | "afro" | "balding" | "bald";
export type HatType = "helmet" | "hardhat" | "climbing" | "cap" | "fedora" | "ushanka" | "beanie" | "chef" | "police";
export type TopType = "tshirt" | "shirt" | "workshirt" | "polo" | "sweater" | "hoodie" | "blouse" | "tank" | "turtleneck" | "scrubs" | "rugby";
export type OuterType = "labcoat" | "blazer" | "cardigan" | "jacket" | "parka" | "vest" | "hivis" | "apron" | "chef" | "police" | "gown";
export type BottomType = "trousers" | "jeans" | "cargo" | "shorts" | "skirt";
export type ShoeType = "shoes" | "boots" | "sneakers";
export type Sleeves = "long" | "rolled" | "short" | "none";
export type Collar = "none" | "crew" | "vee" | "shirt" | "turtle" | "hood";
export type AccessoryType = "stethoscope" | "badge" | "idBadge" | "harness" | "ropeCoil" | "backpack" | "scarf" | "watch" | "glovesBackPocket"
  | "toolBelt" | "chalkBag" | "necklace" | "earrings";
export type Accessory = AccessoryType | { type: AccessoryType; color?: string };

export type TopSpec = {
  type: TopType; color: string;
  sleeves?: Sleeves;                 // default per type (tshirt/polo/scrubs short, tank none, others long)
  collar?: Collar;                   // default per type
  pockets?: 0 | 1 | 2;               // chest pockets (1 = character's left chest)
  pocketFlaps?: boolean;             // flap over each chest pocket
  snaps?: string;                    // colour of snap buttons on the pocket flaps / placket (e.g. brass "#c9a14a")
  buttons?: string | false;          // placket button colour (false = none)
  tie?: string;                      // necktie colour (shirt / blouse / police)
  stripe?: string;                   // chest stripe (sweater / tshirt / polo) or side stripe
  trim?: string;                     // rib / collar / cuff accent colour
  pens?: string[];                   // pen colours sticking out of the left chest pocket
  tucked?: boolean;                  // default: shirts tucked, knits untucked
};
export type OuterSpec = {
  type: OuterType; color: string;
  length?: "hip" | "thigh" | "knee"; // coat length (labcoat default knee, gown knee, others hip)
  open?: boolean;                    // open front shows the top underneath (default true for cardigan / vest / hivis; labcoat + blazer default to the buttoned V look)
  sleeves?: Sleeves;                 // default long (vest / hivis / apron have none)
  trim?: string;                     // lapel / stripe / fur / piping colour
  buttons?: string;                  // button colour
  pens?: string[];                   // pens in the breast pocket
};
export type BottomSpec = {
  type: BottomType; color: string;
  belt?: string;                     // belt colour (buckle is brass)
  cuffs?: boolean;                   // turned-up hems
  stripe?: string;                   // side / reflective stripe colour
  tights?: string;                   // leg colour under shorts / skirt (default skin)
  length?: "mini" | "knee";          // skirt length
};
export type ShoeSpec = { type: ShoeType; color: string; sole?: string; accent?: string; socks?: string };
export type HatSpec = { type: HatType; color?: string; band?: string };

export type CharacterSpec = {
  name?: string;
  body?: { type?: BodyType; build?: Build; age?: Age; height?: number; girth?: number; headScale?: number };
  skin: SkinTone | string;
  face?: {
    eyeColor?: string; brows?: "thin" | "normal" | "thick"; browColor?: string; nose?: "button" | "long" | "wide" | "small";
    lashes?: boolean; freckles?: boolean; blush?: number; stubble?: string | boolean; wrinkles?: boolean;
    scar?: "leftBrow" | "rightBrow" | "leftCheek" | "rightCheek"; mole?: "left" | "right"; lips?: string;
    moustache?: "brush" | "walrus" | "pencil"; goatee?: boolean;
  };
  hair: { style: HairStyle; color?: string; sideburns?: boolean; tie?: string };
  glasses?: { style: "round" | "square" | "sun"; color?: string };
  outfit: { top: TopSpec; outer?: OuterSpec; bottom: BottomSpec; shoes: ShoeSpec; hat?: HatSpec };
  accessories?: Accessory[];
  /** variation layer: dirt / soot (0..1), soaked */
  wear?: { grime?: number; wet?: boolean };
  /** seated: seat height (m); recline (rad) lies back along the seat */
  sit?: number; recline?: number;
};

const shadeHex = (h: string, k: number, to = "#000000") => {
  const a = parseInt(h.slice(1), 16), b = parseInt(to.slice(1), 16);
  return "#" + [16, 8, 0].map((s) => { const x = (a >> s) & 255, y = (b >> s) & 255; return Math.round(x + (y - x) * k).toString(16).padStart(2, "0"); }).join("");
};

const hashStr = (t: string) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; };

/** fully resolved spec (no optional fields left that the rig reads) */
export type Resolved = ReturnType<typeof resolveSpec>;
export const resolveSpec = (S: CharacterSpec) => {
  const bt: BodyType = S.body?.type ?? (S.body?.age === "child" ? "child" : "average");
  const build: Build = S.body?.build ?? "male", age: Age = S.body?.age ?? (bt === "child" ? "child" : "adult");
  const female = build === "female";
  const ageScale = age === "teen" ? 0.92 : age === "senior" ? 0.96 : 1;
  const ageHead = age === "teen" ? 1.04 : 1;
  const B0: BodySpec = { ...BODY[bt] };
  if (female) { B0.shW *= 0.88; B0.waistW *= 0.86; B0.hipW *= 1.05; B0.armR *= 0.9; B0.legR *= 0.93; B0.hand *= 0.92; B0.restOut *= 0.85; B0.depth *= 0.96; }
  if (age === "senior") B0.hunch = 0.07;
  const skin = (SKIN as Record<string, string>)[S.skin] ?? S.skin;
  const hairCol = S.hair.color ?? "#3b2a20";
  const top = S.outfit.top, outer = S.outfit.outer;
  const topSleeves: Sleeves = top.sleeves ?? (top.type === "tshirt" || top.type === "polo" || top.type === "scrubs" ? "short" : top.type === "tank" ? "none" : "long");
  const topCollar: Collar = top.collar ?? ({ tshirt: "crew", shirt: "shirt", workshirt: "shirt", polo: "shirt", sweater: "crew", hoodie: "hood", blouse: "vee", tank: "crew", turtleneck: "turtle", rugby: "shirt", scrubs: "vee" } as const)[top.type];
  const outerHasSleeves = outer && !["vest", "hivis", "apron"].includes(outer.type);
  const outerSleeves: Sleeves | undefined = outer ? (outerHasSleeves ? outer.sleeves ?? "long" : "none") : undefined;
  const outerLen = outer ? outer.length ?? (outer.type === "labcoat" || outer.type === "gown" ? "knee" : "hip") : undefined;
  const outerOpen = outer ? outer.open ?? ["cardigan", "vest", "hivis"].includes(outer.type) : false;
  const acc = (S.accessories ?? []).map((a) => (typeof a === "string" ? { type: a, color: undefined as string | undefined } : { type: a.type, color: a.color }));
  return {
    spec: S, bodyType: bt, build, age, female, B0, scale: (S.body?.height ?? 1) * ageScale, girth: S.body?.girth ?? 1, headK: (S.body?.headScale ?? 1) * ageHead,
    skin, hairStyle: S.hair.style, hairCol, sideburns: S.hair.sideburns ?? false, hairTie: S.hair.tie ?? shadeHex(hairCol, 0.5),
    eyeCol: S.face?.eyeColor ?? "#5a3a26",
    browCol: S.face?.browColor ?? (S.hair.style === "bald" || S.hair.style === "balding" ? shadeHex(hairCol, 0.1) : shadeHex(hairCol, 0.15)),
    browW: S.face?.brows === "thick" ? 1.4 : S.face?.brows === "thin" ? 0.7 : female ? 0.8 : 1,
    nose: S.face?.nose ?? (female || bt === "child" ? "small" : "button"),
    lashes: S.face?.lashes ?? female, freckles: S.face?.freckles ?? false, blush: S.face?.blush ?? (bt === "child" ? 0.32 : 0.22),
    stubble: S.face?.stubble === true ? shadeHex(hairCol, 0.0, "#6a5a4e") : (S.face?.stubble || undefined) as string | undefined,
    wrinkles: S.face?.wrinkles ?? age === "senior", scar: S.face?.scar, mole: S.face?.mole, lips: S.face?.lips,
    moustache: S.face?.moustache, goatee: S.face?.goatee ?? false,
    glasses: S.glasses, top, topSleeves, topCollar, outer, outerSleeves, outerLen, outerOpen,
    sleeves: (outer && outerHasSleeves ? outerSleeves : topSleeves) as Sleeves,
    sleeveCol: outer && outerHasSleeves ? outer.color : top.color,
    bottom: S.outfit.bottom, shoes: S.outfit.shoes, hat: S.outfit.hat, acc,
    has: (t: AccessoryType) => acc.find((a) => a.type === t),
    seed: hashStr(JSON.stringify(S)), grime: S.wear?.grime ?? 0, wet: S.wear?.wet ?? false, sit: S.sit, recline: S.recline,
  };
};
