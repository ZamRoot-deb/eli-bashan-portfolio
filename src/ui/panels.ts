// Level map (compass) and trophy room dialogs.

import { ZONES } from '../content'
import { on } from '../core/bus'
import { ACHIEVEMENTS, getLevel, getXP, unlockedIds, xpForLevel, zonesSeen } from '../core/xp'
import { createDialog, type Dialog } from './dialog'
import { glyph, h } from './dom'
import { warpTo } from './zones'

let mapDlg: Dialog
let trophyDlg: Dialog
let current = 'top'

function paintMap(): void {
  const seen = zonesSeen()
  const grid = h('nav', { class: 'lmap', 'aria-label': 'Level select' })
  ZONES.forEach((z, i) => {
    const isSeen = seen.includes(z.id) || z.id === current
    const a = h('a', { href: `#${z.id}`, style: `--c:var(--${z.hue})`, 'data-seen': String(isSeen), 'aria-current': z.id === current ? 'true' : null },
      h('span', { class: 'lmap__n' }, `ZONE ${String(i + 1).padStart(2, '0')}`),
      h('span', { class: 'lmap__name' }, z.label),
      h('span', { class: 'lmap__state' }, z.id === current ? 'YOU ARE HERE' : isSeen ? 'DISCOVERED' : 'NOT YET FOUND'),
    )
    a.addEventListener('click', (e) => {
      e.preventDefault()
      mapDlg.close()
      warpTo(z.id)
    })
    grid.append(a)
  })
  mapDlg.body.replaceChildren(grid)
}

function paintTrophies(): void {
  const got = unlockedIds()
  const xp = getXP()
  const level = getLevel()
  const summary = h('div', { class: 'troom__summary' },
    h('span', {}, 'LEVEL ', h('b', {}, String(level))),
    h('span', {}, 'XP ', h('b', {}, String(xp))),
    h('span', {}, 'NEXT LEVEL AT ', h('b', {}, String(xpForLevel(level + 1)))),
    h('span', {}, 'UNLOCKED ', h('b', {}, `${got.length}/${ACHIEVEMENTS.length}`)),
  )
  const grid = h('ul', { class: 'troom' })
  for (const a of ACHIEVEMENTS) {
    const on = got.includes(a.id)
    const hidden = a.secret && !on
    grid.append(h('li', { class: `ach${on ? ' is-on' : ''}` },
      h('span', { class: 'ach__icon' }, glyph(hidden ? 'lock' : a.icon)),
      h('p', { class: 'ach__title' }, hidden ? 'Secret' : a.title),
      h('p', { class: 'ach__desc' }, hidden ? 'Keep exploring.' : `${a.desc} +${a.xp} XP`),
    ))
  }
  trophyDlg.body.replaceChildren(summary, grid)
}

export function initPanels(): void {
  mapDlg = createDialog({ id: 'levelmap', title: 'Level map', variant: 'map', hook: 'data-levelmap', hue: 'var(--red)', onOpen: paintMap })
  trophyDlg = createDialog({ id: 'trophyroom', title: 'Trophy room', variant: 'trophies', hook: 'data-trophy-room', hue: 'var(--amber)', onOpen: paintTrophies })
  on('zone', ({ id }) => {
    current = id
    if (mapDlg.isOpen()) paintMap()
  })
  on('achievement', () => {
    if (trophyDlg.isOpen()) paintTrophies()
  })
}

export const openMap = (): void => mapDlg.open()
export const openTrophies = (): void => trophyDlg.open()
