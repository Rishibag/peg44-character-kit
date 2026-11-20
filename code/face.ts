// peg44 2D layers painted onto the 3D surfaces:
//  - the acting FACE (eyes / brows / 11 mouths / lashes / freckles / stubble / wrinkles / scar / moustache) on the head's
//    front projection, redrawn only when the face state changes;
//  - the OUTFIT (top + outerwear + bottom details, pockets, buttons, belts, painted accessories, dirt) on the torso
//    cylinder and on coat / skirt cylinders.
import { FaceState } from "./kit";
import type { Resolved } from "./spec";

export const FW = 460, FH = 512, FS = 2;             // face canvas logical size (x = head width, y = head height) x supersample
export const EYE = { x: 80, y: 251, rx: 42, ry: 50 }; // eye centre offset / radii (logical px)
export const MOUTH_Y = 386, NOSE_V = 0.375, BROW_Y = 172;
export const INK = "#1d1519";                         // the one ink colour (purple-neutral near-black, never #000)

const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** mix colour h toward `to` (default black) by k (0..1). Negative k moves away (lighter for black). */
export const shade = (h: string, k: number, to = "#000000") => { const a = hex(h), b = hex(to); return "#" + a.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (b[i] - v) * k))).toString(16).padStart(2, "0")).join(""); };
export const lighten = (h: string, k: number) => shade(h, k, "#ffffff");
const rgba = (h: string, a: number) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
/** tiny deterministic random from a seed */
export const rng = (seed: number) => { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

export type FaceCols = {
  skin: string; eye: string; brow: string; ink: string; hair: string; browW: number; lashes: boolean; blush: number;
  freckles: boolean; stubble?: string; wrinkles: boolean; scar?: string; mole?: string; lips?: string;
  moustache?: "brush" | "walrus" | "pencil"; goatee: boolean; grime: number; seed: number;
};

export const faceKey = (F: FaceState) => [F.eyes, F.mouth, (F.mouthK ?? 1).toFixed(2), (F.lid ?? 0).toFixed(2), (F.blink ?? 0).toFixed(2), (F.squint ?? 0).toFixed(2),
  (F.look?.[0] ?? 0).toFixed(2), (F.look?.[1] ?? 0).toFixed(2), F.browL.up.toFixed(2), F.browL.tilt.toFixed(2), F.browR.up.toFixed(2), F.browR.tilt.toFixed(2)].join("|");

export const drawFace = (g: CanvasRenderingContext2D, C: FaceCols, F: FaceState) => {
  g.setTransform(FS, 0, 0, FS, 0, 0);
  g.lineCap = "round"; g.lineJoin = "round";
  g.fillStyle = C.skin; g.fillRect(0, 0, FW, FH);
  for (const s of [-1, 1]) {                                   // soft cheek warmth
    const gr = g.createRadialGradient(230 + s * 118, 320, 4, 230 + s * 118, 320, 46);
    gr.addColorStop(0, `rgba(226,104,96,${C.blush})`); gr.addColorStop(1, "rgba(226,104,96,0)");
    g.fillStyle = gr; g.fillRect(0, 0, FW, FH);
  }
  marks(g, C);
  for (const s of [-1, 1]) eye(g, C, F, 230 + s * EYE.x, EYE.y, s);
  for (const s of [-1, 1]) brow(g, C, s < 0 ? F.browL : F.browR, s);
  if (C.scar) scarLine(g, C);
  mouth(g, C, F);
  if (C.moustache) moustache(g, C);
};

/** static skin marks under the eyes / brows: stubble, freckles, wrinkles, mole, soot */
const marks = (g: CanvasRenderingContext2D, C: FaceCols) => {
  const r = rng(C.seed + 7);
  if (C.stubble) {                                             // jaw + upper-lip shadow, fading toward the sides of the face
    const sb = C.stubble;
    g.save();
    const p = new Path2D(); p.moveTo(60, 330); p.quadraticCurveTo(230, 300, 400, 330); p.lineTo(420, 520); p.lineTo(40, 520); p.closePath();
    g.clip(p);
    const lg = g.createLinearGradient(40, 0, 420, 0);
    lg.addColorStop(0, rgba(sb, 0)); lg.addColorStop(0.18, rgba(sb, 0.3)); lg.addColorStop(0.82, rgba(sb, 0.3)); lg.addColorStop(1, rgba(sb, 0));
    g.fillStyle = lg; g.fillRect(40, 300, 380, 220);
    g.fillStyle = rgba(C.skin, 0.55); g.beginPath(); g.ellipse(230, 322, 52, 22, 0, 0, 7); g.fill();   // keep the nose base clean
    g.fillStyle = rgba(shade(sb, 0.25), 0.5);
    for (let i = 0; i < 420; i++) { const x = 70 + r() * 320, y = 336 + r() * 170; if (Math.abs(x - 230) < 175 - (y - 336) * 0.15) g.fillRect(x, y, 2.2, 2.2); }
    g.restore();
  }
  if (C.freckles) {
    g.fillStyle = rgba(shade(C.skin, 0.38, "#7a3a1c"), 0.75);
    for (const s of [-1, 1]) for (let i = 0; i < 13; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 42; g.beginPath(); g.arc(230 + s * 92 + Math.cos(a) * d * 1.3, 318 + Math.sin(a) * d * 0.7, 2.6 + r() * 1.6, 0, 7); g.fill(); }
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(205 + r() * 50, 300 + r() * 18, 2.2, 0, 7); g.fill(); }
  }
  if (C.wrinkles) {
    g.strokeStyle = rgba(shade(C.skin, 0.4), 0.6); g.lineWidth = 3.2;
    for (const y of [104, 124]) { g.beginPath(); g.moveTo(160, y + 4); g.quadraticCurveTo(230, y - 6, 300, y + 4); g.stroke(); }
    for (const s of [-1, 1]) {
      for (const d of [-10, 4, 18]) { g.beginPath(); g.moveTo(230 + s * 132, 252 + d * 0.6); g.lineTo(230 + s * 152, 248 + d); g.stroke(); }   // crow's feet
      g.beginPath(); g.moveTo(230 + s * 40, 336); g.quadraticCurveTo(230 + s * 62, 368, 230 + s * 56, 400); g.stroke();                       // smile lines
    }
  }
  if (C.mole) { const s = C.mole === "left" ? 1 : -1; g.fillStyle = shade(C.skin, 0.55); g.beginPath(); g.arc(230 + s * 64, 372, 4, 0, 7); g.fill(); }
  if (C.goatee) {
    g.fillStyle = C.hair; g.beginPath(); g.moveTo(198, 420); g.quadraticCurveTo(230, 412, 262, 420); g.quadraticCurveTo(266, 470, 230, 486); g.quadraticCurveTo(194, 470, 198, 420); g.fill();
  }
  if (C.grime > 0) {                                           // soot smudges on one cheek and the forehead
    for (const [x, y, rr, a] of [[118, 340, 44, 0.5], [312, 128, 34, 0.35], [338, 362, 22, 0.3]] as [number, number, number, number][]) {
      const gr = g.createRadialGradient(x, y, 2, x, y, rr); gr.addColorStop(0, `rgba(58,44,34,${a * C.grime})`); gr.addColorStop(1, "rgba(58,44,34,0)");
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }
};

const eye = (g: CanvasRenderingContext2D, C: FaceCols, F: FaceState, cx: number, cy: number, s: number) => {
  const blink = F.blink ?? 0, kind = F.eyes;
  const wide = kind === "wide" ? 1 : 0, rx = EYE.rx * (1 + 0.06 * wide), ry = EYE.ry * (1 + 0.1 * wide);
  let lid = Math.max(F.lid ?? 0, 0) + (kind === "angry" ? 0.22 : kind === "sad" ? 0.16 : 0);
  lid = Math.min(1, lid + blink * (1 - lid));
  if (kind === "closed" || lid > 0.9) {
    g.strokeStyle = C.ink; g.lineWidth = 7.5; g.beginPath(); g.moveTo(cx - 34, cy + 6); g.quadraticCurveTo(cx, cy + 18, cx + 34, cy + 6); g.stroke();
    if (C.lashes) { g.lineWidth = 5; g.beginPath(); g.moveTo(cx + s * 32, cy + 8); g.lineTo(cx + s * 44, cy + 14); g.stroke(); }
    return;
  }
  if (kind === "happy") {
    g.strokeStyle = C.ink; g.lineWidth = 8.5; g.beginPath(); g.moveTo(cx - 34, cy + 12); g.quadraticCurveTo(cx, cy - 30, cx + 34, cy + 12); g.stroke();
    if (C.lashes) { g.lineWidth = 5; g.beginPath(); g.moveTo(cx + s * 31, cy + 4); g.lineTo(cx + s * 44, cy - 4); g.stroke(); }
    return;
  }
  const scl = new Path2D(); scl.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.save(); g.clip(scl);
  g.fillStyle = "#fbfaf6"; g.fill(scl);
  g.fillStyle = "rgba(120,130,170,0.18)"; g.beginPath(); g.ellipse(cx, cy - ry * 0.75, rx * 1.1, ry * 0.45, 0, 0, 7); g.fill();   // lid shadow on the eyeball
  const ir = wide ? 21 : 27, pr = wide ? 9 : 14, lx = (F.look?.[0] ?? 0) * 13, ly = (F.look?.[1] ?? 0) * 12;
  const ix = cx + lx, iy = cy + 4 + ly;
  g.fillStyle = C.eye; g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fill();
  g.strokeStyle = shade(C.eye, 0.45); g.lineWidth = 3; g.stroke();
  g.fillStyle = "#120d0e"; g.beginPath(); g.arc(ix, iy, pr, 0, 7); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(ix - 8, iy - 9, wide ? 5.5 : 7, 0, 7); g.fill();
  g.beginPath(); g.arc(ix + 8, iy + 8, 3, 0, 7); g.fill();
  // upper lid (skin) with a slant: angry = inner corner low, sad = outer corner low
  const inner = -s, slant = kind === "angry" ? 0.42 : kind === "sad" ? -0.32 : 0;
  const top = cy - ry - 3, yAt = (x: number) => { const u = (x - cx) / rx; return cy - ry + 2 * ry * lid + slant * ry * 0.9 * (u * inner) * (lid > 0.02 || slant ? 1 : 0); };
  const sq = F.squint ?? 0;
  if (lid > 0.02 || slant) {
    g.fillStyle = shade(C.skin, 0.06); g.beginPath(); g.moveTo(cx - rx - 4, top); g.lineTo(cx + rx + 4, top);
    g.lineTo(cx + rx + 4, yAt(cx + rx + 4)); g.lineTo(cx - rx - 4, yAt(cx - rx - 4)); g.closePath(); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 9; g.beginPath(); g.moveTo(cx - rx - 4, yAt(cx - rx - 4)); g.lineTo(cx + rx + 4, yAt(cx + rx + 4)); g.stroke();
  }
  if (sq > 0.02) {                                              // smile squint: lower lid pushes up
    g.fillStyle = C.skin; g.beginPath(); g.moveTo(cx - rx - 4, cy + ry + 4); g.lineTo(cx + rx + 4, cy + ry + 4);
    g.lineTo(cx + rx + 4, cy + ry - ry * 0.9 * sq); g.quadraticCurveTo(cx, cy + ry - ry * 1.5 * sq, cx - rx - 4, cy + ry - ry * 0.9 * sq); g.closePath(); g.fill();
    g.strokeStyle = shade(C.skin, 0.35); g.lineWidth = 3.5; g.beginPath(); g.moveTo(cx - rx, cy + ry - ry * 0.9 * sq); g.quadraticCurveTo(cx, cy + ry - ry * 1.5 * sq, cx + rx, cy + ry - ry * 0.9 * sq); g.stroke();
  }
  g.restore();
  g.strokeStyle = C.ink; g.lineWidth = 4.5; g.stroke(scl);
  g.lineWidth = 7.5; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();   // heavier upper lash line
  if (C.lashes) {                                               // two outer-corner lash flicks (reads female at thumbnail size)
    const lt = lid > 0.02 ? Math.min(1, lid) : 0, y0 = cy - ry * (0.42 - 0.6 * lt);
    g.lineWidth = 5.5; g.beginPath(); g.moveTo(cx + s * rx * 0.86, y0); g.lineTo(cx + s * (rx + 15), y0 - 14); g.stroke();
    g.lineWidth = 4.5; g.beginPath(); g.moveTo(cx + s * rx * 0.62, y0 - ry * 0.32 * (1 - lt)); g.lineTo(cx + s * (rx + 4), y0 - 26 * (1 - lt) - 6); g.stroke();
  }
};

const brow = (g: CanvasRenderingContext2D, C: FaceCols, B: { up: number; tilt: number }, s: number) => {
  const bx = 230 + s * 84, by = BROW_Y - B.up * 24;
  const ix = bx - s * 36, ox = bx + s * 38, iy = by - B.tilt * 14, oy = by + B.tilt * 5 + 4;
  g.strokeStyle = C.brow; g.lineWidth = 18 * C.browW; g.beginPath(); g.moveTo(ix, iy); g.quadraticCurveTo(bx, Math.min(iy, oy) - 10, ox, oy); g.stroke();
  g.lineWidth = 12 * C.browW; g.beginPath(); g.moveTo(ix - s * 2, iy + 1); g.lineTo(ix + s * 8, iy); g.stroke();
};

/** scar: pale line with a brow gap (leftBrow = character's left = screen right when facing the camera) */
const scarLine = (g: CanvasRenderingContext2D, C: FaceCols) => {
  const k = C.scar!, s = k.startsWith("left") ? 1 : -1, brow = k.endsWith("Brow");
  const x = brow ? 230 + s * 96 : 230 + s * 120, y0 = brow ? 128 : 300, y1 = brow ? 222 : 372;
  if (brow) { g.strokeStyle = C.skin; g.lineWidth = 9; g.beginPath(); g.moveTo(x - s * 6, y0 + 10); g.lineTo(x + s * 6, y1 - 30); g.stroke(); }   // gap in the brow
  g.strokeStyle = lighten(C.skin, 0.35); g.lineWidth = 5; g.beginPath(); g.moveTo(x - s * 8, y0); g.lineTo(x + s * 8, y1); g.stroke();
  g.strokeStyle = rgba(shade(C.skin, 0.3, "#a04040"), 0.6); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - s * 8 + 3, y0); g.lineTo(x + s * 8 + 3, y1); g.stroke();
};

const mouth = (g: CanvasRenderingContext2D, C: FaceCols, F: FaceState) => {
  const k = F.mouthK ?? 1;
  g.save(); g.translate(230, MOUTH_Y);
  g.strokeStyle = C.lips ?? C.ink; g.lineWidth = 6.5;
  const line = (f: (p: Path2D) => void) => { const p = new Path2D(); f(p); g.stroke(p); };
  const open = (f: (p: Path2D) => void, teeth: "top" | "both" | "none", tongue: [number, number, number] | null) => {
    const p = new Path2D(); f(p); p.closePath();
    g.fillStyle = "#4e1c26"; g.fill(p);
    g.save(); g.clip(p);
    if (tongue) { g.fillStyle = "#d36a72"; g.beginPath(); g.ellipse(0, tongue[0], tongue[1], tongue[2], 0, 0, 7); g.fill(); }
    g.fillStyle = "#fbf8f0";
    if (teeth !== "none") g.fillRect(-70, -60, 140, 60 + (teeth === "both" ? 5 : 6));
    if (teeth === "both") g.fillRect(-70, 9, 140, 40);
    g.restore();
    g.strokeStyle = C.ink; g.lineWidth = 5.5; g.stroke(p);
  };
  switch (F.mouth) {
    case "neutral": line((p) => { p.moveTo(-24, 0); p.quadraticCurveTo(0, 7, 24, 0); }); break;
    case "flat": line((p) => { p.moveTo(-28, 3); p.lineTo(28, 3); }); break;
    case "smile": line((p) => { p.moveTo(-44, -9); p.quadraticCurveTo(0, 30, 44, -9); });
      g.lineWidth = 5; line((p) => { p.moveTo(-49, -3); p.lineTo(-42, -13); p.moveTo(49, -3); p.lineTo(42, -13); }); break;
    case "frown": line((p) => { p.moveTo(-36, 13); p.quadraticCurveTo(0, -16, 36, 13); }); break;
    case "smirk": line((p) => { p.moveTo(-28, 4); p.bezierCurveTo(-8, 11, 18, 8, 38, -12); }); break;
    case "wavy": line((p) => { for (let x = -34; x <= 34; x += 2) { const y = 5 * Math.sin((x / 34) * Math.PI * 2); if (x === -34) p.moveTo(x, y); else p.lineTo(x, y); } }); break;
    case "grin": open((p) => { p.moveTo(-52, -10); p.quadraticCurveTo(0, -2, 52, -10); p.bezierCurveTo(46, 40 * k, -46, 40 * k, -52, -10); }, "top", [34 * k, 26, 13]); break;
    case "talkA": open((p) => { p.moveTo(-28, 0); p.bezierCurveTo(-26, -14, 26, -14, 28, 0); p.bezierCurveTo(26, 38 * k, -26, 38 * k, -28, 0); }, "none", [24 * k, 16, 10]);
      g.fillStyle = "#fbf8f0"; g.beginPath(); g.moveTo(-20, -9); g.quadraticCurveTo(0, -12, 20, -9); g.lineTo(18, -4); g.lineTo(-18, -4); g.fill(); break;
    case "talkO": open((p) => { p.ellipse(0, 6, 17, 19 * k, 0, 0, Math.PI * 2); }, "none", [16 * k, 10, 6]); break;
    case "talkE": open((p) => { p.moveTo(-40, -4); p.bezierCurveTo(-30, -13, 30, -13, 40, -4); p.bezierCurveTo(34, 24 * k, -34, 24 * k, -40, -4); }, "both", null); break;
    case "shock": open((p) => { p.ellipse(0, 12, 25, 34 * k, 0, 0, Math.PI * 2); }, "none", [34 * k, 16, 10]); break;
  }
  g.restore();
};

const moustache = (g: CanvasRenderingContext2D, C: FaceCols) => {
  if (C.moustache === "pencil") { g.strokeStyle = C.hair; g.lineWidth = 7; g.beginPath(); g.moveTo(186, 356); g.quadraticCurveTo(230, 344, 274, 356); g.stroke(); return; }
  const p = new Path2D();
  if (C.moustache === "walrus") { p.moveTo(230, 338); p.bezierCurveTo(268, 328, 296, 344, 292, 380); p.bezierCurveTo(272, 366, 250, 362, 230, 368); p.bezierCurveTo(210, 362, 188, 366, 168, 380); p.bezierCurveTo(164, 344, 192, 328, 230, 338); }
  else { p.moveTo(230, 340); p.bezierCurveTo(262, 330, 292, 340, 290, 366); p.bezierCurveTo(270, 362, 248, 356, 230, 362); p.bezierCurveTo(212, 356, 190, 362, 170, 366); p.bezierCurveTo(168, 340, 198, 330, 230, 340); }
  g.fillStyle = C.hair; g.fill(p); g.strokeStyle = C.ink; g.lineWidth = 3.5; g.stroke(p);
};

// =====================================================================================================================
// OUTFIT textures. Torso / coat / skirt cylinders: u = angle round the body (0.5 = front), v = height.
// Angles in rad, + = the character's LEFT side (screen right when facing camera). Heights in metres in the hips frame:
// 0 = hip joints, ~0.06 = waistband, T = shoulder line (T = torso length of the body type).
// =====================================================================================================================
export const TW = 1024, TH = 512;
export type Cyl = { X: (a: number) => number; Y: (yM: number) => number };
export const cylMap = (y0: number, y1: number, h = TH): Cyl => ({ X: (a) => (0.5 + a / (Math.PI * 2)) * TW, Y: (y) => (1 - (y - y0) / (y1 - y0)) * h });
type G = CanvasRenderingContext2D;

const rectA = (g: G, M: Cyl, a0: number, a1: number, y0: number, y1: number) => { const x = M.X(a0), y = M.Y(y1); g.rect(x, y, M.X(a1) - x, M.Y(y0) - y); };
const fillA = (g: G, M: Cyl, a0: number, a1: number, y0: number, y1: number, col: string) => { g.fillStyle = col; g.beginPath(); rectA(g, M, a0, a1, y0, y1); g.fill(); };
const hline = (g: G, M: Cyl, y: number, w = 3, col = INK) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(-4, M.Y(y)); g.lineTo(TW + 4, M.Y(y)); g.stroke(); };
export const button = (g: G, x: number, y: number, r: number, col: string) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke(); };
export const folds = (g: G, M: Cyl, y0: number, y1: number, as: number[], col: string) => {
  g.strokeStyle = col; g.lineWidth = 7; g.filter = "blur(3px)";
  for (const a of as) { g.beginPath(); g.moveTo(M.X(a), M.Y(y1)); g.quadraticCurveTo(M.X(a + 0.05), M.Y((y0 + y1) / 2), M.X(a - 0.02), M.Y(y0)); g.stroke(); }
  g.filter = "none";
};
/** a chest pocket on side s (+1 = character's left), optional flap with a snap, pens sticking out */
export const pocket = (g: G, M: Cyl, T: number, s: number, col: string, o: { flap?: boolean; snap?: string; pens?: string[]; y0?: number; y1?: number; a0?: number; a1?: number } = {}) => {
  const a0 = o.a0 ?? 0.22, a1 = o.a1 ?? 0.6, y0 = o.y0 ?? T * 0.5, y1 = o.y1 ?? T * 0.7;
  const A0 = s > 0 ? a0 : -a1, A1 = s > 0 ? a1 : -a0;
  (o.pens ?? []).forEach((pc, i) => {
    const a = A0 + 0.08 + i * 0.075, x = M.X(a), yt = M.Y(y1 + 0.045);
    g.fillStyle = pc; g.fillRect(x, yt, 10, M.Y(y1 - 0.02) - yt); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x, yt, 10, M.Y(y1 - 0.02) - yt);
    g.fillStyle = "#c9ccd0"; g.fillRect(x + 3, yt + 2, 4, 16);                      // clip
  });
  g.beginPath(); rectA(g, M, A0, A1, y0, y1); g.fillStyle = shade(col, 0.05); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  if (o.flap) {
    g.beginPath(); g.moveTo(M.X(A0 - 0.02), M.Y(y1 + 0.012)); g.lineTo(M.X(A1 + 0.02), M.Y(y1 + 0.012)); g.lineTo(M.X(A1 + 0.02), M.Y(y1 - 0.03));
    g.lineTo(M.X((A0 + A1) / 2), M.Y(y1 - 0.05)); g.lineTo(M.X(A0 - 0.02), M.Y(y1 - 0.03)); g.closePath();
    g.fillStyle = shade(col, 0.12); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    if (o.snap) button(g, M.X((A0 + A1) / 2), M.Y(y1 - 0.033), 6, o.snap);
  }
};
const ribs = (g: G, M: Cyl, y0: number, y1: number, col: string) => {
  fillA(g, M, -Math.PI, Math.PI, y0, y1, shade(col, 0.14));
  g.strokeStyle = shade(col, 0.28); g.lineWidth = 2; for (let x = 0; x < TW; x += 12) { g.beginPath(); g.moveTo(x, M.Y(y1)); g.lineTo(x, M.Y(y0)); g.stroke(); }
  hline(g, M, y0, 3);
};
/** open neck V showing `inner` (skin / shirt), with shirt-collar points in `collar` colour */
const neckV = (g: G, M: Cyl, T: number, depth: number, half: number, inner: string, collar?: string, tie?: string) => {
  const yv = T * depth;
  g.fillStyle = inner; g.beginPath(); g.moveTo(M.X(-half), M.Y(T + 0.1)); g.lineTo(M.X(half), M.Y(T + 0.1)); g.lineTo(M.X(0), M.Y(yv)); g.closePath(); g.fill();
  if (tie) {
    g.fillStyle = tie; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(M.X(-0.05), M.Y(T - 0.035)); g.lineTo(M.X(0.05), M.Y(T - 0.035)); g.lineTo(M.X(0.032), M.Y(T - 0.07)); g.lineTo(M.X(-0.032), M.Y(T - 0.07)); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(M.X(-0.03), M.Y(T - 0.07)); g.lineTo(M.X(0.03), M.Y(T - 0.07)); g.lineTo(M.X(0.06), M.Y(Math.min(yv, T * 0.55) + 0.02)); g.lineTo(M.X(0), M.Y(Math.min(yv, T * 0.55) - 0.01)); g.lineTo(M.X(-0.06), M.Y(Math.min(yv, T * 0.55) + 0.02)); g.closePath(); g.fill(); g.stroke();
  }
  if (collar) {
    g.fillStyle = collar; g.strokeStyle = INK; g.lineWidth = 2.5;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(M.X(s * 0.02), M.Y(T - 0.03)); g.lineTo(M.X(s * 0.2), M.Y(T + 0.02)); g.lineTo(M.X(s * 0.13), M.Y(T - 0.06)); g.closePath(); g.fill(); g.stroke(); }
  }
  g.strokeStyle = INK; g.lineWidth = 3.5; g.beginPath(); g.moveTo(M.X(-half), M.Y(T + 0.1)); g.lineTo(M.X(0), M.Y(yv)); g.lineTo(M.X(half), M.Y(T + 0.1)); g.stroke();
  return yv;
};
const lapels = (g: G, M: Cyl, T: number, depth: number, half: number, col: string) => {
  const yv = T * depth;
  for (const s of [-1, 1]) {
    g.fillStyle = shade(col, 0.07); g.beginPath(); g.moveTo(M.X(s * half), M.Y(T + 0.02)); g.lineTo(M.X(0), M.Y(yv)); g.lineTo(M.X(s * 0.2), M.Y(yv + 0.1));
    g.lineTo(M.X(s * (half + 0.18)), M.Y(T * 0.8)); g.lineTo(M.X(s * (half + 0.06)), M.Y(T * 0.84)); g.lineTo(M.X(s * (half + 0.12)), M.Y(T + 0.02)); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  }
};

/** paint the whole torso: bottoms, top garment, outerwear, painted accessories, dirt */
export const paintTorso = (g: G, R: Resolved, M: Cyl, T: number, C: { top: string; outer: string; bottom: string; skin: string }) => {
  g.lineCap = "round"; g.lineJoin = "round";
  const top = R.top, o = R.outer, bot = R.bottom, rnd = rng(R.seed);
  const tucked = top.tucked ?? ["shirt", "workshirt", "blouse"].includes(top.type);
  const hemY = tucked ? 0.045 : -0.01;
  // 1 base: top colour, bottoms below the hem
  g.fillStyle = C.top; g.fillRect(0, 0, TW, TH);
  g.fillStyle = C.bottom; g.fillRect(0, M.Y(hemY), TW, TH);
  if (bot.type === "jeans") { g.strokeStyle = lighten(C.bottom, 0.35); g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(M.X(0.05), M.Y(hemY)); g.quadraticCurveTo(M.X(0.06), M.Y(-0.08), M.X(0.0), M.Y(-0.12)); g.stroke(); g.setLineDash([]); }
  else { g.strokeStyle = shade(C.bottom, 0.3); g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(0.04), M.Y(hemY)); g.lineTo(M.X(0.04), M.Y(-0.12)); g.stroke(); }
  if (tucked && bot.belt) {
    fillA(g, M, -Math.PI, Math.PI, 0.045, 0.078, bot.belt); hline(g, M, 0.045, 2.5); hline(g, M, 0.078, 2.5);
    g.fillStyle = "#c9a14a"; g.beginPath(); rectA(g, M, -0.07, 0.07, 0.04, 0.083); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
  }
  // 2 top garment
  const yokeV = (depth: number, half: number, collar: boolean) => neckV(g, M, T, depth, half, top.tie ? lighten(C.top, 0.0) : C.skin, collar ? C.top : undefined, top.tie);
  switch (top.type) {
    case "shirt": case "workshirt": case "blouse": case "scrubs": case "polo": {
      const polo = top.type === "polo", scrubs = top.type === "scrubs", blouse = top.type === "blouse";
      const depth = scrubs ? 0.72 : blouse ? 0.8 : polo ? 0.88 : 0.86, half = scrubs ? 0.26 : blouse ? 0.22 : 0.14;
      const yv = yokeV(depth, half, !scrubs && !blouse);
      if (!scrubs) {
        const end = polo ? T * 0.66 : hemY + 0.02, n = polo ? 2 : 5, snap = top.snaps;
        g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(M.X(0), M.Y(yv)); g.lineTo(M.X(0), M.Y(end)); g.stroke();
        if (top.buttons !== false) for (let i = 0; i < n; i++) { const y = yv - 0.03 - i * (yv - end - 0.03) / Math.max(1, n - 1 + (polo ? 0 : 0.5)); if (y > hemY + 0.03) button(g, M.X(-0.04), M.Y(y), snap ? 5.5 : 4.5, snap ?? top.buttons ?? shade(C.top, -0.5)); }
      }
      if (top.type === "workshirt") { g.strokeStyle = shade(C.top, 0.25); g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(-1.6), M.Y(T * 0.82)); g.quadraticCurveTo(M.X(0), M.Y(T * 0.78), M.X(1.6), M.Y(T * 0.82)); g.stroke(); }
      const np = top.pockets ?? (top.type === "workshirt" ? 2 : scrubs ? 1 : 0);
      if (np >= 1) pocket(g, M, T, 1, C.top, { flap: top.pocketFlaps ?? top.type === "workshirt", snap: top.snaps, pens: top.pens });
      if (np >= 2) pocket(g, M, T, -1, C.top, { flap: top.pocketFlaps ?? top.type === "workshirt", snap: top.snaps });
      if (!tucked) ribs(g, M, hemY, hemY + 0.02, C.top);
      folds(g, M, hemY + 0.04, T * 0.5, [-0.4, 0.35], "rgba(30,40,70,0.10)");
      break;
    }
    case "rugby": {                                                  // hooped rugby shirt (worked example in docs/OUTFITS-AND-VARIATIONS.md)
      const hoop = top.stripe ?? lighten(C.top, 0.75);
      for (let y = hemY + 0.03; y < T - 0.02; y += 0.1) fillA(g, M, -Math.PI, Math.PI, y, y + 0.05, hoop);   // 5 cm hoops every 10 cm
      const yv = neckV(g, M, T, 0.88, 0.12, C.skin, top.trim ?? "#f4f1ea");                                 // open neck + white collar points
      g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(M.X(0), M.Y(yv)); g.lineTo(M.X(0), M.Y(T * 0.7)); g.stroke();
      for (const y of [yv - 0.03, T * 0.74]) button(g, M.X(-0.04), M.Y(y), 4.5, top.trim ?? "#f4f1ea");
      ribs(g, M, hemY, hemY + 0.03, C.top);
      folds(g, M, hemY + 0.05, T * 0.5, [-0.42, 0.38], "rgba(60,20,40,0.10)");
      break;
    }
    case "sweater": case "turtleneck": case "tshirt": case "tank": case "hoodie": {
      if (top.type !== "tshirt" && top.type !== "tank") ribs(g, M, hemY, hemY + 0.045, top.trim ?? C.top);
      else { fillA(g, M, -Math.PI, Math.PI, hemY, hemY + 0.02, shade(C.top, 0.08)); hline(g, M, hemY, 3); }
      if (top.stripe) for (const [y, h] of [[T * 0.6, 0.026], [T * 0.69, 0.016]]) fillA(g, M, -Math.PI, Math.PI, y, y + h, top.stripe);
      if (top.type === "tank") {                                     // skin above the scoop, two straps
        g.fillStyle = C.skin;
        for (const [a0, a1] of [[-0.42, 0.42], [0.82, 2.3], [-2.3, -0.82], [2.72, 3.2], [-3.2, -2.72]]) { g.beginPath(); rectA(g, M, a0, a1, T * 0.8, T + 0.1); g.fill(); }
        g.beginPath(); g.ellipse(M.X(0), M.Y(T * 0.8), M.X(0.42) - M.X(0), 26, 0, 0, 7); g.fill();
        g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(M.X(0), M.Y(T * 0.8), M.X(0.42) - M.X(0), 26, 0, 0, Math.PI); g.stroke();
      }
      if (top.type === "hoodie") {
        const y0 = hemY + 0.06, y1 = T * 0.42;                       // kangaroo pocket
        g.fillStyle = shade(C.top, 0.07); g.beginPath(); g.moveTo(M.X(-0.62), M.Y(y0)); g.lineTo(M.X(0.62), M.Y(y0)); g.lineTo(M.X(0.42), M.Y(y1)); g.lineTo(M.X(-0.42), M.Y(y1)); g.closePath(); g.fill();
        g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
        g.strokeStyle = top.trim ?? "#f1efe8"; g.lineWidth = 5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(M.X(s * 0.1), M.Y(T)); g.lineTo(M.X(s * 0.12), M.Y(T * 0.68)); g.stroke(); }
      }
      if (top.type === "sweater" || top.type === "tshirt") { const np = top.pockets ?? 0; if (np) pocket(g, M, T, 1, C.top, { pens: top.pens }); }
      folds(g, M, hemY + 0.05, T * 0.5, [-0.45, 0.4], "rgba(60,20,40,0.10)");
      break;
    }
  }
  // 3 outerwear
  if (o) paintOuter(g, R, M, T, C, hemY);
  // 4 painted accessories
  const acc = (t: Parameters<Resolved["has"]>[0]) => R.has(t);
  const hr = acc("harness");
  if (hr) {
    const hc = hr.color ?? "#d8503c";
    fillA(g, M, -Math.PI, Math.PI, 0.0, 0.05, hc); hline(g, M, 0.0, 2.5); hline(g, M, 0.05, 2.5);
    g.strokeStyle = shade(hc, 0.3); g.lineWidth = 5; g.beginPath(); g.ellipse(M.X(0), M.Y(-0.02), 14, 22, 0, 0, 7); g.stroke();   // belay loop
    for (const a of [-1.2, -0.7, 0.7, 1.2]) { g.strokeStyle = "#2a2a2e"; g.lineWidth = 3; g.beginPath(); g.ellipse(M.X(a), M.Y(-0.005), 9, 14, 0, 0, 7); g.stroke(); }
  }
  const tb = acc("toolBelt");
  if (tb) {
    const c = tb.color ?? "#7a5230";
    fillA(g, M, -Math.PI, Math.PI, 0.03, 0.075, c); hline(g, M, 0.03, 2.5); hline(g, M, 0.075, 2.5);
    for (const a of [0.55, 0.95, -0.6, -1.0]) { g.beginPath(); rectA(g, M, a - 0.16, a + 0.16, -0.08, 0.06); g.fillStyle = shade(c, 0.12); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = "#9aa0a8"; g.fillRect(M.X(0.88), M.Y(0.12), 8, M.Y(0.06) - M.Y(0.12));   // a screwdriver handle sticking out
  }
  const bp = acc("backpack");
  if (bp) { const c = bp.color ?? "#3d5a7a"; for (const s of [-1, 1]) { g.fillStyle = c; g.beginPath(); rectA(g, M, s * 0.38 - 0.08, s * 0.38 + 0.08, T * 0.3, T + 0.1); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); } fillA(g, M, -0.38, 0.38, T * 0.62, T * 0.66, shade(c, 0.2)); }
  const st = acc("stethoscope");
  if (st) {
    const c = st.color ?? "#3a3f48";
    g.strokeStyle = c; g.lineWidth = 7;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(M.X(s * 0.75), M.Y(T + 0.02)); g.quadraticCurveTo(M.X(s * 0.42), M.Y(T * 0.55), M.X(s * 0.12), M.Y(T * 0.48)); g.stroke(); }
    g.beginPath(); g.moveTo(M.X(0.12), M.Y(T * 0.48)); g.quadraticCurveTo(M.X(0.2), M.Y(T * 0.3), M.X(0.3), M.Y(T * 0.26)); g.stroke();
    button(g, M.X(0.32), M.Y(T * 0.24), 11, "#c4c8ce");
  }
  const bd = acc("badge");
  if (bd) {                                                       // gold shield on the left chest
    const x = M.X(0.42), y = M.Y(T * 0.74); g.fillStyle = bd.color ?? "#d8b04a"; g.beginPath();
    g.moveTo(x - 13, y - 14); g.lineTo(x + 13, y - 14); g.lineTo(x + 13, y + 2); g.quadraticCurveTo(x, y + 18, x - 13, y + 2); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
  }
  const id = acc("idBadge");
  if (id) {
    g.strokeStyle = id.color ?? "#2f5fa8"; g.lineWidth = 5; g.beginPath(); g.moveTo(M.X(-0.32), M.Y(T + 0.05)); g.lineTo(M.X(-0.02), M.Y(T * 0.52)); g.lineTo(M.X(0.32), M.Y(T + 0.05)); g.stroke();
    g.fillStyle = "#f4f4ee"; g.fillRect(M.X(-0.09), M.Y(T * 0.52), M.X(0.05) - M.X(-0.09), M.Y(T * 0.36) - M.Y(T * 0.52)); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(M.X(-0.09), M.Y(T * 0.52), M.X(0.05) - M.X(-0.09), M.Y(T * 0.36) - M.Y(T * 0.52));
    g.fillStyle = id.color ?? "#2f5fa8"; g.fillRect(M.X(-0.09), M.Y(T * 0.52), M.X(0.05) - M.X(-0.09), 7);
  }
  const nk = acc("necklace");
  if (nk) { g.strokeStyle = nk.color ?? "#d8b04a"; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(-0.3), M.Y(T + 0.01)); g.quadraticCurveTo(M.X(0), M.Y(T * 0.78), M.X(0.3), M.Y(T + 0.01)); g.stroke(); button(g, M.X(0), M.Y(T * 0.82), 5, nk.color ?? "#d8b04a"); }
  // 5 dirt / soot
  if (R.grime > 0) grime(g, rnd, R.grime, 0, TW, 0, TH);
};

/** outerwear layer (coats, jackets, vests, aprons). Long coats continue on the coat-skirt mesh (paintCoatSkirt). */
const paintOuter = (g: G, R: Resolved, M: Cyl, T: number, C: { top: string; outer: string; bottom: string; skin: string }, hemY: number) => {
  const o = R.outer!, oc = C.outer, long = R.outerLen !== "hip", hem = long ? -0.5 : -0.03, trim = o.trim;
  const btn = o.buttons ?? shade(oc, 0.3);
  if (o.type === "apron") {
    g.fillStyle = oc; g.beginPath(); g.moveTo(M.X(-0.42), M.Y(T * 0.74)); g.lineTo(M.X(0.42), M.Y(T * 0.74)); g.lineTo(M.X(0.5), M.Y(0.1)); g.lineTo(M.X(0.95), M.Y(0.08));
    g.lineTo(M.X(0.95), M.Y(-0.5)); g.lineTo(M.X(-0.95), M.Y(-0.5)); g.lineTo(M.X(-0.95), M.Y(0.08)); g.lineTo(M.X(-0.5), M.Y(0.1)); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    g.strokeStyle = trim ?? shade(oc, 0.15); g.lineWidth = 6;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(M.X(s * 0.4), M.Y(T * 0.74)); g.lineTo(M.X(s * 0.3), M.Y(T + 0.1)); g.stroke(); g.beginPath(); g.moveTo(M.X(s * 0.95), M.Y(0.09)); g.lineTo(M.X(s * 1.7), M.Y(0.09)); g.stroke(); }
    g.beginPath(); rectA(g, M, -0.3, 0.3, T * 0.3, T * 0.5); g.fillStyle = shade(oc, 0.06); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    folds(g, M, -0.1, T * 0.6, [-0.5, -0.15, 0.25, 0.6], "rgba(60,60,90,0.12)");
    return;
  }
  if (R.outerOpen) {
    // open front: outer panels on both sides of a gap, the top shows in the middle
    const gap = o.type === "vest" || o.type === "hivis" ? 0.3 : 0.24;
    for (const s of [-1, 1]) {
      g.fillStyle = oc; g.beginPath(); rectA(g, M, s > 0 ? gap : -Math.PI - 0.1, s > 0 ? Math.PI + 0.1 : -gap, hem, T + 0.12); g.fill();
      g.strokeStyle = INK; g.lineWidth = 3.5; g.beginPath(); g.moveTo(M.X(s * gap), M.Y(T + 0.12)); g.lineTo(M.X(s * gap), M.Y(hem)); g.stroke();
    }
    if (o.type === "vest" || o.type === "hivis") {                  // armholes: show the top round the shoulders
      for (const s of [-1, 1]) { g.fillStyle = C.top; g.beginPath(); g.ellipse(M.X(s * Math.PI / 2), M.Y(T + 0.02), M.X(0.5) - M.X(0), M.Y(T * 0.78) - M.Y(T), 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); }
    }
    if (o.type === "hivis") {
      const band = trim ?? "#dfe3e6";
      for (const y of [T * 0.28, T * 0.52]) for (const s of [-1, 1]) { g.fillStyle = band; g.beginPath(); rectA(g, M, s > 0 ? gap + 0.02 : -Math.PI, s > 0 ? Math.PI : -gap - 0.02, y, y + 0.035); g.fill(); g.strokeStyle = shade(band, 0.35); g.lineWidth = 2; g.stroke(); }
    }
    if (o.type === "cardigan") { ribs(g, M, Math.max(hem, hemY - 0.02), Math.max(hem, hemY - 0.02) + 0.04, oc); for (let i = 0; i < 5; i++) button(g, M.X(gap + 0.04), M.Y(T * 0.8 - i * T * 0.16), 5, btn); }
    if (o.type === "vest") { for (const s of [-1, 1]) { g.beginPath(); rectA(g, M, s > 0 ? 0.42 : -0.86, s > 0 ? 0.86 : -0.42, 0.04, 0.2); g.fillStyle = shade(oc, 0.08); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); } }
    if (o.type === "labcoat" || o.type === "blazer" || o.type === "gown") {
      lapels(g, M, T, 0.62, gap + 0.02, oc);
      pocket(g, M, T, 1, oc, { a0: 0.45, a1: 0.8, pens: o.pens });
    }
    if (!long) hline(g, M, hem, 3);
    folds(g, M, Math.max(hem, -0.1), T * 0.5, [-0.7, -0.45, 0.45, 0.7], "rgba(70,80,120,0.10)");
    return;
  }
  // closed front
  g.fillStyle = oc; g.fillRect(0, 0, TW, M.Y(hem));
  if (!long) hline(g, M, hem, 3);
  switch (o.type) {
    case "labcoat": case "blazer": {
      const half = 0.36, depth = 0.5;
      // the V shows the top garment (shirt + tie, tee, sweater) and its collar
      const yv = neckV(g, M, T, depth, half, C.top, ["shirt", "workshirt", "polo", "blouse"].includes(R.top.type) ? C.top : undefined, R.top.tie);
      lapels(g, M, T, depth, half, oc);
      g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(0.02), M.Y(yv)); g.lineTo(M.X(0.02), M.Y(hem)); g.stroke();
      for (let i = 0; i < 3; i++) button(g, M.X(-0.07), M.Y(yv - 0.06 - i * 0.11), 6, o.buttons ?? (o.type === "labcoat" ? shade(oc, 0.12) : shade(oc, 0.3)));
      pocket(g, M, T, 1, oc, { a0: 0.42, a1: 0.78, pens: o.pens ?? (o.type === "labcoat" ? undefined : []) });
      if (o.type === "blazer") { g.fillStyle = trim ?? "#e8e6dc"; g.beginPath(); g.moveTo(M.X(0.5), M.Y(T * 0.7)); g.lineTo(M.X(0.6), M.Y(T * 0.75)); g.lineTo(M.X(0.7), M.Y(T * 0.7)); g.fill(); }
      folds(g, M, T * 0.05, T * 0.45, [-0.5, -0.25, 0.3, 0.55], "rgba(70,80,120,0.10)");
      break;
    }
    case "jacket": {
      const t = trim ?? shade(oc, 0.18);
      ribs(g, M, hem, hem + 0.04, t);
      g.strokeStyle = "#2f2a22"; g.lineWidth = 6; g.beginPath(); g.moveTo(M.X(0), M.Y(T)); g.lineTo(M.X(0), M.Y(hem + 0.04)); g.stroke();
      for (const s of [-1, 1]) { g.strokeStyle = INK; g.lineWidth = 3.5; g.beginPath(); g.moveTo(M.X(s * 0.55), M.Y(0.06)); g.lineTo(M.X(s * 0.75), M.Y(0.22)); g.stroke(); }
      folds(g, M, 0.04, T * 0.8, [-0.6, -0.2, 0.25, 0.6], "rgba(20,20,30,0.12)");
      break;
    }
    case "parka": {
      const fur = trim ?? "#d9c49a";
      for (let i = 0; i <= 12; i++) {                                // quilt seams
        const y = hem + 0.04 + (T - 0.1 - hem) * (i / 12);
        g.strokeStyle = i % 2 ? "rgba(20,26,18,0.16)" : "rgba(255,255,235,0.10)"; g.lineWidth = 5;
        g.beginPath(); for (let x = 0; x <= TW; x += 32) g.lineTo(x, M.Y(y) + Math.sin(x * 0.02 + i) * 3); g.stroke();
      }
      folds(g, M, 0.0, T * 0.95, [-0.62, -0.2, 0.24, 0.66], "rgba(10,16,10,0.14)");
      g.strokeStyle = "#2f2a22"; g.lineWidth = 7; g.beginPath(); g.moveTo(M.X(0.0), M.Y(T - 0.02)); g.lineTo(M.X(0.0), M.Y(hem + 0.02)); g.stroke();
      button(g, M.X(0.06), M.Y(T - 0.05), 7, fur);
      for (const [a0, a1] of [[0.45, 1.0], [-1.0, -0.45]]) {
        g.beginPath(); rectA(g, M, a0, a1, 0.04, 0.24); g.fillStyle = shade(oc, 0.14); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
        g.beginPath(); rectA(g, M, a0 - 0.04, a1 + 0.04, 0.2, 0.28); g.fillStyle = shade(oc, 0.06); g.fill(); g.stroke();
        button(g, M.X((a0 + a1) / 2), M.Y(0.22), 5, fur);
      }
      break;
    }
    case "chef": {                                                   // double-breasted white jacket, knotted buttons, mandarin collar
      const b = o.buttons ?? "#ece8de";
      g.strokeStyle = shade(oc, 0.2); g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(-0.32), M.Y(T)); g.quadraticCurveTo(M.X(0.1), M.Y(T * 0.7), M.X(0.32), M.Y(hem)); g.stroke();
      for (let i = 0; i < 4; i++) for (const a of [-0.2, 0.2]) button(g, M.X(a), M.Y(T * 0.82 - i * T * 0.2), 6.5, b);
      if (trim) { fillA(g, M, -Math.PI, Math.PI, T + 0.0, T + 0.12, trim); }
      folds(g, M, hem + 0.02, T * 0.5, [-0.5, 0.5], "rgba(70,80,120,0.10)");
      break;
    }
    case "police": {                                                 // uniform shirt-jacket: placket, flap pockets, badge, epaulettes
      neckV(g, M, T, 0.86, 0.14, R.top.tie ? C.top : C.skin, oc, R.top.tie);
      g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(M.X(0), M.Y(T * 0.86)); g.lineTo(M.X(0), M.Y(hem)); g.stroke();
      for (let i = 0; i < 4; i++) button(g, M.X(-0.04), M.Y(T * 0.75 - i * T * 0.18), 5, o.buttons ?? "#c9ccd0");
      pocket(g, M, T, 1, oc, { flap: true, snap: o.buttons ?? "#c9ccd0" }); pocket(g, M, T, -1, oc, { flap: true, snap: o.buttons ?? "#c9ccd0" });
      for (const s of [-1, 1]) { g.fillStyle = shade(oc, 0.2); g.beginPath(); rectA(g, M, s > 0 ? 1.2 : -1.95, s > 0 ? 1.95 : -1.2, T - 0.03, T + 0.12); g.fill(); }
      if (trim) for (const s of [-1, 1]) { g.fillStyle = trim; g.beginPath(); rectA(g, M, s > 0 ? 1.3 : -1.85, s > 0 ? 1.85 : -1.3, T - 0.005, T + 0.01); g.fill(); }
      g.fillStyle = "#e8e6dc"; g.fillRect(M.X(-0.56), M.Y(T * 0.77), M.X(-0.3) - M.X(-0.56), 10);                                // name tag
      folds(g, M, hem + 0.02, T * 0.5, [-0.4, 0.35], "rgba(30,40,70,0.12)");
      break;
    }
    case "vest": case "hivis": case "cardigan": {
      g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(0), M.Y(T * 0.7)); g.lineTo(M.X(0), M.Y(hem)); g.stroke();
      neckV(g, M, T, 0.7, 0.24, C.top);
      for (let i = 0; i < 4; i++) button(g, M.X(-0.04), M.Y(T * 0.62 - i * T * 0.14), 5, btn);
      if (o.type === "hivis") for (const y of [T * 0.28, T * 0.52]) fillA(g, M, -Math.PI, Math.PI, y, y + 0.035, trim ?? "#dfe3e6");
      break;
    }
    case "gown": {
      g.fillStyle = shade(C.top, 0.06); g.beginPath(); g.moveTo(M.X(-0.34), M.Y(T + 0.1)); g.lineTo(M.X(0.34), M.Y(T + 0.1)); g.lineTo(M.X(0.02), M.Y(T * 0.72)); g.closePath(); g.fill();
      g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3.5; g.beginPath(); g.moveTo(M.X(-0.36), M.Y(T + 0.08)); g.lineTo(M.X(0.03), M.Y(T * 0.7)); g.lineTo(M.X(0.85), M.Y(0.18)); g.stroke();
      folds(g, M, 0.2, T * 0.9, [-0.9, -0.4, 0.3, 0.9, 1.6], "rgba(60,80,100,0.09)");
      break;
    }
  }
};

/** knee / thigh coat skirt (labcoat, gown, long parka): placket line + two pockets + soft folds; open coats show a gap */
export const paintCoatSkirt = (g: G, col: string, M: Cyl, yHem: number, yTop: number, grimeK = 0, seed = 1) => {
  g.fillStyle = col; g.fillRect(0, 0, TW, TH);
  folds(g, M, yHem, yTop, [-1.0, -0.62, -0.3, 0.3, 0.64, 1.0, 2.2, -2.2], "rgba(70,80,120,0.12)");
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(M.X(0.02), M.Y(yTop)); g.lineTo(M.X(0.02), M.Y(yHem - 0.1)); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); rectA(g, M, s > 0 ? 0.42 : -0.9, s > 0 ? 0.9 : -0.42, yHem + (yTop - yHem) * 0.38, yHem + (yTop - yHem) * 0.72); g.fillStyle = shade(col, 0.04); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); }
  if (grimeK > 0) grime(g, rng(seed + 3), grimeK, 0, TW, 0, TH);
};
/** plain skirt (bottom.type "skirt"): soft pleats, waistband */
export const paintSkirt = (g: G, col: string, M: Cyl, yHem: number, yTop: number) => {
  g.fillStyle = col; g.fillRect(0, 0, TW, TH);
  folds(g, M, yHem, yTop, [-2.6, -1.9, -1.2, -0.5, 0.2, 0.9, 1.6, 2.3, 3.0], "rgba(40,30,60,0.14)");
  g.fillStyle = shade(col, 0.1); g.fillRect(0, 0, TW, M.Y(yTop - 0.03)); hline(g, M, yTop - 0.03, 2.5);
};

const grime = (g: G, r: () => number, k: number, x0: number, x1: number, y0: number, y1: number) => {
  for (let i = 0; i < 26; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + (0.35 + 0.65 * r()) * (y1 - y0), rr = 18 + r() * 46;
    const gr = g.createRadialGradient(x, y, 2, x, y, rr); gr.addColorStop(0, `rgba(66,50,36,${0.4 * k})`); gr.addColorStop(1, "rgba(66,50,36,0)");
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
};
