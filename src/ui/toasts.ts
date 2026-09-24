// Achievement toasts and the level-up moment. Text is always set with textContent.

import { on } from '../core/bus'
import { sfx } from '../core/sfx'
import { ACHIEVEMENTS } from '../core/xp'
import { glyph, h, uiRoot } from './dom'

let region: HTMLElement
let srStatus: HTMLElement

/** Polite screen-reader announcement for feedback that is otherwise only visual. */
export function announce(text: string): void {
  if (!srStatus) return
  srStatus.textContent = ''
  window.setTimeout(() => (srStatus.textContent = text), 30)
}

const gaming = (): boolean => document.querySelector('[data-game-overlay]:not([hidden])') !== null

type ToastArgs = [kicker: string, title: string, xp: number | null, icon?: Parameters<typeof glyph>[0], hue?: string]
const queue: ToastArgs[] = []
let showingInGame = false

export function toast(...args: ToastArgs): void {
  // while a game is open, toasts sit at the top, one at a time, so they never bury the game
  const inGame = gaming()
  region.classList.toggle('toasts--top', inGame)
  if (inGame) {
    if (showingInGame) {
      queue.push(args)
      return
    }
    showingInGame = true
  }
  render(...args, inGame)
}

function render(kicker: string, title: string, xp: number | null, icon: Parameters<typeof glyph>[0] = 'trophy', hue = 'var(--amber)', inGame = false): void {
  const t = h(
    'div',
    { class: 'toast', 'data-toast': '', style: `--c:${hue}` },
    h('span', { class: 'toast__icon' }, glyph(icon)),
    h('div', {}, h('p', { class: 'toast__kicker' }, kicker), h('p', { class: 'toast__title' }, title)),
    xp !== null ? h('span', { class: 'toast__xp' }, `+${xp} XP`) : null,
  )
  region.append(t)
  while (region.children.length > 3) region.firstElementChild?.remove()
  window.setTimeout(() => {
    t.classList.add('is-out')
    window.setTimeout(() => {
      t.remove()
      if (inGame) showingInGame = false
      // drain regardless of where this toast was shown: a game may have closed meanwhile
      const next = queue.shift()
      if (next) toast(...next)
    }, 320)
  }, inGame ? 2200 : 3600)
}

function levelUp(level: number): void {
  const layer = h('div', { class: 'levelup', 'aria-hidden': 'true' }, h('p', { class: 'levelup__text' }, `LEVEL ${level}`))
  uiRoot().append(layer)
  window.setTimeout(() => layer.remove(), 1900)
}

export function initToasts(): void {
  region = h('div', { class: 'toasts', 'data-toasts': '', role: 'status', 'aria-live': 'polite' })
  srStatus = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' })
  uiRoot().append(region, srStatus)
  on('achievement', ({ id, title }) => {
    const a = ACHIEVEMENTS.find((x) => x.id === id)
    toast('ACHIEVEMENT UNLOCKED', title, a?.xp ?? null, a?.icon ?? 'trophy')
    sfx('powerup')
  })
  on('levelup', ({ level }) => {
    if (!gaming()) levelUp(level)
    toast('LEVEL UP', `You reached level ${level}`, null, 'star', 'var(--term)')
    sfx('levelup')
  })
}
