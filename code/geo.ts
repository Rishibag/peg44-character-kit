// peg44 geometry: one indexed "rings" builder (rows of J points, optional poles, seam wrapped so normals stay smooth and the
// ink hull never cracks). Everything (head, torso, hair shells, hats, shoes, limbs) is built from rings.
import * as THREE from "three";

export const spow = (x: number, e: number) => Math.sign(x) * Math.pow(Math.abs(x), e);
export const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export type P3 = [number, number, number];

/** allocate an indexed ring mesh: rows R x J points (+ optional pole vertex before row 0 / after the last row) */
export const ringGeo = (R: number, J: number, poleA: boolean, poleB: boolean, flip = false) => {
  const n = R * J + (poleA ? 1 : 0) + (poleB ? 1 : 0), o = poleA ? 1 : 0;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const idx: number[] = [], v = (i: number, j: number) => o + i * J + ((j + J) % J);
  const tri = (a: number, b: number, c: number) => (flip ? idx.push(a, c, b) : idx.push(a, b, c));
  if (poleA) for (let j = 0; j < J; j++) tri(0, v(0, j + 1), v(0, j));
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < J; j++) { tri(v(i, j), v(i, j + 1), v(i + 1, j)); tri(v(i, j + 1), v(i + 1, j + 1), v(i + 1, j)); }
  if (poleB) { const p = n - 1; for (let j = 0; j < J; j++) tri(v(R - 1, j), v(R - 1, j + 1), p); }
  g.setIndex(idx);
  g.userData = { R, J, poleA, poleB };
  return g;
};
/** write ring positions: pt(i, j) for rows, optional pole points; recomputes smooth normals */
export const fillRings = (g: THREE.BufferGeometry, pt: (i: number, j: number) => P3, pa?: P3, pb?: P3) => {
  const { R, J, poleA, poleB } = g.userData as { R: number; J: number; poleA: boolean; poleB: boolean };
  const pos = g.attributes.position as THREE.BufferAttribute; let k = 0;
  if (poleA && pa) pos.setXYZ(k++, ...pa);
  for (let i = 0; i < R; i++) for (let j = 0; j < J; j++) pos.setXYZ(k++, ...pt(i, j));
  if (poleB && pb) pos.setXYZ(k++, ...pb);
  pos.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
};
/** per-vertex uv from a function of the vertex position (after fillRings) */
export const uvFrom = (g: THREE.BufferGeometry, f: (x: number, y: number, z: number) => [number, number]) => {
  const p = g.attributes.position, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const [u, v] = f(p.getX(i), p.getY(i), p.getZ(i)); uv.setXY(i, u, v); }
  uv.needsUpdate = true; return g;
};
/** per-row attribute (aInk float / aTint colour); poles copy the first / last row */
export const rowAttr = (g: THREE.BufferGeometry, name: string, size: number, f: (i: number) => number[]) => {
  const { R, J, poleA, poleB } = g.userData as { R: number; J: number; poleA: boolean; poleB: boolean };
  const n = R * J + (poleA ? 1 : 0) + (poleB ? 1 : 0), a = new Float32Array(n * size); let k = 0;
  const put = (v: number[]) => { for (let s = 0; s < size; s++) a[k * size + s] = v[s]; k++; };
  if (poleA) put(f(0));
  for (let i = 0; i < R; i++) { const v = f(i); for (let j = 0; j < J; j++) put(v); }
  if (poleB) put(f(R - 1));
  g.setAttribute(name, new THREE.BufferAttribute(a, size)); return g;
};
export const lin = (c: string) => { const k = new THREE.Color(c); return [k.r, k.g, k.b]; };

/** closed superellipsoid blob (ears, nose, palm, shoes, buttons); axis rows along y, or along z with alongZ */
export const blob = (rx: number, ry: number, rz: number, o: { n?: number; nv?: number; R?: number; J?: number; alongZ?: boolean; flatBottom?: number; taper?: number } = {}) => {
  const R = o.R ?? 14, J = o.J ?? 20, n = o.n ?? 2, nv = o.nv ?? 2, e = 2 / n, ev = 2 / nv;
  const g = ringGeo(R, J, true, true, !!o.alongZ);
  const ring = (lat: number, a: number): P3 => {         // lat: -pi/2..pi/2 along the axis, a: angle
    const t = Math.sin(lat), k = Math.pow(Math.max(0, Math.cos(lat)), ev), tp = 1 + (o.taper ?? 0) * t;
    const u = spow(Math.sin(a), e) * k * tp, w = spow(Math.cos(a), e) * k * tp;
    const ax = spow(t, ev);
    if (o.alongZ) { let y = w * ry; if (o.flatBottom !== undefined) y = Math.max(y, -ry * o.flatBottom); return [u * rx, y, ax * rz]; }
    return [u * rx, ax * ry, w * rz];
  };
  fillRings(g, (i, j) => ring(-Math.PI / 2 + (Math.PI * (i + 1)) / (R + 1), (j / J) * Math.PI * 2),
    o.alongZ ? [0, 0, -rz] : [0, -ry, 0], o.alongZ ? [0, 0, rz] : [0, ry, 0]);
  return g;
};

/** dynamic limb tube along a quadratic bezier S -> (through) E -> W, radius profile r(t); hemispherical caps */
export class Tube {
  geo: THREE.BufferGeometry; R: number; J: number; capN = 4;
  constructor(public N = 22, J = 14) {
    this.R = N + 2 * this.capN; this.J = J;
    this.geo = ringGeo(this.R, J, true, true);
  }
  /** row index -> t along the curve (caps clamp to the ends) */
  rowT(i: number) { const c = this.capN; return i < c ? 0 : i >= c + this.N ? 1 : (i - c) / (this.N - 1); }
  update(S: THREE.Vector3, E: THREE.Vector3, W: THREE.Vector3, r: (t: number) => number, hint: THREE.Vector3) {
    const C = E.clone().multiplyScalar(2).sub(S.clone().add(W).multiplyScalar(0.5));     // control so the curve passes through E
    const P = (t: number) => S.clone().multiplyScalar((1 - t) * (1 - t)).add(C.clone().multiplyScalar(2 * t * (1 - t))).add(W.clone().multiplyScalar(t * t));
    const D = (t: number) => C.clone().sub(S).multiplyScalar(2 * (1 - t)).add(W.clone().sub(C).multiplyScalar(2 * t)).normalize();
    const rows: { p: THREE.Vector3; T: THREE.Vector3; N: THREE.Vector3; B: THREE.Vector3; r: number }[] = [];
    let Nv = hint.clone().sub(D(0).multiplyScalar(hint.dot(D(0)))).normalize();
    if (!isFinite(Nv.x) || Nv.lengthSq() < 1e-6) Nv = new THREE.Vector3(1, 0, 0);
    let Tp = D(0);
    for (let k = 0; k < this.N; k++) {
      const t = k / (this.N - 1), T = D(t);
      const ax = Tp.clone().cross(T); if (ax.lengthSq() > 1e-10) { const ang = Math.asin(Math.min(1, ax.length())); Nv.applyAxisAngle(ax.normalize(), ang); }
      Tp = T; const B = T.clone().cross(Nv).normalize(); Nv = B.clone().cross(T).normalize();
      rows.push({ p: P(t), T, N: Nv.clone(), B, r: r(t) });
    }
    const c = this.capN, all: { p: THREE.Vector3; N: THREE.Vector3; B: THREE.Vector3; r: number }[] = [];
    const f0 = rows[0], f1 = rows[rows.length - 1];
    for (let i = 0; i < c; i++) { const a = (Math.PI / 2) * (1 - (i + 1) / (c + 1)); all.push({ p: f0.p.clone().addScaledVector(f0.T, -Math.sin(a) * f0.r), N: f0.N, B: f0.B, r: Math.cos(a) * f0.r }); }
    all.push(...rows);
    for (let i = 0; i < c; i++) { const a = (Math.PI / 2) * ((i + 1) / (c + 1)); all.push({ p: f1.p.clone().addScaledVector(f1.T, Math.sin(a) * f1.r), N: f1.N, B: f1.B, r: Math.cos(a) * f1.r }); }
    const J = this.J;
    const pa = f0.p.clone().addScaledVector(f0.T, -f0.r), pb = f1.p.clone().addScaledVector(f1.T, f1.r);
    fillRings(this.geo, (i, j) => {
      const q = all[i], a = (j / J) * Math.PI * 2;
      return [q.p.x + q.r * (Math.cos(a) * q.N.x + Math.sin(a) * q.B.x), q.p.y + q.r * (Math.cos(a) * q.N.y + Math.sin(a) * q.B.y), q.p.z + q.r * (Math.cos(a) * q.N.z + Math.sin(a) * q.B.z)];
    }, [pa.x, pa.y, pa.z], [pb.x, pb.y, pb.z]);
  }
}
