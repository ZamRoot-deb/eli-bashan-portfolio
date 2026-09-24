#!/usr/bin/env node
// Reproducible fetch script for the portfolio's premium icon set.
// Run: node tools/icons/fetch-icons.mjs [--only=devicon|simple|tabler|vendor|glyphs]
//
// Sourcing order per the brief: Devicon (MIT) -> Simple Icons (CC0) -> vendor's own
// official mark -> Tabler Icons (MIT) outline baked to the item's group hue.
// See ICONS.md for the provenance of every file this script produces.

import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const OUT = path.join(ROOT, 'public/icons')
mkdirSync(OUT, { recursive: true })

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

// Mirrors src/core/palette.ts HUE. Keep in sync.
const HUE = {
  term: '#4dff9e',
  amber: '#ffd75f',
  magenta: '#ff4fd8',
  cyan: '#45e6ff',
  violet: '#a78bff',
  red: '#ff5a6e',
  orange: '#ff9f45',
  blue: '#6aa8ff',
}
const LIGHT = '#e6edf3'
const PANEL_INK = '#0a1014'

const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const ONLY = onlyArg ? onlyArg.split('=')[1] : 'all'
const results = { ok: [], fail: [] }

// ---------- fetch helpers ----------
async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  return { status: res.status, url: res.url, body: res.status === 200 ? await res.text() : '' }
}
async function getBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (res.status !== 200) return { status: res.status, url: res.url, buf: null }
  return { status: res.status, url: res.url, buf: Buffer.from(await res.arrayBuffer()) }
}

// ---------- colour helpers ----------
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}
function relLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function mixWhite(hex, t) {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
}
// Returns { hex, changed, reason } - lifts anything under the 0.2 legibility
// floor for the #0a1014 panel: flat near-neutral blacks go to the site's
// light ink; saturated dark brand hues are lightened toward white in the
// same hue so the brand colour still reads.
function ensureLegible(hex) {
  const lum = relLuminance(hex)
  if (lum >= 0.2) return { hex, changed: false, reason: '' }
  const [r, g, b] = hexToRgb(hex)
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))
  if (maxDiff < 24) return { hex: LIGHT, changed: true, reason: `near-neutral dark (luminance ${lum.toFixed(2)}), flattened to site light ink ${LIGHT}` }
  let t = 0.15
  let out = hex
  for (let i = 0; i < 14; i++) {
    out = mixWhite(hex, t)
    if (relLuminance(out) >= 0.32) break
    t += 0.07
  }
  return { hex: out, changed: true, reason: `dark brand hue (luminance ${lum.toFixed(2)}), lightened toward white to ${out}` }
}

// ---------- svg helpers ----------
function stripUnsafe(svg) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
}
function pngDims(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47 && buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return null
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

function writeIcon(file, content) {
  const dest = path.join(OUT, file)
  mkdirSync(path.dirname(dest), { recursive: true })
  writeFileSync(dest, content)
  const size = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content)
  console.log(`  OK  ${file}  (${size} bytes)`)
  results.ok.push(file)
}
function fail(label, reason) {
  console.log(`  FAIL  ${label}  -- ${reason}`)
  results.fail.push({ label, reason })
}

// ============================================================
// 1. DEVICON (MIT) - coloured 'original' SVGs
// ============================================================
const DEVICON_ITEMS = [
  { file: 'python.svg', name: 'python' },
  { file: 'fastapi.svg', name: 'fastapi' },
  { file: 'nextjs.svg', name: 'nextjs', darkGradientOverride: true },
  { file: 'react.svg', name: 'react' },
  { file: 'postgresql.svg', name: 'postgresql' },
  { file: 'docker.svg', name: 'docker' },
  { file: 'redis.svg', name: 'redis' },
  { file: 'rust.svg', name: 'rust' },
  { file: 'tauri.svg', name: 'tauri' },
  { file: 'bash.svg', name: 'bash', swapFill: { '#293138': LIGHT } }, // dark badge shape reads as near-invisible on the #0a1014 panel; keep the green $_ accent
  { file: 'powershell.svg', name: 'powershell' },
  { file: 'linux.svg', name: 'linux', preferPlain: true }, // 'original' Tux is a 190KB gradient illustration; 'plain' is a clean 2.8KB silhouette
  { file: 'windows-server.svg', name: 'windows11' },
  { file: 'nginx.svg', name: 'nginx' },
  { file: 'azure.svg', name: 'azure' },
]

async function fetchDevicon({ file, name, darkGradientOverride, preferPlain, swapFill }) {
  const variants = preferPlain ? ['plain', 'original', 'original-wordmark'] : ['original', 'plain', 'original-wordmark']
  for (const variant of variants) {
    const url = `https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/${name}/${name}-${variant}.svg`
    const r = await getText(url)
    if (r.status !== 200 || r.body.length < 60) continue
    let svg = stripUnsafe(r.body)
    if (swapFill) {
      for (const [from, to] of Object.entries(swapFill)) svg = svg.split(`fill="${from}"`).join(`fill="${to}"`)
      writeIcon(file, svg)
      console.log(`      (swapped ${JSON.stringify(swapFill)} for panel contrast)`)
      return true
    }
    const hasGradient = /gradient/i.test(svg)
    const explicitFills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)].map((m) => m[1].toLowerCase())
    const distinct = [...new Set(explicitFills)]

    if (darkGradientOverride && hasGradient) {
      // Next.js mark: black disc (no own fill) + two white->transparent
      // gradient paths forming the "N" cutout. Flip to a light disc with a
      // dark cutout so it reads on the #0a1014 panel instead of vanishing.
      svg = svg.replace('<svg ', `<svg fill="${LIGHT}" `).replace(/stop-color="#fff"/gi, `stop-color="${PANEL_INK}"`)
      writeIcon(file, svg)
      console.log(`      (dark gradient mark, recoloured: light disc #e6edf3 + panel-ink cutout)`)
      return true
    }
    if (hasGradient) {
      // Unexpected gradient mark we haven't special-cased - ship as-is (likely multi-colour) but flag for review.
      writeIcon(file, svg)
      console.log(`      (contains a gradient, not auto-recoloured - verify on the contact sheet)`)
      return true
    }
    if (distinct.length === 0) {
      // No explicit fill anywhere -> defaults to black. Inject a fill on the root.
      const { hex, changed, reason } = ensureLegible('#000000')
      svg = svg.replace('<svg ', `<svg fill="${hex}" `)
      writeIcon(file, svg)
      if (changed) console.log(`      (${reason})`)
      return true
    }
    if (distinct.length === 1) {
      const { hex, changed, reason } = ensureLegible(distinct[0])
      if (changed) {
        svg = svg.split(new RegExp(`fill="${distinct[0]}"`, 'gi')).join(`fill="${hex}"`)
        console.log(`      (${reason})`)
      }
      writeIcon(file, svg)
      return true
    }
    // Multi-colour vendor mark - leave untouched.
    writeIcon(file, svg)
    return true
  }
  fail(`devicon:${name}`, 'no original/plain/wordmark variant returned 200')
  return false
}

// ============================================================
// 2. SIMPLE ICONS (CC0) - inject brand hex from data.json
// ============================================================
const SIMPLE_ICON_ITEMS = [
  { file: 'celery.svg', slug: 'celery' },
  { file: 'claude.svg', slug: 'claude' },
  { file: 'ollama.svg', slug: 'ollama' },
  { file: 'paloaltonetworks.svg', slug: 'paloaltonetworks' },
  { file: 'metasploit.svg', slug: 'metasploit' },
  { file: 'burpsuite.svg', slug: 'burpsuite' },
  { file: 'fortinet.svg', slug: 'fortinet' },
  { file: 'ddrescue.svg', slug: 'gnu' },
  // YARA's own site (virustotal.github.io/yara) has no standalone brand mark;
  // it now lives under the VirusTotal org, so we use VirusTotal's mark as a stand-in.
  { file: 'yara.svg', slug: 'virustotal' },
]

let SI_INDEX = null
async function loadSimpleIconsIndex() {
  if (SI_INDEX) return SI_INDEX
  const r = await getText('https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/data/simple-icons.json')
  if (r.status !== 200) throw new Error('could not load simple-icons.json')
  const data = JSON.parse(r.body)
  const arr = Array.isArray(data) ? data : data.icons || Object.values(data)
  SI_INDEX = new Map(arr.map((i) => [i.slug, i]))
  return SI_INDEX
}

async function fetchSimpleIcon({ file, slug }) {
  const idx = await loadSimpleIconsIndex()
  const meta = idx.get(slug)
  if (!meta) return fail(`simple-icons:${slug}`, 'slug not found in simple-icons.json')
  const url = `https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/${slug}.svg`
  const r = await getText(url)
  if (r.status !== 200) return fail(`simple-icons:${slug}`, `HTTP ${r.status}`)
  let svg = stripUnsafe(r.body)
  const brandHex = '#' + meta.hex
  const { hex, changed, reason } = ensureLegible(brandHex)
  svg = svg.replace('<svg ', `<svg fill="${hex}" `)
  writeIcon(file, svg)
  console.log(`      (brand hex ${brandHex}${changed ? ', ' + reason : ''})`)
  return true
}

// ============================================================
// 3. TABLER ICONS (MIT) outline, baked to the item's group hue
// ============================================================
const TABLER_CONCEPT_ITEMS = [
  { file: 'scalpel.svg', name: 'cut', hue: 'term' },
  { file: 'foremost.svg', name: 'puzzle', hue: 'term' },
  { file: 'eric-zimmerman-tools.svg', name: 'tools', hue: 'term' },
  { file: 'siem-investigation.svg', name: 'list-search', hue: 'red' },
  { file: 'psexec.svg', name: 'terminal-2', hue: 'magenta' },
  { file: 'passive-dns.svg', name: 'world-search', hue: 'cyan' },
  { file: 'bgp-asn-analysis.svg', name: 'route', hue: 'cyan' },
  { file: 'breach-intelligence-feeds.svg', name: 'rss', hue: 'cyan' },
  { file: 'rag-pipeline-design.svg', name: 'database-search', hue: 'violet' },
  { file: 'react-agent-architecture.svg', name: 'robot', hue: 'violet' },
  { file: 'prompt-engineering.svg', name: 'message-chatbot', hue: 'violet' },
  { file: 'ai-privacy-gateway-design.svg', name: 'shield-lock', hue: 'violet' },
  { file: 'semantic-search-vector-embeddings.svg', name: 'vector-triangle', hue: 'violet' },
  { file: 'vps-deployment.svg', name: 'server', hue: 'blue' },
  // Fallbacks discovered while resolving vendor marks: no usable official mark
  // was found for these (see ICONS.md for what was tried).
  { file: 'x-ways.svg', name: 'search', hue: 'term' }, // x-ways.net's only favicon is a blurry 32x32 with illegible text
  { file: 'md-next.svg', name: 'folder-search', hue: 'term' },
  { file: 'kape.svg', name: 'file-analytics', hue: 'term' },
  { file: 'eventtracker.svg', name: 'activity', hue: 'red' },
  { file: 'ghidra.svg', name: 'binary', hue: 'magenta' },
  { file: 'osint-framework.svg', name: 'sitemap', hue: 'cyan' },
  // cyberark.com now redirects into paloaltonetworks.com/idira post-acquisition;
  // its archived favicon is an unconfigured theme-default wireframe cube, and
  // Wikimedia Commons only has their wordmark or an unverifiable icon, so this
  // uses a concept mark (amber = the palette's default for CERT_ICONS).
  { file: 'cyberark.svg', name: 'key', hue: 'amber' },
]

function bakeTablerHue(svg, hex) {
  const openTag = svg.match(/<svg[^>]*>/)[0]
  const inner = svg.slice(openTag.length, svg.lastIndexOf('</svg>'))
  const body = inner
    .replace(/<path\s+stroke="none"\s+d="M0 0h24v24H0z"\s+fill="none"\s*\/>/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${hex}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}

async function fetchTablerConcept({ file, name, hue }) {
  const url = `https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/${name}.svg`
  const r = await getText(url)
  if (r.status !== 200) return fail(`tabler:${name}`, `HTTP ${r.status}`)
  const svg = bakeTablerHue(stripUnsafe(r.body), HUE[hue])
  writeIcon(file, svg)
}

// ============================================================
// 4. GLYPHS - inline Tabler outline markup for src/icons.ts
// ============================================================
const GLYPH_MAP = {
  mail: 'mail',
  phone: 'phone',
  'map-pin': 'map-pin',
  'file-download': 'file-download',
  'arrow-up-right': 'arrow-up-right',
  copy: 'copy',
  check: 'check',
  terminal: 'terminal',
  volume: 'volume',
  'volume-off': 'volume-off',
  trophy: 'trophy',
  compass: 'compass',
  x: 'x',
  gamepad: 'device-gamepad-2',
  star: 'star',
  lock: 'lock',
  'lock-open': 'lock-open',
  eye: 'eye',
  shield: 'shield',
  graph: 'graph',
  checklist: 'checklist',
  helmet: 'helmet',
  play: 'player-play',
  refresh: 'refresh',
  'arrow-up': 'arrow-up',
  map: 'map',
  sparkles: 'sparkles',
  bolt: 'bolt',
  bug: 'bug',
  fingerprint: 'fingerprint',
  database: 'database',
  brain: 'brain',
  cpu: 'cpu',
  world: 'world',
  route: 'route',
  'file-search': 'file-search',
  radar: 'radar',
  key: 'key',
  server: 'server',
  cloud: 'cloud',
  news: 'news',
  school: 'school',
  certificate: 'certificate',
  user: 'user',
  clock: 'clock',
  hourglass: 'hourglass',
}

function normalizeGlyph(svg) {
  const openTag = svg.match(/<svg[^>]*>/)[0]
  const inner = svg.slice(openTag.length, svg.lastIndexOf('</svg>'))
  const body = inner
    .replace(/<path\s+stroke="none"\s+d="M0 0h24v24H0z"\s+fill="none"\s*\/>/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

async function fetchGlyphs() {
  const entries = []
  for (const [glyphName, tablerName] of Object.entries(GLYPH_MAP)) {
    const url = `https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/${tablerName}.svg`
    const r = await getText(url)
    if (r.status !== 200) {
      fail(`glyph:${glyphName}`, `tabler/${tablerName} HTTP ${r.status}`)
      continue
    }
    const markup = normalizeGlyph(stripUnsafe(r.body))
    entries.push([glyphName, tablerName, markup])
    console.log(`  OK  glyph ${glyphName} <- tabler/${tablerName}`)
  }
  const dest = path.join(__dirname, '.glyphs.json')
  writeFileSync(dest, JSON.stringify(entries, null, 2))
  console.log(`Wrote ${entries.length} glyphs to ${path.relative(ROOT, dest)}`)
}

// ============================================================
// 5. VENDOR marks - resolve from official <link rel=icon> tags
// ============================================================
function resolveHref(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href
  } catch {
    return null
  }
}
function parseIconLinks(html, baseUrl) {
  const tagRe = /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi
  const tags = html.match(tagRe) || []
  const out = []
  for (const tag of tags) {
    const rel = (tag.match(/rel=["']([^"']*)["']/i) || [, ''])[1].toLowerCase()
    const href = (tag.match(/href=["']([^"']*)["']/i) || [, ''])[1]
    const sizes = (tag.match(/sizes=["']([^"']*)["']/i) || [, ''])[1]
    const type = (tag.match(/type=["']([^"']*)["']/i) || [, ''])[1]
    if (!href) continue
    const resolved = resolveHref(href, baseUrl)
    if (!resolved) continue
    const maxSize = (sizes.match(/(\d+)x\d+/i) || [, '0'])[1]
    out.push({ rel, href: resolved, sizes, type, maxSize: parseInt(maxSize, 10) || 0 })
  }
  return out
}
function rankCandidate(c) {
  const isSvg = c.type === 'image/svg+xml' || /\.svg(\?|$)/i.test(c.href)
  if (isSvg) return 0
  if (c.rel.includes('apple-touch-icon')) return 10 - Math.min(c.maxSize || 180, 180) / 20
  if (c.rel === 'icon' || c.rel === 'shortcut icon') return 20 - Math.min(c.maxSize, 512) / 40
  if (c.rel.includes('mask-icon')) return 30
  return 40
}

async function downloadCandidate(c) {
  if (/\.svg(\?|$)/i.test(c.href) || c.type === 'image/svg+xml') {
    const r = await getText(c.href)
    if (r.status !== 200 || r.body.length < 80 || !/<svg/i.test(r.body)) return null
    return { ext: 'svg', content: stripUnsafe(r.body), url: c.href }
  }
  const r = await getBuffer(c.href)
  if (r.status !== 200 || !r.buf) return null
  const dims = pngDims(r.buf)
  if (dims && (dims.w < 64 || dims.h < 64)) return null
  if (!dims && !/\.ico(\?|$)/i.test(c.href)) return null // unknown raster type we can't size-check
  return { ext: /\.ico(\?|$)/i.test(c.href) ? 'ico' : 'png', content: r.buf, url: c.href, dims }
}

async function resolveVendorIcon(homepages) {
  for (const home of homepages) {
    let html
    try {
      const r = await getText(home)
      if (r.status !== 200) continue
      html = r.body
    } catch {
      continue
    }
    const candidates = parseIconLinks(html, home).sort((a, b) => rankCandidate(a) - rankCandidate(b))
    for (const c of candidates) {
      try {
        const got = await downloadCandidate(c)
        if (got) return { ...got, home }
      } catch {
        // try next candidate
      }
    }
  }
  return null
}

// Most vendor sites resolve cleanly from their homepage's <link rel=icon>
// tags (see resolveVendorIcon). A handful needed hand discovery - a Wayback
// Machine snapshot because the live domain now redirects post-acquisition
// (cyberark, logrhythm, iso), a GitHub org avatar because the project has no
// square web favicon (maltego, nmap, inquest), or a specific asset path the
// homepage crawl doesn't reach. Those are pinned as directUrl so re-running
// this script is deterministic instead of re-discovering them every time.
const VENDOR_ITEMS = [
  { file: 'belkasoft.svg', directUrl: 'https://belkasoft.com/images/favicon.ico', post: 'ico' },
  { file: 'cellebrite.svg', homepages: ['https://cellebrite.com/'] },
  { file: 'magnet-axiom.svg', homepages: ['https://www.magnetforensics.com/'] },
  { file: 'detego.svg', homepages: ['https://www.detegoglobal.com/'] },
  { file: 'autopsy.svg', homepages: ['https://www.autopsy.com/', 'https://www.sleuthkit.org/'], monoFix: true },
  { file: 'ftk.svg', directUrl: 'https://cdn.prod.website-files.com/697952141e2c1fbd9894f63d/697952141e2c1fbd9894f663_favicon.png' }, // exterro.com's apple-touch-icon is their wordmark; the plain favicon is their square "X" mark
  { file: 'volatility.svg', homepages: ['https://volatilityfoundation.org/'] },
  { file: 'elcomsoft.svg', homepages: ['https://www.elcomsoft.com/'], monoFix: true },
  { file: 'passware.svg', directUrl: 'https://www.passware.com/favicon.ico', post: 'ico' },
  { file: 'cybertriage.svg', homepages: ['https://cybertriage.com/'] },
  { file: 'velociraptor.svg', homepages: ['https://docs.velociraptor.app/', 'https://www.velocidex.com/'] },
  { file: 'arctic-security.svg', directUrl: 'https://www.arcticsecurity.com/hubfs/logos/logo_blue.png', post: 'cap40' },
  { file: 'inquest.svg', directUrl: 'https://github.com/InQuest.png?size=200' }, // inquest.net now redirects to its OPSWAT acquirer; GitHub org avatar keeps the InQuest mark
  { file: 'logrhythm.svg', directUrl: 'https://web.archive.org/web/2020id_/https://logrhythm.com/favicon.ico', post: 'ico' }, // logrhythm.com now redirects to Exabeam (2024 merger); Wayback keeps LogRhythm's own mark
  { file: 'exabeam.svg', homepages: ['https://www.exabeam.com/'] },
  { file: 'alienvault.svg', homepages: ['https://levelblue.com/', 'https://otx.alienvault.com/'] }, // AlienVault rebranded to LevelBlue
  { file: 'crowdstrike.svg', directUrl: 'https://www.crowdstrike.com/etc.clientlibs/crowdstrike/clientlibs/crowdstrike-common/resources/favicon.ico', post: 'ico' },
  { file: 'ida-pro.svg', directUrl: 'https://hex-rays.com/hubfs/Ico-logo.png' },
  { file: 'maltego.svg', directUrl: 'https://github.com/MaltegoTech.png?size=200' }, // maltego.com only serves a 48x48 favicon.ico
  { file: 'nmap.svg', directUrl: 'https://github.com/nmap.png?size=200' }, // nmap.org's own favicon is a 16px eye icon
  { file: 'aws.svg', homepages: ['https://aws.amazon.com/'] },
  { file: 'eccouncil.svg', directUrl: 'https://cdn.eccouncil.org/wp-content/uploads/2023/01/26070257/EC-Council-favicon.webp', post: 'webp' },
  { file: 'cyberwarfarelabs.svg', homepages: ['https://cyberwarfare.live/'] },
  { file: 'tcmsecurity.svg', homepages: ['https://tcm-sec.com/'] },
  { file: 'certiprof.svg', directUrl: 'http://certiprof.com/cdn/shop/files/cp_Flaticon_1.webp?v=1742401613', post: 'autocrop' }, // their og:image logo mark on a wide white canvas; autocropped to the mark
  { file: 'iso.svg', directUrl: 'https://web.archive.org/web/2018id_/https://www.iso.org/favicon.ico', post: 'ico' }, // iso.org blocks direct bot fetches (403); Wayback snapshot
]

function pil(op, ...args) {
  return execFileSync('python3', [path.join(__dirname, 'pil_helper.py'), op, ...args.map(String)], { encoding: 'utf8' }).trim()
}

// SVG single-fill luminance fix, shared with fetchDevicon's inline version but
// applied to vendor Safari-pinned-tab / mask-icon marks (always monochrome).
function applyMonoFixSvg(svg) {
  const explicitFills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)].map((m) => m[1].toLowerCase())
  const distinct = [...new Set(explicitFills)]
  if (distinct.length === 0) {
    const { hex } = ensureLegible('#000000')
    return svg.replace('<svg ', `<svg fill="${hex}" `)
  }
  if (distinct.length === 1) {
    const { hex, changed } = ensureLegible(distinct[0])
    if (changed) return svg.split(new RegExp(`fill="${distinct[0]}"`, 'gi')).join(`fill="${hex}"`)
  }
  return svg
}

// Kaspersky: Simple Icons only ships their cursive wordmark, which is
// illegible at icon-tile size. kaspersky.com's own favicon is a blurry 16x16.
// Their real hexagon+K symbol mark is on Wikimedia Commons (public domain),
// recoloured the same way as any other near-black mark for panel contrast.
async function fetchKaspersky() {
  const url = 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Kaspersky_icon.svg'
  const r = await getText(url)
  if (r.status !== 200) return fail('vendor:kaspersky.svg', `HTTP ${r.status}`)
  const svg = stripUnsafe(r.body).replace(/fill="black"/g, `fill="${LIGHT}"`).replace(/stroke="black"/g, `stroke="${LIGHT}"`)
  writeIcon('kaspersky.svg', svg)
  console.log(`      (from ${url}, Wikimedia Commons, public domain; black recoloured for panel contrast)`)
}

async function fetchVendor(item) {
  let got
  if (item.directUrl) {
    const r = await getBuffer(item.directUrl)
    if (r.status !== 200 || !r.buf) return fail(`vendor:${item.file}`, `directUrl HTTP ${r.status}`)
    got = { ext: item.directUrl.split('?')[0].split('.').pop().toLowerCase(), content: r.buf, url: item.directUrl }
  } else {
    got = await resolveVendorIcon(item.homepages)
    if (!got) return fail(`vendor:${item.file}`, `no usable icon link on ${item.homepages.join(', ')}`)
  }

  let outFile = item.file.replace(/\.svg$/, `.${got.ext}`)
  let content = got.content

  if (got.ext === 'svg') {
    content = item.monoFix ? applyMonoFixSvg(content) : content
    writeIcon(outFile, content)
  } else if (item.post) {
    const tmpIn = path.join(OUT, `.tmp-in.${got.ext}`)
    const tmpOut = path.join(OUT, '.tmp-out.png')
    writeFileSync(tmpIn, content)
    try {
      const op = { ico: 'ico2png', webp: 'webp2png', autocrop: 'autocrop', cap40: 'resize_cap' }[item.post]
      const args = item.post === 'cap40' ? [tmpIn, tmpOut, '40'] : [tmpIn, tmpOut]
      const report = pil(op, ...args)
      const pngBuf = readFileSync(tmpOut)
      outFile = item.file.replace(/\.svg$/, '.png')
      writeIcon(outFile, pngBuf)
      console.log(`      (${item.post}: ${report})`)
    } finally {
      if (existsSync(tmpIn)) unlinkSync(tmpIn)
      if (existsSync(tmpOut)) unlinkSync(tmpOut)
    }
  } else {
    writeIcon(outFile, content)
  }
  console.log(`      (from ${got.url})`)
  return { outFile }
}

// ============================================================
// main
// ============================================================
async function main() {
  if (ONLY === 'all' || ONLY === 'devicon') {
    console.log('\n== Devicon ==')
    for (const item of DEVICON_ITEMS) await fetchDevicon(item)
  }
  if (ONLY === 'all' || ONLY === 'simple') {
    console.log('\n== Simple Icons ==')
    for (const item of SIMPLE_ICON_ITEMS) await fetchSimpleIcon(item)
  }
  if (ONLY === 'all' || ONLY === 'tabler') {
    console.log('\n== Tabler concept icons ==')
    for (const item of TABLER_CONCEPT_ITEMS) await fetchTablerConcept(item)
  }
  if (ONLY === 'all' || ONLY === 'vendor') {
    console.log('\n== Vendor marks ==')
    for (const item of VENDOR_ITEMS) await fetchVendor(item)
    await fetchKaspersky()
  }
  if (ONLY === 'all' || ONLY === 'glyphs') {
    console.log('\n== UI glyphs ==')
    await fetchGlyphs()
  }
  console.log(`\n${results.ok.length} ok, ${results.fail.length} failed`)
  if (results.fail.length) {
    console.log('Failures:')
    for (const f of results.fail) console.log(`  - ${f.label}: ${f.reason}`)
  }
}

main().catch((e) => {
  console.error('fatal', e)
  process.exit(1)
})
