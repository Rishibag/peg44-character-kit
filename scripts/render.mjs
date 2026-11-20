// One-command still renderer:  node scripts/render.mjs <Composition> <out.png> [frame]
// Uses system Google Chrome when installed (no download); otherwise Remotion downloads its own headless browser once.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [comp = "Lineup", out = `out/${(process.argv[2] ?? "lineup").toLowerCase()}.png`, frame = "45"] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const chromes = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"];
const chrome = chromes.find((p) => existsSync(p));
const args = ["remotion", "still", "examples/remotion/index.ts", comp, out, `--frame=${frame}`, "--gl=angle", "--log=error"];
if (chrome) args.push(`--browser-executable=${chrome}`);
console.log(`rendering ${comp} frame ${frame} -> ${out}${chrome ? " (system Chrome)" : ""}`);
const r = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(r.status ?? 1);
