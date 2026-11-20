// peg44 rig: builds one volumetric toy character from a CharacterSpec and poses it per frame (PegPose).
// Body parts are smooth ring meshes with a constant-width ink hull; arms / legs are tubes rebuilt every frame along a
// curve through a hidden elbow / knee (so they arc and step); legs use 2-bone IK to planted feet; 4-finger hands.
//   const vic = createCharacter(VIC); scene.add(vic.root);
//   every frame: vic.pose({ x, z, yaw, face: face("happy"), ... }); vic.light(camera, { rim: "#ffcc80", res: [w, h] });
import * as THREE from "three";
import { BodySpec, HAND, HandShape, PegPose, HandKind, FaceState } from "./kit";
import { makeLight, PegLight, toon, inkMat, ToonOpts } from "./mat";
import { blob, fillRings, ringGeo, rowAttr, uvFrom, lin, spow, sstep, Tube, P3 } from "./geo";
import { drawFace, faceKey, FW, FH, FS, EYE, NOSE_V, paintTorso, paintCoatSkirt, paintSkirt, cylMap, TW, TH, shade, lighten, FaceCols, INK } from "./face";
import { CharacterSpec, Resolved, resolveSpec } from "./spec";

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** hairline / rim polar angle by azimuth: front f, side s, back b (rad from the crown) */
const hline = (f: number, s: number, b: number) => (p: number) => { const a = Math.abs(p); return a < Math.PI / 2 ? lerp(f, s, Math.pow(a / (Math.PI / 2), 1.3)) : lerp(s, b, (a - Math.PI / 2) / (Math.PI / 2)); };
const wrapA = (p: number) => (p > Math.PI ? p - Math.PI * 2 : p);
const HAT_COL: Record<string, string> = { helmet: "#5d6340", hardhat: "#e8b330", climbing: "#d8503c", cap: "#3d4f6e", fedora: "#5a4a3c", ushanka: "#6a4a32", beanie: "#a8442a", chef: "#f4f2ec", police: "#22314f" };
let BLOB_TEX: THREE.Texture | null = null;
const blobTex = () => {
  if (BLOB_TEX) return BLOB_TEX;
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.45, "rgba(0,0,0,0.75)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); BLOB_TEX = new THREE.CanvasTexture(c); return BLOB_TEX;
};

type Finger = { a: THREE.Group; b: THREE.Group };
type Hand = { g: THREE.Group; f: Finger[]; tb: THREE.Group; t1: THREE.Group; t2: THREE.Group; hs: number; cup: THREE.Group };
type Arm = { sh: THREE.Group; el: THREE.Group; wr: THREE.Group; hand: Hand; tube: Tube; side: number };
type Cols = { top: string; outer: string; bottom: string; shoes: string; sole: string; skin: string; sleeve: string; hair: string };

/** the one entry point: build a character from a spec */
export const createCharacter = (spec: CharacterSpec) => new PegChar(spec);

export class PegChar {
  root = new THREE.Group(); hips = new THREE.Group(); headG = new THREE.Group();
  L: PegLight = makeLight(); B: BodySpec; R: Resolved; C: Cols; skin: string;
  H: number; W: number; D: number; yc: number; zc = 0.03; ankleH: number; hipY: number; T: number;
  /** total standing height (m), measured at build time */
  height = 0;
  arms: Arm[] = []; legs: { tube: Tube; hip: THREE.Object3D; shoe: THREE.Group; side: number; blob: THREE.Mesh }[] = [];
  faceCanvas = document.createElement("canvas"); faceG: CanvasRenderingContext2D; faceTex: THREE.CanvasTexture; faceK = ""; faceCols: FaceCols;
  bodyBlob: THREE.Mesh; meshes: THREE.Mesh[] = [];
  private v = new THREE.Vector3();

  constructor(public spec: CharacterSpec) {
    const R = (this.R = resolveSpec(spec));
    const B0 = R.B0, sc = R.scale, gi = R.girth * sc;
    this.B = { ...B0, head: B0.head * R.headK * Math.pow(sc, 0.35), neck: B0.neck * sc, torso: B0.torso * sc, leg: B0.leg * sc, arm: B0.arm * sc,
      shW: B0.shW * gi, waistW: B0.waistW * gi, hipW: B0.hipW * gi, depth: B0.depth * gi, belly: B0.belly * gi, armR: B0.armR * gi, legR: B0.legR * gi,
      hand: B0.hand * Math.pow(sc, 0.5), shoe: B0.shoe.map((v) => v * Math.pow(sc, 0.5)) as [number, number, number], stride: B0.stride * sc };
    const B = this.B;
    const wet = (c: string) => (R.wet ? shade(c, 0.14) : c);
    this.skin = R.skin;
    this.C = { top: wet(R.top.color), outer: wet(R.outer?.color ?? R.top.color), bottom: wet(R.bottom.color), shoes: R.shoes.color,
      sole: R.shoes.sole ?? (R.shoes.type === "sneakers" ? "#f2f0ea" : "#2a2224"), skin: R.skin, sleeve: wet(R.sleeveCol), hair: wet(R.hairCol) };
    this.H = B.head; this.W = this.H * 0.9; this.D = this.W * 0.93; this.yc = this.H * 0.44;
    this.ankleH = B.shoe[2] * 0.55; this.hipY = this.ankleH + B.leg * 0.985; this.T = B.torso;
    this.root.add(this.hips); this.hips.position.y = this.hipY;
    this.faceCols = { skin: this.skin, eye: R.eyeCol, brow: R.browCol, ink: INK, hair: this.C.hair, browW: R.browW, lashes: R.lashes, blush: R.blush,
      freckles: R.freckles, stubble: R.stubble, wrinkles: R.wrinkles, scar: R.scar, mole: R.mole, lips: R.lips, moustache: R.moustache, goatee: R.goatee, grime: R.grime, seed: R.seed };
    this.faceCanvas.width = FW * FS; this.faceCanvas.height = FH * FS; this.faceG = this.faceCanvas.getContext("2d")!;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas); this.faceTex.colorSpace = THREE.SRGBColorSpace; this.faceTex.anisotropy = 8;
    this.buildTorso(); this.buildHead(); this.buildArms(); this.buildLegs(); this.buildAccessories();
    this.bodyBlob = this.blobMesh(B.hipW * 4.2, B.depth * 4.6, 0.5); this.root.add(this.bodyBlob);
    this.root.traverse((m) => { if ((m as THREE.Mesh).isMesh && !(m.userData.ink || m.userData.noShadow)) m.castShadow = true; });
    this.height = this.hipY + this.T + B.neck + this.yc + this.H / 2;
    this.pose({ x: 0, z: 0, yaw: 0, face: { eyes: "open", mouth: "neutral", browL: { up: 0, tilt: 0 }, browR: { up: 0, tilt: 0 } } });
  }

  // ---------------- build helpers ----------------
  private add(parent: THREE.Object3D, geo: THREE.BufferGeometry, o: ToonOpts, ink = 1) {
    const m = new THREE.Mesh(geo, toon(this.L, o)); parent.add(m); this.meshes.push(m);
    if (ink > 0) { const h = new THREE.Mesh(geo, inkMat(this.L, ink)); h.userData.ink = true; m.add(h); }
    return m;
  }
  private blobMesh(w: number, d: number, op: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex(), color: "#1c1526", transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.scale.set(w, 1, d); m.position.y = 0.003; m.renderOrder = 1; m.userData.noShadow = true; m.userData.baseOp = op; return m;
  }
  /** head surface point: theta from the crown, phi round (0 = front, + = character's left), k = radial inflation */
  headPt(th: number, ph: number, k = 0): P3 {
    const c = Math.cos(th), s = Math.sin(th), e = c > 0 ? 2 / 2.6 : 2 / 2.4;
    const y = spow(c, e), r = Math.pow(Math.max(0, s), e), eh = 2 / 2.25;
    let x = r * spow(Math.sin(ph), eh), z = r * spow(Math.cos(ph), eh);
    const jaw = sstep(0.1, -0.95, y);
    x *= (1 - 0.17 * jaw) * (1 + 0.03 * sstep(-0.3, 0.5, y)); z *= 1 - 0.08 * jaw;
    z += 0.04 * jaw * Math.max(0, Math.cos(ph)) * r;
    const K = 1 + k;
    return [x * this.W / 2 * K, this.yc + y * this.H / 2 * K, this.zc + z * this.D / 2 * K];
  }
  /** front surface z at head-local (x, y) */
  frontZ(x: number, y: number) {
    let best = 1e9, bz = 0;
    for (let i = 0; i <= 80; i++) for (let j = 0; j <= 60; j++) {
      const p = this.headPt(0.4 + (i / 80) * 2.4, -1.3 + (j / 60) * 2.6), d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
      if (d < best) { best = d; bz = p[2]; }
    }
    return bz;
  }
  /** a cap-like shell over the skull: hl(p) = rim polar angle per azimuth, th(s, p) = thickness (s 0 crown .. 1 rim) */
  private shell(hl: (p: number) => number, th: (s: number, p: number) => number, o: { Ni?: number; No?: number; J?: number; inner?: number; lip?: number; flare?: (s: number) => number; ink?: boolean; tint?: (row: "in" | "lip" | "out", s: number) => string }) {
    const Ni = o.Ni ?? 8, No = o.No ?? 26, J = o.J ?? 56, inner = o.inner ?? -0.03, lip = o.lip ?? 0.04;
    const g = ringGeo(Ni + No, J, true, true);
    const rowS = (i: number) => (i < Ni ? (i + 1) / Ni : 1 - Math.pow((i - Ni) / No, 1.35));
    fillRings(g, (i, j) => {
      const p = wrapA((j / J) * Math.PI * 2), s = rowS(i), fl = o.flare ? o.flare(s) : 0;
      if (i < Ni) return this.headPt(s * hl(p) * (1 + fl), p, inner);
      const k = i === Ni ? lip : th(s, p);
      return this.headPt(s * hl(p) * (1 + fl), p, k);
    }, this.headPt(0, 0, inner), this.headPt(0, 0, th(0, 0)));
    if (o.ink) rowAttr(g, "aInk", 1, (i) => [i === Ni - 1 || i === Ni ? 1 : 0]);
    if (o.tint) rowAttr(g, "aTint", 3, (i) => lin(o.tint!(i < Ni - 1 ? "in" : i <= Ni ? "lip" : "out", rowS(i))));
    return g;
  }

  // ---------------- torso / outfit ----------------
  private buildTorso() {
    const B = this.B, T = this.T, y0 = -B.hipW * 0.62, y1 = T + 0.015, R = 36, J = 40, n = 2 / 2.7, S = this.R, o = S.outer;
    const key = (ks: [number, number][], t: number) => { for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const [a, va] = ks[i - 1], [b, vb] = ks[i]; return lerp(va, vb, sstep(a, b, t)); } return ks[ks.length - 1][1]; };
    const longCoat = !!o && S.outerLen !== "hip" && o.type !== "apron";
    const puffy = o?.type === "parka" ? 1.14 : o && o.type !== "apron" && o.type !== "vest" && o.type !== "hivis" ? 1.03 : S.top.type === "hoodie" || S.top.type === "sweater" ? 1.02 : 1;
    const Wk: [number, number][] = [[0, B.hipW * 0.92], [0.18, B.hipW], [0.45, B.waistW], [0.74, B.shW * 0.94], [0.9, B.shW]];
    const Dk: [number, number][] = [[0, B.depth * 0.95], [0.4, B.depth], [0.75, B.depth * 1.03], [1, B.depth * 0.92]];
    const prof = (t: number) => {
      const kb = t < 0.16 ? Math.sqrt(1 - ((0.16 - t) / 0.16) ** 2) : 1, kt = t > 0.84 ? Math.sqrt(Math.max(0, 1 - ((t - 0.84) / 0.16) ** 2)) : 1;
      return { y: y0 + t * (y1 - y0), w: key(Wk, t) * kb * kt * (longCoat ? 1.03 : 1) * puffy, d: key(Dk, t) * kb * kt * (longCoat ? 1.04 : 1) * puffy };
    };
    this.torsoProf = prof; this.torsoY = [y0, y1];
    const g = ringGeo(R, J, true, true);
    fillRings(g, (i, j) => {
      const t = (i + 1) / (R + 1), a = (j / J) * Math.PI * 2, P = prof(t), ca = Math.cos(a);
      const belly = B.belly * Math.exp(-(((t - 0.36) / 0.2) ** 2)) * Math.max(0, ca) ** 2;
      return [P.w * spow(Math.sin(a), n), P.y, P.d * spow(ca, n) + belly];
    }, [0, y0, 0], [0, y1, 0]);
    uvFrom(g, (x, y, z) => [0.5 + Math.atan2(x, z) / (Math.PI * 2), (y - y0) / (y1 - y0)]);
    const c = document.createElement("canvas"); c.width = TW; c.height = TH;
    paintTorso(c.getContext("2d")!, S, cylMap(y0, y1), T, this.C);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    this.add(this.hips, g, { map: tex, spec: S.wet ? 0.12 : 0.03, gloss: 12 });
    if (S.bottom.type === "skirt") this.buildSkirt(prof, "skirt");
    if (longCoat) this.buildSkirt(prof, "coat");
    // neck + collar
    const rn = this.W * 0.2;
    const neck = this.add(this.hips, blob(rn, (B.neck + 0.1) / 2, rn * 0.95, { R: 10, J: 20 }), { col: shade(this.skin, 0.12), spec: 0.05 });
    neck.position.set(0, T + B.neck / 2 - 0.005, -0.005);
    const top = S.top, closedOuter = o && !S.outerOpen && o.type !== "apron";
    let colCol = this.C.top, colH = 0.022, colR = 1.3;
    if (closedOuter) colCol = o!.type === "parka" ? o!.trim ?? "#d9c49a" : o!.type === "labcoat" || o!.type === "gown" ? shade(this.C.outer, 0.04) : o!.type === "blazer" ? this.C.top : this.C.outer;
    else if (S.topCollar === "crew") colCol = top.trim ?? shade(this.C.top, top.type === "sweater" ? 0.14 : 0.06);
    if (S.topCollar === "turtle" && !closedOuter) { colH = 0.075; colR = 1.18; colCol = shade(this.C.top, 0.04); }
    if (o?.type === "chef") { colH = 0.05; colR = 1.2; colCol = o.trim ?? shade(this.C.outer, 0.05); }
    const collar = this.add(this.hips, blob(rn * colR, colH, rn * (colR - 0.04), { R: 8, J: 28, nv: 3 }), { col: colCol, spec: 0.05 }, 0.8);
    collar.position.set(0, T + colH * 0.6 - 0.013, -0.004);
    if (top.type === "sweater" && !closedOuter) { const tee = this.add(this.hips, blob(rn * 1.22, 0.02, rn * 1.18, { R: 8, J: 28, nv: 3 }), { col: "#f1ede4" }, 0.7); tee.position.set(0, T + 0.03, -0.004); }
    if (S.topCollar === "hood" && !closedOuter) {                  // hoodie hood lying on the upper back
      const hood = this.add(this.hips, blob(rn * 1.75, rn * 0.75, rn * 1.0, { R: 10, J: 24 }), { col: shade(this.C.top, 0.06), spec: 0.04 }, 0.8);
      hood.position.set(0, T + 0.0, -B.depth * 0.75); hood.rotation.x = -0.35;
    }
  }
  torsoProf: (t: number) => { y: number; w: number; d: number } = () => ({ y: 0, w: 0, d: 0 }); torsoY: [number, number] = [0, 0];

  /** coat skirt (long outerwear, front slit) or plain skirt (bottom.type "skirt") */
  private buildSkirt(prof: (t: number) => { y: number; w: number; d: number }, kind: "coat" | "skirt") {
    const B = this.B, S = this.R, M = 26, J = 48, n = 2 / 2.5, [y0, y1] = this.torsoY;
    const coat = kind === "coat";
    const yTop = coat ? 0.16 : 0.1;
    const yHem = coat ? -B.leg * (S.outerLen === "knee" ? (S.outer!.type === "gown" ? 0.52 : 0.46) : 0.28) : -B.leg * (S.bottom.length === "knee" ? 0.46 : 0.24);
    const flareK = coat ? 0.42 : 0.3, notchK = coat ? 0.075 : 0;
    const tAt = (y: number) => Math.min(0.97, Math.max(0.17, (y - y0) / (y1 - y0)));
    const ring = (s: number, a: number, inner: boolean): P3 => {
      const y = lerp(yHem, yTop, s), P = prof(tAt(Math.max(y, y0 + 0.17 * (y1 - y0))));
      const flare = 1 + flareK * Math.pow(1 - s, 1.6), fold = 1 + 0.035 * Math.pow(1 - s, 1.5) * (0.5 + 0.5 * Math.cos(a * (coat ? 7 : 9) + 0.5));
      const k = (inner ? 0.955 : 1) * flare * fold * (s > 0.75 ? lerp(1.04, coat ? 0.93 : 1.0, (s - 0.75) / 0.25) : 1.04) * (coat ? 1 : 1.03);
      const notch = notchK * Math.pow(1 - s, 2) * Math.exp(-((wrapA(a) / 0.2) ** 2));
      return [P.w * k * spow(Math.sin(a), n), y + notch, P.d * k * 1.05 * spow(Math.cos(a), n)];
    };
    const sAt = (m: number) => Math.pow(m / (M - 1), 1.5);
    const g = ringGeo(2 * M, J, false, false);
    fillRings(g, (i, j) => { const a = (j / J) * Math.PI * 2; return i < M ? ring(sAt(M - 1 - i), a, true) : ring(sAt(i - M), a, false); });
    rowAttr(g, "aInk", 1, (i) => [i === M - 1 || i === M ? 1 : 0]);
    uvFrom(g, (x, y, z) => [0.5 + Math.atan2(x, z) / (Math.PI * 2), (y - yHem) / (yTop - yHem)]);
    const c = document.createElement("canvas"); c.width = TW; c.height = TH;
    if (coat) paintCoatSkirt(c.getContext("2d")!, this.C.outer, cylMap(yHem, yTop), yHem, yTop, S.grime, S.seed);
    else paintSkirt(c.getContext("2d")!, this.C.bottom, cylMap(yHem, yTop), yHem, yTop);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.add(this.hips, g, { map: tex, spec: 0.05, side: THREE.DoubleSide, backK: 0.62 });
  }

  // ---------------- head ----------------
  private buildHead() {
    const S = this.R, H = this.H, W = this.W, R = 40, J = 56, bot = this.yc - H / 2;
    this.headG.position.set(0, this.T + this.B.neck, 0.0); this.hips.add(this.headG);
    const g = ringGeo(R, J, true, true);
    fillRings(g, (i, j) => this.headPt(Math.PI - (Math.PI * (i + 1)) / (R + 1), (j / J) * Math.PI * 2), this.headPt(Math.PI, 0), this.headPt(0, 0));
    uvFrom(g, (x, y, z) => (z < this.zc - 0.01 ? [0.003, 0.003] : [x / W + 0.5, (y - bot) / H]));
    this.add(this.headG, g, { map: this.faceTex, spec: 0.1, gloss: 18 });
    const skinO = { col: this.skin, spec: 0.08, gloss: 16 };
    const style = S.hairStyle, earsHidden = style === "bob" || style === "long";
    // ears (+ earrings)
    for (const s of [-1, 1]) {
      const ey = bot + 0.47 * H; let th = Math.PI / 2;
      for (let k = 0; k < 40; k++) { const p = this.headPt(th, s * Math.PI / 2); th += (p[1] - ey) / H * 0.8; }
      const p = this.headPt(th, s * Math.PI / 2);
      if (!earsHidden) {
        const ear = this.add(this.headG, blob(H * 0.045, H * 0.12, H * 0.085, { R: 10, J: 18 }), skinO, 0.85);
        ear.position.set(p[0] + s * H * 0.012, ey, p[2] - H * 0.04); ear.rotation.set(0, s * 0.35, s * 0.12);
      }
      const er = S.has("earrings");
      if (er) { const e = this.add(this.headG, blob(H * 0.022, H * 0.022, H * 0.022, { R: 8, J: 10 }), { col: er.color ?? "#d8b04a", spec: 0.6, gloss: 40 }, 0.6); e.position.set(p[0] + s * H * (earsHidden ? 0.03 : 0.02), ey - H * 0.12, p[2] - H * 0.03); }
    }
    // nose
    const nk = S.nose, ny = bot + NOSE_V * H, nz = this.frontZ(0, ny);
    const [nx, nyy, nzz] = nk === "long" ? [0.052, 0.068, 0.068] : nk === "wide" ? [0.082, 0.05, 0.055] : nk === "small" ? [0.05, 0.042, 0.046] : [0.058, 0.05, 0.055];
    const nose = this.add(this.headG, blob(W * nx, H * nyy, W * nzz, { R: 10, J: 18 }), { ...skinO, col: shade(this.skin, 0.04, "#c04040") }, 0.75);
    nose.position.set(0, ny + (nk === "long" ? -H * 0.01 : 0), nz + W * nzz * 0.25); nose.rotation.x = nk === "long" ? 0.25 : 0;
    this.buildHair();
    this.buildHat();
    // glasses
    const GL = S.glasses;
    if (GL) {
      const gm = toon(this.L, { col: GL.color ?? "#2a211d", spec: 0.4, gloss: 30 }), ey = bot + (1 - EYE.y / FH) * H, ex = (EYE.x / FW) * W, rr = W * 0.112;
      const sun = GL.style === "sun";
      const lens = new THREE.MeshBasicMaterial({ color: sun ? "#1d2430" : "#dfefff", transparent: true, opacity: sun ? 0.86 : 0.16, depthWrite: false });
      let zf = 0;
      for (const s of [-1, 1]) {
        const z = this.frontZ(s * ex, ey) + 0.012; zf = Math.max(zf, z);
        const ring = GL.style !== "round" ? new THREE.Mesh(new THREE.TorusGeometry(rr, sun ? 0.0055 : 0.0045, 6, 4).rotateZ(Math.PI / 4).scale(1, sun ? 0.74 : 0.82, 1), gm) : new THREE.Mesh(new THREE.TorusGeometry(rr, 0.0048, 8, 36), gm);
        ring.position.set(s * ex, ey, z); this.headG.add(ring);
        const lg = GL.style === "round" ? new THREE.CircleGeometry(rr, 28) : new THREE.PlaneGeometry(rr * 1.4, rr * (sun ? 1.04 : 1.15));
        const ln = new THREE.Mesh(lg, lens); ln.position.set(s * ex, ey, z - 0.002); ln.userData.noShadow = true; ln.renderOrder = 3; this.headG.add(ln);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, this.D * 0.55, 6).rotateX(Math.PI / 2), gm);
        arm.position.set(s * (ex + rr * 0.98), ey + 0.004, z - this.D * 0.27); arm.rotation.y = s * 0.06; this.headG.add(arm);
      }
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(ex - rr, 0.0035, 6, 12, Math.PI), gm); bridge.position.set(0, ey + 0.004, zf + 0.004); this.headG.add(bridge);
    }
  }

  private buildHair() {
    const S = this.R, H = this.H, W = this.W, D = this.D, bot = this.yc - H / 2, style = S.hairStyle, hc = this.C.hair;
    const hairO = { col: hc, spec: style === "slick" || S.wet ? 0.4 : 0.14, gloss: style === "slick" || S.wet ? 40 : 30 };
    const burn = S.sideburns ? 0.42 : 0.22;
    // hairline with temples, sideburns in front of the ears and a lift round the ears; thickness tapers into a thin inked lip
    const hl2 = (f: number, sd: number, b: number, temple: number, bn: number) => (p: number) => { const a = Math.abs(p);
      return hline(f, sd, b)(p) - temple * Math.exp(-(((a - 0.85) / 0.22) ** 2)) + bn * Math.exp(-(((a - 1.3) / 0.11) ** 2)) - 0.12 * Math.exp(-(((a - 1.62) / 0.16) ** 2)); };
    const taper = (lip: number, th: (s: number, p: number) => number) => (s: number, p: number) => lip + (th(s, p) - lip) * sstep(1.0, 0.8, s);
    const shell = (hl: (p: number) => number, th: (s: number, p: number) => number, o: Parameters<PegChar["shell"]>[2], mat = hairO) => this.add(this.headG, this.shell(hl, th, o), mat);
    if (style === "side") {
      const part = -0.62, base = hl2(0.98, 1.4, 2.0, 0.1, burn + 0.02);
      shell((p) => base(p) + 0.13 * Math.exp(-(((p - 0.4) / 0.38) ** 2)) - 0.07 * Math.exp(-(((p - part) / 0.25) ** 2)),
        taper(0.02, (s, p) => 0.06 + 0.075 * Math.exp(-(((p - 0.15) / 0.75) ** 2)) * sstep(0.25, 0.7, s) - 0.045 * Math.exp(-(((p - part) / 0.06) ** 2)) * sstep(0.2, 0.5, s) * (Math.cos(p) > 0 ? 1 : 0)),
        { ink: true, lip: 0.02, J: 72 });
    } else if (style === "curly" || style === "afro") {
      const big = style === "afro" ? 1 : 0;
      shell(hl2(0.92 - 0.04 * big, 1.72 - 0.08 * big, 2.12, 0.0, 0.0), taper(0.04, (s, p) => {
        const th = s * 2; const c = Math.sin(p * 8 + th * 2.5) * Math.sin(th * 7.5 - 0.6) * 0.6 + Math.sin(p * 13 - th * 4) * Math.sin(th * 11) * 0.4;
        return 0.2 + 0.16 * big + 0.11 * Math.pow(Math.abs(c), 0.7);
      }), { ink: true, lip: 0.04, No: 44, J: 104 }, { ...hairO, spec: 0.08 });
    } else if (style === "slick") {
      const base = hl2(0.96, 1.4, 1.95, 0.12, burn);
      shell((p) => base(p) + 0.1 * Math.exp(-((p / 0.14) ** 2)), taper(0.018, (s, p) => 0.05 + 0.012 * Math.cos(p)), { ink: true, lip: 0.018, J: 72 });
    } else if (style === "crew" || style === "buzz") {
      const t = style === "buzz" ? 0.024 : 0.045;
      shell(hl2(1.0, 1.45, 1.9, 0.08, burn - 0.02), taper(0.014, () => t), { ink: true, lip: 0.014, J: 72 });
    } else if (style === "quiff") {                                   // short, standing up at the front in soft spikes
      shell(hl2(0.98, 1.44, 1.92, 0.1, burn), taper(0.02, (s, p) => 0.05 + 0.16 * Math.exp(-((p / 0.62) ** 2)) * sstep(0.3, 0.82, s) * (1 + 0.22 * Math.sin(p * 15 + 1))),
        { ink: true, lip: 0.02, J: 96, No: 30 });
    } else if (style === "ponytail" || style === "bun") {              // pulled back + a high ponytail / a bun
      shell(hl2(0.95, 1.45, 2.0, 0.08, 0.2), taper(0.02, (s, p) => 0.045 + 0.02 * Math.cos(p) * sstep(0.2, 0.7, s)), { ink: true, lip: 0.02, J: 72 });
      const tie = S.hairTie;
      if (style === "ponytail") {
        const a = this.headPt(0.62, Math.PI, 0.03), Sv = new THREE.Vector3(...a);
        const E = Sv.clone().add(new THREE.Vector3(0, 0.03, -0.11)), Wv = Sv.clone().add(new THREE.Vector3(0, -0.27, -0.16));
        const tube = new Tube(18, 16);
        tube.update(Sv, E, Wv, (t) => H * (0.05 + 0.08 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.1))) * (t > 0.8 ? 1 - ((t - 0.8) / 0.2) * 0.75 : 1), new THREE.Vector3(0, 1, 0));
        this.add(this.headG, tube.geo, hairO);
        const band = this.add(this.headG, new THREE.TorusGeometry(H * 0.075, H * 0.026, 8, 20), { col: tie, spec: 0.2 }, 0.6);
        band.position.copy(Sv.clone().lerp(E, 0.12));
        band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), E.clone().sub(Sv).normalize());
      } else {
        const a = this.headPt(0.5, Math.PI, 0.1);
        const bun = this.add(this.headG, blob(H * 0.17, H * 0.15, H * 0.16, { R: 12, J: 20 }), hairO);
        bun.position.set(a[0], a[1] + H * 0.04, a[2] - H * 0.06);
      }
    } else if (style === "bob" || style === "long") {                 // fringe + hair covering the ears (long: down the back)
      const lng = style === "long";
      shell(hl2(0.86, lng ? 2.15 : 2.02, lng ? 2.45 : 2.2, 0.0, 0.0), taper(0.04, (s, p) => 0.09 + 0.05 * sstep(0.55, 0.95, s) + 0.015 * Math.cos(p)),
        { ink: true, lip: 0.04, J: 80, No: 32 });
      if (lng) { const cur = this.add(this.headG, blob(W * 0.44, H * 0.36, D * 0.15, { R: 12, J: 20, n: 2.4 }), hairO, 0.9); cur.position.set(0, bot - H * 0.1, this.zc - D * 0.36); cur.rotation.x = 0.12; }
    } else if (style === "balding") {                                 // horseshoe: bald crown, hair round the sides and back
      shell(hl2(1.0, 1.5, 1.95, 0.0, burn), (s, p) => lerp(-0.07, 0.05, sstep(0.55, 0.78, s) * sstep(0.75, 1.45, Math.abs(p))) * (s > 0.97 ? 0.6 : 1),
        { ink: true, lip: 0.02, J: 72 });
    }
  }

  private buildHat() {
    const S = this.R, hat = S.hat; if (!hat) return;
    const H = this.H, W = this.W, D = this.D, hc = hat.color ?? HAT_COL[hat.type], band = hat.band;
    const sh = (hl: (p: number) => number, th: (s: number, p: number) => number, o: Parameters<PegChar["shell"]>[2], m: ToonOpts) => this.add(this.headG, this.shell(hl, th, o), m);
    const visor = (col: string, len = 0.2, wide = 0.38) => {
      const [, vy, vz] = this.headPt(1.0, 0, 0.1);
      const v = this.add(this.headG, blob(W * wide, 0.011, H * len, { R: 8, J: 24, n: 2.4 }), { col, spec: 0.15 });
      v.position.set(0, vy - 0.004, vz + H * len * 0.3); v.rotation.x = 0.18; return v;
    };
    switch (hat.type) {
      case "helmet":
        sh(hline(1.06, 1.5, 1.66), (s) => 0.2 + 0.08 * sstep(0.84, 1, s), { inner: -0.02, lip: 0.29, flare: (s) => 0.07 * sstep(0.84, 1, s), No: 30,
          tint: (r) => (r === "in" ? shade(hc, 0.55) : r === "lip" ? shade(hc, 0.3) : hc) }, { tint: true, spec: 0.3, gloss: 14 }); break;
      case "hardhat":
        sh(hline(1.04, 1.42, 1.56), (s, p) => 0.19 + 0.07 * Math.exp(-((p / 0.16) ** 2)) * sstep(0.04, 0.8, s) * (1 - sstep(0.85, 1, s)), { inner: -0.02, lip: 0.3, flare: (s) => 0.09 * sstep(0.86, 1, s), No: 30,
          tint: (r) => (r === "in" ? shade(hc, 0.55) : r === "lip" ? shade(hc, 0.12) : hc) }, { tint: true, spec: 0.45, gloss: 26 });
        visor(hc, 0.16, 0.36).position.y += H * 0.02; break;
      case "climbing":
        sh(hline(1.05, 1.46, 1.6), (s) => 0.17 + 0.02 * Math.sin(s * 9), { inner: -0.02, lip: 0.2, No: 30,
          tint: (r, s) => (r === "in" ? "#2a2a2e" : r === "lip" || s > 0.86 ? band ?? "#2a2a2e" : hc) }, { tint: true, spec: 0.5, gloss: 30 }); break;
      case "cap":
        sh(hline(1.0, 1.28, 1.42), () => 0.1, { inner: -0.02, lip: 0.11, tint: (r) => (r === "out" ? hc : shade(hc, 0.4)) }, { tint: true, spec: 0.1 });
        visor(band ?? shade(hc, 0.1)); break;
      case "police": {
        sh(hline(1.0, 1.3, 1.42), () => 0.13, { inner: -0.02, lip: 0.13, tint: (r, s) => (r === "out" ? (s > 0.78 ? band ?? "#1a1d24" : hc) : shade(hc, 0.4)) }, { tint: true, spec: 0.12 });
        const topD = this.add(this.headG, blob(W * 0.6, H * 0.06, D * 0.64, { R: 8, J: 32, n: 2.2 }), { col: hc, spec: 0.12 });
        topD.position.set(0, this.yc + H * 0.5 + H * 0.07, this.zc - D * 0.02); topD.rotation.x = -0.12;
        visor("#16141a", 0.18, 0.36).material = toon(this.L, { col: "#16141a", spec: 0.6, gloss: 40 });
        const [, by, bz] = this.headPt(0.82, 0, 0.14);
        const badge = this.add(this.headG, blob(H * 0.05, H * 0.06, H * 0.015, { R: 8, J: 12 }), { col: "#d8b04a", spec: 0.6, gloss: 30 }, 0.6); badge.position.set(0, by + H * 0.03, bz);
        break;
      }
      case "ushanka": {
        const fur = band ?? "#e2d2b0";
        sh(hline(1.06, 1.42, 1.6), (s) => 0.16 + 0.12 * sstep(0.7, 1, s), { inner: -0.02, lip: 0.26, flare: (s) => 0.06 * sstep(0.8, 1, s), No: 30,
          tint: (r, s) => (r === "in" ? shade(fur, 0.3) : r === "lip" || s > 0.72 ? fur : hc) }, { tint: true, spec: 0.05, gloss: 8 });
        for (const sd of [-1, 1]) {
          const [fx, fy, fz] = this.headPt(1.5, sd * Math.PI * 0.5, 0.12);
          const flap = this.add(this.headG, blob(W * 0.13, H * 0.2, H * 0.17, { R: 8, J: 12 }), { col: fur, spec: 0.04 }, 0.6);
          flap.position.set(fx + sd * W * 0.05, fy - H * 0.12, fz);
        }
        break;
      }
      case "beanie":
        sh(hline(1.0, 1.36, 1.55), (s) => 0.08 + 0.05 * sstep(0.72, 0.8, s) + 0.07 * (1 - sstep(0, 0.3, s)), { inner: -0.02, lip: 0.13, No: 30,
          tint: (r, s) => (r === "in" ? shade(hc, 0.4) : r === "lip" || s > 0.76 ? band ?? shade(hc, 0.12) : hc) }, { tint: true, spec: 0.04, gloss: 8 }); break;
      case "chef": {
        sh(hline(1.0, 1.3, 1.42), () => 0.08, { inner: -0.02, lip: 0.08, tint: (r) => (r === "out" ? band ?? hc : shade(hc, 0.2)) }, { tint: true, spec: 0.05 });
        const puff = this.add(this.headG, blob(W * 0.54, H * 0.32, D * 0.56, { R: 14, J: 28, nv: 2.4 }), { col: hc, spec: 0.05 });
        puff.position.set(0, this.yc + H * 0.5 + H * 0.26, this.zc - D * 0.03); break;
      }
      case "fedora": {
        sh(hline(0.98, 1.16, 1.26), (s, p) => 0.24 - 0.06 * Math.exp(-((p / 0.5) ** 2)) * (1 - sstep(0, 0.5, s)), {
          inner: -0.02, lip: 0.24, tint: (r, s) => (r === "out" ? (s > 0.8 ? band ?? "#2a2220" : hc) : shade(hc, 0.4)) }, { tint: true, spec: 0.12 });
        const [, by] = this.headPt(1.16, Math.PI / 2, 0.24);
        const brim = this.add(this.headG, blob(W * 0.86, 0.012, D * 0.86, { R: 8, J: 40, n: 2.2 }), { col: hc, spec: 0.1 });
        brim.position.set(0, by - 0.005, this.zc); brim.rotation.x = -0.05; break;
      }
    }
  }

  // ---------------- arms + hands ----------------
  private buildArms() {
    const B = this.B, S = this.R, [y0, y1] = this.torsoY, ySh = y1 - (y1 - y0) * 0.13, Lh = B.arm / 2;
    const sl = S.sleeves, sc = this.C.sleeve, oT = S.outer?.type;
    const pk = oT === "parka", coat = oT === "labcoat" || oT === "gown";
    const end = sl === "long" ? 1.01 : sl === "rolled" ? 0.52 : sl === "short" ? 0.28 : 0.03;
    const cuff = pk ? S.outer!.trim ?? "#d9c49a" : coat ? shade(sc, 0.07) : S.top.type === "sweater" || S.top.type === "hoodie" ? shade(sc, 0.16) : shade(sc, 0.1);
    for (const side of [1, -1]) {
      const sh = new THREE.Group(); sh.position.set(side * (B.shW - B.armR * 0.85), ySh, 0); this.hips.add(sh);
      const el = new THREE.Group(); el.position.y = -Lh; sh.add(el);
      const wr = new THREE.Group(); wr.position.y = -Lh; el.add(wr);
      const tube = new Tube(24, 16);
      const watch = side > 0 ? S.has("watch") : undefined;
      rowAttr(tube.geo, "aTint", 3, (i) => {
        const t = tube.rowT(i);
        if (t > end) return lin(watch && t > 0.88 && t < 0.95 ? watch.color ?? "#3a3a40" : this.skin);
        if (sl === "long") return lin(t > 0.87 ? cuff : sc);
        if (sl === "rolled") return lin(t > 0.41 ? lighten(sc, 0.1) : sc);
        if (sl === "short") return lin(t > 0.22 ? shade(sc, 0.08) : sc);
        return lin(sc);
      });
      this.add(this.root, tube.geo, { tint: true, spec: 0.03, gloss: 12 });
      tube.geo.userData.r = (t: number) => {
        const base = B.armR * (coat ? 1.1 : pk ? 1.22 : 1) * (1 - 0.16 * t + (pk ? 0.02 : 0.06) * Math.sin(t * Math.PI));
        if (t > end) return base * 0.86;
        if (sl === "rolled" && t > 0.41) return base * 1.16;
        if (sl === "short") return base * 1.1;
        return base * (sl === "long" && t > 0.87 ? (pk ? 1.16 : 1.08) : 1);
      };
      this.arms.push({ sh, el, wr, hand: this.buildHand(wr, side), tube, side });
    }
  }
  private buildHand(wr: THREE.Group, side: number): Hand {
    const k = this.B.hand, hs = side, g = new THREE.Group(); wr.add(g);
    const o = { col: this.skin, spec: 0.08, gloss: 16 };
    const palm = this.add(g, blob(0.037 * k, 0.036 * k, 0.02 * k, { n: 2.4, R: 10, J: 18 }), o, 0.8); palm.position.set(0, -0.034 * k, 0);
    const f: Finger[] = [];
    [[0.024, 1.0], [0.0, 1.08], [-0.024, 0.94]].forEach(([x, len]) => {
      const a = new THREE.Group(); a.position.set(hs * x * k, -0.062 * k, 0); g.add(a);
      const l1 = 0.026 * k * len, l2 = 0.022 * k * len, r = 0.0118 * k;
      const s1 = this.add(a, new THREE.CapsuleGeometry(r, l1, 4, 10), o, 0.7); s1.position.y = -l1 / 2;
      const b = new THREE.Group(); b.position.y = -l1; a.add(b);
      const s2 = this.add(b, new THREE.CapsuleGeometry(r * 0.96, l2, 4, 10), o, 0.7); s2.position.y = -l2 / 2;
      f.push({ a, b });
    });
    const tb = new THREE.Group(); tb.position.set(hs * 0.03 * k, -0.02 * k, 0.008 * k); g.add(tb);
    const t1 = new THREE.Group(); tb.add(t1);
    const tl1 = 0.024 * k, tl2 = 0.02 * k;
    const ts1 = this.add(t1, new THREE.CapsuleGeometry(0.0125 * k, tl1, 4, 10), o, 0.7); ts1.position.y = -tl1 / 2;
    const t2 = new THREE.Group(); t2.position.y = -tl1; t1.add(t2);
    const ts2 = this.add(t2, new THREE.CapsuleGeometry(0.012 * k, tl2, 4, 10), o, 0.7); ts2.position.y = -tl2 / 2;
    // cup prop (palm side, axis across the hand so it stands upright when the forearm is level)
    const cup = new THREE.Group(); cup.visible = false; g.add(cup);
    const mugG = blob(0.041, 0.05, 0.041, { nv: 5, R: 16, J: 24 });
    rowAttr(mugG, "aTint", 3, (i) => lin(i > 8 && i < 12 ? "#3d6ea5" : "#efe6d2"));
    const mug = this.add(cup, mugG, { tint: true, spec: 0.35, gloss: 30 });
    const coffee = this.add(mug, blob(0.03, 0.004, 0.03, { R: 6, J: 20 }), { col: "#4a2c1c", spec: 0.5, gloss: 40 }, 0); coffee.position.y = 0.0485;
    const handle = this.add(mug, new THREE.TorusGeometry(0.022, 0.007, 8, 16, Math.PI).rotateZ(-Math.PI / 2), { col: "#efe6d2", spec: 0.3 }, 0.7); handle.position.set(0.039, 0, 0);
    cup.position.set(0, -0.052 * k, 0.067 * k); cup.rotation.set(0, 0, hs > 0 ? -Math.PI / 2 : Math.PI / 2);
    mug.rotation.y = hs > 0 ? Math.PI / 2 : -Math.PI / 2;
    return { g, f, tb, t1, t2, hs, cup };
  }
  private setHand(h: Hand, S: HandShape) {
    h.g.rotation.set(S.w, -h.hs * Math.PI / 2, 0, "YXZ");
    const c = [[S.i1, S.i2], [S.m1, S.m2], [S.r1, S.r2]];
    h.f.forEach((f, i) => { f.a.rotation.set(-c[i][0], 0, h.hs * (0.06 * (1 - i)) * (1 - Math.min(1, c[i][0]))); f.b.rotation.x = -c[i][1]; });
    h.tb.rotation.set(0, 0, h.hs * (0.35 + 0.5 * S.ts));
    h.t1.rotation.set(-S.t * 0.75, 0, -h.hs * S.t * 0.35); h.t2.rotation.x = -S.t * 0.6;
  }

  // ---------------- legs + shoes ----------------
  private legR = (t: number) => this.B.legR * (1 - 0.32 * t + 0.05 * Math.sin(t * Math.PI));
  private legK: (t: number) => number = () => 1;
  private buildLegs() {
    const B = this.B, sh = B.shoe, S = this.R, bt = S.bottom.type, shoeT = S.shoes.type;
    const pantsEnd = bt === "shorts" ? 0.42 : bt === "skirt" ? -1 : 1.01;
    const bare = S.bottom.tights ?? this.skin;
    const socks = S.shoes.socks ?? (pantsEnd < 1 && shoeT === "sneakers" ? "#f1efe8" : undefined);
    const harness = S.has("harness"), bc = this.C.bottom, boots = shoeT === "boots";
    const tint = (t: number) => {
      if (boots && t > 0.8) return this.C.shoes;
      if (t < pantsEnd) {
        if (harness && t > 0.04 && t < 0.1) return harness.color ?? "#d8503c";
        if (S.bottom.stripe && t > 0.64 && t < 0.69) return S.bottom.stripe;
        if (bt === "shorts" && t > 0.37) return shade(bc, 0.12);
        if (S.bottom.cuffs && t > 0.9) return shade(bc, 0.15);
        if (bt === "jeans" && t > 0.94) return lighten(bc, 0.12);
        if (bt === "cargo" && t > 0.36 && t < 0.5) return shade(bc, 0.1);
        return bc;
      }
      if (socks && t > 0.86) return socks;
      return bare;
    };
    this.legK = (t) => (boots && t > 0.8 ? 1.14 : t < pantsEnd ? (bt === "cargo" ? 1.08 : bt === "shorts" ? 1.12 : 1) : 0.84);
    for (const side of [1, -1]) {
      const hip = new THREE.Object3D(); hip.position.set(side * B.hipW * 0.5, -0.01, 0); this.hips.add(hip);
      const tube = new Tube(22, 16);
      rowAttr(tube.geo, "aTint", 3, (i) => lin(tint(tube.rowT(i))));
      this.add(this.root, tube.geo, { tint: true, spec: 0.05, gloss: 12 });
      const shoe = new THREE.Group(); this.root.add(shoe);
      const ry = sh[2] / 2 * (boots ? 1.25 : 1), rz = sh[0] / 2;
      const up = this.add(shoe, blob(sh[1] / 2 * (boots ? 1.06 : 1), ry, rz, { alongZ: true, n: 2.3, nv: 2.2, flatBottom: 0.45, R: 16, J: 22 }), { col: this.C.shoes, spec: shoeT === "sneakers" ? 0.2 : 0.35, gloss: 28 });
      up.position.set(0, -this.ankleH + 0.014 + ry * 0.45, rz * 0.3);
      const soleH = shoeT === "sneakers" ? 0.024 : boots ? 0.02 : 0.016;
      const sole = this.add(shoe, blob(sh[1] / 2 + 0.006, soleH, rz + 0.007, { alongZ: true, n: 2.3, flatBottom: 0.6, R: 8, J: 22 }), { col: this.C.sole, spec: 0.1 });
      sole.position.set(0, -this.ankleH + soleH * 0.6, rz * 0.3);
      if (shoeT === "sneakers") {
        const lace = this.add(shoe, blob(sh[1] * 0.2, 0.012, rz * 0.34, { R: 8, J: 14 }), { col: S.shoes.accent ?? "#f2f0ea", spec: 0.1 }, 0.6);
        lace.position.set(0, -this.ankleH + 0.014 + ry * 1.25, rz * 0.42); lace.rotation.x = 0.35;
      }
      const bl = this.blobMesh(sh[1] * 2.3, sh[0] * 1.5, 0.55); this.root.add(bl);
      this.legs.push({ tube, hip, shoe, side, blob: bl });
    }
  }

  // ---------------- accessories (meshes) ----------------
  private buildAccessories() {
    const S = this.R, B = this.B, T = this.T, prof = this.torsoProf, [y0, y1] = this.torsoY;
    const surf = (y: number) => prof(Math.min(0.97, Math.max(0.03, (y - y0) / (y1 - y0))));
    const gl = S.has("glovesBackPocket");
    if (gl) for (const [dx, rz] of [[-0.075, 0.1], [-0.04, -0.12]]) {
      const P = surf(0.03), m = this.add(this.hips, blob(0.03, 0.06, 0.012, { R: 10, J: 14, n: 2.4 }), { col: gl.color ?? "#5a3d2c", spec: 0.05 }, 0.7);
      m.position.set(dx, 0.075, -P.d * 1.0 - 0.012); m.rotation.set(0.18, 0, rz);
    }
    const cb = S.has("chalkBag");
    if (cb) { const P = surf(0.0); const m = this.add(this.hips, blob(0.045, 0.05, 0.045, { R: 10, J: 16, n: 2.4 }), { col: cb.color ?? "#2d6a6e", spec: 0.05 }, 0.8); m.position.set(0.0, -0.01, -P.d - 0.04); }
    const bp = S.has("backpack");
    if (bp) { const P = surf(T * 0.55); const m = this.add(this.hips, blob(B.shW * 0.78, T * 0.36, 0.07, { R: 12, J: 20, n: 3, nv: 3 }), { col: bp.color ?? "#3d5a7a", spec: 0.08 }, 1); m.position.set(0, T * 0.52, -P.d - 0.06); }
    const rc = S.has("ropeCoil");
    if (rc) {
      const g = new THREE.TorusGeometry(1, 0.075, 8, 48).rotateX(Math.PI / 2);
      const m = this.add(this.hips, g, { col: rc.color ?? "#3d8fd0", spec: 0.1 }, 0.8);
      m.scale.set(B.shW * 1.45, 0.3, B.depth * 1.55); m.position.set(0, T * 0.6, 0); m.rotation.z = -0.78;
    }
    const sc = S.has("scarf");
    if (sc) {
      const rn = this.W * 0.2, c = sc.color ?? "#b8402e";
      const ring = this.add(this.hips, new THREE.TorusGeometry(rn * 1.32, rn * 0.42, 10, 28).rotateX(Math.PI / 2), { col: c, spec: 0.04 }, 0.8); ring.position.set(0, T + 0.035, 0);
      const tail = this.add(this.hips, blob(0.035, 0.1, 0.018, { R: 10, J: 14, n: 2.6 }), { col: shade(c, 0.06), spec: 0.04 }, 0.8);
      tail.position.set(-0.06, T - 0.08, surf(T * 0.85).d + 0.02); tail.rotation.set(-0.15, 0, 0.08);
    }
  }

  // ---------------- per-frame ----------------
  pose(P: PegPose) {
    const B = this.B, sq = P.sq ?? 0, amp = P.walk ?? 0, s = B.stride, d = P.walkD ?? 0;
    this.root.position.set(P.x, P.y ?? 0, P.z); this.root.rotation.set(0, P.yaw, 0); this.root.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    const ph = d / (2 * s), bt = P.breathT ?? 0;
    const walkBob = -0.022 * amp * (0.5 + 0.5 * Math.cos(ph * Math.PI * 4));
    this.hips.position.set(0, this.hipY + (P.bob ?? 0) + walkBob + 0.003 * Math.sin(bt * 2.2), 0);
    this.hips.rotation.set((P.lean ?? 0) + B.hunch + 0.05 * amp - (this.R.sit ? this.R.recline ?? 0 : 0), 0.07 * amp * Math.cos(ph * Math.PI * 2), P.tilt ?? 0, "YXZ");
    this.headG.rotation.set((P.headPitch ?? 0) - B.hunch * 0.7 + 0.012 * Math.sin(bt * 2.2 + 0.6), P.headYaw ?? 0, P.headRoll ?? 0, "YXZ");
    for (const A of this.arms) {
      const a = { fwd: 0, out: B.restOut, twist: 0, bend: 0.14, ...(A.side > 0 ? P.armL : P.armR) };
      a.fwd += -A.side * 0.32 * amp * Math.cos(ph * Math.PI * 2);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, A.side * a.out)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-a.fwd, 0, 0))).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, A.side * a.twist, 0)));
      A.sh.quaternion.copy(q); A.el.rotation.set(-a.bend, 0, 0);
      const hk = A.side > 0 ? P.handL : P.handR, hsh = typeof hk === "string" ? HAND[hk as HandKind] : hk ?? HAND.relaxed;
      this.setHand(A.hand, hsh);
      A.hand.cup.visible = (A.side > 0 ? P.propL : P.propR) === "cup";
    }
    this.root.updateMatrixWorld(true);
    const toRoot = (o: THREE.Object3D) => this.root.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
    const fwd = new THREE.Vector3(0, 0, 1);
    for (const A of this.arms) A.tube.update(toRoot(A.sh), toRoot(A.el), toRoot(A.wr), A.tube.geo.userData.r, fwd);
    const legR = (t: number) => this.legR(t) * this.legK(t);
    // legs: gait (feet planted while the root moves walkD along its facing) + 2-bone IK
    const half = B.leg / 2;
    for (const Lg of this.legs) {
      const f = (((ph + (Lg.side > 0 ? 0 : 0.5)) % 1) + 1) % 1;
      let z: number, lift = 0, pitch = 0;
      if (f < 0.5) { z = s / 2 - 2 * s * f; pitch = -0.15 * (1 - sstep(0, 0.1, f)) + 0.25 * sstep(0.38, 0.5, f); }
      else { const u = (f - 0.5) * 2, e = u * u * (3 - 2 * u); z = -s / 2 + s * e; lift = Math.sin(Math.PI * u) * 0.07 * (B.leg / 0.7); pitch = 0.25 * (1 - sstep(0, 0.35, u)) - 0.15 * sstep(0.6, 0.95, u); }
      z *= amp; lift *= amp; pitch *= amp;
      const sp = Math.sin(pitch), A = new THREE.Vector3(Lg.side * B.stance, this.ankleH + lift + Math.max(0, sp) * B.shoe[0] * 0.55 + Math.max(0, -sp) * B.shoe[0] * 0.3, z);
      const Hp = toRoot(Lg.hip), dv = A.clone().sub(Hp), dl = dv.length(), dir = dv.clone().normalize();
      let K: THREE.Vector3;
      if (dl >= half * 2 * 0.999) K = Hp.clone().addScaledVector(dir, dl / 2);
      else { const x = dl / 2, h = Math.sqrt(Math.max(0, half * half - x * x)); const fw = fwd.clone().addScaledVector(dir, -dir.dot(fwd)).normalize(); K = Hp.clone().addScaledVector(dir, x).addScaledVector(fw, h); }
      Lg.tube.update(Hp, K, A, legR, fwd);
      Lg.shoe.position.copy(A); Lg.shoe.rotation.set(pitch, 0, 0);
      Lg.blob.position.set(A.x, 0.003, A.z + B.shoe[0] * 0.12);
      const lk = Math.min(1, lift / 0.08); (Lg.blob.material as THREE.MeshBasicMaterial).opacity = Lg.blob.userData.baseOp * (1 - 0.6 * lk);
      Lg.blob.scale.set(B.shoe[1] * 2.3 * (1 - 0.25 * lk), 1, B.shoe[0] * 1.5 * (1 - 0.25 * lk));
    }
    this.bodyBlob.position.set(0, 0.002, 0);
    // seated (spec.sit = seat height): the seat of the trousers rests on it, thighs forward, shins hang
    if (this.R.sit) {
      const rootY = this.R.sit - (this.hipY - B.hipW * 0.62) * this.root.scale.y;
      this.root.position.y = (P.y ?? 0) + rootY;
      if (this.R.recline) for (const Lg of this.legs) {
        const Hp = toRoot(Lg.hip), Ae = new THREE.Vector3(Lg.side * B.stance * 1.05, this.hipY - B.legR * 0.4, Hp.z + half * 1.96);
        const K = Hp.clone().lerp(Ae, 0.5); K.y += 0.03;
        Lg.tube.update(Hp, K, Ae, legR, fwd);
        Lg.shoe.position.copy(Ae); Lg.shoe.rotation.set(-1.25, 0, 0);
        (Lg.blob.material as THREE.MeshBasicMaterial).opacity = 0;
      }
      else for (const Lg of this.legs) {
        const A = new THREE.Vector3(Lg.side * B.stance * 1.15, Math.max(this.hipY - half * 1.02, -rootY + this.ankleH), half * 1.05);
        const Hp = toRoot(Lg.hip), dv = A.clone().sub(Hp), dl = Math.min(dv.length(), half * 1.999), dir = dv.clone().normalize();
        const x = dl / 2, hh = Math.sqrt(Math.max(0, half * half - x * x));
        const up = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
        const K = Hp.clone().addScaledVector(dir, x).addScaledVector(up, hh);
        const Ae = Hp.clone().addScaledVector(dir, dl);
        Lg.tube.update(Hp, K, Ae, legR, fwd);
        Lg.shoe.position.copy(Ae); Lg.shoe.rotation.set(0.25, 0, 0);
        Lg.blob.position.set(Ae.x, -rootY + 0.003, Ae.z); (Lg.blob.material as THREE.MeshBasicMaterial).opacity = Lg.blob.userData.baseOp * 0.5;
      }
      this.bodyBlob.position.set(0, -rootY + 0.002, 0);
    }
    const F: FaceState = P.face, key = faceKey(F);
    if (key !== this.faceK) { this.faceK = key; drawFace(this.faceG, this.faceCols, F); this.faceTex.needsUpdate = true; }
  }
  /** neutral key (camera-relative) + one-edge rim in the scene colour; ink width in px at the render size. Call every frame AFTER the camera moves. */
  light(cam: THREE.Camera, o: { rim?: string; rimK?: number; rimSide?: number; px?: number; res?: [number, number]; key?: [number, number, number]; expo?: number } = {}) {
    const L = this.L;
    L.uKeyDir.value.set(...(o.key ?? [-0.42, 0.5, 0.76])).normalize();
    L.uRimDir.value.set(o.rimSide ?? 1, 0.3, -0.35).normalize();
    if (o.rim) L.uRimCol.value.set(o.rim);
    L.uRimK.value = o.rimK ?? 0.7; L.uExpo.value = o.expo ?? 1;
    if (o.res) L.uRes.value.set(...o.res);
    const dist = cam.position.distanceTo(this.headG.getWorldPosition(this.v));
    L.uPx.value = (o.px ?? 4.4) * Math.min(1, Math.max(0.66, 2.6 / dist)) * (L.uRes.value.x / 1080);
  }
  set visible(v: boolean) { this.root.visible = v; }
  /** world position of the eyes (for camera framing) */
  eyeWorld(out = new THREE.Vector3()) { return this.headG.localToWorld(out.set(0, this.yc, this.zc)); }
  dispose() { this.root.traverse((m) => { const me = m as THREE.Mesh; if (me.isMesh) { me.geometry.dispose(); (me.material as THREE.Material).dispose(); } }); this.faceTex.dispose(); }
}
