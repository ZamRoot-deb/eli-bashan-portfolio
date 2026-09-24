// Heads-up display pinned to the viewport corners, the right-edge minimap and the scroll ring.

import { PROFILE, ZONES } from '../content'
import { on } from '../core/bus'
import { isMuted, setMuted, sfx } from '../core/sfx'
import { ACHIEVEMENTS, getLevel, getXP, levelProgress, unlock, unlockedIds, zonesSeen } from '../core/xp'
import { $, glyph, h, uiRoot } from './dom'

interface HudActions {
  openTerminal(): void
  openMap(): void
  openTrophies(): void
}

const pad = (n: number) => String(n).padStart(2, '0')
const t0 = performance.now()

export function sessionSeconds(): number {
  return Math.floor((performance.now() - t0) / 1000)
}

export function formatDuration(s: number): string {
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`
}

function fmt(tz?: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz })
  } catch {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }
}

export function initHud(actions: HudActions): void {
  const root = uiRoot()

  // ---- top left: brand, zone, level, XP bar
  const zoneName = h('span', { class: 'hud__zone', 'data-hud': 'zone' }, 'Title screen')
  const lv = h('span', { class: 'hud__lv', 'data-hud': 'level' }, `LV ${pad(getLevel())}`)
  const barFill = h('i')
  const bar = h('span', { class: 'hud__xpbar', role: 'img', 'aria-label': 'Progress to next level' }, barFill)
  const xpText = h('span', { class: 'hud__xp', 'data-hud': 'xp' }, `${getXP()} XP`)
  const tl = h('div', { class: 'hud hud--tl' },
    h('div', { class: 'hud__panel' }, h('span', { class: 'hud__brand' }, 'EZB-OS'), zoneName),
    h('div', { class: 'hud__panel' }, lv, bar, xpText),
  )

  // ---- top right: trophies, terminal, sound
  const trophyBadge = h('span', { class: 'hud__badge', 'aria-hidden': 'true' }, String(unlockedIds().length))
  const trophiesBtn = h('button', { class: 'hud__btn', type: 'button', 'data-hud': 'trophies', 'aria-label': 'Trophy room', title: 'Trophy room' }, glyph('trophy'), trophyBadge)
  const termBtn = h('button', { class: 'hud__btn', type: 'button', 'data-hud': 'terminal', 'aria-label': 'Open terminal (backquote key)', title: 'Terminal ( ` )' }, glyph('terminal'))
  const soundBtn = h('button', { class: 'hud__btn', type: 'button', 'data-hud': 'sound', 'aria-label': 'Sound effects', 'aria-pressed': String(!isMuted()), title: 'Sound' }, glyph(isMuted() ? 'volume-off' : 'volume'))
  const tr = h('div', { class: 'hud hud--tr' }, trophiesBtn, termBtn, soundBtn)

  // ---- bottom left: clocks
  const ownerClock = h('b', { 'data-hud': 'clock-owner' }, '--:--:--')
  const visitorClock = h('b', { 'data-hud': 'clock-visitor' }, '--:--:--')
  const bl = h('div', { class: 'hud hud--bl', 'aria-hidden': 'true' },
    h('div', { class: 'hud__row' }, glyph('map-pin'), `${PROFILE.cityCode} `, ownerClock),
    h('div', { class: 'hud__row' }, glyph('user'), 'YOU ', visitorClock),
  )

  // ---- bottom right: stopwatch, compass, xy
  const watch = h('b', { 'data-hud': 'stopwatch' }, '00:00')
  const compass = h('button', { class: 'hud__btn hud__compass', type: 'button', 'data-hud': 'compass', 'aria-label': 'Level map', title: 'Level map' }, glyph('compass'))
  const xEl = h('b', {}, '0.0000')
  const yEl = h('b', {}, '0.0000')
  const xy = h('div', { class: 'hud__xy', 'data-hud': 'xy', 'aria-hidden': 'true' }, h('span', {}, 'X ', xEl), h('span', {}, 'Y ', yEl))
  const br = h('div', { class: 'hud hud--br' }, h('span', { class: 'hud__row hud__watch', 'aria-hidden': 'true' }, glyph('clock'), watch), compass, xy)

  // ---- minimap
  const minimap = h('nav', { class: 'minimap', 'data-minimap': '', 'aria-label': 'Zones' })
  for (const z of ZONES) {
    minimap.append(h('a', { href: `#${z.id}`, style: `--c:var(--${z.hue})`, 'data-seen': String(zonesSeen().includes(z.id)), 'aria-label': z.label }, h('span', { 'aria-hidden': 'true' }, z.short)))
  }

  // ---- scroll-to-top ring
  const C = 2 * Math.PI * 22
  const ring = h('span', {
    html: `<svg class="ring" viewBox="0 0 50 50" aria-hidden="true"><circle class="ring__track" cx="25" cy="25" r="22" fill="none" stroke-width="3"/><circle class="ring__fill" cx="25" cy="25" r="22" fill="none" stroke-width="3" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"/></svg>`,
  })
  const scrolltop = h('button', { class: 'scrolltop', type: 'button', 'data-scrolltop': '', 'aria-label': 'Back to top' }, ring, glyph('arrow-up'))
  const ringFill = ring.querySelector<SVGCircleElement>('.ring__fill')

  root.append(tl, tr, bl, br, minimap, scrolltop)

  // ---- behaviour
  trophiesBtn.addEventListener('click', () => { sfx('select'); actions.openTrophies() })
  termBtn.addEventListener('click', () => { sfx('select'); actions.openTerminal() })
  compass.addEventListener('click', () => { sfx('select'); actions.openMap() })
  soundBtn.addEventListener('click', () => {
    const on = isMuted()
    setMuted(!on)
    soundBtn.setAttribute('aria-pressed', String(on))
    soundBtn.replaceChildren(glyph(on ? 'volume' : 'volume-off'))
    if (on) {
      sfx('select')
      unlock('sound-on')
    }
  })
  scrolltop.addEventListener('click', () => {
    sfx('select')
    window.scrollTo({ top: 0 })
  })

  const ownerFmt = fmt(PROFILE.timeZone)
  const visitorFmt = fmt()
  const tick = () => {
    const now = new Date()
    ownerClock.textContent = ownerFmt.format(now)
    visitorClock.textContent = visitorFmt.format(now)
    watch.textContent = formatDuration(sessionSeconds())
  }
  tick()
  window.setInterval(tick, 1000)

  let px = 0
  let py = 0
  const writeXY = () => {
    const doc = document.documentElement
    const x = px / Math.max(1, window.innerWidth)
    const y = (window.scrollY + py) / Math.max(1, doc.scrollHeight)
    xEl.textContent = x.toFixed(4)
    yEl.textContent = Math.min(1, y).toFixed(4)
  }
  window.addEventListener('pointermove', (e) => {
    px = e.clientX
    py = e.clientY
    writeXY()
  }, { passive: true })

  let raf = 0
  const onScroll = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const p = max > 0 ? window.scrollY / max : 0
      ringFill?.setAttribute('stroke-dashoffset', (C * (1 - p)).toFixed(1))
      scrolltop.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.6)
      writeXY()
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  const paintXP = () => {
    const xp = getXP()
    xpText.textContent = `${xp} XP`
    lv.textContent = `LV ${pad(getLevel())}`
    barFill.parentElement?.style.setProperty('--xp', String(levelProgress(xp)))
  }
  paintXP()
  on('xp', paintXP)
  on('achievement', () => {
    trophyBadge.textContent = String(unlockedIds().length)
    trophiesBtn.animate([{ transform: 'scale(1.35) rotate(-8deg)' }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' })
  })
  on('zone', ({ id }) => {
    const z = ZONES.find((x) => x.id === id)
    if (z) zoneName.textContent = z.label
    for (const a of minimap.querySelectorAll('a')) {
      const zid = a.getAttribute('href')?.slice(1)
      if (zid === id) a.setAttribute('aria-current', 'true')
      else a.removeAttribute('aria-current')
      if (zid && zonesSeen().includes(zid)) a.dataset.seen = 'true'
    }
  })
  on('sound', ({ on: isOn }) => {
    soundBtn.setAttribute('aria-pressed', String(isOn))
    soundBtn.replaceChildren(glyph(isOn ? 'volume' : 'volume-off'))
  })
}

export const achievementTotal = (): number => ACHIEVEMENTS.length
export const hudEl = (hook: string): HTMLElement | null => $(`[data-hud="${hook}"]`)
