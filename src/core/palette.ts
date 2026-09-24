// Palette shared by canvas code, sprites and baked icon colours.
// Mirrors the CSS custom properties in src/styles/tokens.css (keep both in sync).
import type { Hue } from '../content'

export const INK = '#04070a' // page ground
export const PANEL = '#0a1014' // raised surface
export const PANEL_2 = '#0f1a20' // hover / nested surface
export const LINE = '#17563a' // hairlines, faint borders
export const PAPER = '#d9f2e4' // primary text
export const DIM = '#6fae8d' // secondary text
export const FAINT = '#3d6b55' // tertiary text, disabled

export const HUE: Record<Hue, string> = {
  term: '#4dff9e', // phosphor green: terminal, primary accent
  amber: '#ffd75f', // coins, XP, trophies
  magenta: '#ff4fd8', // glitch, enemies
  cyan: '#45e6ff', // links, scale
  violet: '#a78bff', // AI, magic
  red: '#ff5a6e', // threats, alerts
  orange: '#ff9f45', // pentest, heat
  blue: '#6aa8ff', // infrastructure, logs
}

export const hue = (h: Hue): string => HUE[h]

/** `#rrggbb` + alpha (0..1) as an rgba() string, for canvas fills. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
