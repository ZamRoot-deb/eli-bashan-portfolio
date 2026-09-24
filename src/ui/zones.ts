// Zone tracking: the zone crossing the middle of the viewport is "current". The hash follows it
// (bare #tokens, replaceState so history is not spammed), first visits award XP, and zones that
// are off screen get data-inview="false" so their CSS loops pause.

import { ZONES } from '../content'
import { emit } from '../core/bus'
import { sfx } from '../core/sfx'
import { discoverZone, unlock } from '../core/xp'
import { $, $$ } from './dom'

let current = ''
let arrivedAt = performance.now()

function setHash(id: string): void {
  const want = id === 'top' ? location.pathname + location.search : `#${id}`
  if ((id === 'top' && !location.hash) || location.hash === `#${id}`) return
  try {
    history.replaceState(null, '', want)
  } catch {
    /* sandboxed frames can refuse history writes */
  }
}

function enter(id: string): void {
  if (id === current) return
  current = id
  setHash(id)
  const first = discoverZone(id, ZONES.length)
  if (id === 'contact' && performance.now() - arrivedAt < 60_000) unlock('speedrunner')
  emit('zone', { id, first })
}

export const currentZone = (): string => current || 'top'

/** Scroll to a zone with a warp flourish on the starfield. */
export function warpTo(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  emit('warp', { to: id })
  sfx('powerup')
  el.scrollIntoView({ block: 'start' })
}

export function initZones(): void {
  arrivedAt = performance.now()
  const sections = $$<HTMLElement>('section.zone[data-zone]')

  if ('IntersectionObserver' in window) {
    // current zone: whichever section crosses the horizontal centre line
    const centre = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) enter((e.target as HTMLElement).dataset.zone ?? '')
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    // off-screen zones pause their CSS animation loops
    const inview = new IntersectionObserver((entries) => {
      for (const e of entries) (e.target as HTMLElement).dataset.inview = String(e.isIntersecting)
    })
    sections.forEach((s) => {
      centre.observe(s)
      inview.observe(s)
    })
    // the last zone is short: treat reaching the page bottom as entering it
    window.addEventListener('scroll', () => {
      const doc = document.documentElement
      if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) enter(sections[sections.length - 1]?.dataset.zone ?? 'contact')
    }, { passive: true })
  }

  // on load: honour a zone hash (the browser already scrolled; make sure the zone is framed)
  const initial = location.hash.slice(1)
  if (initial && ZONES.some((z) => z.id === initial)) {
    requestAnimationFrame(() => $(`#${CSS.escape(initial)}`)?.scrollIntoView({ block: 'start', behavior: 'instant' }))
  }

  // in-page zone links get the warp treatment
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return
    const id = a.getAttribute('href')?.slice(1) ?? ''
    if (!ZONES.some((z) => z.id === id)) return
    e.preventDefault()
    warpTo(id)
  })
}
