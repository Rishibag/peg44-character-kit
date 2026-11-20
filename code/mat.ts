// peg44 shading: 3-step toon ramp with a soft spec, NEUTRAL key (camera-relative, never takes the set colour),
// scene colour only as a one-edge rim. Plus a constant-pixel-width inverted-hull ink outline.
import * as THREE from "three";

/** per-character light uniforms, shared by reference across all of that character's materials */
export type PegLight = {
  uKeyDir: { value: THREE.Vector3 }; uRimDir: { value: THREE.Vector3 }; uRimCol: { value: THREE.Color }; uRimK: { value: number };
  uExpo: { value: number }; uPx: { value: number }; uRes: { value: THREE.Vector2 }; uInk: { value: THREE.Color };
};
export const makeLight = (): PegLight => ({
  uKeyDir: { value: new THREE.Vector3(-0.42, 0.5, 0.76).normalize() },
  uRimDir: { value: new THREE.Vector3(1, 0.25, -0.25).normalize() },
  uRimCol: { value: new THREE.Color("#7fb2ff") }, uRimK: { value: 0.75 }, uExpo: { value: 1.0 },
  uPx: { value: 3.2 }, uRes: { value: new THREE.Vector2(1080, 1920) }, uInk: { value: new THREE.Color("#1d1519") },
});

const VS = /* glsl */ `
attribute float aInk;
attribute vec3 aTint;
varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vInk; varying vec3 vTint;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = -mv.xyz; vN = normalize(normalMatrix * normal); vUv = uv; vInk = aInk; vTint = aTint;
  gl_Position = projectionMatrix * mv;
}`;
const FS = /* glsl */ `
uniform vec3 uCol; uniform sampler2D uMap; uniform float uHasMap; uniform float uHasTint;
uniform vec3 uKeyDir; uniform vec3 uRimDir; uniform vec3 uRimCol; uniform float uRimK; uniform float uExpo;
uniform float uSpec; uniform float uGloss; uniform vec3 uInk; uniform float uBackK;
varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vInk; varying vec3 vTint;
void main() {
  vec3 alb = uCol;
  if (uHasTint > 0.5) alb = vTint;
  if (uHasMap > 0.5) alb *= texture2D(uMap, vUv).rgb;
  vec3 N = normalize(vN); vec3 V = normalize(vV);
  float back = 0.0;
  if (!gl_FrontFacing) { N = -N; back = 1.0; }
  float ndl = dot(N, uKeyDir);
  // 3-step ramp (lit / mid / shade) with soft 0.1-wide transitions; shade is a cool lavender, never grey-black
  float s1 = smoothstep(0.0, 0.11, ndl);
  float s2 = smoothstep(-0.46, -0.35, ndl);
  vec3 L = mix(mix(vec3(0.60, 0.585, 0.70), vec3(0.83, 0.82, 0.88), s2), vec3(1.0), s1);
  L += 0.05 * clamp(N.y, 0.0, 1.0);                      // soft sky fill from above
  vec3 col = alb * L * uExpo;
  vec3 H = normalize(uKeyDir + V);
  float sp = smoothstep(0.45, 0.8, pow(max(dot(N, H), 0.0), uGloss)) * uSpec * s1;
  col += sp * vec3(1.0, 0.98, 0.95);
  float fres = 1.0 - max(dot(N, V), 0.0);
  float rim = smoothstep(0.42, 0.7, fres) * smoothstep(0.02, 0.4, dot(N, uRimDir));
  col += uRimCol * rim * uRimK;
  col *= mix(1.0, uBackK, back);
  if (vInk > 0.5) col = uInk;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export type ToonOpts = { col?: string | THREE.Color; map?: THREE.Texture | null; spec?: number; gloss?: number; tint?: boolean; side?: THREE.Side; backK?: number };
export const toon = (L: PegLight, o: ToonOpts = {}) => new THREE.ShaderMaterial({
  vertexShader: VS, fragmentShader: FS, side: o.side ?? THREE.FrontSide,
  uniforms: {
    ...L, uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uMap: { value: o.map ?? null }, uHasMap: { value: o.map ? 1 : 0 },
    uHasTint: { value: o.tint ? 1 : 0 }, uSpec: { value: o.spec ?? 0.12 }, uGloss: { value: o.gloss ?? 24 }, uBackK: { value: o.backK ?? 0.55 },
  },
});

const OVS = /* glsl */ `
uniform float uPx; uniform vec2 uRes; uniform float uW;
void main() {
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec3 nv = normalize(normalMatrix * normal);
  vec2 nc = (projectionMatrix * vec4(nv, 0.0)).xy;
  float l = length(nc);
  nc = l > 1e-5 ? nc / l : vec2(0.0);
  clip.xy += nc * (uPx * uW * 2.0 / uRes) * clip.w;
  gl_Position = clip;
}`;
const OFS = /* glsl */ `
uniform vec3 uInk;
void main() { gl_FragColor = vec4(uInk, 1.0);
  #include <colorspace_fragment>
}`;
/** inverted hull ink line, constant width in screen pixels (uPx at the uRes render size), w = per-part width factor */
export const inkMat = (L: PegLight, w = 1) => new THREE.ShaderMaterial({
  vertexShader: OVS, fragmentShader: OFS, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
  uniforms: { uPx: L.uPx, uRes: L.uRes, uInk: L.uInk, uW: { value: w } },
});
