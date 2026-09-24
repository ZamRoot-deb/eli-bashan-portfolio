# Gates: Eli Zamar Bashan portfolio (terminal-game site, structural clone of ashwingupta.dev)

Scope: docs/BRIEF.md. DOM hooks: docs/CONTRACT.md. Every CHECK prints PASS or FAIL lines; EXPECT matches the PASS token.
Run: node ~/.claude/skills/unlazy/scripts/gate-check.mjs --timeout 600

- [x] G1: Typecheck and production build are clean
  CHECK: npm run build >/tmp/ezb-build.log 2>&1 && echo PASS-BUILD || (tail -20 /tmp/ezb-build.log; echo FAIL-BUILD)
  EXPECT: PASS-BUILD
  EVIDENCE: PASS-BUILD

- [x] G2: Static checks: no dino sprite, no reference-site text, no em-dashes in prose, portrait/hourglass/floppy + CV shipped, ICONS.md covers all 62 tools, size budget
  CHECK: node tools/check-static.mjs
  EXPECT: PASS static
  EVIDENCE: PASS static no dino/ashwin, no em/en-dash, sprites+CV byte-identical, ICONS.md covered, sizes ok (JS max 101.6KB, CSS 82.0KB, total 0.90MB)

- [x] G3: Served over a throwaway static server: page, assets and CV return 200 with correct types
  CHECK: node tools/verify.mjs --only serve
  EXPECT: PASS serve
  EVIDENCE: PASS serve GET / 200; 3/3 assets 200 w/ correct type; CV 200 | PASS console 0 errors across 0 page loads

- [x] G4: Exact content counts render (5 platforms, 8 cases + 3 stats, 7 roles with 1 active, 8 trophies, 4 impact stats, 21 metrics, 8 groups / 62 tools, 3 articles, 3 education, 16 certs, 4 contact rows, 4 games)
  CHECK: node tools/verify.mjs --only content
  EXPECT: PASS content
  EVIDENCE: PASS content 5 platforms, 62 stack items, 10 zones, 4 contact rows | PASS console 0 errors across 1 page loads

- [x] G5: Every one of the 62 tools shows a loaded icon (naturalWidth > 0), vendored locally (no third-party image hosts)
  CHECK: node tools/verify.mjs --only icons
  EXPECT: PASS icons
  EVIDENCE: PASS icons 62/62 items iconed (65 marks), 0 failed to load, 0 third-party | PASS console 0 errors across 1 page loads

- [x] G6: HUD is live: owner and visitor clocks tick, stopwatch runs, X/Y follows the pointer, XP and level shown, compass opens the level map, scroll-to-top ring works
  CHECK: node tools/verify.mjs --only hud
  EXPECT: PASS hud
  EVIDENCE: PASS hud hud hooks visible; clocks/stopwatch tick; xy follows pointer; compass + scrolltop work | PASS console 0 errors across 1 page loads

- [x] G7: Zone routing: hash follows the zone in view; loading #inventory frames the inventory zone; minimap marks the current zone
  CHECK: node tools/verify.mjs --only routing
  EXPECT: PASS routing
  EVIDENCE: PASS routing routed through 10 zones; #inventory deep-link framed; minimap wired | PASS console 0 errors across 2 page loads

- [x] G8: Terminal: opens with backquote and the HUD button, help/whoami/ls/cat/play/sudo commands answer from real content, Escape closes and restores focus
  CHECK: node tools/verify.mjs --only terminal
  EXPECT: PASS terminal
  EVIDENCE: PASS terminal terminal opens/closes; help/whoami/ls/cat/play/sudo respond; focus restored | PASS console 0 errors across 1 page loads

- [x] G9: All 4 mini-games start, play to an end state and exit by keyboard alone AND by pointer alone
  CHECK: node tools/verify.mjs --only games
  EXPECT: PASS games
  EVIDENCE: PASS games 4 games x keyboard-only + pointer-only | PASS console 0 errors across 8 page loads

- [x] G10: Gamification: finishing a game awards XP, HUD updates immediately, achievements toast, state persists across reload
  CHECK: node tools/verify.mjs --only xp
  EXPECT: PASS xp
  EVIDENCE: PASS xp xp 25 -> 205; toast shown; persisted after reload | PASS console 0 errors across 1 page loads

- [x] G11: Storage throwing (localStorage and sessionStorage) never breaks the page: loads, ready, terminal and a game still work, zero errors
  CHECK: node tools/verify.mjs --only storage-off
  EXPECT: PASS storage-off
  EVIDENCE: PASS storage-off ready, terminal and a game work with storage throwing; zero page errors | PASS console 0 errors across 1 page loads

- [x] G12: prefers-reduced-motion: canvas frozen, loops paused, reveals instant, content readable
  CHECK: node tools/verify.mjs --only reduced-motion
  EXPECT: PASS reduced-motion
  EVIDENCE: PASS reduced-motion data-motion=reduced; starfield frozen; 0 stray animations | PASS console 0 errors across 1 page loads

- [x] G13: Layout: no horizontal overflow and no text overlap at 375, 768 and 1440 widths
  CHECK: node tools/verify.mjs --only layout
  EXPECT: PASS layout
  EVIDENCE: PASS layout checked 3 viewports x 10 zones for overflow/overlap | PASS console 0 errors across 3 page loads

- [x] G14: Boot plays with ?boot and any key skips it; end-of-journey overlay appears at the contact zone with a countdown ring and closes; mascot shows in 2+ places
  CHECK: node tools/verify.mjs --only boot,endscreen,mascot
  EXPECT: /PASS boot[\s\S]*PASS endscreen[\s\S]*PASS mascot/
  EVIDENCE: PASS mascot 2 mascots, 1 visible in hero | PASS console 0 errors across 3 page loads

- [x] G15: Accessibility basics: one h1, every img has alt, every button has a name, dialogs are modal and labelled, visible focus
  CHECK: node tools/verify.mjs --only a11y
  EXPECT: PASS a11y
  EVIDENCE: PASS a11y h1=1; imgs alt ok; buttons named; dialogs modal+named; 25 focus stops checked | PASS console 0 errors across 1 page loads

- [x] G16: Zero console errors, page errors or failed requests across a full run of every group
  CHECK: node tools/verify.mjs
  EXPECT: PASS console
  EVIDENCE: PASS a11y h1=1; imgs alt ok; buttons named; dialogs modal+named; 25 focus stops checked | PASS console 0 errors across 24 page loads

- [x] G20: Play layer: terminal flag path, cheat code, cartridge/dossier/badge counters, copy feedback, constellation discovery and a full game at phone width all work
  CHECK: node tools/verify.mjs --only play
  EXPECT: PASS play
  EVIDENCE: PASS play flag, cheat code, cartridges, dossiers, badges, copy, constellation, phone runner | PASS console 0 errors across 2 page loads

- [x] G17: Review: /ship run on the full repo, every Blocker fixed or accepted with a reason; ui-operational-audit run
  EVIDENCE: /ship with 9 reviewers (intent-dod, ux-completeness, design-a11y, demo-critic, correctness, performance-scale, security-privacy, surgical-simplicity, tests) plus ui-operational-audit. Fixed: game hidden under the terminal (dialog stacking), toast queue dropping achievements, backquote on boot opening the terminal, mascot bubble text race, HUD clocks covering the mascot button, --faint contrast on panel-2, silent copy feedback for screen readers, sub-44px touch targets and the compass specificity bug, runner.css token drift, raw-markup sink removed from h(), portrait 138KB to 72KB, idle-deferred init, unbatched scroll handler, dead code and 564KB of duplicate fixtures, stat bars labelled self-rated, LV.08 explained, Insert coin made a real link, test gaps (literal content facts, game reward path, sudo side effect, new play group, stacking and boot-key checks). Accepted with reason: hash URLs instead of paths (host-agnostic), Google Fonts not self-hosted (follow-up), module-init failures log only (no current trigger).

- [x] G18: Committed and pushed to the private GitHub repo, nothing unpushed
  CHECK: git fetch -q origin 2>/dev/null; test -z "$(git status --porcelain)" && test "$(git rev-list --count origin/main..HEAD)" = "0" && echo PASS-PUSHED || echo FAIL-PUSHED
  EXPECT: PASS-PUSHED
  EVIDENCE: PASS-PUSHED

- [x] G19: Viewable link: private preview published and checked in a real browser (public deploy only with the owner's yes)
  EVIDENCE: https://claude.ai/artifact/PqgiMsrA9mPMCviv78xqNC (private, v2, downloads capability for the CV). Opened in the owner's Chrome: boot sequence ran and finished, hero/title/player card/portrait/HUD/minimap rendered, clocks tick, typewriter ran, zone label follows scroll. The Chrome extension cannot deliver pointer events into the sandboxed preview frame (pointer X/Y never moved), so clicks there were not exercised; the identical build passes all 17 interaction groups headless (G3-G16, G20). Public deploy awaits the owner's yes.

- [x] G21: Public deploy on GitHub Pages: the live site passes every verify group (served by GitHub, real network)
  CHECK: node tools/verify.mjs --url https://zamroot-deb.github.io/eli-bashan-portfolio >/tmp/ezb-live.log 2>&1; grep -q '^FAIL' /tmp/ezb-live.log && (grep '^FAIL' /tmp/ezb-live.log; echo FAIL-LIVE) || (grep -c '^PASS' /tmp/ezb-live.log; echo PASS-LIVE)
  EXPECT: PASS-LIVE
  EVIDENCE: 17 | PASS-LIVE
