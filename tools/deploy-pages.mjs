// Build the site and publish dist/ to the gh-pages branch (GitHub Pages serves that branch's root).
// Usage: node tools/deploy-pages.mjs   (run from a clean, pushed main; needs git + push access)

import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim()

if (run('git', ['status', '--porcelain'])) throw new Error('main has uncommitted changes: commit and push first')
const remote = run('git', ['remote', 'get-url', 'origin'])
const sha = run('git', ['rev-parse', '--short', 'HEAD'])

execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' })

const out = mkdtempSync(join(tmpdir(), 'ezb-pages-'))
try {
  cpSync(join(root, 'dist'), out, { recursive: true })
  writeFileSync(join(out, '.nojekyll'), '')
  run('git', ['init', '-q', '-b', 'gh-pages'], out)
  run('git', ['add', '-A'], out)
  run('git', ['commit', '-q', '-m', `deploy: site build from main ${sha}`], out)
  // gh-pages holds build output only; each deploy replaces it
  execFileSync('git', ['push', '-q', '--force', remote, 'gh-pages'], { cwd: out, stdio: 'inherit' })
  console.log(`deployed main ${sha} to gh-pages; GitHub Pages rebuilds in about a minute`)
} finally {
  rmSync(out, { recursive: true, force: true })
}
