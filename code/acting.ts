// peg44 acting: a small keyframe performance system that outputs a PegPose per frame.
//   const act = new Acting(vic, { seed: 3 });
//   act.expr(0, "neutral").talk(20, 95, [32, 60, 84]).expr(100, "shock").shock(100).expr(130, "grin").nod(132, 2);
//   per frame: vic.pose(act.at(frame, { x: 0, z: 0, yaw: 0 }));
// Built-in: automatic blinks (every 2.5-4.5 s + on expression changes), breathing, a tiny idle head drift so holds never
// freeze, spring (overshoot) easing on gestures, smooth easing on the body. Frames assume 30 fps.
import { EXPR, ExprName, FaceState, HandKind, MouthKind, PegPose, Prop, EyeKind } from "./kit";
import { sstep } from "./geo";
import type { PegChar } from "./rig";

export type Channel = "lean" | "tilt" | "bob" | "sq" | "headYaw" | "headPitch" | "headRoll" | "lookX" | "lookY" | "browUp" | "mouthK"
  | "armL.fwd" | "armL.out" | "armL.twist" | "armL.bend" | "armR.fwd" | "armR.out" | "armR.twist" | "armR.bend";
export type Ease = "spring" | "smooth" | "linear";
type Key = { at: number; v: number; dur: number; ease: Ease };
type Step<T> = [number, T];

const easeF = (e: Ease, u: number) => {
  u = Math.min(1, Math.max(0, u));
  if (e === "linear") return u;
  if (e === "smooth") return u * u * (3 - 2 * u);
  const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);   // easeOutBack: small overshoot
};
const blinkCurve = (d: number) => (d < 0 || d > 5 ? 0 : d < 2 ? (d + 1) / 2.5 : d < 3 ? 1 : 1 - (d - 2) / 3);
const TALK: MouthKind[] = ["talkA", "talkE", "neutral", "talkO", "talkA", "talkE", "talkO", "neutral"];

export class Acting {
  rest: Record<Channel, number>;
  private keys = new Map<Channel, Key[]>();
  private exprs: Step<ExprName>[] = [[0, "neutral"]];
  private mouths: Step<MouthKind | null>[] = [];
  private eyes: Step<EyeKind | null>[] = [];
  private handsL: Step<HandKind>[] = [[0, "relaxed"]];
  private handsR: Step<HandKind>[] = [[0, "relaxed"]];
  private propsL: Step<Prop>[] = [[0, null]];
  private propsR: Step<Prop>[] = [[0, null]];
  private talks: { a: number; b: number; k: number }[] = [];
  private blinks: number[] = [];
  seed: number;

  constructor(ch?: PegChar | { restOut: number }, o: { seed?: number; idle?: number; autoBlink?: boolean } = {}) {
    const restOut = ch ? ("B" in ch ? ch.B.restOut : ch.restOut) : 0.12;
    this.seed = o.seed ?? 1; this.idleK = o.idle ?? 1; this.autoBlink = o.autoBlink ?? true;
    this.rest = { lean: 0, tilt: 0, bob: 0, sq: 0, headYaw: 0, headPitch: 0, headRoll: 0, lookX: 0, lookY: 0, browUp: 0, mouthK: 1,
      "armL.fwd": 0, "armL.out": restOut, "armL.twist": 0, "armL.bend": 0.14, "armR.fwd": 0, "armR.out": restOut, "armR.twist": 0, "armR.bend": 0.14 };
  }
  private idleK: number; private autoBlink: boolean;

  // ---------------- raw building blocks ----------------
  /** set channels to values, reached over `dur` frames starting at `at` */
  key(at: number, vals: Partial<Record<Channel, number>>, dur = 6, ease: Ease = "spring") {
    for (const [c, v] of Object.entries(vals) as [Channel, number][]) {
      const arr = this.keys.get(c) ?? []; arr.push({ at, v, dur, ease }); arr.sort((a, b) => a.at - b.at); this.keys.set(c, arr);
    }
    return this;
  }
  /** return channels (default: all body / arm / head channels) to rest */
  toRest(at: number, chans?: Channel[], dur = 8) {
    const cs = chans ?? (Object.keys(this.rest) as Channel[]).filter((c) => c !== "mouthK");
    return this.key(at, Object.fromEntries(cs.map((c) => [c, this.rest[c]])), dur, "smooth");
  }
  /** named expression from frame `at` (brows / lids blend over 5 frames, a blink is added on big changes) */
  expr(at: number, name: ExprName, blink = true) { this.exprs.push([at, name]); this.exprs.sort((a, b) => a[0] - b[0]); if (blink) this.blinks.push(at - 1); return this; }
  /** override only the mouth (null = back to the expression's mouth) */
  mouth(at: number, m: MouthKind | null) { this.mouths.push([at, m]); this.mouths.sort((a, b) => a[0] - b[0]); return this; }
  eyesAt(at: number, e: EyeKind | null) { this.eyes.push([at, e]); this.eyes.sort((a, b) => a[0] - b[0]); return this; }
  hand(at: number, side: "L" | "R" | "both", h: HandKind) { if (side !== "R") this.handsL.push([at, h]); if (side !== "L") this.handsR.push([at, h]); this.handsL.sort((a, b) => a[0] - b[0]); this.handsR.sort((a, b) => a[0] - b[0]); return this; }
  prop(at: number, side: "L" | "R", p: Prop) { (side === "L" ? this.propsL : this.propsR).push([at, p]); (side === "L" ? this.propsL : this.propsR).sort((a, b) => a[0] - b[0]); return this; }
  look(at: number, x: number, y: number, dur = 4) { return this.key(at, { lookX: x, lookY: y }, dur, "smooth"); }
  blink(at: number) { this.blinks.push(at); return this; }

  // ---------------- presets (frames at 30 fps; timings follow the approved calm cadence) ----------------
  /** talk from a to b: mouth flaps every 4 f, nod + brow pop on stressed-word frames, a hand gesture on every 2nd stress */
  talk(a: number, b: number, stress: number[] = [], o: { gesture?: boolean; side?: "L" | "R"; k?: number } = {}) {
    this.talks.push({ a, b, k: o.k ?? 0.85 });
    stress.forEach((s, i) => {
      this.key(s, { headPitch: 0.05, browUp: 0.25 }, 4).key(s + 6, { headPitch: 0, browUp: 0 }, 8, "smooth");
      if ((o.gesture ?? true) && i % 2 === 1) {
        const sd = o.side ?? (i % 4 === 1 ? "R" : "L");
        this.key(s - 2, { [`arm${sd}.fwd`]: 0.45, [`arm${sd}.out`]: 0.22, [`arm${sd}.bend`]: 1.0 } as Partial<Record<Channel, number>>, 7).hand(s, sd, "open");
        this.toRest(s + 16, [`arm${sd}.fwd`, `arm${sd}.out`, `arm${sd}.bend`] as Channel[], 10).hand(s + 20, sd, "relaxed");
      }
    });
    return this;
  }
  nod(at: number, n = 2) { for (let i = 0; i < n; i++) this.key(at + i * 10, { headPitch: 0.11 }, 5).key(at + i * 10 + 5, { headPitch: -0.01 }, 5); return this.key(at + n * 10, { headPitch: 0 }, 6, "smooth"); }
  headShake(at: number, n = 3) { for (let i = 0; i < n; i++) this.key(at + i * 7, { headYaw: i % 2 ? -0.2 : 0.2 }, 5, "smooth"); return this.key(at + n * 7, { headYaw: 0 }, 6, "smooth"); }
  /** surprise: eyes first, then the head jolts back, arms fly up open; settles after `dur` */
  shock(at: number, dur = 30) {
    this.expr(at, "shock", false).key(at, { sq: -0.05 }, 3).key(at + 4, { sq: 0 }, 6, "smooth")
      .key(at + 2, { headPitch: -0.09, lean: -0.06, "armL.fwd": 0.3, "armL.out": 0.42, "armL.bend": 1.0, "armR.fwd": 0.3, "armR.out": 0.42, "armR.bend": 1.0 }, 6)
      .hand(at + 2, "both", "open");
    return this.toRest(at + dur, ["headPitch", "lean", "armL.fwd", "armL.out", "armL.bend", "armR.fwd", "armR.out", "armR.bend"], 12).hand(at + dur + 6, "both", "relaxed");
  }
  laugh(a: number, b: number) {
    this.expr(a, "grin");
    for (let f = a; f < b; f += 10) this.key(f, { headPitch: -0.08, bob: 0.008 }, 5).key(f + 5, { headPitch: 0.02, bob: 0 }, 5);
    return this.key(b, { headPitch: 0, bob: 0 }, 8, "smooth");
  }
  cheer(at: number, dur = 36) {
    this.expr(at, "grin").key(at - 3, { sq: 0.06 }, 3).key(at, { sq: -0.04 }, 4).key(at + 6, { sq: 0 }, 6, "smooth")
      .key(at, { "armL.out": 2.5, "armL.bend": 0.35, "armR.out": 2.5, "armR.bend": 0.35, headPitch: -0.08 }, 7).hand(at + 2, "both", "fist");
    return this.toRest(at + dur, ["armL.out", "armL.bend", "armR.out", "armR.bend", "headPitch"], 12).hand(at + dur + 6, "both", "relaxed");
  }
  shrug(at: number, dur = 26) {
    this.key(at, { "armL.out": 0.42, "armL.fwd": 0.28, "armL.bend": 1.25, "armR.out": 0.42, "armR.fwd": 0.28, "armR.bend": 1.25, headRoll: 0.12, bob: 0.015, browUp: 0.4 }, 7)
      .hand(at + 2, "both", "open").mouth(at, "flat");
    return this.toRest(at + dur, ["armL.out", "armL.fwd", "armL.bend", "armR.out", "armR.fwd", "armR.bend", "headRoll", "bob", "browUp"], 10).hand(at + dur + 4, "both", "relaxed").mouth(at + dur, null);
  }
  /** chin rub: right hand up near the chin, eyes up to the side */
  think(at: number, dur = 45) {
    this.expr(at, "think").key(at, { "armR.fwd": 1.05, "armR.out": 0.1, "armR.bend": 2.15, "armR.twist": -0.3, headRoll: 0.07, lookX: 0.5, lookY: -0.6 }, 9, "smooth").hand(at + 4, "R", "relaxed");
    return this.toRest(at + dur, ["armR.fwd", "armR.out", "armR.bend", "armR.twist", "headRoll", "lookX", "lookY"], 10);
  }
  /** point with one arm (R = character's right, which is screen-left when facing the camera) */
  point(at: number, side: "L" | "R" = "R", dur = 30) {
    this.key(at, { [`arm${side}.fwd`]: 1.3, [`arm${side}.out`]: 0.85, [`arm${side}.bend`]: 0.06, [`arm${side}.twist`]: 0.2, headYaw: side === "R" ? -0.3 : 0.3, lookX: side === "R" ? -0.65 : 0.65 } as Partial<Record<Channel, number>>, 8)
      .hand(at + 3, side, "point");
    return this.toRest(at + dur, [`arm${side}.fwd`, `arm${side}.out`, `arm${side}.bend`, `arm${side}.twist`, "headYaw", "lookX"] as Channel[], 10).hand(at + dur + 4, side, "relaxed");
  }
  wave(at: number, side: "L" | "R" = "R", n = 3) {
    this.key(at, { [`arm${side}.out`]: 2.45, [`arm${side}.bend`]: 0.5, [`arm${side}.fwd`]: 0.2 } as Partial<Record<Channel, number>>, 7).hand(at + 2, side, "open");
    for (let i = 0; i < n * 2; i++) this.key(at + 8 + i * 6, { [`arm${side}.bend`]: i % 2 ? 0.5 : 0.95 } as Partial<Record<Channel, number>>, 6, "smooth");
    const e = at + 8 + n * 12;
    return this.toRest(e, [`arm${side}.out`, `arm${side}.bend`, `arm${side}.fwd`] as Channel[], 10).hand(e + 4, side, "relaxed");
  }
  sad(at: number) { return this.expr(at, "sad").key(at, { headPitch: 0.15, lean: 0.05, lookY: 0.4 }, 14, "smooth"); }
  angry(at: number, dur = 40) {
    this.expr(at, "angry").key(at, { lean: 0.06, headPitch: 0.06, "armL.bend": 0.6, "armR.bend": 0.6 }, 6).hand(at, "both", "fist");
    return this.toRest(at + dur, ["lean", "headPitch", "armL.bend", "armR.bend"], 10).hand(at + dur + 4, "both", "relaxed");
  }
  /** hold a mug at chest height in the right hand */
  holdCup(at: number, side: "L" | "R" = "R") {
    return this.key(at, { [`arm${side}.fwd`]: 0.62, [`arm${side}.out`]: 0.08, [`arm${side}.bend`]: 1.62, [`arm${side}.twist`]: -0.25 } as Partial<Record<Channel, number>>, 10, "smooth")
      .hand(at + 4, side, "grip").prop(at + 4, side, "cup");
  }

  // ---------------- evaluation ----------------
  private ch(c: Channel, f: number) {
    const ks = this.keys.get(c), r = this.rest[c];
    if (!ks || !ks.length || f < ks[0].at) return r;
    let start = r, i = 0;
    for (; i < ks.length - 1 && ks[i + 1].at <= f; i++) start = start + (ks[i].v - start) * easeF(ks[i].ease, (ks[i + 1].at - ks[i].at) / ks[i].dur);
    return start + (ks[i].v - start) * easeF(ks[i].ease, (f - ks[i].at) / ks[i].dur);
  }
  private step<T>(arr: Step<T>[], f: number, d: T): T { let v = d; for (const [k, x] of arr) if (f >= k) v = x; return v; }
  private autoBlinks(f: number) {
    let b = 0; for (const k of this.blinks) b = Math.max(b, blinkCurve(f - k));
    let t = 20 + ((this.seed * 37) % 40);
    for (let i = 0; this.autoBlink && t <= f + 6 && i < 400; i++) { b = Math.max(b, blinkCurve(f - t)); const x = Math.sin((this.seed + 1) * 91.7 + i * 12.9898) * 43758.5453; t += 75 + Math.floor((x - Math.floor(x)) * 60); }
    return b;
  }
  /** the face at frame f (expression + brow blend + talk flaps + blinks) */
  faceAt(f: number): FaceState {
    let cur = this.exprs[0], prev = this.exprs[0];
    for (const e of this.exprs) if (f >= e[0]) { prev = cur; cur = e; }
    const E = EXPR[cur[1]], P = EXPR[prev[1]], k = sstep(cur[0], cur[0] + 5, f);
    const mix = (a: number, b: number) => a + (b - a) * k, bu = this.ch("browUp", f);
    const F: FaceState = {
      eyes: this.step(this.eyes, f, null) ?? E.eyes, mouth: this.step(this.mouths, f, null) ?? E.mouth,
      lid: mix(P.lid ?? 0, E.lid ?? 0), squint: mix(P.squint ?? 0, E.squint ?? 0), mouthK: this.ch("mouthK", f),
      browL: { up: mix(P.browL.up, E.browL.up) + bu, tilt: mix(P.browL.tilt, E.browL.tilt) }, browR: { up: mix(P.browR.up, E.browR.up) + bu, tilt: mix(P.browR.tilt, E.browR.tilt) },
      look: [this.ch("lookX", f), this.ch("lookY", f)], blink: this.autoBlinks(f),
    };
    const tk = this.talks.find((t) => f >= t.a && f < t.b);
    if (tk) { F.mouth = TALK[Math.floor((f - tk.a) / 4) % TALK.length]; F.mouthK = tk.k + 0.2 * Math.sin(f * 1.7); }
    return F;
  }
  /** full pose at frame f; place = floor position / facing (+ optional walk fields and riser height y) */
  at(f: number, place: { x: number; z: number; yaw: number; y?: number; walkD?: number; walk?: number }, fps = 30): PegPose {
    const t = f / fps, s = this.seed, idle = this.idleK;
    const arm = (sd: "L" | "R") => ({ fwd: this.ch(`arm${sd}.fwd`, f), out: this.ch(`arm${sd}.out`, f), twist: this.ch(`arm${sd}.twist`, f), bend: this.ch(`arm${sd}.bend`, f) });
    return {
      ...place, breathT: t + s, face: this.faceAt(f),
      lean: this.ch("lean", f), tilt: this.ch("tilt", f), bob: this.ch("bob", f), sq: this.ch("sq", f),
      headYaw: this.ch("headYaw", f) + idle * 0.025 * Math.sin(t * 0.7 + s), headPitch: this.ch("headPitch", f) + idle * 0.012 * Math.sin(t * 0.9 + s * 2),
      headRoll: this.ch("headRoll", f) + idle * 0.015 * Math.sin(t * 0.53 + s * 3),
      armL: arm("L"), armR: arm("R"), handL: this.step(this.handsL, f, "relaxed"), handR: this.step(this.handsR, f, "relaxed"),
      propL: this.step(this.propsL, f, null), propR: this.step(this.propsR, f, null),
    };
  }
}

/** walk from p0 to p1 between frames a..b with planted feet (ease in / constant / ease out). Spread into the pose place. */
export const walkPath = (f: number, a: number, b: number, p0: [number, number], p1: [number, number], stride: number) => {
  const u = (f - a) / (b - a), r = Math.min(0.3, 7 / (b - a)), vmax = 1 / (1 - r);
  const dist = u <= 0 ? 0 : u >= 1 ? 1 : u < r ? (vmax * u * u) / (2 * r) : u > 1 - r ? 1 - (vmax * (1 - u) * (1 - u)) / (2 * r) : vmax * (u - r / 2);
  const dx = p1[0] - p0[0], dz = p1[1] - p0[1], L = Math.hypot(dx, dz);
  return { x: p0[0] + dx * dist, z: p0[1] + dz * dist, yaw: Math.atan2(dx, dz), walkD: stride / 2 + dist * L, walk: sstep(a, a + 4, f) * (1 - sstep(b - 4, b + 1, f)) };
};
