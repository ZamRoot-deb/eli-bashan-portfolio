// Chain of Custody: a timed ordering puzzle. Rebuild the DFRWS investigative model
// (identify -> preserve -> collect -> examine -> analyse -> present) from a scrambled
// pool of evidence tags before the clock runs out. Zero runtime dependencies.
import type { GameHost, GameInstance, GameModule } from './types'
import { FLOPPY, SANKO, spriteDataURL } from '../core/sprites'
import type { Sprite } from '../core/sprites'
import './custody.css'

type PhaseId = 'identify' | 'preserve' | 'collect' | 'examine' | 'analyse' | 'present'

interface Phase {
  id: PhaseId
  label: string
  brief: string
  icon: Sprite
}

// Small 12x12 pixel icons, hand-placed on the shared SPRITE_PALETTE (core/sprites.ts) so
// they render through the same drawSprite/spriteDataURL pipeline as Sanko and the floppy.
const IDENTIFY_ICON: Sprite = [
  '............',
  '...ccc......',
  '..cc.ccc....',
  '.ccw...c....',
  '.c.....c....',
  '.cc....c....',
  '..c...cc....',
  '..cccccO....',
  '........O...',
  '.........OO.',
  '.........OOO',
  '..........OO',
]

const PRESERVE_ICON: Sprite = [
  '............',
  '...dddddd...',
  '...d....d...',
  '...d....d...',
  '..oooooooo..',
  '..oyyyyyyo..',
  '..oyyssyyo..',
  '..oyyssyyo..',
  '..oyysyyyo..',
  '..oyyyyyyo..',
  '..oooooooo..',
  '............',
]

const EXAMINE_ICON: Sprite = [
  '............',
  '..dddddddd..',
  '..dpppppod..',
  '..dppppppd..',
  '..dpddddpd..',
  '..dppppppd..',
  '..dpddddpd..',
  '..dppppppd..',
  '..dpddddpd..',
  '..dppppppd..',
  '..dddddddd..',
  '............',
]

const ANALYSE_ICON: Sprite = [
  '............',
  '............',
  '........g...',
  '......g.GG..',
  '.....g..vv..',
  '...g.GG.vv..',
  '..g..vv.vv..',
  '..GG.vv.vv..',
  '..vv.vv.vv..',
  '..vv.vv.vv..',
  '.dddddddddd.',
  '............',
]

const PRESENT_ICON: Sprite = [
  '............',
  '.ddddddd....',
  '.dpppppd....',
  '.dddddpd....',
  '.dpppppd....',
  '.dddddpd....',
  '.dpppppyyyys',
  '.dppppyyyysy',
  '.dppppysysyy',
  '.dppppyysyyy',
  '.dddddyyyyyy',
  '.......yyyy.',
]

// DFRWS investigative model order. This sequence is the puzzle's one correct answer.
const ORDER: readonly Phase[] = [
  { id: 'identify', label: 'IDENTIFY', brief: 'Spot which devices and data are in scope.', icon: IDENTIFY_ICON },
  { id: 'preserve', label: 'PRESERVE', brief: 'Write-block the source, then hash it.', icon: PRESERVE_ICON },
  { id: 'collect', label: 'COLLECT', brief: 'Acquire a forensic image, bit for bit.', icon: FLOPPY },
  { id: 'examine', label: 'EXAMINE', brief: 'Pull the artefacts out, filter the noise.', icon: EXAMINE_ICON },
  { id: 'analyse', label: 'ANALYSE', brief: 'Build the timeline, answer who/what/when.', icon: ANALYSE_ICON },
  { id: 'present', label: 'PRESENT', brief: 'Write the report. Be ready to testify.', icon: PRESENT_ICON },
]

const PHASE_BY_ID: Record<PhaseId, Phase> = Object.fromEntries(ORDER.map((p) => [p.id, p])) as Record<
  PhaseId,
  Phase
>

const CONTROLS_HINT = '1-6 or TAB + ENTER/SPACE to pick. Click or tap also works.'
const FLY_MS = 260
const HASH_SCROLL_MS = 2400
const HASH_STATIC_MS = 1600
const WRONG_PENALTY_S = 3

function must<T extends Element>(el: T | null): T {
  if (!el) throw new Error('custody: missing required element')
  return el
}

function randomHex(len: number): string {
  const bytes = new Uint8Array(Math.ceil(len / 2))
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, len)
}

function shuffledOrder(): PhaseId[] {
  const ids = ORDER.map((p) => p.id)
  const out = ids.slice()
  do {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = out[i]
      out[i] = out[j]
      out[j] = tmp
    }
  } while (out.every((id, i) => id === ids[i]))
  return out
}

function chainRowMarkup(): string {
  const parts: string[] = []
  for (let i = 0; i < ORDER.length; i++) {
    parts.push(
      `<div class="custody-chain-slot is-empty" data-slot="${i}"><span class="custody-chain-num">${i + 1}</span></div>`,
    )
    if (i < ORDER.length - 1) parts.push(`<div class="custody-chain-connector" data-connector="${i}"></div>`)
  }
  return parts.join('')
}

function statRow(label: string, value: string): string {
  return `<div class="custody-stat-row"><span class="custody-stat-label">${label}</span><span class="custody-stat-value">${value}</span></div>`
}

function mount(host: GameHost): GameInstance {
  const root = host.root
  root.classList.add('custody-root')

  const wrap = document.createElement('div')
  wrap.className = 'custody'
  wrap.innerHTML = `
    <section class="custody-screen custody-ready" data-screen="ready">
      <div class="custody-title">CHAIN OF CUSTODY</div>
      <p class="custody-brief">Six phases. One defensible order. The court is watching.</p>
      <p class="custody-controls">${CONTROLS_HINT}</p>
      <button type="button" class="custody-btn custody-btn-primary" data-action="start">START</button>
    </section>
    <section class="custody-screen custody-playing" data-screen="playing">
      <div class="custody-hud">
        <span class="custody-hud-item">SCORE <strong data-cstat="score">0</strong></span>
        <span class="custody-hud-item">TIME <strong data-cstat="time">0s</strong></span>
      </div>
      <div class="custody-timerbar" data-timerbar>
        <div class="custody-timerbar-fill" data-timerfill></div>
      </div>
      <div class="custody-chain" aria-label="Chain of custody, six phases in order">${chainRowMarkup()}</div>
      <div class="custody-hashline" data-hashline hidden></div>
      <div class="custody-pool-wrap">
        <p class="custody-caption">EVIDENCE POOL &mdash; pick the next phase</p>
        <div class="custody-pool" data-pool role="group" aria-label="Evidence pool"></div>
      </div>
      <p class="custody-controls custody-controls-mini">${CONTROLS_HINT}</p>
    </section>
    <section class="custody-screen custody-over" data-screen="over">
      <div class="custody-over-title" data-over-title>CHAIN INTACT</div>
      <div class="custody-best-badge" data-best-badge hidden>NEW BEST</div>
      <div class="custody-over-stats" data-over-stats></div>
      <ol class="custody-order-list" data-order-list hidden></ol>
      <div class="custody-sanko" data-sanko data-mascot hidden>
        <img class="custody-sanko-img" data-sanko-img alt="Sanko the mascot cheers" />
      </div>
      <div class="custody-actions">
        <button type="button" class="custody-btn custody-btn-primary" data-action="again">PLAY AGAIN</button>
        <button type="button" class="custody-btn" data-action="exit">EXIT</button>
      </div>
    </section>
    <div class="custody-sr" data-sr aria-live="polite" role="status"></div>
  `
  root.appendChild(wrap)

  const startBtn = must(wrap.querySelector<HTMLButtonElement>('[data-action="start"]'))
  const againBtn = must(wrap.querySelector<HTMLButtonElement>('[data-action="again"]'))
  const hudScoreEl = must(wrap.querySelector<HTMLElement>('[data-cstat="score"]'))
  const hudTimeEl = must(wrap.querySelector<HTMLElement>('[data-cstat="time"]'))
  const timerBarEl = must(wrap.querySelector<HTMLElement>('[data-timerbar]'))
  const timerFillEl = must(wrap.querySelector<HTMLElement>('[data-timerfill]'))
  const poolEl = must(wrap.querySelector<HTMLElement>('[data-pool]'))
  const hashLineEl = must(wrap.querySelector<HTMLElement>('[data-hashline]'))
  const overTitleEl = must(wrap.querySelector<HTMLElement>('[data-over-title]'))
  const bestBadgeEl = must(wrap.querySelector<HTMLElement>('[data-best-badge]'))
  const overStatsEl = must(wrap.querySelector<HTMLElement>('[data-over-stats]'))
  const orderListEl = must(wrap.querySelector<HTMLOListElement>('[data-order-list]'))
  const sankoWrapEl = must(wrap.querySelector<HTMLElement>('[data-sanko]'))
  const sankoImgEl = must(wrap.querySelector<HTMLImageElement>('[data-sanko-img]'))
  const srEl = must(wrap.querySelector<HTMLElement>('[data-sr]'))
  const chainSlots = Array.from(wrap.querySelectorAll<HTMLElement>('.custody-chain-slot'))
  const connectors = Array.from(wrap.querySelectorAll<HTMLElement>('.custody-chain-connector'))

  wrap.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
    const action = btn.dataset.action
    btn.addEventListener('click', () => {
      if (action === 'start' || action === 'again') start()
      else if (action === 'exit') host.exit()
    })
  })

  const timeoutIds = new Set<number>()
  const intervalIds = new Set<number>()
  function after(ms: number, fn: () => void): number {
    const id = window.setTimeout(() => {
      timeoutIds.delete(id)
      fn()
    }, ms)
    timeoutIds.add(id)
    return id
  }
  function every(ms: number, fn: () => void): number {
    const id = window.setInterval(fn, ms)
    intervalIds.add(id)
    return id
  }

  let state: 'ready' | 'playing' | 'over' = 'ready'
  let score = 0
  let poolOrder: PhaseId[] = []
  let chainIndex = 0
  let duration = host.fast ? 8 : 45
  let timeLeft = duration
  let rafId = 0
  let lastFrameT = 0
  let paused = false
  let finished = false
  let sankoInterval = 0

  function setState(s: 'ready' | 'playing' | 'over') {
    state = s
    root.dataset.state = s
  }

  function announce(msg: string) {
    srEl.textContent = msg
  }

  function tagIcon(icon: Sprite, scale: number): string {
    return spriteDataURL(icon, scale)
  }

  function renderPool() {
    poolEl.replaceChildren()
    poolOrder.forEach((id, i) => {
      const phase = PHASE_BY_ID[id]
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'custody-tag'
      btn.dataset.phase = id
      btn.title = phase.brief
      btn.setAttribute('aria-label', `${i + 1}. ${phase.label} evidence tag. ${phase.brief}`)
      const num = document.createElement('span')
      num.className = 'custody-tag-num'
      num.textContent = String(i + 1)
      const img = document.createElement('img')
      img.className = 'custody-tag-icon'
      img.src = tagIcon(phase.icon, 4)
      img.alt = ''
      img.setAttribute('aria-hidden', 'true')
      const label = document.createElement('span')
      label.className = 'custody-tag-label'
      label.textContent = phase.label
      btn.append(num, img, label)
      btn.addEventListener('click', () => pick(id))
      poolEl.appendChild(btn)
    })
  }

  function resetChainRow() {
    chainSlots.forEach((slot, i) => {
      slot.className = 'custody-chain-slot is-empty'
      slot.innerHTML = `<span class="custody-chain-num">${i + 1}</span>`
    })
    connectors.forEach((c) => {
      c.className = 'custody-chain-connector'
    })
  }

  function fillChainSlot(index: number, phase: Phase) {
    const slot = chainSlots[index]
    if (!slot) return
    slot.className = 'custody-chain-slot is-filled'
    slot.innerHTML = `
      <img class="custody-chain-icon" src="${tagIcon(phase.icon, 4)}" alt="" aria-hidden="true" />
      <span class="custody-chain-label">${phase.label}</span>
      <span class="custody-stamp" aria-hidden="true">OK</span>
    `
    const connector = connectors[index - 1]
    if (connector) connector.classList.add('is-linked')
    const cls = host.reducedMotion ? 'is-landing-reduced' : 'is-landing'
    slot.classList.add(cls)
    slot.addEventListener('animationend', () => slot.classList.remove('is-landing', 'is-landing-reduced'), {
      once: true,
    })
  }

  function showPenaltyBadge(btn: HTMLButtonElement) {
    const span = document.createElement('span')
    span.className = `custody-penalty ${host.reducedMotion ? 'is-static' : 'is-float'}`
    span.textContent = `-${WRONG_PENALTY_S}s`
    span.setAttribute('aria-hidden', 'true')
    btn.appendChild(span)
    span.addEventListener('animationend', () => span.remove(), { once: true })
  }

  function showHashLine() {
    const hex = randomHex(64)
    hashLineEl.textContent = `SHA-256  ${hex}  WRITE-BLOCK OK`
    hashLineEl.hidden = false
    hashLineEl.classList.remove('is-scrolling', 'is-static')
    // restart the animation even if this were ever called twice in one run
    void hashLineEl.offsetWidth
    const reduced = host.reducedMotion
    hashLineEl.classList.add(reduced ? 'is-static' : 'is-scrolling')
    after(reduced ? HASH_STATIC_MS : HASH_SCROLL_MS, () => {
      hashLineEl.hidden = true
    })
  }

  function hideHashLine() {
    hashLineEl.hidden = true
    hashLineEl.classList.remove('is-scrolling', 'is-static')
  }

  function updateTimerUI() {
    const pct = Math.max(0, Math.min(100, (timeLeft / duration) * 100))
    timerFillEl.style.width = `${pct}%`
    const wholeSecs = Math.max(0, Math.floor(timeLeft))
    hudTimeEl.textContent = `${wholeSecs}s`
    hudScoreEl.textContent = String(score)
    timerBarEl.classList.toggle('is-critical', wholeSecs <= 5)
  }

  function frame(t: number) {
    const dt = Math.min(0.05, Math.max(0, (t - lastFrameT) / 1000))
    lastFrameT = t
    const prevSec = Math.ceil(timeLeft)
    timeLeft = Math.max(0, timeLeft - dt)
    updateTimerUI()
    const sec = Math.ceil(timeLeft)
    if (sec !== prevSec && sec <= 5 && sec >= 1) host.sfx('tick')
    if (timeLeft <= 0) {
      finishLose()
      return
    }
    rafId = requestAnimationFrame(frame)
  }

  function pick(id: PhaseId) {
    if (state !== 'playing') return
    // A just-picked tag lingers in the DOM (pointer-events:none) for its exit animation before
    // renderPool() drops it. Ignore a stray repeat/double key on it instead of treating it as wrong.
    if (!poolOrder.includes(id)) return
    const btn = poolEl.querySelector<HTMLButtonElement>(`[data-phase="${id}"]`)
    if (!btn) return
    const expected = ORDER[chainIndex]
    if (expected && id === expected.id) onCorrectPick(expected, btn)
    else onWrongPick(btn)
  }

  function onWrongPick(btn: HTMLButtonElement) {
    host.sfx('hit')
    timeLeft = Math.max(0, timeLeft - WRONG_PENALTY_S)
    updateTimerUI()
    showPenaltyBadge(btn)
    const cls = host.reducedMotion ? 'is-wrong-flash' : 'is-wrong-shake'
    btn.classList.add(cls)
    btn.addEventListener('animationend', () => btn.classList.remove(cls), { once: true })
    announce(`Wrong evidence tag. ${WRONG_PENALTY_S} seconds lost.`)
    if (timeLeft <= 0) finishLose()
  }

  function onCorrectPick(phase: Phase, btn: HTMLButtonElement) {
    host.sfx('coin')
    poolOrder = poolOrder.filter((id) => id !== phase.id)
    fillChainSlot(chainIndex, phase)
    chainIndex++
    score += 100
    host.setScore(score)
    updateTimerUI()
    announce(`${phase.label} linked. ${chainIndex} of ${ORDER.length}.`)
    const cls = host.reducedMotion ? 'is-picked-reduced' : 'is-picked'
    btn.classList.add(cls)
    after(FLY_MS, renderPool)
    if (phase.id === 'preserve') showHashLine()
    if (chainIndex === ORDER.length) finishWin()
  }

  function stopSankoCheer() {
    if (sankoInterval) {
      clearInterval(sankoInterval)
      intervalIds.delete(sankoInterval)
      sankoInterval = 0
    }
  }

  function startSankoCheer() {
    stopSankoCheer()
    sankoImgEl.src = tagIcon(SANKO.idle0, 4)
    if (host.reducedMotion) return
    let toggled = false
    sankoInterval = every(420, () => {
      toggled = !toggled
      sankoImgEl.src = tagIcon(toggled ? SANKO.idle1 : SANKO.idle0, 4)
    })
  }

  function renderOver(win: boolean, isBest: boolean, xp: number) {
    overTitleEl.textContent = win ? 'CHAIN INTACT' : 'CHAIN BROKEN'
    overTitleEl.classList.toggle('is-win', win)
    overTitleEl.classList.toggle('is-lose', !win)
    const rows: string[] = []
    if (win) rows.push(statRow('TIME LEFT', `${Math.max(0, Math.floor(timeLeft))}s`))
    rows.push(statRow('SCORE', String(score)))
    rows.push(statRow('BEST', String(Math.max(host.best, score))))
    rows.push(statRow('XP EARNED', `+${xp}`))
    overStatsEl.innerHTML = rows.join('')
    bestBadgeEl.hidden = !isBest
    orderListEl.hidden = win
    sankoWrapEl.hidden = !win
    sankoImgEl.src = tagIcon(SANKO.idle0, 4) // baseline frame so the <img> is never src-less, even while hidden
    if (!win) {
      orderListEl.innerHTML = ORDER.map(
        (p, i) =>
          `<li><span class="custody-order-num">${i + 1}</span><img src="${tagIcon(p.icon, 3)}" alt="" aria-hidden="true" /><span>${p.label}</span></li>`,
      ).join('')
    } else {
      startSankoCheer()
    }
  }

  function finishWin() {
    if (finished) return
    finished = true
    cancelAnimationFrame(rafId)
    const bonus = Math.max(0, Math.floor(timeLeft)) * 20
    score += bonus
    host.setScore(score)
    const isBest = host.reportScore(score)
    const xp = Math.min(50, 20 + Math.max(0, Math.floor(timeLeft)))
    host.awardXP(xp, 'Chain of Custody: solved')
    host.unlock('custody-solved')
    if (timeLeft >= duration / 2) host.unlock('custody-fast')
    host.sfx('win')
    renderOver(true, isBest, xp)
    setState('over')
    announce(`Chain intact. Score ${score}.${isBest ? ' New best.' : ''}`)
    againBtn.focus()
  }

  function finishLose() {
    if (finished) return
    finished = true
    cancelAnimationFrame(rafId)
    timeLeft = 0
    updateTimerUI()
    host.setScore(score)
    const isBest = host.reportScore(score)
    const xp = 5
    host.awardXP(xp, 'Chain of Custody: broken')
    host.sfx('lose')
    renderOver(false, isBest, xp)
    setState('over')
    announce(`Chain broken. Correct order revealed. Score ${score}.`)
    againBtn.focus()
  }

  function start() {
    cancelAnimationFrame(rafId)
    stopSankoCheer()
    score = 0
    chainIndex = 0
    duration = host.fast ? 8 : 45
    timeLeft = duration
    finished = false
    paused = false
    poolOrder = shuffledOrder()
    resetChainRow()
    renderPool()
    hideHashLine()
    host.setScore(0)
    updateTimerUI()
    host.sfx('start')
    setState('playing')
    announce('Round started. Six phases scrambled. Pick the first one.')
    lastFrameT = performance.now()
    rafId = requestAnimationFrame(frame)
    const firstTag = poolEl.querySelector<HTMLButtonElement>('.custody-tag')
    firstTag?.focus()
  }

  function pause() {
    if (state !== 'playing' || paused) return
    paused = true
    cancelAnimationFrame(rafId)
  }

  function resume() {
    if (state !== 'playing' || !paused) return
    paused = false
    lastFrameT = performance.now()
    rafId = requestAnimationFrame(frame)
  }

  function onVisibility() {
    if (document.hidden) pause()
    else resume()
  }

  function onKeyDown(e: KeyboardEvent) {
    const targetIsButton = e.target instanceof HTMLElement && e.target.tagName === 'BUTTON'
    if (state === 'playing') {
      if (e.key >= '1' && e.key <= '6') {
        const idx = Number(e.key) - 1
        const btn = poolEl.children[idx] as HTMLButtonElement | undefined
        if (btn) {
          e.preventDefault()
          pick(btn.dataset.phase as PhaseId)
        }
      }
      return
    }
    if ((state === 'ready' || state === 'over') && (e.key === ' ' || e.key === 'Enter')) {
      if (targetIsButton) return
      e.preventDefault()
      start()
    }
  }

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('visibilitychange', onVisibility)

  setState('ready')
  updateTimerUI()
  startBtn.focus()

  return {
    destroy() {
      cancelAnimationFrame(rafId)
      stopSankoCheer()
      for (const id of timeoutIds) clearTimeout(id)
      timeoutIds.clear()
      for (const id of intervalIds) clearInterval(id)
      intervalIds.clear()
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibility)
      wrap.remove()
      root.classList.remove('custody-root')
      delete root.dataset.state
    },
    pause,
    resume,
  }
}

const custody: GameModule = {
  id: 'custody',
  title: 'Chain of Custody',
  blurb: 'Rebuild the forensic process before the timer runs out.',
  controls: CONTROLS_HINT,
  mount,
}

export default custody
