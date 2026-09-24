# Brief: Eli Zamar Bashan portfolio, "EZB-OS"

## Goal
A single-page personal site that makes a DFIR / AI-engineering audience register the real scope of Eli's work
(5 shipped platforms, 50+ forensic reports, 7 roles, 16 certifications, 62 tools) through a terminal-GAME
interaction model: the architecture and interaction patterns of ashwingupta.dev, pushed much further into
motion graphics, gamification, original pixel characters and playable mini-games.

## Done-when (verified by tools/verify.mjs + tools/check-static.mjs, see GATES.md)
1. Content is exact: 5 platforms (full body + stack tags), 8 case types + 3 case stats, 7 roles (1 active),
   8 trophies + 4 impact stats, 8 stack groups totalling 62 items (16/12/4/5/7/10/3/5), 3 articles,
   3 education entries, 16 certifications, 4 contact rows (CV, email, phone, location). No invented numbers,
   no invented links (no GitHub/LinkedIn: absent from the source).
2. Every stack item shows a real icon (brand logo where one exists, a category-tinted concept glyph for
   capability phrases), vendored locally, provenance in ICONS.md.
3. Zones: one long page; the hash follows the zone in view; loading `#zone` frames that zone.
4. HUD: owner clock (Accra) + visitor clock, session stopwatch, compass (opens the level map), live X/Y,
   XP bar + level. Scroll-to-top control with a progress ring.
5. Gamification: XP for discovering zones, playing games, finding secrets; levels with a level-up moment;
   15+ achievements with toasts and a trophy room; state persisted in localStorage and fully working when
   storage throws.
6. Four playable mini-games (runner, threat hunt, phish-or-legit, chain of custody), each startable,
   playable to an end state and exitable by keyboard alone and by pointer/touch alone; reachable from the
   Arcade zone and the terminal.
7. Terminal overlay (backquote key or HUD button) with real commands over the content (help, whoami, ls,
   cat, cases, quests, inventory, games, play <game>, contact, sudo hire-me, clear, exit, and a hidden flag).
8. Original mascot "Sanko" (a pixel Sankofa bird, Ghana gold with a black star) animated in 2+ places.
   The owner's old dino sprites (a trace of Google's T-Rex) never ship.
9. Boot sequence once per session, skippable by any key or click; end-of-journey "quest complete" overlay
   with a countdown ring when the contact zone is reached, dismissable.
10. Motion: cosmic starfield canvas, CRT layer, text decode/scramble reveals, counters, marquee, cartridge
    and dossier interactions, quest-rail traveller, impact constellation. All of it respects
    prefers-reduced-motion and pauses off screen; content is readable at rest (no opacity-0 parking).
11. Quality: zero console errors through every feature; no horizontal overflow and no text overlap at
    375 / 768 / 1440; keyboard focus visible; overlays trap and restore focus.
12. Built with `npm run build`, verified on a throwaway static server in headless Chrome (never a dev
    server), committed and pushed to a private GitHub repo.

## Non-goals
Backend, CMS, forms that submit anywhere, analytics, multiplayer, copying any text/image/code from the
reference site, a recommendations section (no source content), public deployment without the owner's yes.

## Approach
Vite 7 + vanilla TypeScript, zero runtime dependencies. Content lives in `src/content.ts`; a Vite plugin
pre-renders every section into `index.html` at build time (SEO, readable without JS); `src/main.ts`
progressively enhances. Games are lazy chunks. `base: './'` so the build works on any sub-path.

## Chunks
- Core (orchestrator): content, SSG renderer, design system CSS, HUD, zones, starfield, CRT, reveals,
  boot, XP/achievements, sfx, sprites + mascot, terminal, end screen, arcade shell, integration.
- Icons (builder): vendor 62 stack icons + cert issuer marks + UI glyphs, `src/icons.ts`, ICONS.md.
- Games x4 (builders): `src/games/{runner,threathunt,phish,custody}.ts` against `src/games/types.ts`.
- Constellation (builder): `src/ui/constellation.ts` against `METRICS` in content.ts.
- Verify tool (builder): `tools/verify.mjs` against docs/CONTRACT.md.

## Constraints & landmines
No dev server (static server + headless Chrome only). localStorage and history.replaceState in try/catch.
Hash anchors are bare tokens. Canvas: DPR-aware, paused off screen and when the tab is hidden, guarded.
Games preventDefault arrows/space only while their overlay has focus. Fixed overlays live outside any
transformed ancestor. WebAudio only after a gesture, muted by default. Marquee: 200% track, no gap.
Prose uses plain punctuation (no em-dashes). curl is blocked in Bash (use node fetch).

## Assumptions (decided, noted for the owner)
- Platform 5 shows the live name SafetrexIQ, "formerly SafeIQos".
- Prompt host renamed from `via-os` to the personal `ezb-os` so the site does not read as an employer product.
- Deploy target (GitHub Pages needs a public repo on this plan; or the VPS) is asked at delivery.
