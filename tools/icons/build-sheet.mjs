// Renders every icon into a labelled contact sheet on the site's #0a1014
// panel colour, using a real headless Chrome (SVG/PNG render exactly as the
// browser will). Reuses puppeteer-core + Chrome already on this machine -
// no new dependency added to this project.
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { STACK_ICONS, CERT_ICONS } from './manifest-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const require = createRequire('/path/to/a-project-with-puppeteer-core/package.json')
const puppeteer = require('puppeteer-core')

// Same order/grouping as STACK_GROUPS in src/content.ts.
const GROUP_ITEMS = {
  'Digital forensics': ['Belkasoft', 'Cellebrite', 'Magnet Axiom', 'Detego Forensic Suite', 'Autopsy', 'FTK', 'X-Ways', 'MD Next', 'Volatility 3', 'KAPE', 'Eric Zimmerman Tools', 'Elcomsoft', 'Passware', 'Scalpel', 'Foremost', 'DDrescue'],
  'Incident response & threat intel': ['CyberTriage', 'Velociraptor', 'Arctic Security', 'InQuest', 'LogRhythm', 'Exabeam', 'AlienVault', 'EventTracker', 'Kaspersky EDR', 'CrowdStrike', 'Cortex XDR', 'SIEM investigation'],
  'Malware analysis': ['IDA Pro', 'Ghidra', 'YARA rule authoring & engine integration', 'PsExec'],
  OSINT: ['Maltego', 'OSINT Framework', 'Passive DNS', 'BGP/ASN analysis', 'Breach intelligence feeds'],
  'AI engineering': ['Claude API', 'Ollama local LLM deployment', 'RAG pipeline design', 'ReAct agent architecture', 'Prompt engineering', 'AI privacy gateway design', 'Semantic search with vector embeddings'],
  'Software development': ['Python', 'FastAPI', 'Next.js / React', 'PostgreSQL', 'Docker', 'Redis', 'Celery', 'Rust (Tauri)', 'Bash', 'PowerShell'],
  'Penetration testing': ['Metasploit', 'Burp Suite', 'Nmap'],
  Infrastructure: ['Linux', 'Windows Server', 'VPS deployment', 'Nginx', 'Cloud forensics on AWS & Azure'],
}

function tile(label, files, kind) {
  const imgs = files.map((f) => `<img src="file://${path.join(ROOT, 'public', f)}" alt="" />`).join('')
  return `<div class="tile"><div class="icons">${imgs}</div><div class="label">${label}</div><div class="kind">${kind}</div></div>`
}

let body = ''
for (const [group, items] of Object.entries(GROUP_ITEMS)) {
  body += `<h2>${group}</h2><div class="grid">`
  for (const item of items) {
    const def = STACK_ICONS[item]
    body += tile(item, def.files, def.kind)
  }
  body += `</div>`
}
body += `<h2>Certification issuers</h2><div class="grid">`
for (const [id, def] of Object.entries(CERT_ICONS)) {
  body += tile(id, def.files, def.kind)
}
body += `</div>`

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { background:#0a1014; margin:0; padding:32px; font-family:-apple-system,Helvetica,Arial,sans-serif; }
  h2 { color:#4dff9e; font-size:14px; text-transform:uppercase; letter-spacing:0.08em; margin:28px 0 12px; }
  .grid { display:flex; flex-wrap:wrap; gap:10px; }
  .tile { width:132px; height:118px; background:#0f1a20; border:1px solid #17563a; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px; box-sizing:border-box; }
  .icons { display:flex; gap:6px; align-items:center; justify-content:center; height:48px; }
  .icons img { height:40px; width:40px; object-fit:contain; }
  .label { color:#d9f2e4; font-size:10px; text-align:center; margin-top:6px; line-height:1.25; max-height:26px; overflow:hidden; }
  .kind { color:#6fae8d; font-size:9px; margin-top:2px; }
</style></head><body>${body}</body></html>`

mkdirSync(path.join(__dirname, '.tmp'), { recursive: true })
const htmlPath = path.join(__dirname, '.tmp/sheet.html')
writeFileSync(htmlPath, html)

mkdirSync(path.join(ROOT, 'tools/.shots'), { recursive: true })
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1500, height: 1200, deviceScaleFactor: 2 })
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' })
const height = await page.evaluate(() => document.body.scrollHeight)
await page.setViewport({ width: 1500, height, deviceScaleFactor: 2 })
await page.screenshot({ path: path.join(ROOT, 'tools/.shots/icons-sheet.png'), fullPage: true })
await browser.close()
console.log('wrote tools/.shots/icons-sheet.png')
