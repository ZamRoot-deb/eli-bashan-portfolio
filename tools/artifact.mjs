// Package dist/ as a claude.ai Artifact: the page body (no doctype/html/head/body wrappers, which the
// Artifact skeleton provides) plus the list of supporting files to publish next to it.
// Usage: node tools/artifact.mjs  ->  artifact/index.html + artifact/files.json

import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const dist = path.join(root, 'dist')
const out = path.join(root, 'artifact')
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? ''
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ''
const keepHead = head
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !/^<meta (charset|name="viewport")/i.test(l))
  .join('\n')

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'index.html'), `${keepHead}\n${body.trim()}\n`)

const files = {}
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const rel = path.relative(dist, full).split(path.sep).join('/')
    if (fs.statSync(full).isDirectory()) walk(full)
    else if (rel !== 'index.html') files[rel] = path.relative(root, full)
  }
}
walk(dist)
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(files, null, 2))
const bytes = Object.values(files).reduce((n, f) => n + fs.statSync(path.join(root, f)).size, 0)
console.log(`artifact/index.html + ${Object.keys(files).length} supporting files (${(bytes / 1024).toFixed(0)} KB)`)
