// rAF loop that only runs while its element is on screen, the tab is visible and motion is allowed.
// Reduced motion draws a single still frame instead.

import { isReduced, onMotionChange } from '../core/env'

export function loopWhenVisible(el: Element, draw: (t: number, dt: number) => void): () => void {
  let raf = 0
  let last = 0
  let visible = false
  let stopped = false

  const frame = (t: number) => {
    const dt = last ? Math.min(64, t - last) : 16
    last = t
    draw(t, dt)
    raf = requestAnimationFrame(frame)
  }
  const run = () => {
    if (stopped || raf || !visible || document.hidden || isReduced()) return
    last = 0
    raf = requestAnimationFrame(frame)
  }
  const halt = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }

  draw(0, 0) // a still frame right away, so the canvas is never blank

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        visible = entries.some((e) => e.isIntersecting)
        if (visible) run()
        else halt()
      })
    : null
  if (io) io.observe(el)
  else {
    visible = true
    run()
  }
  const onVis = () => (document.hidden ? halt() : run())
  document.addEventListener('visibilitychange', onVis)
  const offMotion = onMotionChange((r) => (r ? (halt(), draw(0, 0)) : run()))

  return () => {
    stopped = true
    halt()
    io?.disconnect()
    document.removeEventListener('visibilitychange', onVis)
    offMotion()
  }
}

/** Size a canvas to its CSS box at the device pixel ratio (cap 2). Returns the CSS size. */
export function fitCanvas(canvas: HTMLCanvasElement, maxDpr = 2): { w: number; h: number; dpr: number } {
  const r = canvas.getBoundingClientRect()
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1)
  const w = Math.max(1, Math.round(r.width))
  const h = Math.max(1, Math.round(r.height))
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  return { w, h, dpr }
}
