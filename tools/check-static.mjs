#!/usr/bin/env node
// Filesystem-only checks (no browser, no server) against a built `dist/` and the repo.
// Usage: node tools/check-static.mjs [--dist <dir>]
// Prints `PASS static <evidence>` or `FAIL static: <reasons>`.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadContent } from './lib/content.mjs'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const TEXT_EXTS = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.svg', '.json', '.txt', '.ts', '.map'])
const SKIP_DIRS = new Set(['node_modules', '.git'])

function walk(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

function readTextSafe(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

function checkDino(distDir) {
  const reasons = []
  const files = walk(distDir)
  const dinoFiles = files.filter(f => /(^|[-_.])dino/i.test(basename(f)))
  if (dinoFiles.length) reasons.push(`file(s) named dino*: ${dinoFiles.map(f => relative(distDir, f)).join(', ')}`)
  const hits = []
  for (const f of files) {
    if (!TEXT_EXTS.has(extname(f).toLowerCase())) continue
    const txt = readTextSafe(f)
    if (txt && /dino/i.test(txt)) hits.push(relative(distDir, f))
  }
  if (hits.length) reasons.push(`"dino" string found in: ${hits.slice(0, 5).join(', ')}`)
  return reasons
}

function checkVendoredAssets(distDir) {
  const reasons = []
  const rels = ['sprites/portrait.png', 'sprites/hourglass.png', 'sprites/floppy.png', 'Eli_Zamar_Bashan_CV.pdf']
  for (const rel of rels) {
    const pubPath = join(REPO_ROOT, 'public', rel)
    const distPath = join(distDir, rel)
    if (!existsSync(pubPath)) {
      reasons.push(`public/${rel} missing (cannot verify byte-identity)`)
      continue
    }
    if (!existsSync(distPath)) {
      reasons.push(`dist/${rel} missing`)
      continue
    }
    const a = readFileSync(pubPath)
    const b = readFileSync(distPath)
    if (!a.equals(b)) reasons.push(`dist/${rel} differs from public/${rel} (${a.length}B vs ${b.length}B)`)
  }
  return reasons
}

function checkAshwin(distDir) {
  const reasons = []
  const dirs = [join(REPO_ROOT, 'src'), join(REPO_ROOT, 'public'), distDir]
  for (const dir of dirs) {
    for (const f of walk(dir)) {
      if (!TEXT_EXTS.has(extname(f).toLowerCase())) continue
      const txt = readTextSafe(f)
      if (txt && /ashwin/i.test(txt)) reasons.push(`"ashwin" found in ${relative(REPO_ROOT, f)}`)
    }
  }
  return reasons.slice(0, 10)
}

function checkDashes(distDir) {
  const reasons = []
  const idxPath = join(distDir, 'index.html')
  if (!existsSync(idxPath)) {
    reasons.push(`${relative(REPO_ROOT, idxPath)} missing`)
    return reasons
  }
  let html = readFileSync(idxPath, 'utf8')
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  let text = html.replace(/<[^>]+>/g, ' ')
  text = text.replace(/&mdash;|&#8212;|&#x2014;/gi, '—').replace(/&ndash;|&#8211;|&#x2013;/gi, '–')
  const emCount = (text.match(/—/g) || []).length
  const enCount = (text.match(/–/g) || []).length
  if (emCount) reasons.push(`${emCount} em-dash (U+2014) in visible text`)
  if (enCount) reasons.push(`${enCount} en-dash (U+2013) in visible text`)
  return reasons
}

function checkIcons(content) {
  const reasons = []
  const iconsMdPath = join(REPO_ROOT, 'ICONS.md')
  if (!existsSync(iconsMdPath)) {
    reasons.push('ICONS.md missing')
    return reasons
  }
  const md = readFileSync(iconsMdPath, 'utf8')

  let filesCoverage = null
  const iconsTsPath = join(REPO_ROOT, 'src', 'icons.ts')
  if (existsSync(iconsTsPath)) {
    const ts = readFileSync(iconsTsPath, 'utf8')
    const files = [...new Set([...ts.matchAll(/['"`]([^'"`]+\.(?:svg|png|webp|jpe?g))['"`]/gi)].map(m => basename(m[1])))]
    if (files.length) filesCoverage = { total: files.length, missing: files.filter(f => !md.includes(f)) }
  }

  let itemsCoverage = null
  if (content) itemsCoverage = { total: content.stackItems.length, missing: content.stackItems.filter(item => !md.includes(item)) }

  const filesOk = !!filesCoverage && filesCoverage.missing.length === 0
  const itemsOk = !!itemsCoverage && itemsCoverage.missing.length === 0
  if (!filesOk && !itemsOk) {
    if (itemsCoverage) reasons.push(`ICONS.md missing rows for ${itemsCoverage.missing.length}/${itemsCoverage.total} stack items: ${itemsCoverage.missing.slice(0, 6).join(', ')}`)
    if (filesCoverage) reasons.push(`ICONS.md missing rows for ${filesCoverage.missing.length}/${filesCoverage.total} src/icons.ts files: ${filesCoverage.missing.slice(0, 6).join(', ')}`)
    if (!itemsCoverage && !filesCoverage) reasons.push('could not determine coverage: neither src/content.ts nor src/icons.ts was usable')
  }
  return reasons
}

function checkSizeBudget(distDir) {
  const reasons = []
  const files = walk(distDir)
  let total = 0
  let maxJs = 0
  let maxJsFile = ''
  let totalCss = 0
  for (const f of files) {
    const size = statSync(f).size
    total += size
    const ext = extname(f).toLowerCase()
    if ((ext === '.js' || ext === '.mjs') && size > maxJs) {
      maxJs = size
      maxJsFile = f
    }
    if (ext === '.css') totalCss += size
  }
  if (maxJs > 220 * 1024) reasons.push(`largest JS chunk ${(maxJs / 1024).toFixed(1)}KB > 220KB budget (${relative(distDir, maxJsFile)})`)
  if (totalCss > 120 * 1024) reasons.push(`total CSS ${(totalCss / 1024).toFixed(1)}KB > 120KB budget`)
  if (total > 6 * 1024 * 1024) reasons.push(`dist total ${(total / 1024 / 1024).toFixed(2)}MB > 6MB budget`)
  return { reasons, total, maxJs, totalCss }
}

async function main() {
  const args = process.argv.slice(2)
  const distIdx = args.indexOf('--dist')
  const distDir = distIdx >= 0 ? resolve(process.cwd(), args[distIdx + 1]) : join(REPO_ROOT, 'dist')

  if (!existsSync(distDir)) {
    console.log(`FAIL static: ${distDir} does not exist`)
    process.exit(1)
  }

  let content = null
  try {
    content = await loadContent(REPO_ROOT)
  } catch {
    // handled as a coverage-check caveat below; other checks don't need content.ts
  }

  const reasons = [
    ...checkDino(distDir),
    ...checkVendoredAssets(distDir),
    ...checkAshwin(distDir),
    ...checkDashes(distDir),
    ...checkIcons(content),
  ]
  const budget = checkSizeBudget(distDir)
  reasons.push(...budget.reasons)

  if (reasons.length) {
    console.log(`FAIL static: ${reasons.join('; ')}`)
    process.exit(1)
  }
  console.log(
    `PASS static no dino/ashwin, no em/en-dash, sprites+CV byte-identical, ICONS.md covered, sizes ok (JS max ${(budget.maxJs / 1024).toFixed(1)}KB, CSS ${(budget.totalCss / 1024).toFixed(1)}KB, total ${(budget.total / 1024 / 1024).toFixed(2)}MB)`,
  )
}

main()
