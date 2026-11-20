// Hand-in plumbing for "Vice Cover", my gta6-cover-art-01 entry (Node 22+, standard library only).
// The app itself lives in app/: a static, fully offline multi-panel cover-art maker. It takes the
// user's own photos (or the two bundled AI-generated samples), composes them into full-bleed,
// split, comic-strip or 2x2-grid poster layouts with per-panel drag/zoom cropping, grades them
// with sunset / neon / vice-city canvas colour presets, sets huge slanted condensed captions
// (local OFL fonts: Anton + Bebas Neue) and exports PNGs at 1080x1080, 1080x1350 or 1920x1080.
// This program does not make art: it copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json (the judge's summary) via the vendored make.fun library.
// screenshots/ holds my own captures: an exported landscape cover first, then the editor and
// square/portrait covers.
//
// Try it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
