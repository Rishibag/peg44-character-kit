// Plain Three.js lineup (no React, no Remotion). Build: `npm run three`, then open examples/three/index.html in Chrome.
// Press 1 = all presets, 2 = Vic + Molly outfit variations.
import * as THREE from "three";
import { setupRenderer } from "../../code";
import { buildLineup } from "../shared/lineup";
import { LINEUP, OUTFIT_LINEUP } from "../shared/scenes";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
setupRenderer(renderer);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);
let S = buildLineup(LINEUP, { gap: 0.18 });
const use = (s: ReturnType<typeof buildLineup>) => { scene.clear(); S = s; scene.add(S.root); scene.background = S.background; };
use(S);
window.addEventListener("keydown", (e) => { if (e.key === "1") use(buildLineup(LINEUP, { gap: 0.18 })); if (e.key === "2") use(buildLineup(OUTFIT_LINEUP, { gap: 0.3, px: 2.6 })); });
window.addEventListener("resize", () => renderer.setSize(window.innerWidth, window.innerHeight));
const t0 = performance.now();
const loop = () => {
  const f = Math.floor(((performance.now() - t0) / 1000) * 30);
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  S.update(f, camera, [v.x, v.y]);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
};
loop();
