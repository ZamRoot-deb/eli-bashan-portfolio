// Evidence Runner: side-scrolling endless runner. Sanko sprints a pixel data-centre floor at
// night, jumping malware bugs and ransomware padlocks, grabbing evidence floppies for bonus
// points. Original art only: server racks, floor tiles and the padlock enemy are drawn/authored
// here from the shared sprite palette; no third-party sprites.
import type { GameHost, GameInstance, GameModule } from './types'
import { SANKO, FLOPPY, BUG, drawSprite, type Sprite } from '../core/sprites'
import { INK, PANEL, LINE, PAPER, DIM, HUE, rgba } from '../core/palette'
import './runner.css'

/** Ransomware padlock (taller ground enemy). 12x15, original pixel art from the shared palette. */
const PADLOCK: Sprite = [
  '....kkkk....',
  '...knnnnk...',
  '...knnnnk...',
  '...knnnnk...',
  '..kkkkkkkk..',
  '..krrrrrrk..',
  '..krrrrrrk..',
  '..krrssrrk..',
  '..krrrrrrk..',
  '..krrrrrrk..',
  '..kkkkkkkk..',
  '..kkkkkkkk..',
  '..kwkwkwkw..',
  '...w.w.w.w..',
  '....w...w...',
]

// ---- tunables --------------------------------------------------------------------------------
const GRAVITY = 2000 // px/s^2
const JUMP_VELOCITY = -640 // px/s, initial upward speed
const SHORT_HOP_VY = -220 // clamp target for an early release (variable jump height)
const MAX_HOLD_MS = 260 // release only shortens the jump within this window of takeoff
const COYOTE_MS = 110 // forgiveness window to still jump just after leaving the ground

const BASE_SPEED = 230
const MAX_SPEED = 620
const ACCEL = 6 // px/s per elapsed second
const FAST_SPEED = 460 // host.fast: high base speed
const FAST_ACCEL = 26
const FAST_FIRST_SPAWN = 1.2 // seconds: first obstacle arrives quickly in automation mode
const NORMAL_FIRST_SPAWN: readonly [number, number] = [1.7, 2.3]

const SCORE_PER_PX = 0.06 // distance -> score
const FLOPPY_VALUE = 50
const XP_CAP = 60
const ACH_300 = 300
const ACH_1000 = 1000

const CRASH_FREEZE_MS = 260
const CRASH_FREEZE_MS_RM = 170
const SHAKE_MS = 180
const FLASH_MS = 120

// ---- small helpers -----------------------------------------------------------------------------
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
/** Deterministic pseudo-random in [0,1) from a seed; used so parallax tiles don't reshuffle every frame. */
const hash01 = (n: number): number => {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}
const aabbHit = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by

interface Obstacle {
  x: number
  y: number
  w: number
  h: number
  kind: 'bug' | 'padlock'
}
interface FloppyItem {
  x: number
  y: number
  w: number
  h: number
  taken: boolean
}
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}
interface Popup {
  x: number
  y: number
  vy: number
  life: number
  maxLife: number
  text: string
  color: string
}

class RunnerGame implements GameInstance {
  private host: GameHost
  private root: HTMLElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private startBtn: HTMLButtonElement
  private againBtn: HTMLButtonElement
  private exitBtn: HTMLButtonElement
  private scoreValueEl: HTMLElement
  private bestValueEl: HTMLElement
  private newBestEl: HTMLElement
  private xpValueEl: HTMLElement

  private resizeObserver: ResizeObserver
  private rafId: number | null = null
  private lastFrameTime = 0
  private paused = false
  private destroyed = false

  // layout (recomputed on resize)
  private cssW = 960
  private cssH = 560
  private scale = 3
  private groundY = 500
  private playerSize = 72

  // world / run state
  private distance = 0
  private elapsed = 0
  private speed = BASE_SPEED
  private scoreFloat = 0
  private lastReportedScore = -1
  private fastRun = false
  private obstacleTimer = 2
  private floppyTimer = 1.5
  private obstacles: Obstacle[] = []
  private floppies: FloppyItem[] = []
  private particles: Particle[] = []
  private popups: Popup[] = []

  // player
  private playerX = 140
  private playerY = 0
  private playerVy = 0
  private grounded = true
  private lastGroundedAt = 0
  private jumpStartAt = 0
  private anim: 'run' | 'jump' | 'hurt' = 'run'
  private frameIdx: 0 | 1 = 0
  private frameTimer = 0

  // fx
  private crashed = false
  private freezeUntil = 0
  private shakeUntil = 0
  private flashUntil = 0

  constructor(host: GameHost) {
    this.host = host
    this.root = host.root
    this.root.classList.add('rn-root')
    this.root.dataset.state = 'ready'
    // Canvas fillText doesn't reliably trigger a @font-face fetch the way visible DOM text does,
    // and the HUD score label is the only thing on this page that uses "Press Start 2P" before a
    // new-best badge might reveal it in the DOM. Ask for it explicitly so it's ready before the
    // canvas HUD paints instead of silently falling back to a generic font.
    document.fonts.load('9px "Press Start 2P"').catch(() => {})

    const dom = this.buildDom()
    this.canvas = dom.canvas
    this.startBtn = dom.startBtn
    this.againBtn = dom.againBtn
    this.exitBtn = dom.exitBtn
    this.scoreValueEl = dom.scoreValueEl
    this.bestValueEl = dom.bestValueEl
    this.newBestEl = dom.newBestEl
    this.xpValueEl = dom.xpValueEl

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('runner: 2d canvas context unavailable')
    this.ctx = ctx

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.root)
    this.resize()

    this.startBtn.addEventListener('click', this.onStartClick)
    this.againBtn.addEventListener('click', this.onStartClick)
    this.exitBtn.addEventListener('click', this.onExitClick)
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('visibilitychange', this.onVisibility)

    this.startBtn.focus()

    this.lastFrameTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  // ---- DOM ------------------------------------------------------------------------------------
  private buildDom() {
    const canvas = document.createElement('canvas')
    canvas.className = 'rn-canvas'
    canvas.setAttribute('aria-hidden', 'true')

    const readyScreen = document.createElement('div')
    readyScreen.className = 'rn-screen rn-ready'
    const readyCard = document.createElement('div')
    readyCard.className = 'rn-card'
    const title = document.createElement('h2')
    title.className = 'rn-title'
    title.id = 'rn-ready-title'
    title.textContent = 'EVIDENCE RUNNER'
    const controls = document.createElement('p')
    controls.className = 'rn-controls'
    controls.textContent = 'SPACE / UP / W / TAP to jump. Hold for a higher jump.'
    const bestLine = document.createElement('p')
    bestLine.className = 'rn-best'
    const bestReadyEl = document.createElement('span')
    bestReadyEl.className = 'rn-num'
    bestReadyEl.textContent = String(this.host.best)
    bestLine.append('BEST ', bestReadyEl)
    const startBtn = document.createElement('button')
    startBtn.type = 'button'
    startBtn.className = 'rn-btn rn-start'
    startBtn.textContent = 'START'
    readyCard.append(title, controls, bestLine, startBtn)
    readyScreen.append(readyCard)

    const overScreen = document.createElement('div')
    overScreen.className = 'rn-screen rn-over'
    const overCard = document.createElement('div')
    overCard.className = 'rn-card'
    const overTitle = document.createElement('h2')
    overTitle.className = 'rn-title rn-title--alert'
    overTitle.id = 'rn-over-title'
    overTitle.textContent = 'CONNECTION LOST'
    const scoreLine = document.createElement('p')
    scoreLine.className = 'rn-score'
    const scoreValueEl = document.createElement('span')
    scoreValueEl.className = 'rn-num'
    scoreValueEl.textContent = '0'
    scoreLine.append('SCORE ', scoreValueEl)
    const bestLine2 = document.createElement('p')
    bestLine2.className = 'rn-best'
    const bestValueEl = document.createElement('span')
    bestValueEl.className = 'rn-num'
    bestValueEl.textContent = '0'
    bestLine2.append('BEST ', bestValueEl)
    const newBestEl = document.createElement('p')
    newBestEl.className = 'rn-badge'
    newBestEl.textContent = 'NEW BEST'
    newBestEl.hidden = true
    const xpLine = document.createElement('p')
    xpLine.className = 'rn-xp'
    const xpValueEl = document.createElement('span')
    xpValueEl.className = 'rn-num'
    xpValueEl.textContent = '0'
    xpLine.append('+', xpValueEl, ' XP')
    const actions = document.createElement('div')
    actions.className = 'rn-actions'
    const againBtn = document.createElement('button')
    againBtn.type = 'button'
    againBtn.className = 'rn-btn rn-again'
    againBtn.textContent = 'PLAY AGAIN'
    const exitBtn = document.createElement('button')
    exitBtn.type = 'button'
    exitBtn.className = 'rn-btn rn-exit-btn'
    exitBtn.textContent = 'EXIT'
    actions.append(againBtn, exitBtn)
    overCard.append(overTitle, scoreLine, bestLine2, newBestEl, xpLine, actions)
    overScreen.append(overCard)

    this.root.append(canvas, readyScreen, overScreen)

    return { canvas, startBtn, againBtn, exitBtn, scoreValueEl, bestValueEl, newBestEl, xpValueEl }
  }

  // ---- layout ---------------------------------------------------------------------------------
  private resize(): void {
    const rect = this.root.getBoundingClientRect()
    this.cssW = Math.max(1, Math.round(rect.width))
    this.cssH = Math.max(1, Math.round(rect.height))
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.round(this.cssW * dpr)
    this.canvas.height = Math.round(this.cssH * dpr)
    this.canvas.style.width = `${this.cssW}px`
    this.canvas.style.height = `${this.cssH}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.ctx.imageSmoothingEnabled = false

    this.scale = this.cssH >= 480 ? 3 : 2
    const groundBand = 10 * this.scale
    this.groundY = this.cssH - groundBand - 8
    this.playerSize = 24 * this.scale
    this.playerX = Math.round(this.cssW * 0.16)

    if (this.root.dataset.state === 'playing') {
      this.playerY = Math.min(this.playerY, this.groundY - this.playerSize)
    } else {
      this.playerY = this.groundY - this.playerSize
    }

    this.root.style.setProperty('--rn-w', `${this.cssW}px`)
    this.root.style.setProperty('--rn-h', `${this.cssH}px`)
  }

  // ---- input ----------------------------------------------------------------------------------
  private onStartClick = (): void => {
    this.startRun()
  }

  private onExitClick = (): void => {
    this.host.exit()
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.destroyed) return
    const target = e.target
    if (target instanceof HTMLElement && target.tagName === 'BUTTON') return

    if (e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault()

    const isJumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'
    const isStartKey = e.code === 'Space' || e.code === 'Enter'
    const state = this.root.dataset.state

    if (state === 'playing') {
      if (isJumpKey && !e.repeat) this.tryJump(performance.now())
    } else if (state === 'ready' || state === 'over') {
      if (isStartKey && !e.repeat) this.startRun()
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    if (this.destroyed) return
    const isJumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'
    if (isJumpKey) this.releaseJump(performance.now())
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.destroyed) return
    if (this.root.dataset.state !== 'playing') return
    e.preventDefault()
    this.tryJump(performance.now())
  }

  private onPointerUp = (): void => {
    if (this.destroyed) return
    this.releaseJump(performance.now())
  }

  private onVisibility = (): void => {
    if (document.hidden) this.pause()
    else this.resume()
  }

  // ---- run lifecycle ----------------------------------------------------------------------------
  private startRun(): void {
    // The START / PLAY AGAIN button that triggered this becomes display:none the instant
    // dataset.state flips below; blur it now so a jump key pressed right after isn't ignored
    // while waiting on the browser's own focus-fixup (target-is-button is otherwise swallowed).
    const active = document.activeElement
    if (active instanceof HTMLElement && this.root.contains(active)) active.blur()

    this.fastRun = this.host.fast
    this.distance = 0
    this.elapsed = 0
    this.speed = this.fastRun ? FAST_SPEED : BASE_SPEED
    this.scoreFloat = 0
    this.lastReportedScore = -1
    this.obstacles = []
    this.floppies = []
    this.particles = []
    this.popups = []
    this.obstacleTimer = this.fastRun ? FAST_FIRST_SPAWN : rand(NORMAL_FIRST_SPAWN[0], NORMAL_FIRST_SPAWN[1])
    this.floppyTimer = rand(1.0, 1.8)

    this.playerY = this.groundY - this.playerSize
    this.playerVy = 0
    this.grounded = true
    this.lastGroundedAt = performance.now()
    this.anim = 'run'
    this.frameIdx = 0
    this.frameTimer = 0.16

    this.crashed = false
    this.freezeUntil = 0
    this.shakeUntil = 0
    this.flashUntil = 0

    this.host.setScore(0)
    this.host.sfx('start')
    this.root.dataset.state = 'playing'
  }

  private finalizeRun(): void {
    const finalScore = Math.floor(this.scoreFloat)
    this.host.setScore(finalScore)
    const isBest = this.host.reportScore(finalScore)
    const xp = Math.min(XP_CAP, 10 + 5 * Math.floor(finalScore / 100))
    this.host.awardXP(xp, `Cleared a data centre run with ${finalScore} points`)
    if (finalScore >= ACH_300) this.host.unlock('runner-300')
    if (finalScore >= ACH_1000) this.host.unlock('runner-1000')
    this.host.sfx('lose')

    this.scoreValueEl.textContent = String(finalScore)
    this.bestValueEl.textContent = String(Math.max(this.host.best, finalScore))
    this.newBestEl.hidden = !isBest
    this.xpValueEl.textContent = String(xp)

    this.crashed = false
    this.root.dataset.state = 'over'
    this.againBtn.focus()
  }

  // ---- physics ----------------------------------------------------------------------------------
  private tryJump(now: number): void {
    if (this.root.dataset.state !== 'playing' || this.crashed) return
    const coyoteOk = !this.grounded && now - this.lastGroundedAt < COYOTE_MS
    if (this.grounded || coyoteOk) {
      this.playerVy = JUMP_VELOCITY
      this.grounded = false
      this.anim = 'jump'
      this.jumpStartAt = now
      this.host.sfx('jump')
    }
  }

  private releaseJump(now: number): void {
    if (this.playerVy < SHORT_HOP_VY && now - this.jumpStartAt < MAX_HOLD_MS) {
      this.playerVy = SHORT_HOP_VY
    }
  }

  private updatePlayer(dt: number, now: number): void {
    this.playerVy += GRAVITY * dt
    this.playerY += this.playerVy * dt
    const restY = this.groundY - this.playerSize
    if (this.playerY >= restY) {
      this.playerY = restY
      this.playerVy = 0
      if (!this.grounded) {
        this.grounded = true
        this.lastGroundedAt = now
        this.anim = 'run'
      }
    } else {
      this.grounded = false
      this.anim = 'jump'
    }

    if (this.anim === 'run') {
      this.frameTimer -= dt
      if (this.frameTimer <= 0) {
        this.frameIdx = this.frameIdx === 0 ? 1 : 0
        this.frameTimer = clamp(0.19 - (this.speed - BASE_SPEED) * 0.00025, 0.07, 0.19)
      }
    }
  }

  // ---- spawns -------------------------------------------------------------------------------------
  private nextObstacleGap(): number {
    const t = clamp(this.elapsed / 60, 0, 1)
    return rand(lerp(520, 480, t), lerp(760, 620, t))
  }

  private spawnObstacle(): void {
    const stage2 = this.elapsed >= 16
    const r = Math.random()
    const bugW = 12 * this.scale
    const bugH = 10 * this.scale
    const lockW = 12 * this.scale
    const lockH = 15 * this.scale
    const spawnX = this.cssW + 24

    let footprintW = bugW
    let footprintH = bugH
    if (stage2 && r < 0.22) {
      const innerGap = 10 * this.scale
      this.obstacles.push({ x: spawnX, y: this.groundY - bugH, w: bugW, h: bugH, kind: 'bug' })
      this.obstacles.push({ x: spawnX + bugW + innerGap, y: this.groundY - bugH, w: bugW, h: bugH, kind: 'bug' })
      footprintW = bugW * 2 + innerGap
      footprintH = bugH
    } else if (r < 0.58) {
      this.obstacles.push({ x: spawnX, y: this.groundY - bugH, w: bugW, h: bugH, kind: 'bug' })
      footprintW = bugW
      footprintH = bugH
    } else {
      this.obstacles.push({ x: spawnX, y: this.groundY - lockH, w: lockW, h: lockH, kind: 'padlock' })
      footprintW = lockW
      footprintH = lockH
    }

    if (Math.random() < 0.45) {
      const fw = 12 * this.scale
      const fh = 12 * this.scale
      this.floppies.push({
        x: spawnX + footprintW / 2 - fw / 2,
        y: this.groundY - footprintH - fh * 1.9,
        w: fw,
        h: fh,
        taken: false,
      })
    }
  }

  private spawnFloppy(): void {
    const fw = 12 * this.scale
    const fh = 12 * this.scale
    const low = Math.random() < 0.5
    const y = low ? this.groundY - this.playerSize * 0.55 : this.groundY - this.playerSize * 1.55
    this.floppies.push({ x: this.cssW + 24, y, w: fw, h: fh, taken: false })
  }

  private updateSpawns(dt: number): void {
    this.obstacleTimer -= dt
    if (this.obstacleTimer <= 0) {
      this.spawnObstacle()
      this.obstacleTimer = this.nextObstacleGap() / this.speed
    }
    this.floppyTimer -= dt
    if (this.floppyTimer <= 0) {
      this.spawnFloppy()
      this.floppyTimer = rand(1.1, 2.2)
    }
  }

  // ---- collision / scoring -------------------------------------------------------------------------
  private collectFloppy(f: FloppyItem): void {
    this.scoreFloat += FLOPPY_VALUE
    this.host.sfx('coin')
    this.popups.push({ x: f.x + f.w / 2, y: f.y, vy: -34, life: 0.75, maxLife: 0.75, text: '+50', color: HUE.amber })
    const n = this.host.reducedMotion ? 3 : 8
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2)
      const sp = rand(30, 90)
      this.particles.push({
        x: f.x + f.w / 2,
        y: f.y + f.h / 2,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.4,
        maxLife: 0.4,
        size: 2,
        color: HUE.amber,
      })
    }
  }

  private triggerCrash(now: number): void {
    this.crashed = true
    this.anim = 'hurt'
    this.host.sfx('hit')
    const rm = this.host.reducedMotion
    this.freezeUntil = now + (rm ? CRASH_FREEZE_MS_RM : CRASH_FREEZE_MS)
    if (!rm) {
      this.shakeUntil = now + SHAKE_MS
      this.flashUntil = now + FLASH_MS
    }
    const n = rm ? 5 : 18
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2)
      const sp = rand(60, 220)
      this.particles.push({
        x: this.playerX + this.playerSize / 2,
        y: this.playerY + this.playerSize / 2,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.5,
        maxLife: 0.5,
        size: rand(2, 4),
        color: i % 2 === 0 ? HUE.red : HUE.amber,
      })
    }
  }

  private checkCollisions(now: number): void {
    const pInsetX = this.playerSize * 0.2
    const pInsetY = this.playerSize * 0.16
    const px = this.playerX + pInsetX
    const py = this.playerY + pInsetY
    const pw = this.playerSize - pInsetX * 2
    const ph = this.playerSize - pInsetY * 2

    for (const f of this.floppies) {
      if (f.taken) continue
      if (aabbHit(px, py, pw, ph, f.x, f.y, f.w, f.h)) {
        f.taken = true
        this.collectFloppy(f)
      }
    }

    if (this.crashed) return
    for (const o of this.obstacles) {
      const oix = o.w * 0.12
      const oiy = o.h * 0.1
      if (aabbHit(px, py, pw, ph, o.x + oix, o.y + oiy, o.w - oix * 2, o.h - oiy * 2)) {
        this.triggerCrash(now)
        break
      }
    }
  }

  // ---- update / loop -------------------------------------------------------------------------------
  private update(dt: number, now: number): void {
    this.elapsed += dt
    const accel = this.fastRun ? FAST_ACCEL : ACCEL
    const base = this.fastRun ? FAST_SPEED : BASE_SPEED
    this.speed = clamp(base + this.elapsed * accel, base, MAX_SPEED)

    this.distance += this.speed * dt
    this.scoreFloat += this.speed * dt * SCORE_PER_PX
    const scoreInt = Math.floor(this.scoreFloat)
    if (scoreInt !== this.lastReportedScore) {
      this.lastReportedScore = scoreInt
      this.host.setScore(scoreInt)
    }

    this.updatePlayer(dt, now)
    this.updateSpawns(dt)

    const dx = this.speed * dt
    for (const o of this.obstacles) o.x -= dx
    for (const f of this.floppies) f.x -= dx
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > -10)
    this.floppies = this.floppies.filter((f) => !f.taken && f.x + f.w > -10)

    this.checkCollisions(now)
  }

  private updateFx(dt: number): void {
    for (const p of this.particles) {
      p.vy += 500 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)

    for (const p of this.popups) {
      p.y += p.vy * dt
      p.life -= dt
    }
    this.popups = this.popups.filter((p) => p.life > 0)
  }

  private updateAmbient(dt: number): void {
    this.frameTimer -= dt
    if (this.frameTimer <= 0) {
      this.frameIdx = this.frameIdx === 0 ? 1 : 0
      this.frameTimer = 0.5
    }
    if (this.root.dataset.state === 'ready') {
      this.distance += 46 * dt
    }
  }

  private loop = (now: number): void => {
    if (this.destroyed || this.paused) return
    let dt = (now - this.lastFrameTime) / 1000
    this.lastFrameTime = now
    dt = clamp(dt, 0, 0.05)

    this.updateFx(dt)

    const state = this.root.dataset.state
    if (state === 'playing') {
      if (this.crashed) {
        if (now >= this.freezeUntil) this.finalizeRun()
      } else {
        this.update(dt, now)
      }
    } else {
      this.updateAmbient(dt)
    }

    this.render(now)
    this.rafId = requestAnimationFrame(this.loop)
  }

  // ---- render -----------------------------------------------------------------------------------
  private drawStars(now: number): void {
    const ctx = this.ctx
    const tile = 200
    const factor = 0.12
    const scrollX = (this.distance * factor) % tile
    const start = Math.floor(-scrollX / tile) - 1
    const skyH = Math.max(10, this.groundY - 30)
    for (let i = start; i * tile - scrollX < this.cssW + tile; i++) {
      const baseX = i * tile - scrollX
      for (let s = 0; s < 6; s++) {
        const h1 = hash01(i * 12.9898 + s * 3.233)
        const h2 = hash01(i * 78.233 + s * 5.71 + 0.5)
        const h3 = hash01(i * 4.11 + s * 1.73 + 0.25)
        const x = baseX + h1 * tile
        const y = 10 + h2 * skyH
        const r = 1 + Math.floor(h3 * 2)
        const twinkle = this.host.reducedMotion
          ? 0.75
          : 0.4 + 0.6 * Math.abs(Math.sin(now * 0.0015 + i * 12.3 + s))
        ctx.fillStyle = rgba(PAPER, 0.12 + 0.45 * twinkle)
        ctx.fillRect(Math.round(x), Math.round(y), r, r)
      }
    }
  }

  private drawRacks(now: number): void {
    const ctx = this.ctx
    const tile = 130
    const factor = 0.5
    const scrollX = (this.distance * factor) % tile
    const start = Math.floor(-scrollX / tile) - 1
    const topY = this.groundY
    for (let i = start; i * tile - scrollX < this.cssW + tile; i++) {
      const baseX = i * tile - scrollX
      const hgt = 40 + hash01(i * 3.3) * 70
      const rw = 46
      const rx = baseX + (tile - rw) / 2
      const ry = topY - hgt
      ctx.fillStyle = rgba(PANEL, 0.9)
      ctx.fillRect(rx, ry, rw, hgt)
      ctx.strokeStyle = rgba(LINE, 0.7)
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, hgt - 1)
      for (let l = 0; l < 3; l++) {
        const lx = rx + 6 + (l % 2) * (rw - 16)
        const ly = ry + 10 + l * 14
        if (ly > topY - 8) continue
        const phase = hash01(i * 7.1 + l * 2.3) * Math.PI * 2
        const on = this.host.reducedMotion ? true : Math.sin(now * 0.004 + phase) > 0.2
        ctx.fillStyle = on ? rgba(HUE.term, 0.9) : rgba(HUE.term, 0.15)
        ctx.fillRect(lx, ly, 3, 3)
      }
    }
  }

  private drawGround(): void {
    const ctx = this.ctx
    const w = this.cssW
    const y = this.groundY
    ctx.fillStyle = PANEL
    ctx.fillRect(0, y, w, this.cssH - y)
    ctx.strokeStyle = rgba(HUE.term, 0.55)
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(w, y + 0.5)
    ctx.stroke()

    const tile = 20 * this.scale
    const offset = this.distance % tile
    ctx.strokeStyle = rgba(LINE, 0.9)
    for (let x = -offset; x < w; x += tile) {
      ctx.beginPath()
      ctx.moveTo(x, y + 4)
      ctx.lineTo(x, y + 10)
      ctx.stroke()
    }
  }

  private drawPlayer(): void {
    const state = this.root.dataset.state
    let sprite: Sprite
    if (state === 'ready') {
      sprite = this.frameIdx === 0 ? SANKO.idle0 : SANKO.idle1
    } else if (state === 'over') {
      sprite = SANKO.hurt
    } else if (this.anim === 'jump') {
      sprite = SANKO.jump
    } else if (this.anim === 'hurt') {
      sprite = SANKO.hurt
    } else {
      sprite = this.frameIdx === 0 ? SANKO.run0 : SANKO.run1
    }
    drawSprite(this.ctx, sprite, this.playerX, this.playerY, this.scale, false)
  }

  private drawHud(): void {
    if (this.root.dataset.state !== 'playing') return
    const ctx = this.ctx
    const pad = 10
    const score = Math.floor(this.scoreFloat)
    ctx.fillStyle = rgba(PANEL, 0.7)
    ctx.fillRect(pad - 6, pad - 4, 128, 38)
    ctx.strokeStyle = rgba(LINE, 0.8)
    ctx.strokeRect(pad - 5.5, pad - 3.5, 127, 37)
    ctx.fillStyle = DIM
    ctx.font = '9px "Press Start 2P", monospace'
    ctx.fillText('SCORE', pad, pad + 8)
    ctx.fillStyle = PAPER
    ctx.font = '22px "VT323", monospace'
    ctx.fillText(String(score), pad, pad + 32)
  }

  private render(now: number): void {
    const ctx = this.ctx
    const w = this.cssW
    const h = this.cssH

    ctx.save()
    if (now < this.shakeUntil) {
      const k = (this.shakeUntil - now) / SHAKE_MS
      ctx.translate((hash01(now * 0.017) - 0.5) * 8 * k, (hash01(now * 0.021 + 5) - 0.5) * 8 * k)
    }

    ctx.fillStyle = INK
    ctx.fillRect(-20, -20, w + 40, h + 40)

    this.drawStars(now)
    this.drawRacks(now)
    this.drawGround()

    for (const f of this.floppies) {
      if (f.taken) continue
      const bob = Math.sin(now * 0.006 + f.x * 0.05) * this.scale * 0.6
      drawSprite(ctx, FLOPPY, f.x, f.y + bob, this.scale)
    }

    for (const o of this.obstacles) {
      drawSprite(ctx, o.kind === 'bug' ? BUG : PADLOCK, o.x, o.y, this.scale)
    }

    this.drawPlayer()

    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1)
      ctx.fillStyle = rgba(p.color, a)
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
    }

    ctx.textAlign = 'center'
    for (const p of this.popups) {
      const a = clamp(p.life / p.maxLife, 0, 1)
      ctx.font = `${12 + this.scale * 2}px "VT323", monospace`
      ctx.fillStyle = rgba(p.color, a)
      ctx.fillText(p.text, p.x, p.y)
    }
    ctx.textAlign = 'left'

    ctx.restore()

    this.drawHud()

    if (now < this.flashUntil) {
      const a = clamp((this.flashUntil - now) / FLASH_MS, 0, 1) * 0.28
      ctx.fillStyle = rgba(HUE.red, a)
      ctx.fillRect(0, 0, w, h)
    }
  }

  // ---- GameInstance -----------------------------------------------------------------------------
  pause(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.paused = true
  }

  resume(): void {
    if (this.destroyed || !this.paused) return
    this.paused = false
    this.lastFrameTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.resizeObserver.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.startBtn.removeEventListener('click', this.onStartClick)
    this.againBtn.removeEventListener('click', this.onStartClick)
    this.exitBtn.removeEventListener('click', this.onExitClick)
    this.root.replaceChildren()
    this.root.classList.remove('rn-root')
    delete this.root.dataset.state
  }
}

const runner: GameModule = {
  id: 'runner',
  title: 'Evidence Runner',
  blurb: 'Sprint the server floor, dodge malware, grab the evidence before the trail goes cold.',
  controls: 'SPACE / UP / W / TAP to jump',
  mount(host: GameHost): GameInstance {
    return new RunnerGame(host)
  },
}

export default runner
