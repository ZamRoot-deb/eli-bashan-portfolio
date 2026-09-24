// Sanko, the site's original mascot, in three places: the hero guide (talks, blinks, hops when
// poked), the quest-rail traveller, and the runner strip at the bottom of the contact zone.

import { on } from '../core/bus'
import { isReduced } from '../core/env'
import { HUE, LINE, rgba } from '../core/palette'
import { sfx } from '../core/sfx'
import { count, counted, unlock } from '../core/xp'
import { BUG, FLOPPY, SANKO, drawSprite, type Sprite } from '../core/sprites'
import { $ } from './dom'
import { fitCanvas, loopWhenVisible } from './loop'

const TIPS = [
  'Every zone you discover is worth XP. There are ten of them.',
  'The arcade sits near the bottom. Four cabinets, all of them about the job.',
  'Type help in the terminal. Not every command is listed.',
  'Hover the case files. Sealed things sometimes open.',
  'Your progress saves on this device. Come back later and keep your level.',
  "I'm Sanko. I go back and fetch what the past left behind. That is the whole job, really.",
]

let typing = 0 // generation counter: a newer line cancels the one still typing

function typeInto(el: HTMLElement, text: string): void {
  const gen = ++typing
  if (isReduced()) {
    el.textContent = text
    return
  }
  el.textContent = ''
  let i = 0
  const tick = () => {
    if (gen !== typing) return
    i += 2
    el.textContent = text.slice(0, i)
    if (i < text.length) window.setTimeout(tick, 22)
  }
  tick()
}

function initGuide(): void {
  const wrap = $('.guide[data-mascot]')
  const canvas = wrap?.querySelector<HTMLCanvasElement>('canvas')
  const bubble = wrap?.querySelector<HTMLElement>('[data-guide-bubble]')
  const ctx = canvas?.getContext('2d')
  if (!wrap || !canvas || !ctx || !bubble) return

  let frame: Sprite = SANKO.idle0
  let blinkUntil = 0
  let nextBlink = 1800
  let hopUntil = 0
  let tip = 0

  loopWhenVisible(canvas, (t) => {
    if (t > nextBlink) {
      blinkUntil = t + 140
      nextBlink = t + 2200 + Math.random() * 2600
    }
    const hopping = t < hopUntil
    frame = hopping ? SANKO.jump : t < blinkUntil ? SANKO.idle1 : SANKO.idle0
    const bobY = hopping ? -Math.sin(((hopUntil - t) / 420) * Math.PI) * 5 : Math.round(Math.sin(t / 420))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = rgba(HUE.amber, 0.12)
    ctx.fillRect(20, 88, 56, 4) // shadow
    drawSprite(ctx, frame, 0, bobY * 4 + 2, 4)
  })

  const hop = () => {
    hopUntil = performance.now() + 420
    sfx('jump')
  }

  const poke = wrap.querySelector<HTMLButtonElement>('.guide__poke') ?? canvas
  poke.addEventListener('click', () => {
    hop()
    // bounded: only the first five pokes are recorded
    if (counted('sanko-pets').length < 5 && count('sanko-pets', String(Date.now())) >= 5) unlock('sanko')
    tip = (tip + 1) % TIPS.length
    typeInto(bubble, TIPS[tip])
  })

  window.setInterval(() => {
    if (document.hidden || bubble.getBoundingClientRect().bottom < 0) return
    tip = (tip + 1) % TIPS.length
    typeInto(bubble, TIPS[tip])
  }, 9000)

  on('achievement', ({ title }) => {
    const r = wrap.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) return
    hop()
    typeInto(bubble, `Nice. ${title} unlocked.`)
  })
}

function initTraveller(): void {
  const qlog = $('.qlog')
  const canvas = $<HTMLCanvasElement>('.qlog__traveller canvas')
  const ctx = canvas?.getContext('2d')
  if (!qlog || !canvas || !ctx) return
  let lastScroll = window.scrollY
  let movingUntil = 0

  const place = () => {
    const r = qlog.getBoundingClientRect()
    const mid = window.innerHeight * 0.5
    const p = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)))
    qlog.style.setProperty('--p', p.toFixed(4))
  }
  place()
  let raf = 0
  window.addEventListener('scroll', () => {
    if (Math.abs(window.scrollY - lastScroll) > 2) movingUntil = performance.now() + 180
    lastScroll = window.scrollY
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      place()
    })
  }, { passive: true })

  loopWhenVisible(canvas, (t) => {
    const moving = t < movingUntil
    const f = moving ? (Math.floor(t / 110) % 2 ? SANKO.run0 : SANKO.run1) : SANKO.idle0
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawSprite(ctx, f, 0, 0, 2)
  })
}

function initRunway(): void {
  const canvas = $<HTMLCanvasElement>('[data-runway]')
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  let x = -60
  let jumpT = -1
  const bugs = [0.55, 1.15, 1.7].map((f) => ({ f }))

  loopWhenVisible(canvas, (t, dt) => {
    const { w, h, dpr } = fitCanvas(canvas)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const ground = h - 24
    // ground tiles
    ctx.fillStyle = LINE
    ctx.fillRect(0, ground, w, 2)
    for (let gx = -((t / 12) % 24); gx < w; gx += 24) ctx.fillRect(gx, ground + 8, 10, 2)
    // travelling bugs
    for (const b of bugs) {
      const bx = ((b.f * w - t * 0.09) % (w + 60) + w + 60) % (w + 60) - 30
      drawSprite(ctx, BUG, bx, ground - 20, 2)
      if (jumpT < 0 && bx - x > 30 && bx - x < 60) jumpT = t
    }
    // floppies to grab
    const fx = ((w * 0.8 - t * 0.05) % (w + 40) + w + 40) % (w + 40) - 20
    drawSprite(ctx, FLOPPY, fx, ground - 70, 2)
    // Sanko runs across, auto-hopping the bugs
    x += dt * 0.12
    if (x > w + 40) x = -60
    let y = ground - 48
    let f: Sprite = Math.floor(t / 100) % 2 ? SANKO.run0 : SANKO.run1
    if (jumpT >= 0) {
      const p = (t - jumpT) / 520
      if (p >= 1) jumpT = -1
      else {
        y -= Math.sin(p * Math.PI) * 38
        f = SANKO.jump
      }
    }
    drawSprite(ctx, f, x, y, 2)
  })

  $('[data-runway-play]')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('ezb:play', { detail: 'runner' }))
  })
}

export function initMascot(): void {
  initGuide()
  initTraveller()
  initRunway()
}
