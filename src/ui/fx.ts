// Motion graphics layered on top of the static page. Content is always readable at rest:
// reveals only move things (never park them invisible), text effects restore the exact text.

import { COARSE, isReduced } from '../core/env'
import { $$, onceVisible } from './dom'

const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEF$%&@'

/** Decode effect: characters resolve left to right out of noise. */
export function scramble(el: HTMLElement, duration = 800): Promise<void> {
  const text = el.dataset.text ?? el.textContent ?? ''
  el.dataset.text = text
  if (isReduced() || !text.trim()) {
    el.textContent = text
    return Promise.resolve()
  }
  if (!el.hasAttribute('aria-label') && el.tagName !== 'SPAN') el.setAttribute('aria-label', text)
  return new Promise((resolve) => {
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const solved = Math.floor(p * text.length)
      let out = text.slice(0, solved)
      for (let i = solved; i < text.length; i++) {
        const ch = text[i]
        out += ch === ' ' || ch === '\n' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      }
      el.textContent = out
      if (p < 1) requestAnimationFrame(step)
      else {
        el.textContent = text
        resolve()
      }
    }
    requestAnimationFrame(step)
  })
}

/** Typewriter for prompt lines (the full text is already in the HTML). */
function typeOut(el: HTMLElement, speed = 26): void {
  const text = el.textContent ?? ''
  if (isReduced() || !text) return
  el.textContent = ''
  let i = 0
  const tick = () => {
    i += 1
    el.textContent = text.slice(0, i)
    if (i < text.length) window.setTimeout(tick, speed)
  }
  window.setTimeout(tick, 120)
}

/** Count up numbers when they come into view. */
function countUp(el: HTMLElement): void {
  const target = Number(el.dataset.count)
  const padTo = Number(el.dataset.pad ?? 0)
  if (!Number.isFinite(target) || isReduced()) return
  const fmt = (n: number) => String(Math.round(n)).padStart(padTo, '0')
  const start = performance.now()
  const dur = 1100 + Math.min(900, target * 4)
  const step = (t: number) => {
    const p = Math.min(1, (t - start) / dur)
    const eased = 1 - (1 - p) ** 3
    el.textContent = fmt(target * eased)
    if (p < 1) requestAnimationFrame(step)
    else el.textContent = fmt(target)
  }
  el.textContent = fmt(0)
  requestAnimationFrame(step)
}

const REVEAL = [
  '.rule', '.cart', '.dossier', '.quest', '.istat', '.slot', '.article', '.edu__node', '.badges li', '.cab',
  '.row', '.pull', '.prose', '.scope', '.casestat', '.cmap', '.marquee', '.constellation', '.note', '.status-chip',
].join(',')

function initReveals(): void {
  if (isReduced() || !('IntersectionObserver' in window)) return
  const groups = new Map<Element, number>()
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        io.unobserve(e.target)
        const el = e.target as HTMLElement
        const parent = el.parentElement ?? document.body
        const n = groups.get(parent) ?? 0
        groups.set(parent, n + 1)
        // small, quick offsets: cards that hold buttons must not jump away from a pointer
        el.animate(
          [
            { transform: 'translateY(12px)', filter: 'brightness(1.8) saturate(0.4)' },
            { transform: 'none', filter: 'none' },
          ],
          { duration: 420, delay: Math.min(n, 3) * 45, easing: 'steps(6, end)', fill: 'backwards' },
        )
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  )
  // only below-the-fold elements animate; anything already on screen stays still
  const fold = window.innerHeight
  for (const el of $$(REVEAL)) if (el.getBoundingClientRect().top > fold * 0.9) io.observe(el)
}

function initText(): void {
  const fold = window.innerHeight
  for (const el of $$('[data-cmd] [data-type]')) {
    if (el.closest('.zone--hero')) {
      typeOut(el, 30)
      continue
    }
    if (el.getBoundingClientRect().top > fold) onceVisible(el, () => typeOut(el), '0px 0px -12% 0px')
  }
  for (const el of $$('[data-scramble]')) {
    if (el.getBoundingClientRect().top > fold) onceVisible(el, () => void scramble(el, 900), '0px 0px -12% 0px')
  }
  for (const el of $$('[data-count]')) onceVisible(el, () => countUp(el), '0px 0px -10% 0px')
}

/** 3D tilt that follows the pointer. */
function initTilt(): void {
  if (COARSE) return
  for (const el of $$('[data-tilt]')) {
    let raf = 0
    el.addEventListener('pointermove', (e) => {
      if (isReduced()) return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`
      })
    })
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf)
      el.style.transform = ''
    })
  }
}

/** Pixel sparks where the player clicks. */
function initSparks(): void {
  const colors = ['var(--amber)', 'var(--term)', 'var(--cyan)', 'var(--magenta)']
  window.addEventListener('pointerdown', (e) => {
    if (isReduced() || e.pointerType === 'touch') return
    const target = e.target as Element | null
    if (target?.closest('.dlg, input, textarea')) return
    for (let i = 0; i < 7; i++) {
      const s = document.createElement('span')
      s.className = 'spark'
      s.style.left = `${e.clientX - 3}px`
      s.style.top = `${e.clientY - 3}px`
      s.style.setProperty('--c', colors[i % colors.length])
      document.body.append(s)
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.5
      const d = 26 + Math.random() * 30
      s.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0.2)`, opacity: 0 },
        ],
        { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' },
      ).onfinish = () => s.remove()
    }
  }, { passive: true })
}

/** Glitch a heading once in a while when it is hovered. */
function initGlitch(): void {
  for (const el of $$('.zhead__title, .cart__name, .title__line')) {
    el.addEventListener('pointerenter', () => {
      if (isReduced() || el.classList.contains('is-glitching')) return
      el.classList.add('is-glitching')
      window.setTimeout(() => el.classList.remove('is-glitching'), 450)
    })
  }
}

export function initFx(): void {
  initReveals()
  initText()
  initTilt()
  initSparks()
  initGlitch()
}
