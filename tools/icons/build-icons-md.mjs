// Generates ICONS.md from manifest-data.mjs plus the SOURCES table below.
// SOURCES mirrors exactly what fetch-icons.mjs fetches for each file (see
// its DEVICON_ITEMS / SIMPLE_ICON_ITEMS / TABLER_CONCEPT_ITEMS / VENDOR_ITEMS
// tables and the dedicated fetchKaspersky()) - kept as plain data here so
// this script has no dependency on a prior run's log output.
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STACK_ICONS, CERT_ICONS } from './manifest-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const DEVICON = 'Devicon, MIT licence.'
const SIMPLE = 'Simple Icons, CC0 (SVG data).'
const TABLER = "Tabler Icons, MIT licence. Concept glyph, stroke baked to the item's group hue."
const VENDOR = 'Vendor mark, trademark of its owner (nominative use).'

// file -> { url, licence }
const SOURCES = {
  'python.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/python/python-original.svg', licence: DEVICON },
  'fastapi.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/fastapi/fastapi-original.svg', licence: DEVICON },
  'nextjs.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/nextjs/nextjs-original.svg', licence: `${DEVICON} Black disc + white-fade gradient "N"; recoloured to a light disc with a panel-ink cutout so it reads on #0a1014.` },
  'react.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/react/react-original.svg', licence: DEVICON },
  'postgresql.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/postgresql/postgresql-original.svg', licence: DEVICON },
  'docker.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/docker/docker-original.svg', licence: DEVICON },
  'redis.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/redis/redis-original.svg', licence: DEVICON },
  'rust.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/rust/rust-original.svg', licence: `${DEVICON} Default (unfilled) black mark; recoloured to the site's light ink for panel contrast.` },
  'tauri.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/tauri/tauri-original.svg', licence: DEVICON },
  'bash.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/bash/bash-original.svg', licence: `${DEVICON} The badge shape's near-black fill (#293138) was swapped for the site's light ink so it doesn't disappear on the #0a1014 panel; the green $_ accent is untouched.` },
  'powershell.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/powershell/powershell-original.svg', licence: DEVICON },
  'linux.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/linux/linux-plain.svg', licence: `${DEVICON} The 'original' Tux is a 190KB gradient illustration (712 paths); 'plain' is a clean 2.8KB silhouette, recoloured to the site's light ink.` },
  'windows-server.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/windows11/windows11-original.svg', licence: `${DEVICON} Used for "Windows Server" (devicon has no separate Windows Server mark); single-colour 4-pane flag, lightened for panel contrast.` },
  'nginx.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/nginx/nginx-original.svg', licence: DEVICON },
  'azure.svg': { url: 'https://cdn.jsdelivr.net/npm/devicon@2.17.0/icons/azure/azure-original.svg', licence: DEVICON },

  'celery.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/celery.svg', licence: `${SIMPLE} Brand green (#37814A) lightened toward white for panel contrast.` },
  'claude.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/claude.svg', licence: SIMPLE },
  'ollama.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/ollama.svg', licence: `${SIMPLE} Official brand colour is black (#000000); recoloured to the site's light ink.` },
  'paloaltonetworks.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/paloaltonetworks.svg', licence: `${SIMPLE} Used for "Cortex XDR" (a Palo Alto Networks product).` },
  'metasploit.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/metasploit.svg', licence: SIMPLE },
  'burpsuite.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/burpsuite.svg', licence: SIMPLE },
  'fortinet.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/fortinet.svg', licence: SIMPLE },
  'ddrescue.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/gnu.svg', licence: `${SIMPLE} DDrescue is a GNU project; the GNU mark is used per the brief. Brand maroon (#A42E2B) lightened toward white for panel contrast.` },
  'yara.svg': { url: 'https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/virustotal.svg', licence: `${SIMPLE} YARA has no standalone brand mark (maintained under the VirusTotal GitHub org); VirusTotal's mark used as a stand-in. Brand blue lightened toward white for panel contrast.` },

  'scalpel.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/cut.svg', licence: TABLER },
  'foremost.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/puzzle.svg', licence: TABLER },
  'eric-zimmerman-tools.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/tools.svg', licence: `${TABLER} ericzimmerman.github.io has no logo; its only image asset is the author's personal GitHub avatar, not a product mark.` },
  'siem-investigation.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/list-search.svg', licence: TABLER },
  'psexec.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/terminal-2.svg', licence: `${TABLER} No PsExec-specific mark on Microsoft Learn/Sysinternals.` },
  'passive-dns.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/world-search.svg', licence: TABLER },
  'bgp-asn-analysis.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/route.svg', licence: TABLER },
  'breach-intelligence-feeds.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/rss.svg', licence: TABLER },
  'rag-pipeline-design.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/database-search.svg', licence: TABLER },
  'react-agent-architecture.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/robot.svg', licence: TABLER },
  'prompt-engineering.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/message-chatbot.svg', licence: TABLER },
  'ai-privacy-gateway-design.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/shield-lock.svg', licence: TABLER },
  'semantic-search-vector-embeddings.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/vector-triangle.svg', licence: TABLER },
  'vps-deployment.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/server.svg', licence: TABLER },
  'x-ways.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/search.svg', licence: `${TABLER} x-ways.net's only favicon is a blurry 32x32 with illegible text; no apple-touch-icon.` },
  'md-next.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/folder-search.svg', licence: `${TABLER} gmdsoft.com declares a "192x192" favicon that is actually a fake-labelled 32x32 PNG.` },
  'kape.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/file-analytics.svg', licence: `${TABLER} kroll.com's only favicon is 32x32; no larger official KAPE or Kroll mark found.` },
  'eventtracker.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/activity.svg', licence: `${TABLER} netsurion.com (EventTracker's parent, Lumifi) blocks direct fetches (403); Wayback Machine snapshots of both domains are all 16-32px.` },
  'ghidra.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/binary.svg', licence: `${TABLER} ghidra-sre.org now redirects straight to its GitHub repo, which has no standalone icon (only GitHub's own default octocat mask-icon, which would misrepresent the brand).` },
  'osint-framework.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/sitemap.svg', licence: `${TABLER} osintframework.com has no favicon (500 on /favicon.ico) and no logo image on the page.` },
  'cyberark.svg': { url: 'https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/key.svg', licence: `${TABLER} cyberark.com now redirects into paloaltonetworks.com/idira post-acquisition. Its archived (2022) favicon is an unconfigured theme-default wireframe cube, not a CyberArk mark, and the only square icon on Wikimedia Commons is unverifiable, so a concept icon was used rather than risk showing the wrong brand.` },

  'belkasoft.png': { url: 'https://belkasoft.com/images/favicon.ico', licence: `${VENDOR} Their only favicon is 32x32; no apple-touch-icon exists.` },
  'cellebrite.png': { url: 'https://media.cellebrite.com/wp-content/uploads/2020/01/favicon.png', licence: VENDOR },
  'magnet-axiom.svg': { url: 'https://www.magnetforensics.com/wp-content/themes/magnet-forensics-wordpress/dist/images/favicon/safari-pinned-tab_13223d7d.svg', licence: VENDOR },
  'detego.png': { url: 'https://detegoglobal.com/wp-content/uploads/2022/07/Untitled-design-62.png', licence: VENDOR },
  'autopsy.svg': { url: 'https://www.autopsy.com/favicons/safari-pinned-tab.svg', licence: `${VENDOR} Safari-pinned-tab mark ships solid black; recoloured to the site's light ink.` },
  'ftk.png': { url: 'https://cdn.prod.website-files.com/697952141e2c1fbd9894f63d/697952141e2c1fbd9894f663_favicon.png', licence: `${VENDOR} exterro.com's apple-touch-icon is their full wordmark; this is their plain favicon, a clean square "X" mark.` },
  'volatility.png': { url: 'https://volatilityfoundation.org/wp-content/uploads/2023/11/IMG_6301-200x200.png', licence: VENDOR },
  'elcomsoft.svg': { url: 'https://www.elcomsoft.com/safari-pinned-tab.svg', licence: `${VENDOR} Safari-pinned-tab mark ships solid black; recoloured to the site's light ink.` },
  'passware.png': { url: 'https://www.passware.com/favicon.ico', licence: VENDOR },
  'cybertriage.png': { url: 'https://cybertriage.com/favicons/apple-touch-icon.png', licence: VENDOR },
  'velociraptor.png': { url: 'https://docs.velociraptor.app/images/favicon.png', licence: VENDOR },
  'arctic-security.png': { url: 'https://www.arcticsecurity.com/hubfs/logos/logo_blue.png', licence: `${VENDOR} Their standalone snowflake/network symbol mark (a separate wordmark logo also exists); downscaled from a 3000x3000 source to fit the 40KB budget.` },
  'inquest.png': { url: 'https://github.com/InQuest.png', licence: `${VENDOR} inquest.net now redirects to its acquirer OPSWAT's site, whose favicon is OPSWAT-branded; InQuest's own GitHub org avatar keeps the InQuest mark.` },
  'logrhythm.png': { url: 'https://logrhythm.com/favicon.ico (Wayback Machine snapshot)', licence: `${VENDOR} logrhythm.com now redirects to Exabeam (2024 merger) and serves Exabeam's favicon; a Wayback Machine snapshot keeps LogRhythm's own mark.` },
  'exabeam.png': { url: 'https://www.exabeam.com/ (favicon)', licence: VENDOR },
  'alienvault.png': { url: 'https://www.levelblue.com/hubfs/lb-web/graphic-elements/favicon.png', licence: `${VENDOR} AlienVault rebranded to LevelBlue; this is their current mark.` },
  'crowdstrike.png': { url: 'https://www.crowdstrike.com/ (favicon.ico)', licence: VENDOR },
  'ida-pro.png': { url: 'https://hex-rays.com/hubfs/Ico-logo.png', licence: VENDOR },
  'maltego.png': { url: 'https://github.com/MaltegoTech.png', licence: `${VENDOR} maltego.com only serves a 48x48 favicon.ico; their GitHub org avatar is a crisper 200x200.` },
  'nmap.png': { url: 'https://github.com/nmap.png', licence: `${VENDOR} nmap.org's own favicon is a 16px eye icon; their GitHub org avatar is a crisper 168x168 of the same mark.` },
  'aws.png': { url: 'https://a0.awsstatic.com/libra-css/images/site/touch-icon-ipad-144-smile.png', licence: VENDOR },
  'eccouncil.png': { url: 'https://cdn.eccouncil.org/wp-content/uploads/2023/01/26070257/EC-Council-favicon.webp', licence: VENDOR },
  'cyberwarfarelabs.png': { url: 'https://cyberwarfare.live/wp-content/uploads/2024/02/cropped-Logo-Fav-180x180.png', licence: VENDOR },
  'tcmsecurity.png': { url: 'https://media.tcm-sec.com/uploads/2026/02/cropped-TCM-Sec-Primary-Logo-1-300x300.png', licence: VENDOR },
  'certiprof.png': { url: 'https://certiprof.com/cdn/shop/files/cp_Flaticon_1.webp', licence: `${VENDOR} Their social-share logo image on a wide white canvas, autocropped to the mark.` },
  'iso.png': { url: 'https://www.iso.org/favicon.ico (Wayback Machine snapshot)', licence: `${VENDOR} iso.org returns 403 to direct fetches; a Wayback Machine snapshot of their favicon was used instead.` },

  'kaspersky.svg': { url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Kaspersky_icon.svg', licence: 'Wikimedia Commons file "Kaspersky icon.svg", public domain. kaspersky.com only serves a 16x16 favicon and Simple Icons only has their cursive wordmark (illegible at icon size); this is their real hexagon+K symbol mark, recoloured (from black) for panel contrast.' },
}

function usedForMap() {
  const usedFor = new Map()
  const add = (label, def) => {
    for (const f of def.files) {
      const key = f.replace(/^icons\//, '')
      if (!usedFor.has(key)) usedFor.set(key, [])
      usedFor.get(key).push(label)
    }
  }
  for (const [item, def] of Object.entries(STACK_ICONS)) add(item, def)
  for (const [id, def] of Object.entries(CERT_ICONS)) add(`CERTS issuer: ${id}`, def)
  return usedFor
}

const usedFor = usedForMap()
const files = [...usedFor.keys()].sort()
const missing = files.filter((f) => !SOURCES[f])
if (missing.length) {
  console.error('MISSING SOURCES for:', missing)
  process.exit(1)
}

const rows = files.map((f) => `| \`icons/${f}\` | ${usedFor.get(f).join('; ')} | ${SOURCES[f].url} | ${SOURCES[f].licence} |`)

const brandCount = [...Object.values(STACK_ICONS), ...Object.values(CERT_ICONS)].filter((d) => d.kind === 'brand').length
const conceptCount = [...Object.values(STACK_ICONS), ...Object.values(CERT_ICONS)].filter((d) => d.kind === 'concept').length

const md = `# Icon provenance

Legal basis: Devicon icons are MIT licensed. Simple Icons SVG data is CC0.
Tabler Icons are MIT licensed. All vendor marks (product/company logos) are
trademarks of their respective owners, reproduced here only to nominatively
identify the tools and certification issuers the site's owner actually uses;
no sponsorship or endorsement by any of these companies is implied.

${files.length} files total, covering all 62 STACK_GROUPS items + 10 CERTS
issuers = 72 manifest entries (${brandCount} kind: brand, ${conceptCount} kind: concept -
some files are reused by more than one manifest entry, e.g. Cellebrite backs
both the tool listing and the certification issuer, so file count and entry
count differ).

| File | Used for | Source URL | Licence / basis |
| --- | --- | --- | --- |
${rows.join('\n')}
`

writeFileSync(path.join(ROOT, 'ICONS.md'), md)
console.log(`wrote ICONS.md: ${files.length} file rows`)
