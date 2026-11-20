# gta6-cover-art-maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/banglento/gta6-cover-art-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/banglento/gta6-cover-art-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover is an offline, in-browser multi-panel poster maker that turns your own photos and a caption into GTA-style cover art. Drop in one photo or several, pick a layout (Full, Split, Strip with a hero panel, or a 2×2 Grid), then drag any panel to reframe it, scroll to zoom, flip it, or push its framing to every panel. Three canvas colour grades — Sunset, Neon and Vice City — plus vignette and film grain give the artwork its heat, and huge slanted condensed captions (with tagline, tracking, outline, drop shadow and gradient fills) are set in bundled OFL fonts Anton and Bebas Neue. Export a share-ready PNG at 1080×1080, 1080×1350 or 1920×1080 with one click; a Shuffle button and six preset captions remix the whole cover instantly, and deterministic `?shot=` modes reproduce any cover exactly. No uploads, no network at run time, no build step — everything happens on your device.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 (use `--port N` for a different port). The live preview also renders straight from `file://`, but PNG export needs the local server because browsers block canvas export on `file://` pages.

## Credits & licences

- Fonts under `app/fonts/` are **Anton** and **Bebas Neue**, both under the SIL Open Font License 1.1; the licence texts are included (`OFL-Anton.txt`, `OFL.txt`).
- Sample photos under `app/samples/` were generated with an image model for make.fun and are free to use.
- No Rockstar Games logos, artwork, characters or fonts are used anywhere in this app.

<sub>Entered on [make.fun](https://make.fun/?r=d4q39cjn&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
