// Boot sequence: plays once per session, any key / click / tap skips it.

import { FORCE_BOOT, SKIP_BOOT, isReduced } from '../core/env'
import { session } from '../core/store'
import { unlock } from '../core/xp'
import { h, uiRoot } from './dom'

const LINES = [
  'EZB-OS v3.0  forensic kernel [64-bit]',
  '> mounting /evidence ............. OK',
  '> verifying sha256 chain ......... INTACT',
  '> loading sprites ................ OK',
  '> syncing threat intel feed ...... SYNCED',
  '> spawning player ................ ELI ZAMAR BASHAN',
  '',
  'PRESS ANY KEY TO START',
]

export function runBoot(onDone: () => void): void {
  const already = session.get<string>('ezb.booted', '') === '1'
  if (!FORCE_BOOT && (SKIP_BOOT || already)) {
    unlock('press-start')
    onDone()
    return
  }

  const log = h('div', { class: 'boot__log', 'aria-live': 'off' })
  const fill = h('i')
  const bar = h('div', { class: 'boot__bar' }, fill)
  const box = h('div', { class: 'boot__box' },
    h('div', { class: 'boot__head' },
      h('img', { class: 'boot__glass', src: 'sprites/hourglass.png', alt: '', width: 72, height: 83 }),
      h('div', {}, h('p', { class: 'boot__name' }, 'EZB-OS'), h('p', { class: 'boot__sub' }, 'Loading player profile...')),
    ),
    log,
    bar,
    h('p', { class: 'boot__skip' }, '[ press any key or tap to skip ]'),
  )
  const el = h('div', { class: 'boot', 'data-boot': '', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Starting EZB-OS' }, box)
  uiRoot().append(el)

  let finished = false
  let timer = 0
  const finish = () => {
    if (finished) return
    finished = true
    window.clearTimeout(timer)
    window.removeEventListener('keydown', finish, true)
    el.removeEventListener('pointerdown', finish)
    session.set('ezb.booted', '1')
    el.classList.add('is-out')
    unlock('press-start')
    window.setTimeout(() => {
      el.remove()
      onDone()
    }, isReduced() ? 0 : 420)
  }
  window.addEventListener('keydown', finish, true)
  el.addEventListener('pointerdown', finish)

  const text = LINES.join('\n')
  let i = 0
  const step = () => {
    i = Math.min(text.length, i + 3)
    log.textContent = text.slice(0, i)
    fill.parentElement?.style.setProperty('--p', (i / text.length).toFixed(3))
    if (i < text.length) timer = window.setTimeout(step, 16)
    else timer = window.setTimeout(finish, 900)
  }
  if (isReduced()) {
    log.textContent = text
    fill.parentElement?.style.setProperty('--p', '1')
    timer = window.setTimeout(finish, 900)
  } else step()
}
