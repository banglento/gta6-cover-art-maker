// Vice Cover — multi-panel poster maker (make.fun entry gta6-cover-art-01).
//
// This is my build of an offline, browser-only cover-art studio: it takes the
// user's own photos, lays them out in GTA-style multi-panel posters (full,
// split, strip, grid), lets each panel be dragged/zoomed/flipped into place,
// grades everything with sunset / neon / Vice City canvas effects, and sets a
// huge slanted condensed caption in bundled OFL fonts (Anton + Bebas Neue).
// The finished cover exports as a PNG at 1080x1080, 1080x1350 or 1920x1080.
// No uploads, no network at run time, no build step — just static files in app/.
//
// This entrypoint packages the entry for review: it copies app/ and
// screenshots/ into the output directory and writes dossier.json describing
// them, using the kit's dossier library in vendor/makefun-app.ts.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outDir, { recursive: true });

// Preflight: the review caps allow at most 4 screenshots of 256 KiB each, and
// the judge loses any entry whose screenshots show no exported cover — fail
// loudly here rather than shipping a broken dossier.
const shotsDir = join(root, 'screenshots');
const shotFiles = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => f.toLowerCase().endsWith('.png')).sort()
  : [];
if (shotFiles.length === 0 || shotFiles.length > 4) {
  throw new Error(`expected 1..4 screenshots, found ${shotFiles.length}`);
}
for (const f of shotFiles) {
  const n = statSync(join(shotsDir, f)).size;
  if (n > 262144) throw new Error(`screenshot ${f} is ${n} bytes (> 262144 cap)`);
}
if (!existsSync(join(root, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing');
}

for (const dir of ['app', 'screenshots']) {
  const src = join(root, dir);
  if (existsSync(src)) {
    cpSync(src, join(outDir, dir), { recursive: true });
    console.log(`copied ${dir}/ -> ${join(outDir, dir)}`);
  } else {
    console.warn(`warning: ${dir}/ not found, skipped`);
  }
}

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const dossierBytes = buildDossier(root, caps);
writeFileSync(join(outDir, 'dossier.json'), dossierBytes);
console.log(`wrote ${join(outDir, 'dossier.json')} (${dossierBytes.length} bytes)`);
