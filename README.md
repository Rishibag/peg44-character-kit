# peg44 character kit

3D toy characters in the approved Factory 44 v2 look, made 100 % in code (Three.js + Remotion).

**Start here:** `SKILL.md` (quick start, API, style rules). Pictures: `renders/`.

```bash
npm run setup     # once
npm run lineup    # renders out/lineup.png - if this works, everything works
```

- `code/` - the kit (import everything from `code/index.ts`)
- `code/presets/` - Vic, Molly and 10 more ready characters
- `examples/` - Remotion compositions (Lineup, Outfits, Garment, Talk) and a plain Three.js page
- `docs/` - character design guide, outfits + variations (with a new-garment walkthrough), tips and tricks
- `renders/` - lineup.png, outfits.png, garment.png, talk-frame60.png

Versions are pinned: three 0.170.0, remotion 4.0.370, @react-three/fiber 9.8.2, react 19.1.0.
Rules: no AI image/video generation, no Blender, no on-screen text, render with `--concurrency 1`.

Companion repo: **factory44-3d-short** - the full short-film pipeline (voiceover -> story data -> QA -> render -> mix),
how to build new worlds/sets, and all production tips. This kit is the character half of it.
