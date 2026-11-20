---
name: peg44-character-kit
description: Build and animate peg44 3D toy characters (Factory 44 v2 style) in code with Three.js or Remotion, using 12 ready presets, 22 outfit recipes, seeded distinct extras and an acting system.
---

# peg44 character kit

Volumetric 3D "toy" characters drawn entirely in code: big acting faces (10 expressions, 11 mouths, animated
brows, blinks), 4-finger hands, bendable limbs, a constant-width ink outline, toon shading and planted feet.
No image/video AI, no Blender, no downloaded models. Works in plain Three.js and in Remotion (`@remotion/three`).

Rendered proof: `renders/lineup.png` (all 12 presets), `renders/outfits.png` (Vic + Molly x 4 outfits),
`renders/garment.png` (the new-garment worked example), `renders/talk-frame60.png` (one acting frame, 9:16).

## Quick start (one command each)
Needs Node.js 18+ and Google Chrome (Remotion uses the installed Chrome; otherwise it downloads its own once).
```bash
npm run setup      # install (three 0.170, remotion 4.0.370, react 19.1) - everything is a normal dependency
npm run lineup     # -> out/lineup.png   all presets side by side
npm run outfits    # -> out/outfits.png  Vic + Molly in 4 outfits each
npm run garment    # -> out/garment.png  the "rugby" top added in docs/OUTFITS-AND-VARIATIONS.md
npm run talk       # -> out/talk.mp4     3 s 9:16 acting clip (Vic talks, gets a shock, grins)
npm run studio     # Remotion Studio preview of all compositions
npm run three      # plain Three.js build -> open examples/three/index.html (keys 1 / 2)
npm run typecheck
```
`node scripts/render.mjs <Composition> <out.png> [frame]` renders any still. Render videos with `--concurrency 1`.

## Folder map
| Path | What |
|---|---|
| `code/index.ts` | everything is exported from here |
| `code/spec.ts` | `CharacterSpec` - the whole look of a character as data |
| `code/rig.ts` | `createCharacter(spec)` -> `PegChar` (meshes, `pose()`, `light()`, `dispose()`) |
| `code/kit.ts` | body types, skin/hair palettes, expressions, mouths, hand shapes, `PegPose` |
| `code/face.ts` | face painter and all garment texture painters (`paintTorso`, `paintOuter` ...) |
| `code/acting.ts` | `Acting` keyframe performance (talk, nod, shock, laugh, wave, point, holdCup ...), `walkPath` |
| `code/outfits.ts` | `OUTFITS` recipes, `FABRIC` / `SHOE` / `METAL` palettes, `variant()` |
| `code/extras.ts` | `makeExtra(seed)`, `makeCrowd(n, seed)` - distinct background people |
| `code/studio.ts` | `LIGHT` presets, `setupRenderer`, `lightAll`, `createStudio` (cyclorama + sun + shadows) |
| `code/presets/` | Vic, Molly (+4 variants each) and 10 more characters |
| `examples/shared/` | `buildLineup()` and the lineup item lists (shared by both examples) |
| `examples/remotion/` | `Root.tsx` (Lineup, Outfits, Garment, Talk), `LineupScene.tsx`, `TalkScene.tsx` |
| `examples/three/` | plain Three.js page |
| `docs/` | design guide, outfits + variations, tips and tricks |

## Core API (5 calls)
```ts
import * as THREE from "three";
import { createCharacter, createStudio, Acting, PRESETS, LIGHT, setupRenderer, OUTFITS, variant, makeCrowd } from "./code";

setupRenderer(renderer);                         // NeutralToneMapping, exposure 1.0, sRGB, soft shadows
const studio = createStudio();                   // sunny cyclorama; scene.add(studio.group); scene.background = studio.background
const vic = createCharacter(PRESETS.vic);        // or createCharacter({ ...your CharacterSpec })
scene.add(vic.root);
const act = new Acting(vic, { seed: 3 }).expr(0, "neutral").talk(10, 50, [18, 34]).expr(52, "shock").shock(52).expr(74, "grin");

// EVERY FRAME, after the camera has moved:
vic.pose(act.at(frame, { x: 0, z: 0, yaw: 0.2 }));     // floor position + facing (+ y for risers, + walkPath fields)
studio.aimSun(camera);                                  // keeps the sun behind the camera (rel 40 deg, el 50 deg)
vic.light(camera, { ...LIGHT.sunny, res: [w, h] });     // neutral face key + one-edge rim + ink width for this size
// many characters: lightAll(chars, camera, [w, h], "sunny", { px: 2.0 })
```
- New look: write a `CharacterSpec` (see `code/presets/cast.ts` for 10 examples) - body, skin, face, hair, glasses,
  `outfit { top, outer?, bottom, shoes, hat? }`, accessories, `wear { grime, wet }`, `sit` / `recline`.
- Outfits: `outfit: OUTFITS.chef()` or with overrides `OUTFITS.police({ outer: { trim: METAL.gold } })`.
- Same person, other clothes: `variant(PRESETS.molly, { outfit: OUTFITS.casual(), wear: { grime: 0.4 } })`.
- Crowd: `makeCrowd(8, 42).map(createCharacter)` - silhouettes never repeat. Never reuse a seed in one scene.
- Free posing without `Acting`: `vic.pose({ x, z, yaw, face: face("happy"), armR: { fwd: 1.2, out: 0.8, bend: 0.1 }, handR: "point" })`.
- Remotion integration pattern = `examples/remotion/TalkScene.tsx` (build in `useMemo`, pose + light per frame).
- Call `char.dispose()` when a character is removed.

## A new character, the efficient way (data, not code)
1. Start from the closest preset (`code/presets/cast.ts`) and change only 2-3 anchors: body type, hair, one garment colour.
   A whole new spec from zero is slower and drifts off-style.
2. Tell-apart test: next to the rest of the cast, every person must differ in body type + hair + one strong colour.
   Extras: `makeCrowd(n, seed)`, never the same seed twice in a scene.
3. Cast to fit the story: real people, country, period. Clothes match the world (polar = padded parka in
   orange/red/khaki/navy with a fur hat, never black; surgery = gown).
4. Same person, other scene = `variant(spec, { outfit: ... })`, not a new character.
5. Furniture: `sit` (seat height) + `recline` (lean back) instead of standing poses; props that touch the body
   (pillows, sheets) are round and attach to the character so they move with it.
6. Check ONE still (`node scripts/render.mjs Talk out/check.png 60`) before animating a whole scene.
7. New code only for a genuinely new garment or pose: add it once to `code/outfits.ts` / `code/kit.ts`
   (worked example: `docs/OUTFITS-AND-VARIATIONS.md`) and reuse it forever.

## Style rules (non-negotiable - they ARE the look)
1. Proportions: big head, total height 3.4-4.9 heads for adults (head:body about 1:3.5-4), child 3.4 heads. 4-finger hands.
2. Faces act: 10 expressions + 11 mouths + animated brows. Change expression every 0.8-1.5 s (24-45 f) with clear holds;
   arms calm except on the 1-2 biggest beats. Never leave a visible face unchanged for more than ~50 frames.
3. One constant-width ink outline (`INK #1d1519`, purple-neutral, never #000). Default 4.4 px at 1080 px wide for
   mediums/close-ups; use `px` 1.8-2.6 for wide shots and lineups.
4. Lighting: NEUTRAL camera-relative key on every face - dark skin is never in shade. Scene colour only as a rim on
   ONE edge (sunny: `#ffcc80`, rimK 0.72, rimSide +1 because the sun sits screen-right). NeutralToneMapping, exposure 1.0.
5. Feet planted: contact shadow + real sun shadow; walking only through `walkPath` (planted steps).
6. Every extra distinct (body / hair / glasses / moustache / skin / garment colour); use `makeCrowd`.
7. Colour targets for a frame: mean value 0.55-0.60, mean saturation 0.35-0.55, whites #f8f8f8-#fefefe,
   blacks purple-neutral #120f1e-#151221 (never navy, never pure black). Garment colours from `FABRIC`.
8. No on-screen text (tiny diegetic prop markings only).
9. Characters always sharp (depth of field only on the set).

## Read next
- `docs/CHARACTER-DESIGN-GUIDE.md` - proportions table, faces, skin/hair palettes, designing a new character, checklist.
- `docs/OUTFITS-AND-VARIATIONS.md` - every garment option, recipes, variants, wear, and how to add a new garment (worked example).
- `docs/TIPS-AND-TRICKS.md` - acting cadence, camera/framing, lighting, performance, common mistakes and fixes.
- Full short-film pipeline, building new worlds/sets, and every production lesson: the companion repo
  `factory44-3d-short` -> `references/WORKFLOW.md`, `references/BUILD-WORLDS-AND-CHARACTERS.md`,
  `references/TIPS-AND-TRICKS.md`, worked example `examples/short11-antarctica/`.
