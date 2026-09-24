// Environment flags resolved once at startup, plus the live reduced-motion preference.

const params = new URLSearchParams(location.search)

/** ?fast: short game rounds (automation / speed runs). */
export const FAST = params.has('fast')
/** Boot overlay policy: ?boot forces it, ?noboot or automation skips it. */
export const FORCE_BOOT = params.has('boot')
export const SKIP_BOOT = params.has('noboot') || (navigator.webdriver === true && !FORCE_BOOT)

const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
let reduced = mq?.matches ?? false
const listeners = new Set<(reduced: boolean) => void>()

export const isReduced = (): boolean => reduced

export function onMotionChange(fn: (reduced: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function apply(): void {
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
}

export function initMotion(): void {
  apply()
  mq?.addEventListener('change', (e) => {
    reduced = e.matches
    apply()
    listeners.forEach((fn) => fn(reduced))
  })
}

/** Coarse pointer (touch-first) devices skip hover-only effects like tilt. */
export const COARSE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
