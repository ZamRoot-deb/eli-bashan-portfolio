// Loads src/content.ts (the single source of truth for counts/text) and derives the exact
// numbers docs/CONTRACT.md promises, so the content group never hardcodes a number content.ts
// already owns. Node 26 imports .ts natively (type-stripping) — no transpile step needed.
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

// Structural DOM-contract facts that are NOT content.ts data (they describe the markup shape
// itself, per docs/CONTRACT.md) — safe to hardcode since CONTRACT.md is their source of truth.
export const CONTACT_KINDS = ['cv', 'email', 'phone', 'location']
export const GAME_IDS = ['runner', 'threathunt', 'phish', 'custody']
export const ZONE_IDS_EXPECTED = [
  'top', 'about', 'builds', 'cases', 'quests', 'trophies', 'inventory', 'logs', 'arcade', 'contact',
]

export async function loadContent(repoRoot) {
  const url = pathToFileURL(join(repoRoot, 'src/content.ts')).href
  let m
  try {
    m = await import(url)
  } catch (e) {
    throw new Error(`could not import src/content.ts (Node ${process.version}): ${e.message}`)
  }
  const required = ['PROFILE', 'PLATFORMS', 'CASEWORK', 'ROLES', 'IMPACT', 'METRICS', 'STACK_GROUPS', 'WRITING', 'CERTS', 'ZONES']
  const missing = required.filter(k => m[k] === undefined)
  if (missing.length) throw new Error(`src/content.ts is missing expected exports: ${missing.join(', ')}`)

  const stackItems = m.STACK_GROUPS.flatMap(g => g.items)
  const sectorsLine = m.PROFILE.mandate?.find(s => /sector/i.test(s)) || ''
  const banksLine = m.PROFILE.mandate?.find(s => /bank/i.test(s)) || ''
  const sectors = (sectorsLine.match(/\d+/) || [])[0]
  const banks = (banksLine.match(/\d+/) || [])[0]

  return {
    raw: m,
    nameLines: m.PROFILE.nameLines, // ['ELI','ZAMAR','BASHAN']
    sectors, // '13'
    banks, // '24'
    platformsCount: m.PLATFORMS.length, // 5
    caseTypesCount: m.CASEWORK.types.length, // 8
    caseStatsCount: m.CASEWORK.stats.length, // 3
    rolesCount: m.ROLES.length, // 7
    rolesActiveCount: m.ROLES.filter(r => r.active).length, // 1
    trophiesCount: m.IMPACT.trophies.length, // 8
    impactStatsCount: m.IMPACT.stats.length, // 4
    metricsCount: m.METRICS.length, // 21
    stackGroupsCount: m.STACK_GROUPS.length, // 8
    stackItems, // 62 strings, exact text
    stackItemsCount: stackItems.length,
    articlesCount: m.WRITING.articles.length, // 3
    eduCount: m.WRITING.education.length, // 3
    certsCount: m.CERTS.length, // 16
    zoneIds: m.ZONES.map(z => z.id), // page order
    contactKinds: CONTACT_KINDS,
    gameIds: GAME_IDS,
  }
}
