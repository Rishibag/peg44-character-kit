// Remotion + @remotion/three wrapper around the shared lineup scene. This is the whole integration pattern:
// build once (useMemo), then pose + light every frame from useCurrentFrame().
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { buildLineup } from "../shared/lineup";
import { LINEUP, OUTFIT_LINEUP, GARMENT_LINEUP } from "../shared/scenes";
import { setupRenderer } from "../../code";

const Inner: React.FC<{ f: number; which: "lineup" | "outfits" | "garment" }> = ({ f, which }) => {
  const { camera, gl, scene } = useThree();
  const S = useMemo(() => (which === "lineup" ? buildLineup(LINEUP, { gap: 0.18 }) : which === "outfits" ? buildLineup(OUTFIT_LINEUP, { gap: 0.3, px: 2.6 }) : buildLineup(GARMENT_LINEUP, { gap: 0.35, px: 3.2 })), [which]);
  useMemo(() => { setupRenderer(gl); scene.background = S.background; }, [gl, scene, S]);
  const v = gl.getDrawingBufferSize(new THREE.Vector2());
  S.update(f, camera as THREE.PerspectiveCamera, [v.x, v.y]);
  return <primitive object={S.root} dispose={null} />;
};

export const LineupScene: React.FC<{ which: "lineup" | "outfits" | "garment" }> = ({ which }) => {
  const f = useCurrentFrame(), { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ fov: 22, near: 0.1, far: 200 }}>
        <Inner f={f} which={which} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
