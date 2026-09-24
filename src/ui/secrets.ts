// Easter eggs: the classic cheat code, a night-owl badge, and a note for people who open devtools.

import { isReduced } from '../core/env'
import { sfx } from '../core/sfx'
import { unlock } from '../core/xp'

const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

function confetti(): void {
  if (isReduced()) return
  const colors = ['var(--amber)', 'var(--term)', 'var(--cyan)', 'var(--magenta)', 'var(--violet)', 'var(--red)']
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('span')
    s.className = 'spark'
    s.style.left = `${Math.random() * window.innerWidth}px`
    s.style.top = '-10px'
    s.style.setProperty('--c', colors[i % colors.length])
    document.body.append(s)
    const fall = window.innerHeight + 40
    s.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)' },
        { transform: `translate(${(Math.random() - 0.5) * 240}px, ${fall}px) rotate(${Math.random() * 720}deg)` },
      ],
      { duration: 1600 + Math.random() * 1400, delay: Math.random() * 400, easing: 'cubic-bezier(.3,.6,.4,1)' },
    ).onfinish = () => s.remove()
  }
}

export function initSecrets(): void {
  let pos = 0
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    pos = k === CODE[pos] ? pos + 1 : k === CODE[0] ? 1 : 0
    if (pos === CODE.length) {
      pos = 0
      sfx('powerup')
      confetti()
      unlock('konami')
    }
  })

  const hour = new Date().getHours()
  if (hour >= 0 && hour < 5) unlock('night-owl')

  console.log(
    '%cEZB-OS%c\nYou opened the source. Good instinct.\nThe terminal (press `) has more commands than it lists. Try: ls -a',
    'font: 16px monospace; color: #4dff9e; background: #04070a; padding: 4px 8px;',
    'font: 12px monospace; color: #6fae8d;',
  )
}
