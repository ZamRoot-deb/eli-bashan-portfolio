// Level title card: the first time a zone is discovered, a "ZONE 03 / BUILDS" card sweeps across
// the screen like a new level starting. Decorative only (aria-hidden, no pointer events).

import { ZONES } from '../content'
import { on } from '../core/bus'
import { isReduced } from '../core/env'
import { ZONE_XP } from '../core/xp'
import { h, uiRoot } from './dom'

export function initBanner(): void {
  let busy = false
  on('zone', ({ id, first }) => {
    if (!first || id === 'top' || isReduced() || busy) return
    const i = ZONES.findIndex((z) => z.id === id)
    const z = ZONES[i]
    if (!z) return
    busy = true
    const card = h('div', { class: 'zbanner', 'aria-hidden': 'true', style: `--c:var(--${z.hue})` },
      h('span', { class: 'zbanner__n' }, `ZONE ${String(i + 1).padStart(2, '0')} DISCOVERED`),
      h('span', { class: 'zbanner__name' }, z.label.toUpperCase()),
      h('span', { class: 'zbanner__xp' }, `+${ZONE_XP} XP`),
    )
    uiRoot().append(card)
    const anim = card.animate(
      [
        { transform: 'translate(-50%, -50%) scaleX(0)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scaleX(1)', opacity: 1, offset: 0.14 },
        { transform: 'translate(-50%, -50%) scaleX(1)', opacity: 1, offset: 0.82 },
        { transform: 'translate(-50%, -50%) scaleX(0.96)', opacity: 0 },
      ],
      { duration: 1500, easing: 'steps(18, end)' },
    )
    anim.onfinish = () => {
      card.remove()
      busy = false
    }
  })
}

/** Soft blips when hovering controls (only audible with sound on). */
export function initHoverBlips(blip: () => void): void {
  let last = 0
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element | null)?.closest?.('.btn, .filter, .hud__btn, .cart__insert, .badge, .row__link, .press-start, .lmap a')
    if (!t) return
    const now = performance.now()
    if (now - last < 70) return
    last = now
    blip()
  })
}
