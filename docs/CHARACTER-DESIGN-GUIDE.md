# Character design guide (peg44)

## 1. Proportions
Measured from `BODY` in `code/kit.ts` (standing height = ankle + leg + torso + neck + head; head = skull height without hair).
Female builds narrow the shoulders (x0.88) and waist (x0.86) and widen the hips (x1.05); seniors are x0.96 tall with a
slight hunch; teens are x0.92 tall with a x1.04 head.

| Body type | Height (m) | Head (m) | Total height in heads | Head % of height | Use for |
|---|---|---|---|---|---|
| `tall` | 1.84 | 0.375 | 4.9 | 20 % | officers, doctors, lanky types |
| `slim` | 1.66 | 0.365 | 4.5 | 22 % | office, teens, scientists |
| `average` | 1.63 | 0.37 | 4.4 | 23 % | default adult |
| `stocky` | 1.59 | 0.375 | 4.25 | 23.5 % | workers, Vic |
| `round` | 1.44 | 0.37 | 3.9 | 26 % | chefs, grandparents, Big Joe |
| `child` | 1.15 | 0.34 | 3.4 | 30 % | kids (Leo) |

Hair, hats and the big eyes make the head READ larger than the table (visually about 1:3.5-4 for adults).
Tweak per character with `body: { height: 0.97, girth: 1.12, headScale: 1.05 }` - stay inside height 0.9-1.1,
girth 0.85-1.2, headScale 0.95-1.1 or the family look breaks.

Silhouette rules: rounded head with a slightly flat top tapering to a rounded jaw, short neck, slightly tapered boxy
torso, chunky rounded pill shoes, 4 fingers, hidden elbows/knees (limbs bend in smooth arcs).

## 2. Faces
- Eyes: white + pupil + highlight, `eyeColor` any hex. Eye kinds: open, happy, wide, angry, sad, closed (+ `lid`, `squint`).
- Brows: separate, thick-ish, animated (`up` -1..1, `tilt` + = worried inner-up / - = angry). `brows: thin | normal | thick`, `browColor`.
- 11 mouths: neutral, flat, smile, grin, talkA, talkO, talkE, frown, shock, smirk, wavy (`mouthK` scales opening).
- 10 named expressions (`EXPR`): neutral, happy, grin, talk, shock, worried, angry, sad, smug, think.
- Nose: button | long | wide | small. Ears always on.
- Identity marks (pick 1-2 per main character so they read at a distance):
  `freckles`, `blush` 0-1, `stubble` (true or hex), `wrinkles`, `scar` (leftBrow | rightBrow | leftCheek | rightCheek),
  `mole` (left | right), `lips` hex, `lashes`, `moustache` (brush | walrus | pencil), `goatee`.
- Glasses: round | square | sun, any frame colour (`METAL.tortoise`, `METAL.gold` ...). Earrings / necklace are accessories.

## 3. Skin and hair
`SKIN` (all tested under the neutral key): porcelain `#f6d9c4`, light `#f2c9a8`, peach `#f0c4a0`, medium `#d9a274`,
tan `#c98d64`, olive `#c49a6c`, brown `#a66a43`, dark `#6b4029`, deep `#5c3522`. Any hex works - keep value 0.40-0.97
and saturation 0.18-0.45.

`HAIR`: black `#1f1a1a` (never pure black), espresso, darkBrown, brown, chestnut, auburn, copper, ginger, caramel,
blonde, platinum, grey, silver, white.
Hair styles: side, curly, afro, slick, crew, buzz, quiff, ponytail (`tie` colour), bun, bob, long, balding, bald
(+ `sideburns`). Hats: helmet, hardhat, climbing, cap, police, ushanka, beanie, chef, fedora - a hat hides most of the
hair, so do not put a hat on a character whose hair is part of the identity (Walt is balding, so he has no cap).

## 4. Designing a new character (recipe)
1. One sentence brief: age, job, personality. ("Nadia, 40s, ferry captain, calm and dry.")
2. Body type from the table, build, age. Then ONE silhouette hook nobody else in the cast has
   (hair shape, hat, coat length, body type).
3. Skin + eye colour + 1-2 identity marks.
4. Outfit: start from an `OUTFITS` recipe, then give the character 2-3 anchor colours from `FABRIC` that no other
   main character uses (Vic = rust + olive, Molly = butter yellow + teal + coral). Keep anchors in every variant.
5. Accessories that tell the job (stethoscope, idBadge, toolBelt, harness, ropeCoil, chalkBag, backpack, scarf, watch,
   badge, glovesBackPocket, necklace, earrings).
6. Render a lineup with your character next to 2-3 presets (`examples/shared/scenes.ts`, `npm run lineup`) and run the checklist.

```ts
export const NADIA: CharacterSpec = {
  name: "Nadia", body: { type: "average", build: "female", height: 1.02 }, skin: "olive",
  face: { eyeColor: "#4f6b3a", brows: "thick", mole: "right", lips: "#9a4048" },
  hair: { style: "bob", color: HAIR.espresso },
  outfit: OUTFITS.police({ top: { color: FABRIC.offWhite, tie: FABRIC.navy }, outer: { color: FABRIC.navy, trim: METAL.gold },
    bottom: { color: FABRIC.navy }, hat: { type: "cap", color: FABRIC.navy, band: METAL.gold } }),
  accessories: ["watch"],
};
```

## 5. The presets (copy and adapt)
| Key | Who | Hook |
|---|---|---|
| `vic` | stocky worker, tan skin, scar through left brow, stubble | quiff + sideburns, rust work shirt with rolled sleeves, gloves in back pocket |
| `molly` | slim scientist, peach skin, freckles | copper high ponytail, round tortoise glasses, butter-yellow knee lab coat |
| `leo` | 8-year-old | curly hair, red striped tee, shorts, teal backpack |
| `rosa` | grandma | silver bun, round gold glasses, sage cardigan, plum skirt, pearls |
| `marco` | chef | round body, walrus moustache, double-breasted jacket + toque |
| `dana` | police officer | tall, dark skin, peaked cap, gold trim |
| `priya` | office | slim, long hair, coral blouse, charcoal blazer, ID lanyard |
| `joe` | construction | big round, goatee, hi-vis vest, hard hat, tool belt |
| `okafor` | doctor | tall, deep skin, square glasses, white coat, stethoscope |
| `kai` | rock climber | black bob, climbing helmet, tank, harness, rope coil, chalk bag |
| `walt` | grandpa | balding white hair, walrus moustache, brown cardigan |
| `zoe` | 15-year-old | afro, plum hoodie, cuffed light jeans, coral-accent sneakers |

Variants: `VIC_VARIANTS` (work, sooty, winter, sunday), `MOLLY_VARIANTS` (lab, weekend, field, conference).

## 6. Checklist before using a new character
- [ ] Reads in silhouette at lineup size (head shape, hair, hat or coat length differs from every neighbour).
- [ ] Face is lit in every shot (neutral key) - check dark skin especially; scene colour only on one edge.
- [ ] Ink outline is one even width; no gaps, no double lines (use `px` 1.8-2.6 in wides).
- [ ] No pure black/white: hair darkest `#1f1a1a`, garments from `FABRIC`, whites `#f4f1ea`-ish (they render near #f8f8f8).
- [ ] Hands: 4 fingers, pose matches the action (`grip` for props, `point`, `open` for gestures, `fist` for anger/cheer).
- [ ] Feet on the floor (use `y` on risers), contact shadow visible.
- [ ] Expression changes every 0.8-1.5 s with holds; no constant twitching.
- [ ] Extras: from `makeCrowd`, no repeated seeds, no clone of a main character.
