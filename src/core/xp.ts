// Gamification engine: XP, levels, achievements, discovered zones, best scores.
// State persists to localStorage when available and lives in memory otherwise.

import type { GameId } from '../games/types'
import type { GlyphName } from '../icons'
import { emit } from './bus'
import { local } from './store'

export interface Achievement {
  id: string
  title: string
  desc: string
  xp: number
  icon: GlyphName
  secret?: boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'press-start', title: 'Player one ready', desc: 'Boot EZB-OS and enter the world.', xp: 10, icon: 'play' },
  { id: 'explorer', title: 'Explorer', desc: 'Discover 5 zones.', xp: 30, icon: 'map' },
  { id: 'cartographer', title: 'Cartographer', desc: 'Discover all 10 zones.', xp: 60, icon: 'compass' },
  { id: 'speedrunner', title: 'Speedrunner', desc: 'Reach the contact zone within 60 seconds.', xp: 40, icon: 'bolt' },
  { id: 'collector', title: 'Cartridge collector', desc: 'Insert all 5 build cartridges.', xp: 30, icon: 'cpu' },
  { id: 'decryptor', title: 'Decryptor', desc: 'Decrypt all 8 case files.', xp: 30, icon: 'lock-open' },
  { id: 'stargazer', title: 'Stargazer', desc: 'Map all 21 stars in the impact constellation.', xp: 50, icon: 'sparkles' },
  { id: 'librarian', title: 'Badge inspector', desc: 'Inspect all 16 certification badges.', xp: 40, icon: 'certificate' },
  { id: 'save-game', title: 'Save game', desc: 'Download the CV.', xp: 30, icon: 'file-download' },
  { id: 'hello-world', title: 'Hello, world', desc: 'Reach out: email, call or copy a contact.', xp: 25, icon: 'mail' },
  { id: 'root', title: 'Root access', desc: 'Use sudo in the terminal.', xp: 25, icon: 'terminal' },
  { id: 'first-game', title: 'Coin-op', desc: 'Finish your first arcade run.', xp: 20, icon: 'gamepad' },
  { id: 'arcade-all', title: 'Completionist', desc: 'Finish a run in all 4 cabinets.', xp: 60, icon: 'trophy' },
  { id: 'runner-300', title: 'Evidence runner', desc: 'Score 300+ in Evidence Runner.', xp: 30, icon: 'hourglass' },
  { id: 'runner-1000', title: 'Marathon', desc: 'Score 1000+ in Evidence Runner.', xp: 60, icon: 'route' },
  { id: 'hunter-10', title: 'Threat hunter', desc: 'Quarantine 10+ threats in one Threat Hunt round.', xp: 30, icon: 'bug' },
  { id: 'hunter-clean', title: 'Zero false positives', desc: 'Finish a round with 5+ quarantines and no false positives.', xp: 40, icon: 'shield' },
  { id: 'phish-perfect', title: 'Phish slayer', desc: 'Answer all 8 Phish or Legit cards correctly.', xp: 50, icon: 'fingerprint' },
  { id: 'custody-solved', title: 'Chain intact', desc: 'Solve Chain of Custody.', xp: 30, icon: 'key' },
  { id: 'custody-fast', title: 'Court-ready', desc: 'Solve Chain of Custody with half the clock left.', xp: 50, icon: 'checklist' },
  { id: 'sound-on', title: 'Chiptune', desc: 'Turn the sound on.', xp: 10, icon: 'volume' },
  { id: 'sanko', title: 'Bird whisperer', desc: 'Say hello to Sanko five times.', xp: 20, icon: 'star', secret: true },
  { id: 'night-owl', title: 'Night owl', desc: 'Visit between midnight and 5am, your time.', xp: 20, icon: 'clock', secret: true },
  { id: 'konami', title: 'Old school', desc: 'Enter the classic cheat code.', xp: 50, icon: 'sparkles', secret: true },
  { id: 'flag', title: 'Flag captured', desc: 'Find and submit the hidden flag in the terminal.', xp: 100, icon: 'key', secret: true },
]

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
export const ZONE_XP = 15

interface Save {
  v: 1
  xp: number
  unlocked: string[]
  zones: string[]
  best: Partial<Record<GameId, number>>
  played: GameId[]
  counters: Record<string, string[]>
}

const KEY = 'ezb.save.v1'
const blank = (): Save => ({ v: 1, xp: 0, unlocked: [], zones: [], best: {}, played: [], counters: {} })

let state: Save = (() => {
  const s = local.get<Save | null>(KEY, null)
  if (!s || s.v !== 1) return blank()
  return { ...blank(), ...s }
})()

const persist = () => local.set(KEY, state)

// ---------------------------------------------------------------- levels

/** Total XP needed to reach a level (level 1 = 0 XP). */
export const xpForLevel = (level: number): number => 40 * (level - 1) ** 2 + 20 * (level - 1)

export function levelFor(xp: number): number {
  let l = 1
  while (xp >= xpForLevel(l + 1)) l++
  return l
}

/** 0..100 progress through the current level. */
export function levelProgress(xp: number): number {
  const l = levelFor(xp)
  const a = xpForLevel(l)
  const b = xpForLevel(l + 1)
  return Math.round(((xp - a) / (b - a)) * 100)
}

export const getXP = (): number => state.xp
export const getLevel = (): number => levelFor(state.xp)
export const unlockedIds = (): string[] => [...state.unlocked]
export const zonesSeen = (): string[] => [...state.zones]
export const bestOf = (id: GameId): number => state.best[id] ?? 0

// ---------------------------------------------------------------- mutations

export function award(amount: number, reason: string): void {
  if (!Number.isFinite(amount) || amount <= 0) return
  const before = levelFor(state.xp)
  state.xp += Math.round(amount)
  persist()
  const level = levelFor(state.xp)
  emit('xp', { total: state.xp, level, gained: Math.round(amount), reason })
  if (level > before) emit('levelup', { level })
}

export function unlock(id: string): boolean {
  const a = BY_ID.get(id)
  if (!a || state.unlocked.includes(id)) return false
  state.unlocked.push(id)
  persist()
  emit('achievement', { id, title: a.title })
  award(a.xp, a.title)
  return true
}

/** First visit of a zone: XP plus explorer achievements. Returns true when new. */
export function discoverZone(id: string, total: number): boolean {
  if (state.zones.includes(id)) return false
  state.zones.push(id)
  persist()
  award(ZONE_XP, `Zone found: ${id}`)
  if (state.zones.length >= 5) unlock('explorer')
  if (state.zones.length >= total) unlock('cartographer')
  return true
}

/** Record a finished game run; returns true for a new best score. */
export function recordRun(id: GameId, score: number): boolean {
  const prev = state.best[id] ?? 0
  const isBest = score > prev
  if (isBest) state.best[id] = score
  if (!state.played.includes(id)) state.played.push(id)
  persist()
  unlock('first-game')
  if (state.played.length >= 4) unlock('arcade-all')
  return isBest
}

/** Distinct-item counters (e.g. cartridges inserted). Returns the new count. */
export function count(counter: string, item: string): number {
  const list = (state.counters[counter] ??= [])
  if (!list.includes(item)) {
    list.push(item)
    persist()
  }
  return list.length
}

export const counted = (counter: string): string[] => [...(state.counters[counter] ?? [])]
