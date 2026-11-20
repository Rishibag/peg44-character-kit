// Remotion compositions: "Lineup" (all presets) and "Outfits" (Vic + Molly x 4). Both animate (idle, waves, blinks off)
// and are rendered as stills at frame 45 by `npm run lineup` / `npm run outfits`.
import React from "react";
import { Composition } from "remotion";
import { LineupScene } from "./LineupScene";
import { TalkScene } from "./TalkScene";
import { LINEUP, OUTFIT_LINEUP } from "../shared/scenes";

export const Root: React.FC = () => (
  <>
    <Composition id="Lineup" component={LineupScene} durationInFrames={120} fps={30} width={3600} height={1100} defaultProps={{ which: "lineup" as const }} />
    <Composition id="Outfits" component={LineupScene} durationInFrames={120} fps={30} width={3000} height={1100} defaultProps={{ which: "outfits" as const }} />
    <Composition id="Garment" component={LineupScene} durationInFrames={120} fps={30} width={1600} height={1100} defaultProps={{ which: "garment" as const }} />
    <Composition id="Talk" component={TalkScene} durationInFrames={90} fps={30} width={1080} height={1920} />
  </>
);
void LINEUP; void OUTFIT_LINEUP;
