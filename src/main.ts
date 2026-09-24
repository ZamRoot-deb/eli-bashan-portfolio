// Entry point: progressive enhancement of the pre-rendered page.
import './styles/base.css'
import './styles/fx.css'
import './styles/zones.css'
import './styles/ui.css'

import { ZONES } from './content'
import { initMotion, isReduced } from './core/env'
import { storageOk } from './core/store'
import { getLevel, getXP, unlockedIds } from './core/xp'
import { openGame, closeGame, initArcade } from './games/arcade'
import { initBanner, initHoverBlips } from './ui/banner'
import { sfx } from './core/sfx'
import type { GameId } from './games/types'
import { runBoot } from './ui/boot'
import { $, safe } from './ui/dom'
import { initEndscreen, showEnd } from './ui/endscreen'
import { initFx } from './ui/fx'
import { initHud } from './ui/hud'
import { initInteract } from './ui/interact'
import { initMascot } from './ui/mascot'
import { initPanels, openMap, openTrophies } from './ui/panels'
import { initSecrets } from './ui/secrets'
import { initStarfield } from './ui/starfield'
import { closeTerminal, initTerminal, openTerminal } from './ui/terminal'
import { initToasts } from './ui/toasts'
import { initZones } from './ui/zones'
import { mountConstellation } from './ui/constellation'
import { count, unlock } from './core/xp'

declare global {
  interface Window {
    __ezb?: Record<string, unknown>
  }
}

function start(): void {
  initMotion()
  safe('toasts', initToasts)
  safe('panels', initPanels)
  safe('hud', () => initHud({ openTerminal: () => openTerminal(), openMap, openTrophies }))
  safe('starfield', initStarfield)
  safe('zones', initZones)
  safe('fx', initFx)
  safe('mascot', initMascot)
  safe('interact', initInteract)
  safe('constellation', () => {
    const el = $('[data-constellation]')
    if (!el) return
    mountConstellation(el, {
      reducedMotion: isReduced(),
      onDiscover: (id) => void count('stars', id),
      onComplete: () => void unlock('stargazer'),
    })
  })
  safe('arcade', initArcade)
  safe('terminal', () => initTerminal((id: GameId) => void openGame(id)))
  safe('endscreen', initEndscreen)
  safe('secrets', initSecrets)
  safe('banner', initBanner)
  safe('blips', () => initHoverBlips(() => sfx('blip')))

  window.__ezb = {
    xp: getXP,
    level: getLevel,
    achievements: unlockedIds,
    storageOk,
    openTerminal,
    closeTerminal,
    openGame,
    closeGame,
    showEnd,
    zones: ZONES.map((z) => z.id),
  }

  runBoot(() => {
    document.documentElement.dataset.app = 'ready'
  })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
else start()
