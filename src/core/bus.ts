// Tiny typed event bus shared by the HUD, XP engine, mascot and zones.

export interface BusEvents {
  xp: { total: number; level: number; gained: number; reason: string }
  levelup: { level: number }
  achievement: { id: string; title: string }
  zone: { id: string; first: boolean }
  warp: { to: string }
  sound: { on: boolean }
}

const target = new EventTarget()

export function emit<K extends keyof BusEvents>(name: K, detail: BusEvents[K]): void {
  target.dispatchEvent(new CustomEvent(name, { detail }))
}

export function on<K extends keyof BusEvents>(name: K, fn: (detail: BusEvents[K]) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<BusEvents[K]>).detail)
  target.addEventListener(name, handler)
  return () => target.removeEventListener(name, handler)
}
