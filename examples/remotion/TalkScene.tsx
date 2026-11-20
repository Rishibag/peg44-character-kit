// The smallest useful scene: ONE character acting in the sunny studio, 9:16, 3 s. Copy this file to start a new shot.
// Pattern: build once in useMemo -> every frame: move camera, pose from Acting, aim sun, light. Nothing else.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { createCharacter, createStudio, Acting, PRESETS, LIGHT, setupRenderer } from "../../code";

const Inner: React.FC<{ f: number }> = ({ f }) => {
  const { camera, gl, scene } = useThree();
  const S = useMemo(() => {
    const studio = createStudio();
    const vic = createCharacter(PRESETS.vic);
    // calm cadence: a new expression every 0.8-1.5 s (24-45 f) with clear holds
    const act = new Acting(vic, { seed: 3 })
      .expr(0, "neutral").talk(10, 50, [18, 34])            // says a line, nods + one hand gesture on the stresses
      .expr(52, "shock").shock(52, 18)                      // big beat
      .expr(74, "grin").nod(76, 1);                         // payoff
    const root = new THREE.Group(); root.add(studio.group, vic.root);
    return { studio, vic, act, root };
  }, []);
  useMemo(() => { setupRenderer(gl); scene.background = S.studio.background; }, [gl, scene, S]);
  const v = gl.getDrawingBufferSize(new THREE.Vector2());
  const cam = camera as THREE.PerspectiveCamera;
  // low medium shot with a slow push-in (camera moving in most frames)
  const push = f / 90;
  cam.fov = 30; cam.aspect = v.x / v.y; cam.position.set(0.35 - push * 0.1, 1.05, 4.4 - push * 0.5); cam.lookAt(0, 1.0, 0);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  S.vic.pose(S.act.at(f, { x: 0, z: 0, yaw: 0.18 }));
  S.studio.aimSun(cam);                                    // sun behind the camera, 40 deg to the side, 50 deg up
  S.vic.light(cam, { ...LIGHT.sunny, res: [v.x, v.y] });   // neutral face key + warm one-edge rim, ink 4.4 px
  return <primitive object={S.root} dispose={null} />;
};

export const TalkScene: React.FC = () => {
  const f = useCurrentFrame(), { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true }} camera={{ fov: 30, near: 0.1, far: 200 }}>
        <Inner f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
