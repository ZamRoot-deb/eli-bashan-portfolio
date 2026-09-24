// Arcade host: the game overlay, lazy game loading, the GameHost bridge to XP/sfx/best scores,
// and the attract-mode screens on each cabinet.

import { ARCADE } from '../content'
import { FAST, isReduced } from '../core/env'
import { HUE, LINE, PAPER, rgba } from '../core/palette'
import { sfx } from '../core/sfx'
import { BUG, FLOPPY, SANKO, drawSprite } from '../core/sprites'
import { award, bestOf, recordRun, unlock } from '../core/xp'
import { createDialog, type Dialog } from '../ui/dialog'
import { $$, h } from '../ui/dom'
import { loopWhenVisible } from '../ui/loop'
import { toast } from '../ui/toasts'
import type { GameAchievement, GameHost, GameId, GameInstance, GameModule } from './types'

const LOADERS: Record<GameId, () => Promise<{ default: GameModule }>> = {
  runner: () => import('./runner'),
  threathunt: () => import('./threathunt'),
  phish: () => import('./phish'),
  custody: () => import('./custody'),
}

let dlg: Dialog
let root: HTMLElement
let scoreEl: HTMLElement
let bestEl: HTMLElement
let current: { id: GameId; inst: GameInstance | null } | null = null
let loadToken = 0

function paintBest(id: GameId): void {
  const v = String(bestOf(id))
  for (const el of $$(`[data-best="${id}"]`)) el.textContent = v
  if (current?.id === id) bestEl.textContent = v
}

function teardown(): void {
  loadToken++
  try {
    current?.inst?.destroy()
  } catch (err) {
    console.error('[ezb] game destroy failed', err)
  }
  current = null
  root.replaceChildren()
  delete root.dataset.state
  delete root.dataset.lastReward
  root.className = 'game-root'
}

export async function openGame(id: GameId): Promise<void> {
  if (!dlg || !(id in LOADERS)) return
  if (current) teardown()
  const meta = ARCADE.games.find((g) => g.id === id)
  dlg.titleEl.textContent = meta?.title ?? id
  scoreEl.textContent = '0'
  bestEl.textContent = String(bestOf(id))
  current = { id, inst: null }
  root.replaceChildren(h('p', { class: 'game-loading' }, 'LOADING CARTRIDGE...'))
  dlg.open()
  sfx('start')

  const token = ++loadToken
  let mod: GameModule
  try {
    mod = (await LOADERS[id]()).default
  } catch (err) {
    console.error('[ezb] could not load game', id, err)
    if (token !== loadToken) return
    const retry = h('button', { class: 'btn', type: 'button' }, 'Try again')
    retry.addEventListener('click', () => void openGame(id))
    root.replaceChildren(h('div', { class: 'game-error' }, h('p', {}, 'This cartridge did not load. Check the connection and try again.'), retry))
    return
  }
  if (token !== loadToken || !dlg.isOpen()) return
  root.replaceChildren()

  const host: GameHost = {
    root,
    awardXP: (amount, reason) => {
      const xp = Math.round(Math.max(0, Math.min(80, amount)))
      if (!xp) return
      root.dataset.lastReward = String(xp)
      award(xp, `${meta?.title ?? id}: ${reason}`)
      toast('RUN COMPLETE', `${meta?.title ?? id}: ${reason}`, xp, 'gamepad', 'var(--term)')
    },
    unlock: (a: GameAchievement) => void unlock(a),
    sfx,
    setScore: (n) => (scoreEl.textContent = String(n)),
    reportScore: (n) => {
      const isBest = recordRun(id, n)
      paintBest(id)
      return isBest
    },
    best: bestOf(id),
    reducedMotion: isReduced(),
    fast: FAST,
    exit: () => dlg.close(),
  }
  try {
    current.inst = mod.mount(host)
  } catch (err) {
    console.error('[ezb] game failed to start', id, err)
    root.replaceChildren(h('div', { class: 'game-error' }, h('p', {}, 'This cartridge crashed on start. Close it and try another cabinet.')))
    return
  }
  if (!root.contains(document.activeElement)) root.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
}

export const closeGame = (): void => dlg.close()

// ---------------------------------------------------------------- attract mode

function attract(canvas: HTMLCanvasElement, id: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  ctx.imageSmoothingEnabled = false
  const text = (s: string, x: number, y: number, c: string) => {
    ctx.fillStyle = c
    ctx.font = '8px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(s, x, y)
  }
  loopWhenVisible(canvas, (t) => {
    ctx.fillStyle = '#020304'
    ctx.fillRect(0, 0, W, H)
    const blink = Math.floor(t / 500) % 2 === 0
    if (id === 'runner') {
      const g = H - 30
      ctx.fillStyle = LINE
      ctx.fillRect(0, g, W, 2)
      for (let x = -((t / 10) % 20); x < W; x += 20) ctx.fillRect(x, g + 8, 8, 2)
      const bx = W - ((t / 8) % (W + 40))
      drawSprite(ctx, BUG, bx, g - 20, 2)
      const jump = bx > 40 && bx < 110 ? Math.sin(((110 - bx) / 70) * Math.PI) * 34 : 0
      drawSprite(ctx, jump > 1 ? SANKO.jump : Math.floor(t / 120) % 2 ? SANKO.run0 : SANKO.run1, 50, g - 48 - jump, 2)
      drawSprite(ctx, FLOPPY, W - ((t / 6 + 90) % (W + 40)), g - 84, 2)
    } else if (id === 'threathunt') {
      const cw = 58
      const ch = 34
      const ox = (W - cw * 3 - 16) / 2
      for (let i = 0; i < 9; i++) {
        const x = ox + (i % 3) * (cw + 8)
        const y = 10 + Math.floor(i / 3) * (ch + 6)
        ctx.strokeStyle = LINE
        ctx.strokeRect(x + 0.5, y + 0.5, cw, ch)
        const slot = Math.floor(t / 700 + i * 1.7) % 5
        if (slot === 0) drawSprite(ctx, BUG, x + cw / 2 - 12, y + 7, 2)
        if (slot === 2 && i % 2) {
          ctx.fillStyle = rgba(HUE.term, 0.8)
          ctx.fillRect(x + cw / 2 - 8, y + 9, 16, 16)
        }
      }
    } else if (id === 'phish') {
      const phase = Math.floor(t / 1400) % 2
      const sway = Math.sin(t / 300) * 6
      ctx.save()
      ctx.translate(W / 2 + sway, H / 2 - 6)
      ctx.rotate((sway / 6) * 0.08)
      ctx.fillStyle = '#0d1a22'
      ctx.fillRect(-60, -38, 120, 76)
      ctx.strokeStyle = phase ? HUE.term : HUE.red
      ctx.lineWidth = 2
      ctx.strokeRect(-60, -38, 120, 76)
      ctx.fillStyle = rgba(PAPER, 0.5)
      for (let i = 0; i < 4; i++) ctx.fillRect(-48, -24 + i * 12, i === 3 ? 50 : 96, 4)
      ctx.restore()
      text(phase ? 'LEGIT' : 'PHISH', W / 2 + sway, H - 14, phase ? HUE.term : HUE.red)
    } else {
      const n = Math.floor(t / 600) % 8
      for (let i = 0; i < 6; i++) {
        const x = 18 + i * 36
        const y = H / 2 - 12
        ctx.fillStyle = i < n ? HUE.violet : '#16222b'
        ctx.fillRect(x, y, 24, 24)
        if (i < n - 1) {
          ctx.fillStyle = HUE.amber
          ctx.fillRect(x + 24, y + 10, 12, 4)
        }
      }
      text(n >= 7 ? 'CHAIN INTACT' : 'ORDER THE EVIDENCE', W / 2, H - 20, n >= 7 ? HUE.amber : PAPER)
    }
    if (blink) text('INSERT COIN', W / 2, 14, HUE.amber)
  })
}

export function initArcade(): void {
  dlg = createDialog({
    id: 'game',
    title: 'Arcade',
    variant: 'game',
    hook: 'data-game-overlay',
    closeHook: 'data-game-close',
    bodyClass: 'game-root',
    hue: 'var(--amber)',
    onClose: teardown,
  })
  root = dlg.body
  root.setAttribute('data-game-root', '')
  scoreEl = h('b', { 'data-game-score': '' }, '0')
  bestEl = h('b', {}, '0')
  dlg.head.insertBefore(h('p', { class: 'dlg__meta' }, 'SCORE ', scoreEl, '  BEST ', bestEl), dlg.head.lastElementChild)

  for (const b of $$<HTMLButtonElement>('[data-game-launch]')) {
    b.addEventListener('click', () => void openGame(b.dataset.gameId as GameId))
  }
  document.addEventListener('ezb:play', (e) => void openGame((e as CustomEvent<GameId>).detail))
  document.addEventListener('visibilitychange', () => {
    if (!current?.inst) return
    if (document.hidden) current.inst.pause?.()
    else current.inst.resume?.()
  })
  for (const g of ARCADE.games) paintBest(g.id as GameId)
  for (const c of $$<HTMLCanvasElement>('[data-attract]')) attract(c, c.dataset.attract ?? '')
}
