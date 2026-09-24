#!/usr/bin/env node
// Verification harness for the EZB-OS portfolio's built `dist/`.
//
// Usage: node tools/verify.mjs [--only g1,g2] [--shots] [--dist <dir>]
//   --only g1,g2   run only these groups (comma-separated); `console` always still runs last.
//   --shots        save screenshots under tools/.shots/
//   --dist <dir>   serve this directory instead of ./dist (used by the fixture self-test).
//
// Starts a throwaway static server (tools/lib/serve.mjs) + headless Chrome (tools/lib/cdp.mjs),
// runs the selected docs/CONTRACT.md groups, prints one `PASS <group> ...` / `FAIL <group>: ...`
// line per group, and exits 1 if any group failed. Never a dev server.
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

import { start as startServer } from './lib/serve.mjs'
import { launch, openPage } from './lib/cdp.mjs'
import { loadContent } from './lib/content.mjs'
import { ALL_GROUPS, GROUP_ORDER } from './lib/groups.mjs'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

function parseArgs(argv) {
  const out = { only: null, shots: false, dist: null, url: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--only') out.only = argv[++i]
    else if (a === '--shots') out.shots = true
    else if (a === '--dist') out.dist = argv[++i]
    else if (a === '--url') out.url = argv[++i].replace(/\/+$/, '') // test a deployed site instead of dist/
    else {
      console.error(`Unknown argument: ${a}`)
      process.exit(2)
    }
  }
  return out
}

async function detectOffline() {
  try {
    await fetch('https://fonts.googleapis.com/', { signal: AbortSignal.timeout(2000) })
    return false
  } catch {
    return true
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const distDir = args.dist ? resolve(process.cwd(), args.dist) : join(REPO_ROOT, 'dist')
  const shotsDir = join(REPO_ROOT, 'tools', '.shots')

  const distIndex = join(distDir, 'index.html')
  if (!existsSync(distIndex)) {
    console.error(`FAIL: ${distIndex} does not exist. Build the site first (npm run build) or pass --dist <dir>.`)
    process.exit(1)
  }

  let runList
  if (args.only) {
    const names = args.only.split(',').map(s => s.trim()).filter(Boolean)
    const bad = names.filter(n => !ALL_GROUPS[n])
    if (bad.length) {
      console.error(`Unknown group(s): ${bad.join(', ')}. Known: ${Object.keys(ALL_GROUPS).join(', ')}`)
      process.exit(2)
    }
    runList = names.filter(n => n !== 'console')
  } else {
    runList = [...GROUP_ORDER]
  }
  runList.push('console') // console always runs last, summarising whatever ran in this invocation

  if (args.shots) mkdirSync(shotsDir, { recursive: true })

  let server
  let b
  let cleanedUp = false
  const cleanup = async () => {
    if (cleanedUp) return
    cleanedUp = true
    if (b) await b.close().catch(() => {})
    if (server) await server.close().catch(() => {})
  }
  process.on('SIGINT', async () => {
    await cleanup()
    process.exit(130)
  })
  process.on('SIGTERM', async () => {
    await cleanup()
    process.exit(143)
  })

  let exitCode = 0
  try {
    if (!args.url) server = await startServer(distDir)

    let content = null
    let contentError = null
    try {
      content = await loadContent(REPO_ROOT)
    } catch (e) {
      contentError = e.message
    }

    const offline = await detectOffline()

    b = await launch({})

    const ctx = {
      url: args.url || server.url,
      distDir,
      repoRoot: REPO_ROOT,
      content,
      contentError,
      shots: args.shots,
      shotsDir,
      offline,
      _allPages: [],
      async newPage(opts) {
        const p = await openPage(b, opts)
        ctx._allPages.push(p)
        return p
      },
    }

    for (const name of runList) {
      const fn = ALL_GROUPS[name]
      let r
      try {
        r = await fn(ctx)
      } catch (e) {
        r = { pass: false, notes: `threw: ${(e && e.stack ? e.stack.split('\n').slice(0, 2).join(' <- ') : String(e))}` }
      }
      if (r.pass) console.log(`PASS ${name}${r.notes ? ' ' + r.notes : ''}`)
      else {
        console.log(`FAIL ${name}: ${r.notes || 'unknown failure'}`)
        exitCode = 1
      }
    }
  } catch (e) {
    console.error(`FAIL verify: ${e.stack || e.message}`)
    exitCode = 1
  } finally {
    await cleanup()
  }
  process.exit(exitCode)
}

main()
