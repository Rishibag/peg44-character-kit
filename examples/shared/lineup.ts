// Shared lineup scene used by BOTH examples (plain Three.js and Remotion): characters side by side in the sunny studio,
// each with its own expression / gesture, framed head-to-toe with a long lens.
import * as THREE from "three";
import { createCharacter, createStudio, lightAll, Acting, PegChar, CharacterSpec, ExprName } from "../../code";

export type LineupItem = { spec: CharacterSpec; expr: ExprName; act?: (a: Acting) => void; yaw?: number };

export const buildLineup = (items: LineupItem[], o: { gap?: number; fov?: number; px?: number } = {}) => {
  const studio = createStudio();
  const root = new THREE.Group(); root.add(studio.group);
  const chars: PegChar[] = items.map((it) => createCharacter(it.spec));
  chars.forEach((c) => root.add(c.root));
  // x positions from body widths so big and small characters get fair spacing
  const gap = o.gap ?? 0.06, widths = chars.map((c) => Math.max(c.B.shW * 2 + 0.16, c.B.shoe[1] * 2 + c.B.stance * 2 + 0.08));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = -total / 2; const xs = widths.map((w) => { const c = x + w / 2; x += w + gap; return c; });
  const tallest = Math.max(...chars.map((c) => c.height + (c.R.hat ? 0.16 : 0.04)));
  const acts = items.map((it, k) => { const a = new Acting(chars[k], { seed: k + 1, autoBlink: false, idle: 0.4 }); a.expr(0, it.expr, false); it.act?.(a); return a; });
  const fov = o.fov ?? 22;
  const update = (f: number, cam: THREE.PerspectiveCamera, res: [number, number]) => {
    const aspect = res[0] / res[1], t = Math.tan((fov * Math.PI) / 360);
    const dist = Math.max((total * 1.03) / (2 * t * aspect), (tallest * 1.12) / (2 * t));
    const cy = tallest * 0.5;
    cam.fov = fov; cam.aspect = aspect; cam.near = 0.1; cam.far = 200;
    cam.position.set(0, cy + 0.05, dist); cam.lookAt(0, cy - 0.02, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    chars.forEach((c, k) => {
      const yaw = items[k].yaw ?? (k % 2 ? -0.16 : 0.16);
      c.pose(acts[k].at(f, { x: xs[k], z: 0, yaw }));
    });
    studio.aimSun(cam, new THREE.Vector3(0, 0, 0), 40, 50);
    lightAll(chars, cam, res, "sunny", { px: o.px ?? 2.0 });
  };
  return { root, chars, update, background: studio.background };
};
