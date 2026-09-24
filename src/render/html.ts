// Tiny string-HTML helpers for the build-time renderer (runs in Node via the Vite plugin).

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escape text for element content and double-quoted attributes. */
export const esc = (s: string | number): string => String(s).replace(/[&<>"']/g, (c) => ENTITIES[c])

/** Join class names, dropping falsy entries. */
export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ')

/** Render a list of items with a mapper and join without separators. */
export const each = <T>(items: readonly T[], fn: (item: T, i: number) => string): string => items.map(fn).join('')

/** Two-digit zero padded number, e.g. 3 -> "03". */
export const pad2 = (n: number): string => String(n).padStart(2, '0')

/** URL-safe slug from free text. */
export const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
