// The cosmic backdrop: three parallax layers of pixel stars, twinkle, shooting stars, pointer and
// scroll parallax, and a hyperspace warp when the player jumps between zones.
// Reduced motion renders one still frame. Never throws: no 2D context means no sky, nothing else.

import { on } from '../core/bus'
import { isReduced, onMotionChange } from '../core/env'
import { HUE, PAPER, rgba } from '../core/palette'
import { $ } from './dom'

interface Star { x: number; y: number; z: number; s: number; c: string; tw: number; ph: number }
interface Shot { x: number; y: number; vx: number; vy: number; life: number }

const TINTS = [PAPER, PAPER, PAPER, PAPER, HUE.term, HUE.amber, HUE.cyan, HUE.violet, HUE.magenta]

export function initStarfield(): void {
  const canvas = $<HTMLCanvasElement>('[data-starfield]')
  const ctx = canvas?.getContext('2d', { alpha: true })
  if (!canvas || !ctx) return

  let w = 0
  let h = 0
  let dpr = 1
  let stars: Star[] = []
  let shots: Shot[] = []
  let raf = 0
  let last = 0
  let warp = 0 // 0..1 warp intensity
  let mx = 0
  let my = 0
  let tx = 0
  let ty = 0
  let nextShot = 4000

  const build = () => {
    dpr = Math.min(1.75, window.devicePixelRatio || 1)
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const n = Math.min(340, Math.round((w * h) / 4200))
    stars = Array.from({ length: n }, () => {
      const z = Math.random() < 0.6 ? 0.25 : Math.random() < 0.7 ? 0.55 : 1
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        s: z === 1 ? 2 + Math.round(Math.random()) : z > 0.5 ? 2 : 1,
        c: TINTS[(Math.random() * TINTS.length) | 0],
        tw: 0.4 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
      }
    })
  }

  const draw = (t: number, dt: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    tx += (mx - tx) * 0.05
    ty += (my - ty) * 0.05
    const scroll = window.scrollY
    const cx = w / 2
    const cy = h / 2
    for (const st of stars) {
      // gentle drift, faster for nearer layers
      st.y += (dt / 1000) * 6 * st.z
      if (st.y > h + 4) st.y -= h + 8
      let x = st.x - tx * 14 * st.z
      let y = (st.y - scroll * 0.06 * st.z - ty * 10 * st.z) % h
      if (y < 0) y += h
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * st.tw + st.ph))
      ctx.fillStyle = rgba(st.c, a * (0.45 + st.z * 0.55))
      if (warp > 0.02) {
        const dx = x - cx
        const dy = y - cy
        const len = warp * 60 * st.z
        const d = Math.hypot(dx, dy) || 1
        ctx.strokeStyle = rgba(st.c, Math.min(1, a + warp * 0.4))
        ctx.lineWidth = st.s
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (dx / d) * len, y + (dy / d) * len)
        ctx.stroke()
        st.x += (dx / d) * warp * 20 * st.z
        st.y += (dy / d) * warp * 20 * st.z
        if (st.x < -10 || st.x > w + 10) st.x = cx + (Math.random() - 0.5) * 80
        x = st.x
      } else {
        ctx.fillRect(Math.round(x), Math.round(y), st.s, st.s)
        if (st.s > 2) {
          ctx.fillStyle = rgba(st.c, a * 0.25)
          ctx.fillRect(Math.round(x) - 1, Math.round(y) + 1, st.s + 2, 1)
          ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, st.s + 2)
        }
      }
    }
    // shooting stars
    nextShot -= dt
    if (nextShot <= 0 && shots.length < 2) {
      nextShot = 5000 + Math.random() * 7000
      shots.push({ x: Math.random() * w * 0.8, y: Math.random() * h * 0.4, vx: 0.6 + Math.random() * 0.5, vy: 0.22 + Math.random() * 0.2, life: 1 })
    }
    shots = shots.filter((s) => s.life > 0)
    for (const s of shots) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt / 1100
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 180, s.y - s.vy * 180)
      g.addColorStop(0, rgba(PAPER, 0.9 * s.life))
      g.addColorStop(1, rgba(PAPER, 0))
      ctx.strokeStyle = g
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(s.x - s.vx * 180, s.y - s.vy * 180)
      ctx.stroke()
    }
    warp = Math.max(0, warp - dt / 900)
  }

  const loop = (t: number) => {
    const dt = last ? Math.min(64, t - last) : 16
    last = t
    draw(t, dt)
    raf = requestAnimationFrame(loop)
  }

  const start = () => {
    if (raf || isReduced() || document.hidden) return
    last = 0
    raf = requestAnimationFrame(loop)
  }
  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }
  const still = () => {
    stop()
    draw(0, 0)
  }

  build()
  if (isReduced()) still()
  else start()

  let resizeT = 0
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeT)
    resizeT = window.setTimeout(() => {
      build()
      if (isReduced()) still()
    }, 120)
  })
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX / Math.max(1, w) - 0.5
    my = e.clientY / Math.max(1, h) - 0.5
  }, { passive: true })
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))
  onMotionChange((reduced) => (reduced ? still() : start()))
  on('warp', () => {
    if (!isReduced()) warp = 1
  })
}
