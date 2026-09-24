// TEMPORARY STUB so the core typechecks while the icon builder works in parallel.
// Replaced wholesale by the vendored manifest (same exports, same types).

export interface IconDef { files: string[]; kind: 'brand' | 'concept' }

export const STACK_ICONS: Record<string, IconDef> = {}
export const CERT_ICONS: Record<string, IconDef> = {}

export type GlyphName = 'mail' | 'phone' | 'map-pin' | 'file-download' | 'arrow-up-right' | 'copy' | 'check' | 'terminal' | 'volume' | 'volume-off' | 'trophy' | 'compass' | 'x' | 'gamepad' | 'star' | 'lock' | 'lock-open' | 'eye' | 'shield' | 'graph' | 'checklist' | 'helmet' | 'play' | 'refresh' | 'arrow-up' | 'map' | 'sparkles' | 'bolt' | 'bug' | 'fingerprint' | 'database' | 'brain' | 'cpu' | 'world' | 'route' | 'file-search' | 'radar' | 'key' | 'server' | 'cloud' | 'news' | 'school' | 'certificate' | 'user' | 'clock' | 'hourglass'

const PLACEHOLDER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16"/></svg>'

export const GLYPHS: Record<GlyphName, string> = new Proxy({} as Record<GlyphName, string>, { get: () => PLACEHOLDER })
