// peg44 kit data: body measurements, skin / hair palettes, hand shapes, face vocabulary (eyes, brows, 11 mouths,
// named expressions) and the per-frame pose type. No rendering here. See spec.ts for the CharacterSpec a user writes.

// ---------------- bodies ----------------
export type BodyType = "tall" | "average" | "slim" | "stocky" | "round" | "child";
/** body measurements (m). Adult head ~22-23 % of total height (body below the chin ~3.4-3.6 heads); child ~28 % */
export type BodySpec = {
  head: number; neck: number; torso: number; leg: number; arm: number;
  shW: number; waistW: number; hipW: number; depth: number; belly: number;
  armR: number; legR: number; hand: number; shoe: [number, number, number]; restOut: number; stance: number; stride: number;
  /** permanent forward hunch (rad), seniors */
  hunch: number;
};
export const BODY: Record<BodyType, BodySpec> = {
  tall:    { head: 0.375, neck: 0.05, torso: 0.56, leg: 0.84, arm: 0.70, shW: 0.20, waistW: 0.155, hipW: 0.16, depth: 0.12, belly: 0.0,
             armR: 0.046, legR: 0.062, hand: 1.0, shoe: [0.23, 0.10, 0.085], restOut: 0.11, stance: 0.085, stride: 0.34, hunch: 0 },
  average: { head: 0.37, neck: 0.045, torso: 0.50, leg: 0.70, arm: 0.62, shW: 0.205, waistW: 0.175, hipW: 0.175, depth: 0.13, belly: 0.01,
             armR: 0.05, legR: 0.068, hand: 1.0, shoe: [0.22, 0.105, 0.085], restOut: 0.12, stance: 0.09, stride: 0.30, hunch: 0 },
  slim:    { head: 0.365, neck: 0.05, torso: 0.49, leg: 0.74, arm: 0.61, shW: 0.18, waistW: 0.142, hipW: 0.158, depth: 0.112, belly: 0.0,
             armR: 0.042, legR: 0.057, hand: 0.93, shoe: [0.205, 0.093, 0.08], restOut: 0.1, stance: 0.08, stride: 0.30, hunch: 0 },
  stocky:  { head: 0.375, neck: 0.04, torso: 0.52, leg: 0.64, arm: 0.6, shW: 0.25, waistW: 0.215, hipW: 0.195, depth: 0.155, belly: 0.025,
             armR: 0.061, legR: 0.077, hand: 1.1, shoe: [0.235, 0.115, 0.09], restOut: 0.2, stance: 0.1, stride: 0.28, hunch: 0 },
  round:   { head: 0.37, neck: 0.035, torso: 0.47, leg: 0.55, arm: 0.56, shW: 0.225, waistW: 0.25, hipW: 0.22, depth: 0.19, belly: 0.06,
             armR: 0.056, legR: 0.08, hand: 1.05, shoe: [0.22, 0.115, 0.09], restOut: 0.30, stance: 0.11, stride: 0.24, hunch: 0 },
  child:   { head: 0.34, neck: 0.03, torso: 0.34, leg: 0.42, arm: 0.42, shW: 0.15, waistW: 0.13, hipW: 0.135, depth: 0.10, belly: 0.012,
             armR: 0.037, legR: 0.05, hand: 0.78, shoe: [0.165, 0.085, 0.075], restOut: 0.12, stance: 0.07, stride: 0.2, hunch: 0 },
};

// ---------------- palettes ----------------
/** skin tones (all tested under the neutral key). Any hex also works; stay inside value 0.40-0.97, saturation 0.18-0.45 */
export const SKIN = {
  porcelain: "#f6d9c4", light: "#f2c9a8", peach: "#f0c4a0", medium: "#d9a274", tan: "#c98d64",
  olive: "#c49a6c", brown: "#a66a43", dark: "#6b4029", deep: "#5c3522",
} as const;
export type SkinTone = keyof typeof SKIN;
/** hair colours: never pure black (#000) - the darkest is a warm near-black so the ink outline still reads around it */
export const HAIR = {
  black: "#1f1a1a", espresso: "#2b211c", darkBrown: "#3b2a20", brown: "#4a3020", chestnut: "#7a4a26", auburn: "#8a3b22",
  copper: "#a8442a", ginger: "#c0642e", caramel: "#b07a3e", blonde: "#d8b16a", platinum: "#e6d6b0", grey: "#8c8c8c", silver: "#c4c4c0", white: "#ecebe6",
} as const;

// ---------------- face vocabulary ----------------
export type EyeKind = "open" | "happy" | "wide" | "angry" | "sad" | "closed";
export type MouthKind = "neutral" | "flat" | "smile" | "grin" | "talkA" | "talkO" | "talkE" | "frown" | "shock" | "smirk" | "wavy";
/** the 11 mouth shapes */
export const MOUTHS: MouthKind[] = ["neutral", "flat", "smile", "grin", "talkA", "talkO", "talkE", "frown", "shock", "smirk", "wavy"];
export type Brow = { up: number; tilt: number };          // up -1..1 (raise), tilt + inner end up (worried) / - inner down (angry)
export type FaceState = {
  eyes: EyeKind; mouth: MouthKind; mouthK?: number;       // mouthK: openness multiplier for talk flaps (0.4..1.2)
  lid?: number; blink?: number; squint?: number;          // upper lid 0..1, blink 0..1, smile squint 0..1
  look?: [number, number];                                // pupils -1..1 (x + = screen right, y + = down)
  browL: Brow; browR: Brow;                               // screen-left / screen-right brow (as you look at the face)
};
export type ExprName = "neutral" | "happy" | "grin" | "talk" | "shock" | "worried" | "angry" | "sad" | "smug" | "think";
/** the 10 named expressions (eyes + mouth + brows) */
export const EXPR: Record<ExprName, Omit<FaceState, "look" | "blink">> = {
  neutral: { eyes: "open", mouth: "neutral", browL: { up: 0, tilt: 0 }, browR: { up: 0, tilt: 0 } },
  happy:   { eyes: "open", mouth: "smile", squint: 0.3, browL: { up: 0.25, tilt: 0.1 }, browR: { up: 0.25, tilt: 0.1 } },
  grin:    { eyes: "happy", mouth: "grin", browL: { up: 0.45, tilt: 0.15 }, browR: { up: 0.45, tilt: 0.15 } },
  talk:    { eyes: "open", mouth: "talkA", browL: { up: 0.2, tilt: 0 }, browR: { up: 0.1, tilt: 0 } },
  shock:   { eyes: "wide", mouth: "shock", browL: { up: 1, tilt: 0.35 }, browR: { up: 1, tilt: 0.35 } },
  worried: { eyes: "sad", mouth: "wavy", browL: { up: 0.4, tilt: 0.8 }, browR: { up: 0.4, tilt: 0.8 } },
  angry:   { eyes: "angry", mouth: "frown", browL: { up: -0.4, tilt: -0.9 }, browR: { up: -0.4, tilt: -0.9 } },
  sad:     { eyes: "sad", mouth: "frown", lid: 0.25, browL: { up: 0.2, tilt: 0.9 }, browR: { up: 0.2, tilt: 0.9 } },
  smug:    { eyes: "open", mouth: "smirk", lid: 0.4, browL: { up: 0.5, tilt: -0.2 }, browR: { up: -0.1, tilt: -0.1 } },
  think:   { eyes: "open", mouth: "flat", browL: { up: 0.6, tilt: 0.1 }, browR: { up: -0.2, tilt: -0.3 } },
};
export const face = (name: ExprName, extra: Partial<FaceState> = {}): FaceState => ({ ...EXPR[name], look: [0, 0], ...extra } as FaceState);

// ---------------- hands ----------------
/** finger curls (rad): thumb curl, thumb spread, index 1/2, middle 1/2, ring 1/2, wrist cock */
export type HandShape = { t: number; ts: number; i1: number; i2: number; m1: number; m2: number; r1: number; r2: number; w: number };
export type HandKind = "relaxed" | "open" | "point" | "grip" | "fist";
export const HAND: Record<HandKind, HandShape> = {
  relaxed: { t: 0.35, ts: 0.35, i1: 0.35, i2: 0.35, m1: 0.45, m2: 0.4, r1: 0.55, r2: 0.45, w: 0.05 },
  open:    { t: 0.05, ts: 0.95, i1: 0.02, i2: 0.0, m1: 0.04, m2: 0.0, r1: 0.06, r2: 0.02, w: -0.1 },
  point:   { t: 1.0, ts: 0.25, i1: 0.0, i2: 0.0, m1: 1.55, m2: 1.65, r1: 1.6, r2: 1.65, w: 0.0 },
  grip:    { t: 0.75, ts: 0.9, i1: 1.15, i2: 1.15, m1: 1.2, m2: 1.2, r1: 1.25, r2: 1.2, w: 0.0 },
  fist:    { t: 1.15, ts: 0.3, i1: 1.65, i2: 1.75, m1: 1.65, m2: 1.75, r1: 1.65, r2: 1.75, w: 0.1 },
};
export const handMix = (a: HandShape, b: HandShape, k: number): HandShape =>
  Object.fromEntries(Object.keys(a).map((n) => [n, a[n as keyof HandShape] + (b[n as keyof HandShape] - a[n as keyof HandShape]) * k])) as HandShape;

// ---------------- pose ----------------
/** arm angles (rad): fwd = raise forward, out = raise sideways, twist = roll, bend = elbow bend */
export type ArmPose = { fwd: number; out: number; twist: number; bend: number };
export type Prop = "cup" | null;
export type PegPose = {
  x: number; z: number; yaw: number;                      // floor position + facing (rad, 0 = facing +z)
  /** standing height of the floor under the feet (m), e.g. a riser or a step */
  y?: number;
  /** walking: distance travelled along the path (m, drives planted feet) and blend 0..1 */
  walkD?: number; walk?: number;
  lean?: number; tilt?: number; bob?: number; sq?: number; // body pitch fwd, roll, bob (m), squash (+ squash / - stretch)
  headYaw?: number; headPitch?: number; headRoll?: number;
  armL?: Partial<ArmPose>; armR?: Partial<ArmPose>;       // L = character's left (screen-right when facing camera)
  handL?: HandKind | HandShape; handR?: HandKind | HandShape;
  face: FaceState;
  propR?: Prop; propL?: Prop;                             // held props ("cup")
  breathT?: number;                                       // time (s) for idle breathing
};
export const restPose = (x = 0, z = 0, yaw = 0, expr: ExprName = "neutral"): PegPose => ({ x, z, yaw, face: face(expr), handL: "relaxed", handR: "relaxed" });
