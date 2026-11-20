// Neutral sunny studio (cyclorama floor + soft sky wall + sun shadows) and the character light presets.
// Works in plain Three.js and inside Remotion's <ThreeCanvas>. Characters use their own toon shader: they are lit by
// light(camera, preset) every frame, NOT by scene lights (scene lights only make the floor + cast shadows).
import * as THREE from "three";
import type { PegChar } from "./rig";

/** character light presets: rim colour on ONE edge (screen side rimSide), never on the face key */
export const LIGHT = {
  sunny:    { rim: "#ffcc80", rimK: 0.72, rimSide: 1, expo: 1.0 },    // World v2 SUNNY_CARD: warm sun rim on the sun side (aimSun default puts the sun screen-right)
  studio:   { rim: "#8fcbe0", rimK: 0.8, rimSide: 1, expo: 1.0 },     // approved pose-test stage
  overcast: { rim: "#d6e2f2", rimK: 0.45, rimSide: 1, expo: 0.97 },
  interior: { rim: "#ffb877", rimK: 0.6, rimSide: 1, expo: 0.98 },    // warm practical lamp
  night:    { rim: "#7fb2ff", rimK: 0.85, rimSide: 1, expo: 0.9 },    // moonlight rim; faces stay lit
} as const;
export type LightPreset = keyof typeof LIGHT;

/** recommended renderer settings (call once). Remotion: pass the same values via the gl prop / onCreated. */
export const setupRenderer = (gl: THREE.WebGLRenderer) => {
  gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
  gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; gl.outputColorSpace = THREE.SRGBColorSpace;
};

/** light every character for this frame (after the camera has moved). res = drawing-buffer size in px. */
export const lightAll = (chars: PegChar[], cam: THREE.Camera, res: [number, number], preset: LightPreset | (typeof LIGHT)[LightPreset] = "sunny", o: { px?: number } = {}) => {
  const P = typeof preset === "string" ? LIGHT[preset] : preset;
  // o.px = ink width override (default 4.4 for mediums/close-ups; ~1.8-2.4 for wide shots and lineups so the outline doesn't swamp small characters)
  for (const c of chars) c.light(cam, { rim: P.rim, rimK: P.rimK, rimSide: P.rimSide, expo: P.expo, res, px: o.px });
};

export type StudioOpts = { floor?: string; floorEdge?: string; wallLow?: string; wallHigh?: string; width?: number; risers?: { x: number; z: number; w: number; d: number; h: number }[] };
/** a seamless sunny studio: warm sand floor with a light pool, sky-blue cyclorama wall, sun from behind-left of the camera */
export const createStudio = (o: StudioOpts = {}) => {
  const g = new THREE.Group();
  const floorA = new THREE.Color(o.floor ?? "#e2d6c0"), floorB = new THREE.Color(o.floorEdge ?? "#c2b296");
  const wallA = new THREE.Color(o.wallLow ?? "#cfe1f0"), wallB = new THREE.Color(o.wallHigh ?? "#5f9fdc");
  const W = o.width ?? 30;
  // profile: floor (z 10 -> -3), quarter-circle cove (r 2.8), wall up to y 16
  const prof: [number, number][] = [];
  for (let i = 0; i <= 26; i++) prof.push([10 - (i / 26) * 13, 0]);
  for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; prof.push([-3 - Math.sin(a) * 2.8, 2.8 - Math.cos(a) * 2.8]); }
  for (let i = 1; i <= 12; i++) prof.push([-5.8, 2.8 + (i / 12) * 14]);
  const NX = 60, pos: number[] = [], col: number[] = [], idx: number[] = [];
  prof.forEach(([z, y]) => {
    for (let i = 0; i <= NX; i++) {
      const x = -W / 2 + (i / NX) * W; pos.push(x, y, z);
      const c = new THREE.Color();
      if (y < 0.01) { c.copy(floorB).lerp(floorA, Math.exp(-((x / 7) ** 2)) * Math.min(1, Math.max(0, (9 - z) / 8))); }
      else { const h = Math.min(1, y / 7); c.copy(floorA).lerp(wallA, Math.min(1, y / 1.4)).lerp(wallB, h * h * (3 - 2 * h)); }
      col.push(c.r, c.g, c.b);
    }
  });
  for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
  g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  // shadow catcher on the floor (purple-neutral shadow colour, never grey-black)
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(W, 14).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: "#2a2142", opacity: 0.3 }));
  catcher.position.set(0, 0.001, 2); catcher.receiveShadow = true; g.add(catcher);
  // risers (steps / platforms): lambert boxes so they shade and receive shadows
  for (const r of o.risers ?? []) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.h, r.d), new THREE.MeshLambertMaterial({ color: "#efe7d8" }));
    m.position.set(r.x, r.h / 2, r.z); m.receiveShadow = true; m.castShadow = true; g.add(m);
  }
  g.add(new THREE.HemisphereLight("#eaf2ff", "#b8a88c", 1.6));
  const sun = new THREE.DirectionalLight("#fff4e2", 1.6);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  const c = sun.shadow.camera; c.left = -W / 4; c.right = W / 4; c.top = 4; c.bottom = -4; c.near = 0.5; c.far = 30;
  g.add(sun, sun.target);
  /** place the sun behind the camera: rel = degrees to the side of the camera direction, el = elevation */
  const aimSun = (cam: THREE.Camera, target = new THREE.Vector3(0, 0, 0), rel = 40, el = 50) => {
    const d = new THREE.Vector3().subVectors(cam.position, target); d.y = 0; d.normalize();
    const a = Math.atan2(d.x, d.z) + (rel * Math.PI) / 180, e = (el * Math.PI) / 180;
    sun.position.set(target.x + Math.sin(a) * Math.cos(e) * 12, Math.sin(e) * 12, target.z + Math.cos(a) * Math.cos(e) * 12); sun.target.position.copy(target);
  };
  return { group: g, sun, aimSun, background: new THREE.Color(o.wallHigh ?? "#5f9fdc") };
};
