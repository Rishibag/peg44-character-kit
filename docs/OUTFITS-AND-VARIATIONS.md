# Outfits and variations

A character's clothes are pure data in `CharacterSpec.outfit`:
```ts
outfit: { top: TopSpec; outer?: OuterSpec; bottom: BottomSpec; shoes: ShoeSpec; hat?: HatSpec }
```
All garments are painted into one torso texture plus sleeve / leg / shoe colours by `code/face.ts` (`paintTorso`,
`paintOuter`, `paintCoatSkirt`, `paintSkirt`) and shaped by `code/rig.ts` (coat flare, collars, hats, sleeves, legs).

## 1. Garment options
**Top** (`type`): tshirt, shirt, workshirt, polo, sweater, hoodie, blouse, tank, turtleneck, scrubs, rugby.
Options: `sleeves` long | rolled | short | none (defaults per type), `collar` none | crew | vee | shirt | turtle | hood,
`pockets` 0-2, `pocketFlaps`, `snaps` (snap colour), `buttons` (colour or false), `tie`, `stripe`, `trim`, `pens`, `tucked`.

**Outer** (`type`): labcoat, blazer, cardigan, jacket, parka, vest, hivis, apron, chef, police, gown.
Options: `length` hip | thigh | knee (labcoat + gown default knee), `open` (cardigan / vest / hivis default open;
labcoat + blazer default to the buttoned V look), `sleeves`, `trim`, `buttons`, `pens`.

**Bottom** (`type`): trousers, jeans, cargo, shorts, skirt. Options: `belt`, `cuffs`, `stripe` (side / reflective),
`tights`, `length` mini | knee (skirt).

**Shoes** (`type`): shoes, boots, sneakers. Options: `sole`, `accent`, `socks`.
**Hat** (`type`): helmet, hardhat, climbing, cap, police, ushanka, beanie, chef, fedora. Options: `color`, `band`.

**Accessories**: stethoscope, badge, idBadge, harness, ropeCoil, backpack, scarf, watch, glovesBackPocket, toolBelt,
chalkBag, necklace, earrings - as a string or `{ type, color }`.

**Wear** (variation layer on any outfit): `wear: { grime: 0..1, wet: true }` - soot/dirt patches painted on the face,
clothes and shoes (seeded, stable per character), wet darkens all fabrics.

## 2. Recipes (`OUTFITS`)
Professions: scientist, doctor, nurse, surgeon, chef, cook, police, office, suit, construction, mechanic, soldier,
climber, winter, casual, weekend, schoolkid, retiree, sporty. Eras: lab1940s, office1950s, seventies.

Every recipe takes per-garment overrides that are merged into the defaults; `hat: null` removes the hat;
replacing `outer` with a full object changes the outerwear.
```ts
outfit: OUTFITS.chef()
outfit: OUTFITS.police({ outer: { trim: METAL.gold }, hat: null })
outfit: OUTFITS.office({ top: { color: FABRIC.butter, tie: FABRIC.teal }, bottom: { type: "skirt", color: FABRIC.navy, length: "knee" } })
outfit: { ...OUTFITS.casual(), outer: { type: "jacket", color: FABRIC.olive } }
```
Palettes: `FABRIC` (neutrals offWhite...ink, blues/greens sky...olive, warms butter...brown, hiVisOrange/hiVisYellow),
`SHOE` (black, darkBrown, brown, tan, navy, white, grey, coral), `METAL` (brass, gold, silver, gunmetal, tortoise).
None of them is pure black or white - keep it that way for new colours.

## 3. Variations of one character
`variant(base, { outfit?, accessories?, wear?, hair?, face?, name? })` keeps body, skin, face and glasses and changes the
rest. Accessories are replaced only when given.
```ts
export const VIC_VARIANTS = {
  work: VIC,
  sooty: variant(VIC, { name: "Vic (after the blast)", wear: { grime: 0.75 } }),
  winter: variant(VIC, { accessories: [{ type: "scarf", color: FABRIC.mustard }],
    outfit: OUTFITS.winter({ top: { color: "#b35a2e" }, outer: { color: "#4e5a33", trim: "#d9c49a" }, hat: { color: "#3b4150" } }) }),
  sunday: variant(VIC, { accessories: [], outfit: OUTFITS.suit({ top: { tie: "#b35a2e" }, outer: { color: "#2f3a5a" } }) }),
};
```
Rules for variants that still read as the same person:
- Keep the character's 2-3 anchor colours somewhere (Vic's rust appears as the sweater in winter and the tie on Sunday;
  Molly keeps butter yellow + teal + coral in all four).
- Keep the hair silhouette visible; if a hat is needed, prefer one that shows the hairline (Molly's field hard hat
  keeps the ponytail).
- Change at most one of: coat length, body coverage, head gear per step in a story so the audience can follow.
- Story damage goes through `wear` (grime / wet), not through a new outfit.

See `renders/outfits.png` for both 4-way sets.

## 4. Worked example: adding a new garment (the "rugby" top)
The rugby shirt shipped in this kit was added exactly like this - copy the steps for any new garment.
Result: `renders/garment.png` (`npm run garment`).

**Step 1 - name it** in `code/spec.ts`:
```ts
export type TopType = "tshirt" | ... | "scrubs" | "rugby";
```
TypeScript now lists every place that must handle it. The only required one is the default collar map in
`resolveSpec` (same file):
```ts
const topCollar: Collar = top.collar ?? ({ ..., turtleneck: "turtle", rugby: "shirt", scrubs: "vee" } as const)[top.type];
```
Default sleeves are long unless the type is listed in the `topSleeves` line.

**Step 2 - paint it** in `code/face.ts`, inside the `switch (top.type)` of `paintTorso`. The torso texture is a
cylinder map: `M.X(angle)` (0 = chest centre, +-PI = back) and `M.Y(height in metres)` (0 = hips, `T` = shoulders),
`hemY` = where the top ends. Helpers: `fillA` (band), `hline`, `ribs` (knit cuff), `neckV` (open neck + collar),
`button`, `pocket`, `folds`. Always outline with `INK`.
```ts
case "rugby": {                                                  // hooped rugby shirt
  const hoop = top.stripe ?? lighten(C.top, 0.75);
  for (let y = hemY + 0.03; y < T - 0.02; y += 0.1) fillA(g, M, -Math.PI, Math.PI, y, y + 0.05, hoop);   // 5 cm hoops every 10 cm
  const yv = neckV(g, M, T, 0.88, 0.12, C.skin, top.trim ?? "#f4f1ea");                                 // open neck + white collar
  g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(M.X(0), M.Y(yv)); g.lineTo(M.X(0), M.Y(T * 0.7)); g.stroke();
  for (const y of [yv - 0.03, T * 0.74]) button(g, M.X(-0.04), M.Y(y), 4.5, top.trim ?? "#f4f1ea");
  ribs(g, M, hemY, hemY + 0.03, C.top);
  folds(g, M, hemY + 0.05, T * 0.5, [-0.42, 0.38], "rgba(60,20,40,0.10)");
  break;
}
```
**Step 3 - give it a recipe** in `code/outfits.ts` (optional but makes it one word to use):
```ts
sporty: (o?: O) => merge({ top: { type: "rugby", color: FABRIC.forest, stripe: FABRIC.butter }, bottom: { type: "shorts", color: FABRIC.navy },
  shoes: { type: "sneakers", color: SHOE.white, socks: FABRIC.forest } }, o),
```
**Step 4 - test it on three different bodies** (child, slim, round) - `GARMENT_LINEUP` in `examples/shared/scenes.ts`,
`npm run typecheck && npm run garment`. Check: pattern follows the body without stretching, outline even, colours not
pure white, hem and sleeves match.

**Other kinds of garment**
- New outerwear: add to `OuterType`, paint in `paintOuter` (`face.ts`); if it has no sleeves add it to the
  `outerHasSleeves` exclusion list in `resolveSpec`; long coats get the flare skirt automatically from `length`.
- New hat: add to `HatType` and build a small shell mesh in `rig.ts` next to the existing hats (look at `beanie` or
  `cap`); hats are meshes, not textures, so they get the ink outline and toon shading for free.
- New accessory: add to `AccessoryType`; flat ones (badges, logos without text) are painted in `face.ts`, volumetric ones
  (bags, coils) are meshes in `PegChar.buildAccessories()` (see `backpack`, `ropeCoil`, `scarf`).
- New held prop: extend `Prop` in `kit.ts` and add the mesh where `cup` is built in `rig.ts`; use `grip` hands.

## 5. Distinct extras
`makeExtra(seed, base?)` returns the same person for the same seed; `makeCrowd(n, seed, base?)` returns n people whose
body + hair style + main colour silhouettes never repeat. `base` pins anything (e.g. a crowd of nurses):
```ts
const staff = makeCrowd(6, 7, { outfit: OUTFITS.nurse() });
const lab = makeCrowd(5, 11, { outfit: { outer: { type: "labcoat", color: FABRIC.offWhite } } });
```
Never reuse a seed for two extras in one scene, and keep extras out of the main characters' anchor colours.
