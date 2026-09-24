// "Quest complete" overlay, shown once per session when the player reaches the bottom of the page.
// An arcade CONTINUE countdown ring closes it automatically.

import { ZONES } from '../content'
import { sfx } from '../core/sfx'
import { session } from '../core/store'
import { ACHIEVEMENTS, getLevel, getXP, unlockedIds, zonesSeen } from '../core/xp'
import { createDialog, type Dialog } from './dialog'
import { $, h } from './dom'
import { formatDuration, sessionSeconds } from './hud'
import { warpTo } from './zones'

const SECONDS = 10
let dlg: Dialog
let timer = 0
let shownThisLoad = false

function stat(value: string, label: string): HTMLElement {
  return h('div', { class: 'end__stat' }, h('b', {}, value), h('span', {}, label))
}

export function showEnd(): void {
  const C = 2 * Math.PI * 28
  const num = h('b', {}, String(SECONDS))
  const ring = h('div', {
    class: 'countdown',
    'data-countdown': '',
    html: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="cd__track" cx="32" cy="32" r="28"/><circle class="cd__fill" cx="32" cy="32" r="28" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"/></svg>`,
  }, num)
  const fillEl = ring.querySelector<SVGCircleElement>('.cd__fill')

  const again = h('button', { class: 'btn btn--gold', type: 'button' }, 'Play again')
  const arcade = h('button', { class: 'btn', type: 'button' }, 'Open the arcade')
  const talk = h('button', { class: 'btn', type: 'button' }, 'Get in touch')

  dlg.body.replaceChildren(
    h('div', { class: 'end' },
      h('p', { class: 'end__kicker' }, 'QUEST COMPLETE'),
      h('p', { class: 'end__title' }, 'You scrolled the whole case file. Thanks for staying for the full story.'),
      h('div', { class: 'end__stats' },
        stat(formatDuration(sessionSeconds()), 'TIME PLAYED'),
        stat(`${zonesSeen().length}/${ZONES.length}`, 'ZONES FOUND'),
        stat(String(getXP()), 'XP'),
        stat(`LV ${getLevel()}`, 'LEVEL'),
        stat(`${unlockedIds().length}/${ACHIEVEMENTS.length}`, 'ACHIEVEMENTS'),
      ),
      h('div', { class: 'end__actions' }, again, arcade, talk),
      ring,
      h('p', { class: 'countdown__label' }, 'CONTINUE?'),
    ),
  )

  again.addEventListener('click', () => {
    dlg.close()
    warpTo('top')
  })
  arcade.addEventListener('click', () => {
    dlg.close()
    warpTo('arcade')
  })
  talk.addEventListener('click', () => {
    dlg.close()
    $<HTMLElement>('[data-contact-row][data-kind="email"] a')?.focus()
  })

  dlg.open()
  again.focus()
  sfx('win')
  let left = SECONDS
  const start = performance.now()
  const tick = () => {
    const elapsed = (performance.now() - start) / 1000
    left = Math.max(0, SECONDS - elapsed)
    num.textContent = String(Math.ceil(left))
    fillEl?.setAttribute('stroke-dashoffset', (C * (1 - left / SECONDS)).toFixed(1))
    if (left <= 0) {
      dlg.close()
      return
    }
    timer = window.setTimeout(tick, 100)
  }
  tick()
}

export function initEndscreen(): void {
  dlg = createDialog({ id: 'endscreen', title: 'Continue?', variant: 'end', hook: 'data-endscreen', hue: 'var(--amber)', onClose: () => window.clearTimeout(timer) })
  const foot = $('.foot')
  if (!foot || !('IntersectionObserver' in window)) return
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return
    if (shownThisLoad || session.get<string>('ezb.end', '') === '1') return
    shownThisLoad = true
    session.set('ezb.end', '1')
    io.disconnect()
    window.setTimeout(showEnd, 600)
  }, { threshold: 0.6 })
  io.observe(foot)
}
