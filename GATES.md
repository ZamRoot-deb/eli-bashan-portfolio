# Gates: Eli Zamar Bashan portfolio (terminal-game site, structural clone of ashwingupta.dev)

Scope: docs/BRIEF.md. DOM hooks: docs/CONTRACT.md. Every CHECK prints PASS or FAIL lines; EXPECT matches the PASS token.
Run: node ~/.claude/skills/unlazy/scripts/gate-check.mjs --timeout 600

- [ ] G1: Typecheck and production build are clean
  CHECK: npm run build >/tmp/ezb-build.log 2>&1 && echo PASS-BUILD || (tail -20 /tmp/ezb-build.log; echo FAIL-BUILD)
  EXPECT: PASS-BUILD
  EVIDENCE: pending

- [ ] G2: Static checks: no dino sprite, no reference-site text, no em-dashes in prose, portrait/hourglass/floppy + CV shipped, ICONS.md covers all 62 tools, size budget
  CHECK: node tools/check-static.mjs
  EXPECT: PASS static
  EVIDENCE: pending

- [ ] G3: Served over a throwaway static server: page, assets and CV return 200 with correct types
  CHECK: node tools/verify.mjs --only serve
  EXPECT: PASS serve
  EVIDENCE: pending

- [ ] G4: Exact content counts render (5 platforms, 8 cases + 3 stats, 7 roles with 1 active, 8 trophies, 4 impact stats, 21 metrics, 8 groups / 62 tools, 3 articles, 3 education, 16 certs, 4 contact rows, 4 games)
  CHECK: node tools/verify.mjs --only content
  EXPECT: PASS content
  EVIDENCE: pending

- [ ] G5: Every one of the 62 tools shows a loaded icon (naturalWidth > 0), vendored locally (no third-party image hosts)
  CHECK: node tools/verify.mjs --only icons
  EXPECT: PASS icons
  EVIDENCE: pending

- [ ] G6: HUD is live: owner and visitor clocks tick, stopwatch runs, X/Y follows the pointer, XP and level shown, compass opens the level map, scroll-to-top ring works
  CHECK: node tools/verify.mjs --only hud
  EXPECT: PASS hud
  EVIDENCE: pending

- [ ] G7: Zone routing: hash follows the zone in view; loading #inventory frames the inventory zone; minimap marks the current zone
  CHECK: node tools/verify.mjs --only routing
  EXPECT: PASS routing
  EVIDENCE: pending

- [ ] G8: Terminal: opens with backquote and the HUD button, help/whoami/ls/cat/play/sudo commands answer from real content, Escape closes and restores focus
  CHECK: node tools/verify.mjs --only terminal
  EXPECT: PASS terminal
  EVIDENCE: pending

- [ ] G9: All 4 mini-games start, play to an end state and exit by keyboard alone AND by pointer alone
  CHECK: node tools/verify.mjs --only games
  EXPECT: PASS games
  EVIDENCE: pending

- [ ] G10: Gamification: finishing a game awards XP, HUD updates immediately, achievements toast, state persists across reload
  CHECK: node tools/verify.mjs --only xp
  EXPECT: PASS xp
  EVIDENCE: pending

- [ ] G11: Storage throwing (localStorage and sessionStorage) never breaks the page: loads, ready, terminal and a game still work, zero errors
  CHECK: node tools/verify.mjs --only storage-off
  EXPECT: PASS storage-off
  EVIDENCE: pending

- [ ] G12: prefers-reduced-motion: canvas frozen, loops paused, reveals instant, content readable
  CHECK: node tools/verify.mjs --only reduced-motion
  EXPECT: PASS reduced-motion
  EVIDENCE: pending

- [ ] G13: Layout: no horizontal overflow and no text overlap at 375, 768 and 1440 widths
  CHECK: node tools/verify.mjs --only layout
  EXPECT: PASS layout
  EVIDENCE: pending

- [ ] G14: Boot plays with ?boot and any key skips it; end-of-journey overlay appears at the contact zone with a countdown ring and closes; mascot shows in 2+ places
  CHECK: node tools/verify.mjs --only boot,endscreen,mascot
  EXPECT: /PASS boot[\s\S]*PASS endscreen[\s\S]*PASS mascot/
  EVIDENCE: pending

- [ ] G15: Accessibility basics: one h1, every img has alt, every button has a name, dialogs are modal and labelled, visible focus
  CHECK: node tools/verify.mjs --only a11y
  EXPECT: PASS a11y
  EVIDENCE: pending

- [ ] G16: Zero console errors, page errors or failed requests across a full run of every group
  CHECK: node tools/verify.mjs
  EXPECT: PASS console
  EVIDENCE: pending

- [ ] G17: Review: /ship run on the full repo, every Blocker fixed or accepted with a reason; ui-operational-audit run
  EVIDENCE: pending

- [ ] G18: Committed and pushed to the private GitHub repo, nothing unpushed
  CHECK: git fetch -q origin 2>/dev/null; test -z "$(git status --porcelain)" && test "$(git rev-list --count origin/main..HEAD)" = "0" && echo PASS-PUSHED || echo FAIL-PUSHED
  EXPECT: PASS-PUSHED
  EVIDENCE: pending

- [ ] G19: Viewable link: private preview published and checked in a real browser (public deploy only with the owner's yes)
  EVIDENCE: pending
