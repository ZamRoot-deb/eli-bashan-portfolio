# DOM contract (what tools/verify.mjs may rely on)

The built page (`dist/index.html`) is pre-rendered: every hook below exists in the HTML before any script
runs, except the ones marked (runtime), which main.ts creates.

## Global
- `html[data-app="ready"]` (runtime): set once main.ts finished initialising every module.
- `html[data-motion="reduced"|"full"]` (runtime): resolved motion preference.
- `window.__ezb` (runtime): debug handle for tests: `{ xp(): number, level(): number, achievements(): string[],
  storageOk: boolean, openTerminal(): void, closeTerminal(): void, openGame(id): Promise<void>, closeGame(): void,
  showEnd(): void, zones: string[] }`.
- `[data-boot]` (runtime): boot overlay; removed from the DOM when finished or skipped.
  Skipped automatically when `sessionStorage['ezb.booted']==='1'`, when `navigator.webdriver` is true, or with
  `?noboot` in the URL. Force it with `?boot`.
- `[data-mascot]`: the Sanko mascot; at least 2 in the page.
- `[data-toasts]` (runtime): `role="status"` live region; each toast is `[data-toast]`.

## Zones (page order)
`section.zone[data-zone]` with `id` equal to the zone id:
`top, about, builds, cases, quests, trophies, inventory, logs, arcade, contact`.
Each non-hero zone has a head: `[data-zone-head]` containing `[data-cmd]` (the terminal prompt line) and an `h2`.

## Content hooks and exact counts
- `#top [data-name]` text contains `ELI`, `ZAMAR`, `BASHAN`. `[data-stat="sectors"]`=13, `[data-stat="banks"]`=24.
- `[data-platform]` x5, each with `[data-platform-name]`, `[data-platform-body]`, and one or more `[data-stack-tag]`.
- `[data-case]` x8, `[data-case-stat]` x3.
- `[data-role]` x7; exactly one `[data-role][data-active="true"]`.
- `[data-trophy]:not([data-dup])` x8 (marquee duplicates carry `data-dup` and `aria-hidden="true"`).
- `[data-impact-stat]` x4.
- `[data-constellation]` contains a `<canvas>` (runtime) and a `<ul>` fallback with `[data-metric]` x21.
- `[data-stack-group]` x8; `[data-stack-item]` x62; each item contains `img[data-icon]` (a vendored file, must load
  with `naturalWidth > 0`).
- `[data-article]` x3, `[data-edu]` x3, `[data-cert]` x16 (each cert is a `<button>`; after activation it carries
  `data-seen="true"`).
- `[data-contact-row]` x4 with `data-kind` = `cv|email|phone|location`. The email and phone rows each contain a
  `[data-copy]` button that copies the value.
- `[data-game-launch]` x4 with `data-game-id` = `runner|threathunt|phish|custody`.

## HUD (runtime, fixed, outside any transformed ancestor)
`[data-hud="clock-owner"]`, `[data-hud="clock-visitor"]`, `[data-hud="stopwatch"]`, `[data-hud="xy"]`,
`[data-hud="xp"]` (text like `120 XP`), `[data-hud="level"]` (text like `LV 02`), `[data-hud="compass"]`
(button, opens `[data-levelmap]`), `[data-hud="terminal"]` (button), `[data-hud="sound"]` (button,
`aria-pressed`), `[data-hud="trophies"]` (button, opens `[data-trophy-room]`).
`[data-scrolltop]`: button with an SVG progress ring; visible after the first zone.
`[data-minimap]`: right-edge zone list; `[data-minimap] a[href="#<zone>"]` for every zone; the current one has
`aria-current="true"`.

## Overlays (runtime), all `role="dialog"` with `aria-modal="true"`, closed with Escape, focus restored
- `[data-terminal]`: input `#term-input`, output `[data-term-out]`. Opened by the backquote key, `[data-hud="terminal"]`
  or `window.__ezb.openTerminal()`. Commands listed in docs/BRIEF.md item 7.
- `[data-game-overlay]`: contains `[data-game-root]` where a game mounts, `[data-game-close]`, `[data-game-score]`.
  After a run pays XP, `[data-game-root]` carries `data-last-reward` (the amount paid through `host.awardXP`).
- `[data-endscreen]`: shown once per session when `#contact` is fully reached; has `[data-countdown]` (SVG ring) and
  auto-closes at 0.
- `[data-levelmap]`, `[data-trophy-room]`.

## Games (src/games/types.ts)
Each game sets `data-state` on its own root element: `ready` (start screen), `playing`, `over` (end screen).
Keyboard: Space/Enter starts from `ready` and `over`. Every game also exposes on-screen buttons for touch.
