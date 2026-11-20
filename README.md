# gta6-cover-art-maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/banglento/gta6-cover-art-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/banglento/gta6-cover-art-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover is an offline, in-browser cover-art maker that turns your photos and a caption into multi-panel poster art in the style of a certain sun-soaked crime-game cover: pick a full-bleed, two-panel split, three-panel comic strip or four-panel grid layout, drop one or several photos into the panels, drag to pan and scroll or slide to zoom each crop, then grade everything with Sunset, Neon or Vice City colour presets (warm gradients, split-toning, vignette and film grain, all done on canvas). Captions are set in huge slanted condensed capitals with a black outline, white or gradient fill and a tracked-out tagline, using bundled SIL OFL fonts (Anton and Bebas Neue). Export a share-ready PNG at 1080×1080, 1080×1350 or 1920×1080 with one click — a shuffle button, preset captions and deterministic `?shot=` screenshot modes included. No uploads, no network, no build step: every pixel is rendered on your own machine.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — add photos (or press a sample button), pick a layout, type a caption, hit **Export PNG**. Nothing is uploaded and nothing is fetched: every pixel is rendered on your machine.

Fonts under `app/fonts/` are Anton and Bebas Neue, both licensed under the SIL Open Font License 1.1 (licence texts included). Sample photos under `app/samples/` were generated with an image model for make.fun. No Rockstar Games logos, artwork, characters or fonts are used. The preview also renders when `app/index.html` is opened directly from disk; PNG export uses `node serve.ts` because browsers block canvas export on `file://` pages.

<sub>Entered on [make.fun](https://make.fun/?r=d4q39cjn&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>