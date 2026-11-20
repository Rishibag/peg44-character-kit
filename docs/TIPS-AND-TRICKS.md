# Tips and tricks

## Acting
- Cadence: a new expression every 0.8-1.5 s (24-45 frames at 30 fps), then HOLD. Readable, not hyperactive.
  Blinks alone do not count as a change; a face that stays identical for more than ~50 frames looks dead.
- Order on a beat: eyes/brows first (frame 0), head 2-3 f later, arms 4-6 f later, settle 20-30 f after.
  `shock(at)` already does this. Big arm moves (`cheer`, `shock`, `point`) only on the 1-2 biggest beats of a shot.
- Dialogue: `talk(a, b, stressFrames)` flaps the mouth every 4 f, nods + raises brows on each stress frame and makes a
  hand gesture on every 2nd stress. Put stress frames on the stressed syllables of the voiceover.
  Listener reactions: `nod`, `expr("think")`, `look(at, x, y)` - a listener that never reacts reads as a prop.
- Chain presets with `.expr()` changes between them: `act.expr(0,"neutral").talk(10,60,[20,44]).expr(64,"worried").headShake(66)`.
- `Acting` options: `seed` (different idle drift per character - give every character its own), `idle` (0 = frozen,
  0.4 for stills, 1 default), `autoBlink` (off for stills/lineups so nobody is caught mid-blink).
- Raw control: `key(at, { "armR.fwd": 0.6, "armR.bend": 1.4, headRoll: 0.1 }, dur, "spring" | "smooth" | "linear")`,
  `toRest(at)`, `hand(at, "R", "grip")`, `prop(at, "R", "cup")`, `mouth(at, "talkO")`, `eyesAt(at, "closed")`.
  Arms: L = character's left = screen-right when facing the camera. `fwd` raises forward, `out` raises sideways
  (2.5 = overhead), `bend` = elbow, `twist` = forearm roll.
- Walking: spread `walkPath(f, a, b, [x0,z0], [x1,z1], char.B.stride)` into the `at()` place - steps are planted.
  Start/stop eases are built in; turn the character to camera after arriving with a `yaw` key in your own code.
- Seated: `sit: 0.45` (seat height m), `recline: 0.3`.

## Camera and framing
- Default angle: low, near-ground hero shot looking slightly up; mediums and two-shots for dialogue; face close-ups only
  for punchlines; extreme wides for scale. Keep the camera moving slowly in most frames.
- Never crop heads (hair/hat included); check the LAST frame of each shot for drift.
- Long lenses (fov 18-30) flatter the toy proportions; very wide lenses (fov > 50) close to a face distort the head.
- Lineups / group shots: `buildLineup(items, { gap, fov, px })` in `examples/shared/lineup.ts` spaces characters by
  body width and frames head-to-toe automatically. Use a wide canvas (3000x1100+) for 8+ characters.

## Lighting and colour
- Always call `char.light(camera, ...)` (or `lightAll`) EVERY frame AFTER the camera moves - the face key is camera-relative.
- Rim side: `rimSide: +1` = rim on the screen-right edge. `studio.aimSun(cam, target, 40, 50)` puts the sun behind
  the camera to screen-right, so the sunny preset uses +1. If you aim the sun with a negative `rel`, flip `rimSide` to -1.
- Presets: `LIGHT.sunny` (warm #ffcc80 rim), `studio` (cool cyan rim, pose-test stage), `overcast`, `interior`
  (warm lamp), `night` (moon-blue rim, faces still lit). Do not put a coloured key on faces - only the rim takes colour.
- Ink width: `px` 4.4 default (mediums/close-ups at 1080 px). Wide shots / lineups: 1.8-2.6. It also scales with
  render width (`res`) and distance, so pass the real drawing-buffer size.
- Renderer: `setupRenderer(gl)` = NeutralToneMapping, exposure 1.0, sRGB, PCF soft shadows. Do not use ACES (it
  muddies skin and yellows the whites).
- Measure finished frames: mean value 0.55-0.60, saturation 0.35-0.55; whites #f8f8f8-#fefefe; blacks #120f1e-#151221.
  Too dark -> raise the set, not the characters' exposure; too grey -> more saturated set colours, not a rim boost.

## Performance
- Build characters ONCE (`useMemo` in Remotion) and only call `pose()` + `light()` per frame. Building paints the
  face canvas and torso texture, so it is the expensive part; posing is cheap.
- The face texture is repainted only when the face state changes (cached by `faceKey`), so held expressions are free.
- 20+ characters: use `px` 2 and lower shadow map size if needed (`studio.sun.shadow.mapSize`).
- Render with `--concurrency 1 --gl=angle` (one Chrome, GPU via ANGLE). Set `REMOTION_TMP` / `TMPDIR` to an
  ABSOLUTE path if the system temp disk is small.
- `char.dispose()` frees geometry, materials and the face texture when characters leave a long scene.

## Common mistakes -> fixes
| Symptom | Fix |
|---|---|
| Face looks muddy / orange / in shadow | `light()` not called after the camera moved, or a coloured key - use the presets |
| Outline thick and blobby in a wide | pass `px` 1.8-2.6 (`lightAll(chars, cam, res, "sunny", { px: 2 })`) |
| Outline thin / flickers in a close-up | pass the real drawing-buffer size as `res` |
| Characters look like clones | different body type + hair style + anchor colours; extras via `makeCrowd` |
| Hat hides the identity (e.g. balding grandpa) | drop the hat or pick one that shows the hairline |
| Feet float or sink on a step | pass `y` = riser height in the `at()` place |
| Arm goes through the neighbour | add gap or yaw the character; check arm `out` values in group shots |
| Twitchy acting | fewer expression changes, longer holds, `smooth` ease for body, `spring` only for gestures |
| Blink caught in a still | `autoBlink: false` for stills |
| Remotion "output.path is not an absolute path" | `REMOTION_TMP` / `TMPDIR` must be absolute |
| `npm install` skips TypeScript / esbuild | the kit lists them as normal dependencies on purpose (some setups run with `omit=dev`) |
| A box-shaped pillow/sheet reads as "a rectangle block on top of" the character | soft goods are round: cylinders on their side, squashed spheres |
| A standing pose where the story needs lying down (surgery, sickbed) | `sit` + `recline`; attach pillows/sheet to the hips |
| "No struggle" in a pain scene | break the calm-acting rule for that beat: gritted teeth, sweat, eyes shut, head rolling back |
| Helpers in the scene do nothing | give them visible jobs with their hands (hold, raise, wipe, pass) and keep them in frame |
| Character shot shows a flat wall instead of the person | the character stands outside the room bounds - check positions before framing |

## Production lessons (from the Factory 44 shorts)
- Look at a still of every new character in its real set before rendering a scene; fix in data, re-still, then render once.
- Cheapest fixes are data edits (spec fields, poses, camera framing); a new garment is the only thing worth new code.
