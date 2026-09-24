// Storage that never throws. Private windows, blocked site data and sandboxed frames can make
// the storage accessors themselves throw; every feature must keep working without persistence.

type Kind = 'localStorage' | 'sessionStorage'

function probe(kind: Kind): Storage | null {
  try {
    const s = window[kind]
    const k = '__ezb_probe__'
    s.setItem(k, '1')
    s.removeItem(k)
    return s
  } catch {
    return null
  }
}

function make(kind: Kind) {
  const s = probe(kind)
  return {
    ok: s !== null,
    get<T>(key: string, fallback: T): T {
      if (!s) return fallback
      try {
        const raw = s.getItem(key)
        return raw === null ? fallback : (JSON.parse(raw) as T)
      } catch {
        return fallback
      }
    },
    set(key: string, value: unknown): void {
      if (!s) return
      try {
        s.setItem(key, JSON.stringify(value))
      } catch {
        /* quota or blocked: ignore */
      }
    },
  }
}

export const local = make('localStorage')
export const session = make('sessionStorage')
export const storageOk = local.ok && session.ok
