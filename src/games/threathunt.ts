// Threat Hunt: a whack-a-mole round for a DFIR audience. Quarantine malware as it pops up across
// a 3x3 grid of hosts, but leave legitimate processes alone or it counts as a false positive.
import type { GameModule, GameHost, GameInstance } from './types'
import { BUG, spriteDataURL, type Sprite } from '../core/sprites'
import './threathunt.css'

// ---------------------------------------------------------------------------------------------
// Original pixel sprites (local to this game). Grids use the shared SPRITE_PALETTE characters
// from src/core/sprites.ts so they render through the same drawSprite/spriteDataURL pipeline.
// Threats read red/magenta and spiky; legit processes read green/blue and rounded/friendly.
// ---------------------------------------------------------------------------------------------

const WORM: Sprite = [
  '..mm...mm....',
  '.kkkkk.kkkk..',
  'kwsrrrrrrkrk.',
  'kwsrrrrrrrrk.',
  '.krrrrrrrrk..',
  '..kkkkkkkk...',
  '.....kk..kk..',
]

const RANSOM: Sprite = [
  '.....kok.....',
  '....koook....',
  '....koook....',
  '..kkkkkkkkk..',
  '..krrrrrrrk..',
  '..krrrsrrrk..',
  '..krrrrrrrk..',
  '..krrrrrrrk..',
  '..krrrrrrrk..',
  '..krrrrrrrk..',
  '..kkkkkkkkk..',
  '...m.m.m.m...',
]

const TROJAN: Sprite = [
  'm...........m',
  'mk.........km',
  'kkkkkkkkkkkkk',
  'krrwrrrrrwrrk',
  'krrsrrrrrsrrk',
  'krrrrrrrrrrrk',
  'krrrrrrrrrrrk',
  'kmmmmmmmmmmmk',
  'krrrrrrrrrrrk',
  'krrrrrrrrrrrk',
  'kkkkkkkkkkkkk',
  '..k.......k..',
]

const SHIELD: Sprite = [
  '..kkkkkkkkk..',
  '..kgggggggk..',
  '..kgwgggwgk..',
  '..kgggggggk..',
  '..kgggggggk..',
  '..kgggggggk..',
  '...kgggggk...',
  '....kgggk....',
  '.....kgk.....',
  '......k......',
  '.............',
  '.............',
]

const BACKUP: Sprite = [
  '..kkkkkkkkk..',
  '..k.ccccc.k..',
  '..kpwpppwpk..',
  '..kppkpkppk..',
  '..kccccccck..',
  '..kccccccck..',
  '..kbbbbbbbk..',
  '..kccccccck..',
  '..kccccccck..',
  '..kkkkkkkkk..',
  '.............',
  '.............',
]

const GEAR: Sprite = [
  '...k.....k...',
  '...kccccck...',
  '..kccccccck..',
  '.kcwcccccwck.',
  '.kccccccccck.',
  '.kcckccckcck.',
  '.kccccccccck.',
  '.kbbbbbbbbbk.',
  '..kccccccck..',
  '...kccccck...',
  '...k.....k...',
  '.............',
]

interface KindDef {
  readonly threat: boolean
  readonly sprite: Sprite
  readonly label: string
}

const THREATS: readonly KindDef[] = [
  { threat: true, sprite: BUG, label: 'malware' },
  { threat: true, sprite: WORM, label: 'worm' },
  { threat: true, sprite: RANSOM, label: 'ransomware' },
  { threat: true, sprite: TROJAN, label: 'trojan' },
]

const LEGIT: readonly KindDef[] = [
  { threat: false, sprite: SHIELD, label: 'svchost' },
  { threat: false, sprite: BACKUP, label: 'backup' },
  { threat: false, sprite: GEAR, label: 'update' },
]

const HOSTNAMES: readonly string[] = ['WS-01', 'WS-02', 'FIN-01', 'FIN-02', 'DC-01', 'DC-02', 'HR-01', 'SRV-01', 'WEB-01']

/** keys 1-9 and Q W E / A S D / Z X C map to cells left-to-right, top-to-bottom. */
const KEY_MAP: Record<string, number> = {
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8,
  q: 0, w: 1, e: 2, a: 3, s: 4, d: 5, z: 6, x: 7, c: 8,
}

// ---------------------------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------------------------
const ROUND_MS_NORMAL = 30000
const ROUND_MS_FAST = 6000
const MAX_CONCURRENT = 3
const LEGIT_CHANCE = 0.35
const SCORE_HIT = 10
const SCORE_MISS_PENALTY = 15
const COMBO_X2_AT = 3
const COMBO_X3_AT = 6
const XP_BASE = 10
const XP_PER_KILL = 2
const XP_CAP = 60
const SETTLE_GOOD_MS = 480
const SETTLE_BAD_MS = 560
const SETTLE_GONE_MS = 380
const INITIAL_SPAWN_DELAY_MS = 300
const SPRITE_SCALE_CELL = 5
const SPRITE_SCALE_CHIP = 3

const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.max(0, Math.min(1, t))
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
const comboMultiplier = (combo: number): number => (combo >= COMBO_X3_AT ? 3 : combo >= COMBO_X2_AT ? 2 : 1)

function retrigger(el: HTMLElement, cls: string): void {
  el.classList.remove(cls)
  void el.offsetWidth // force reflow so the animation restarts
  el.classList.add(cls)
}

interface ActiveProc {
  def: KindDef
  expireAt: number
}

interface Cell {
  hostname: string
  btn: HTMLButtonElement
  img: HTMLImageElement
  screen: HTMLElement
  proc: ActiveProc | null
  settleCls: string | null
  settleUntil: number | null
  burstEl: HTMLElement | null
}

function mount(host: GameHost): GameInstance {
  const root = host.root
  const el = document.createElement('div')
  el.className = 'th'
  if (host.reducedMotion) el.classList.add('th--reduced')
  root.appendChild(el)

  let state: 'ready' | 'playing' | 'over' = 'ready'
  let cells: Cell[] = []
  let scoreEl: HTMLElement | null = null
  let comboEl: HTMLElement | null = null
  let timerBar: HTMLElement | null = null
  let timerTrack: HTMLElement | null = null

  let score = 0
  let quarantined = 0
  let falsePositives = 0
  let combo = 0
  let roundMs = ROUND_MS_NORMAL
  let roundStartTs = 0
  let pausedMs = 0
  let pauseBeganAt = 0
  let paused = false
  let rafId = 0
  let lastTickSecond = -1
  let nextSpawnAt = 0

  const setState = (next: 'ready' | 'playing' | 'over'): void => {
    state = next
    root.dataset.state = next
    el.dataset.state = next
  }

  function elapsed(): number {
    return performance.now() - roundStartTs - pausedMs
  }

  // -----------------------------------------------------------------------------------------
  // Ready screen
  // -----------------------------------------------------------------------------------------
  function legendChip(def: KindDef): HTMLElement {
    const chip = document.createElement('div')
    chip.className = 'th-chip'
    const img = document.createElement('img')
    img.className = 'th-chip-icon'
    img.src = spriteDataURL(def.sprite, SPRITE_SCALE_CHIP)
    img.alt = ''
    chip.appendChild(img)
    const label = document.createElement('span')
    label.className = 'th-chip-label'
    label.textContent = def.label
    chip.appendChild(label)
    return chip
  }

  function legendGroup(heading: string, defs: readonly KindDef[], variant: 'threat' | 'legit'): HTMLElement {
    const group = document.createElement('div')
    group.className = `th-legend-group th-legend-group--${variant}`
    const h = document.createElement('h3')
    h.className = 'th-legend-heading'
    h.textContent = heading
    group.appendChild(h)
    const row = document.createElement('div')
    row.className = 'th-legend-row'
    for (const def of defs) row.appendChild(legendChip(def))
    group.appendChild(row)
    return group
  }

  function renderReady(): void {
    setState('ready')
    el.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.className = 'th-ready'

    const title = document.createElement('h2')
    title.className = 'th-title'
    title.textContent = 'THREAT HUNT'
    wrap.appendChild(title)

    const sub = document.createElement('p')
    sub.className = 'th-sub'
    sub.textContent = 'Quarantine malware the moment it pops up. Leave legit processes running.'
    wrap.appendChild(sub)

    if (host.best > 0) {
      const best = document.createElement('p')
      best.className = 'th-best'
      best.textContent = `BEST ${host.best}`
      wrap.appendChild(best)
    }

    const legend = document.createElement('div')
    legend.className = 'th-legend'
    legend.appendChild(legendGroup('THREATS - QUARANTINE', THREATS, 'threat'))
    legend.appendChild(legendGroup('LEGIT - DO NOT HIT', LEGIT, 'legit'))
    wrap.appendChild(legend)

    const controls = document.createElement('p')
    controls.className = 'th-controls'
    controls.textContent =
      'CLICK OR TAP A HOST. KEYS 1-9 OR Q W E / A S D / Z X C. HIT THE RED, LEAVE THE GREEN AND BLUE ALONE.'
    wrap.appendChild(controls)

    const startBtn = document.createElement('button')
    startBtn.type = 'button'
    startBtn.className = 'th-btn th-btn--primary'
    startBtn.textContent = 'START'
    startBtn.addEventListener('click', startRound)
    wrap.appendChild(startBtn)

    el.appendChild(wrap)
    startBtn.focus()
  }

  // -----------------------------------------------------------------------------------------
  // Playing screen
  // -----------------------------------------------------------------------------------------
  function isIdle(cell: Cell): boolean {
    return cell.proc === null && cell.settleUntil === null
  }

  function resetCellIdle(cell: Cell): void {
    cell.img.hidden = true
    cell.img.removeAttribute('src')
    cell.btn.dataset.kind = 'idle'
    cell.btn.setAttribute('aria-label', `${cell.hostname}: idle`)
    cell.btn.classList.remove('th-cell--pop')
    if (cell.burstEl) {
      cell.burstEl.remove()
      cell.burstEl = null
    }
  }

  function makeCell(hostname: string, idx: number): Cell {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'th-cell'
    btn.dataset.kind = 'idle'
    btn.setAttribute('aria-label', `${hostname}: idle`)

    const bar = document.createElement('span')
    bar.className = 'th-cell-bar'
    bar.textContent = hostname
    btn.appendChild(bar)

    const screen = document.createElement('span')
    screen.className = 'th-cell-screen'
    const img = document.createElement('img')
    img.className = 'th-cell-sprite'
    img.alt = ''
    img.hidden = true
    screen.appendChild(img)
    btn.appendChild(screen)

    const cell: Cell = { hostname, btn, img, screen, proc: null, settleCls: null, settleUntil: null, burstEl: null }
    btn.addEventListener('click', () => attemptHit(idx))
    return cell
  }

  function renderPlaying(): void {
    setState('playing')
    el.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.className = 'th-playing'

    const hud = document.createElement('div')
    hud.className = 'th-hud'

    const scoreItem = document.createElement('div')
    scoreItem.className = 'th-hud-item'
    const scoreLabel = document.createElement('span')
    scoreLabel.className = 'th-hud-label'
    scoreLabel.textContent = 'SCORE'
    scoreEl = document.createElement('span')
    scoreEl.className = 'th-hud-value'
    scoreEl.textContent = '0'
    scoreItem.append(scoreLabel, scoreEl)

    const comboItem = document.createElement('div')
    comboItem.className = 'th-hud-item'
    const comboLabel = document.createElement('span')
    comboLabel.className = 'th-hud-label'
    comboLabel.textContent = 'COMBO'
    comboEl = document.createElement('span')
    comboEl.className = 'th-hud-value'
    comboEl.textContent = 'x1'
    comboItem.append(comboLabel, comboEl)

    hud.append(scoreItem, comboItem)

    timerTrack = document.createElement('div')
    timerTrack.className = 'th-timer'
    timerBar = document.createElement('div')
    timerBar.className = 'th-timer-bar'
    timerTrack.appendChild(timerBar)

    const grid = document.createElement('div')
    grid.className = 'th-grid'
    grid.setAttribute('role', 'group')
    grid.setAttribute('aria-label', 'Hosts')

    cells = HOSTNAMES.map((hostname, idx) => makeCell(hostname, idx))
    for (const cell of cells) grid.appendChild(cell.btn)

    wrap.append(hud, timerTrack, grid)
    el.appendChild(wrap)
    cells[0]?.btn.focus()
  }

  function updateScore(): void {
    host.setScore(score)
    if (scoreEl) scoreEl.textContent = String(score)
  }

  function updateCombo(): void {
    if (!comboEl) return
    const mult = comboMultiplier(combo)
    comboEl.textContent = `x${mult}`
    comboEl.classList.toggle('th-hud-value--x2', mult === 2)
    comboEl.classList.toggle('th-hud-value--x3', mult === 3)
  }

  function showBurst(cell: Cell, text: string, variant: 'good' | 'bad'): void {
    if (cell.burstEl) cell.burstEl.remove()
    const span = document.createElement('span')
    span.className = `th-burst th-burst--${variant}`
    span.textContent = text
    cell.screen.appendChild(span)
    cell.burstEl = span
  }

  function settleCell(cell: Cell, cls: string, ms: number): void {
    cell.btn.classList.remove('th-cell--pop')
    retrigger(cell.btn, cls)
    // The cell is no longer a live target the instant settling starts (proc is already null by
    // now): flip data-kind/aria-label back to idle immediately so a fast second click or a
    // screen reader re-reading the label never sees a stale threat/legit state, even while the
    // hit/miss flash animation keeps playing for a beat as pure visual feedback.
    cell.btn.dataset.kind = 'idle'
    cell.btn.setAttribute('aria-label', `${cell.hostname}: idle`)
    cell.settleCls = cls
    cell.settleUntil = elapsed() + ms
  }

  function spawnCellVisual(cell: Cell, def: KindDef): void {
    cell.img.src = spriteDataURL(def.sprite, SPRITE_SCALE_CELL)
    cell.img.hidden = false
    cell.btn.dataset.kind = def.threat ? 'threat' : 'legit'
    cell.btn.setAttribute('aria-label', `${cell.hostname}: ${def.label}`)
    retrigger(cell.btn, 'th-cell--pop')
  }

  function spawnGap(progress: number): number {
    return lerp(900, 420, progress) * (0.75 + Math.random() * 0.5)
  }

  function visibleMs(progress: number): number {
    return lerp(1550, 700, progress) * (0.85 + Math.random() * 0.3)
  }

  function trySpawn(t: number): void {
    const idle = cells.filter(isIdle)
    const activeCount = cells.length - idle.length
    if (idle.length === 0 || activeCount >= MAX_CONCURRENT) return
    const cell = pick(idle)
    const isThreat = Math.random() > LEGIT_CHANCE
    const def = pick(isThreat ? THREATS : LEGIT)
    const progress = t / roundMs
    cell.proc = { def, expireAt: t + visibleMs(progress) }
    spawnCellVisual(cell, def)
  }

  function expireCell(cell: Cell): void {
    const wasThreat = cell.proc?.def.threat ?? false
    cell.proc = null
    if (wasThreat) {
      combo = 0
      updateCombo()
    }
    settleCell(cell, 'th-cell--gone', SETTLE_GONE_MS)
  }

  function attemptHit(idx: number): void {
    if (state !== 'playing' || paused) return
    const cell = cells[idx]
    if (!cell) return
    const proc = cell.proc
    if (!proc) {
      host.sfx('blip')
      return
    }
    cell.proc = null
    const def = proc.def
    if (def.threat) {
      combo++
      const gain = SCORE_HIT * comboMultiplier(combo)
      score += gain
      quarantined++
      updateScore()
      host.sfx('whack')
      showBurst(cell, `QUARANTINED +${gain}`, 'good')
      settleCell(cell, 'th-cell--hit-good', SETTLE_GOOD_MS)
    } else {
      combo = 0
      score = Math.max(0, score - SCORE_MISS_PENALTY)
      falsePositives++
      updateScore()
      host.sfx('hit')
      showBurst(cell, 'FALSE POSITIVE!', 'bad')
      settleCell(cell, 'th-cell--hit-bad', SETTLE_BAD_MS)
    }
    updateCombo()
  }

  function loop(): void {
    if (state !== 'playing' || paused) return
    const t = elapsed()
    if (t >= roundMs) {
      endRound()
      return
    }
    const progress = t / roundMs
    if (timerBar) timerBar.style.width = `${Math.max(0, 100 - progress * 100)}%`

    const remainingSec = Math.ceil((roundMs - t) / 1000)
    const urgent = remainingSec <= 5
    if (timerTrack) timerTrack.classList.toggle('th-timer--low', urgent)
    if (urgent && remainingSec >= 1 && remainingSec !== lastTickSecond) {
      lastTickSecond = remainingSec
      host.sfx('tick')
      if (timerTrack) retrigger(timerTrack, 'th-timer--tick')
    }

    for (const cell of cells) {
      if (cell.settleUntil !== null && t >= cell.settleUntil) {
        if (cell.settleCls) cell.btn.classList.remove(cell.settleCls)
        cell.settleCls = null
        cell.settleUntil = null
        resetCellIdle(cell)
      } else if (cell.proc && t >= cell.proc.expireAt) {
        expireCell(cell)
      }
    }

    if (t >= nextSpawnAt) {
      trySpawn(t)
      nextSpawnAt = t + spawnGap(progress)
    }

    rafId = requestAnimationFrame(loop)
  }

  function startRound(): void {
    score = 0
    quarantined = 0
    falsePositives = 0
    combo = 0
    roundMs = host.fast ? ROUND_MS_FAST : ROUND_MS_NORMAL
    lastTickSecond = -1
    nextSpawnAt = INITIAL_SPAWN_DELAY_MS
    host.sfx('start')
    renderPlaying()
    updateScore()
    updateCombo()
    roundStartTs = performance.now()
    pausedMs = 0
    paused = false
    rafId = requestAnimationFrame(loop)
  }

  // -----------------------------------------------------------------------------------------
  // Over screen
  // -----------------------------------------------------------------------------------------
  function addStat(dl: HTMLElement, label: string, value: string): void {
    const dt = document.createElement('dt')
    dt.textContent = label
    const dd = document.createElement('dd')
    dd.textContent = value
    dl.append(dt, dd)
  }

  function renderOver(stats: {
    quarantined: number
    falsePositives: number
    score: number
    best: number
    isBest: boolean
    xp: number
  }): void {
    setState('over')
    el.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.className = 'th-over'

    const title = document.createElement('h2')
    title.className = 'th-title'
    title.textContent = 'ROUND COMPLETE'
    wrap.appendChild(title)

    const dl = document.createElement('dl')
    dl.className = 'th-stats'
    addStat(dl, 'QUARANTINED', String(stats.quarantined))
    addStat(dl, 'FALSE POSITIVES', String(stats.falsePositives))
    addStat(dl, 'SCORE', String(stats.score))
    addStat(dl, 'BEST', String(stats.best))
    wrap.appendChild(dl)

    if (stats.isBest) {
      const badge = document.createElement('p')
      badge.className = 'th-badge th-badge--best'
      badge.textContent = 'NEW BEST'
      wrap.appendChild(badge)
    }

    const xp = document.createElement('p')
    xp.className = 'th-xp'
    xp.textContent = `+${stats.xp} XP`
    wrap.appendChild(xp)

    const actions = document.createElement('div')
    actions.className = 'th-actions'
    const again = document.createElement('button')
    again.type = 'button'
    again.className = 'th-btn th-btn--primary'
    again.textContent = 'PLAY AGAIN'
    again.addEventListener('click', startRound)
    const exit = document.createElement('button')
    exit.type = 'button'
    exit.className = 'th-btn'
    exit.textContent = 'EXIT'
    exit.addEventListener('click', () => host.exit())
    actions.append(again, exit)
    wrap.appendChild(actions)

    el.appendChild(wrap)
    again.focus()
  }

  function endRound(): void {
    if (state !== 'playing') return
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    setState('over')
    const xp = Math.min(XP_CAP, XP_BASE + XP_PER_KILL * quarantined)
    const prevBest = host.best
    const isBest = host.reportScore(score)
    host.awardXP(xp, 'Threat Hunt round complete')
    if (quarantined >= 10) host.unlock('hunter-10')
    if (quarantined >= 5 && falsePositives === 0) host.unlock('hunter-clean')
    host.sfx(score > 0 ? 'win' : 'lose')
    renderOver({
      quarantined,
      falsePositives,
      score,
      best: isBest ? score : prevBest,
      isBest,
      xp,
    })
  }

  // -----------------------------------------------------------------------------------------
  // Input, pause/resume, lifecycle
  // -----------------------------------------------------------------------------------------
  function onKeydown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const key = e.key
    const lower = key.length === 1 ? key.toLowerCase() : key
    if (state === 'playing' && Object.prototype.hasOwnProperty.call(KEY_MAP, lower)) {
      e.preventDefault()
      attemptHit(KEY_MAP[lower])
      return
    }
    if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
      if (e.target instanceof HTMLButtonElement) return // native activation already handles it
      if (state === 'ready' || state === 'over') {
        e.preventDefault()
        startRound()
      }
    }
  }

  function doPause(): void {
    if (paused || state !== 'playing') return
    paused = true
    pauseBeganAt = performance.now()
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function doResume(): void {
    if (!paused || state !== 'playing') return
    paused = false
    pausedMs += performance.now() - pauseBeganAt
    rafId = requestAnimationFrame(loop)
  }

  function onVisibility(): void {
    if (document.hidden) doPause()
    else doResume()
  }

  document.addEventListener('keydown', onKeydown)
  document.addEventListener('visibilitychange', onVisibility)

  renderReady()

  return {
    destroy(): void {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('keydown', onKeydown)
      document.removeEventListener('visibilitychange', onVisibility)
      el.remove()
    },
    pause: doPause,
    resume: doResume,
  }
}

const threatHunt: GameModule = {
  id: 'threathunt',
  title: 'Threat Hunt',
  blurb: 'Whack-a-mole for blue teamers: quarantine malware, spare the legit processes.',
  controls: 'CLICK/TAP A HOST - KEYS 1-9 OR Q W E / A S D / Z X C',
  mount,
}

export default threatHunt
