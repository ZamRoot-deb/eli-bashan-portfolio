# EZB-OS: Eli Zamar Bashan

Personal site of Eli Zamar Bashan, DFIR Lead and AI Engineer (Accra, Ghana), built as a terminal arcade game:
ten zones, a live HUD, XP and achievements, four mini-games, an in-page terminal and Sanko, the mascot.

- Static site: Vite 7 + vanilla TypeScript, zero runtime dependencies.
- Every zone is pre-rendered into `index.html` at build time from `src/content.ts`, so the page reads fine
  before any script runs; `src/main.ts` adds the motion, HUD and games on top.
- Brand icons are vendored under `public/icons/` (sources and licences in `ICONS.md`).

## Edit the content

All words, numbers and links live in `src/content.ts`. Change them there and rebuild; nothing else needs touching.
Stack items map to icons by their exact name in `src/icons.ts`.

## Build

```bash
npm install
npm run build
```

The output in `dist/` is plain static files with relative paths, so it works on any static host or sub-path
(GitHub Pages, Netlify, an nginx folder).

## Verify

```bash
node tools/verify.mjs
node tools/check-static.mjs
```

`verify.mjs` serves `dist/` on a throwaway local port, drives headless Chrome through every zone, overlay and
game (keyboard and pointer), and prints one PASS/FAIL line per check. There is no dev server in this project
on purpose.

## Secrets for players

Press the backquote key for the terminal. There is a flag to find.
