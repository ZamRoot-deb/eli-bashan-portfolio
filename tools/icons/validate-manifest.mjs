// Cross-checks manifest-data.mjs against the real STACK_GROUPS/CERTS in
// src/content.ts and the actual files on disk. Run before generating icons.ts.
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STACK_ICONS, CERT_ICONS } from './manifest-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const contentSrc = readFileSync(path.join(ROOT, 'src/content.ts'), 'utf8')

// Extract every items: [...] array under STACK_GROUPS and every CERTS issuer.
const stackGroupsBlock = contentSrc.match(/export const STACK_GROUPS[\s\S]*?\n\]/)[0]
const itemStrings = [...stackGroupsBlock.matchAll(/items:\s*\[([^\]]*)\]/g)].flatMap((m) =>
  [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((mm) => mm[1].replace(/\\'/g, "'"))
)
const certsBlock = contentSrc.match(/export const CERTS[\s\S]*?\n\]/)[0]
const issuerIds = [...new Set([...certsBlock.matchAll(/issuer:\s*'([^']*)'/g)].map((m) => m[1]))]

let errors = 0
console.log(`content.ts: ${itemStrings.length} STACK_GROUPS items, ${issuerIds.length} unique CERTS issuers`)

for (const item of itemStrings) {
  if (!(item in STACK_ICONS)) {
    console.log(`MISSING from STACK_ICONS: ${JSON.stringify(item)}`)
    errors++
  }
}
for (const key of Object.keys(STACK_ICONS)) {
  if (!itemStrings.includes(key)) {
    console.log(`EXTRA key in STACK_ICONS (not in content.ts): ${JSON.stringify(key)}`)
    errors++
  }
}
for (const id of issuerIds) {
  if (!(id in CERT_ICONS)) {
    console.log(`MISSING from CERT_ICONS: ${JSON.stringify(id)}`)
    errors++
  }
}
for (const key of Object.keys(CERT_ICONS)) {
  if (!issuerIds.includes(key)) {
    console.log(`EXTRA key in CERT_ICONS (not in content.ts): ${JSON.stringify(key)}`)
    errors++
  }
}

// Every referenced file must exist.
const allEntries = [...Object.entries(STACK_ICONS), ...Object.entries(CERT_ICONS)]
for (const [key, def] of allEntries) {
  for (const f of def.files) {
    const p = path.join(ROOT, 'public', f)
    if (!existsSync(p)) {
      console.log(`MISSING FILE for ${JSON.stringify(key)}: ${f}`)
      errors++
    }
  }
  if (!['brand', 'concept'].includes(def.kind)) {
    console.log(`BAD kind for ${JSON.stringify(key)}: ${def.kind}`)
    errors++
  }
}

console.log(errors === 0 ? 'PASS manifest validation' : `FAIL: ${errors} issue(s)`)
process.exit(errors === 0 ? 0 : 1)
