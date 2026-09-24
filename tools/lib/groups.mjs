// One function per docs/CONTRACT.md verification group, plus `console` (always last).
// Every group is defensive: missing hooks produce a FAIL reason string, never an uncaught throw,
// so a partial/broken build degrades to a clear report instead of crashing the whole run.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { waitFor, makeCheck, result, browserExpr, sleep } from './util.mjs'
import { mimeFor } from './serve.mjs'
import { EXPECTED, GAME_IDS, ZONE_IDS_EXPECTED } from './content.mjs'

const FAST_NOBOOT = '/index.html?fast&noboot'
const FONT_HOST_RE = /fonts\.(googleapis|gstatic)\.com/

// ---------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------

async function waitReady(page, timeout = 20000) {
  return !!(await waitFor(() => page.eval(`document.documentElement.getAttribute('data-app')==='ready'`), { timeout, interval: 150 }))
}

/** Open a fresh page, navigate to `path` (default fast+noboot) and wait for data-app=ready. */
async function openReady(ctx, opts = {}, path = FAST_NOBOOT) {
  const page = await ctx.newPage(opts)
  await page.goto(ctx.url + path)
  const ready = await waitReady(page)
  return { page, ready }
}

async function shot(ctx, page, name) {
  if (!ctx.shots) return
  try {
    await page.shot(join(ctx.shotsDir, name + '.png'))
  } catch {}
}

async function isVisible(page, sel) {
  return page.eval(browserExpr(`return __isVisible(document.querySelector(${JSON.stringify(sel)}))`))
}

async function textOf(page, sel) {
  return page.eval(browserExpr(`const e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent:null`))
}

async function countOf(page, sel) {
  return page.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`)
}

async function countCheck(chk, page, sel, expected, label) {
  const n = await countOf(page, sel)
  chk.ok(n === expected, `${label} count ${n} (want ${expected})`)
  return n
}

async function pollForChange(page, sel, timeout) {
  const start = await textOf(page, sel)
  const changed = await waitFor(async () => (await textOf(page, sel)) !== start, { timeout, interval: 200 })
  return !!changed
}

function diffMultiset(expected, actual) {
  const count = arr => arr.reduce((m, x) => (m.set(x, (m.get(x) || 0) + 1), m), new Map())
  const em = count(expected)
  const am = count(actual)
  const missing = []
  const extra = []
  for (const [k, v] of em) {
    const av = am.get(k) || 0
    if (av < v) missing.push(v - av === 1 ? k : `${k} (x${v - av})`)
  }
  for (const [k, v] of am) {
    const ev = em.get(k) || 0
    if (v > ev) extra.push(v - ev === 1 ? k : `${k} (x${v - ev})`)
  }
  return { missing, extra }
}

async function gameState(page) {
  return page.eval(`(()=>{const r=document.querySelector('[data-game-root]');return r?r.getAttribute('data-state'):null})()`)
}

async function firstVisibleButtonRect(page, containerSel) {
  return page.eval(
    browserExpr(`
    const root = document.querySelector(${JSON.stringify(containerSel)})
    if (!root) return null
    const btns = [...root.querySelectorAll('button')].filter(__isVisible)
    if (!btns.length) return null
    const r = btns[0].getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  `),
  )
}

async function visibleButtonRects(page, containerSel, max = 4) {
  return page.eval(
    browserExpr(`
    const root = document.querySelector(${JSON.stringify(containerSel)})
    if (!root) return []
    const btns = [...root.querySelectorAll('button')].filter(__isVisible).slice(0, ${max})
    return btns.map(b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  `),
  )
}

// ---------------------------------------------------------------------------
// groups
// ---------------------------------------------------------------------------

export async function gServe(ctx) {
  const chk = makeCheck()
  const distIndex = join(ctx.distDir, 'index.html')
  let html
  try {
    html = readFileSync(distIndex, 'utf8')
  } catch (e) {
    return { pass: false, notes: `cannot read ${distIndex}: ${e.message}` }
  }

  let root
  try {
    root = await fetch(ctx.url + '/')
  } catch (e) {
    return { pass: false, notes: `GET / threw: ${e.message}` }
  }
  chk.ok(root.status === 200, `GET / status ${root.status}`)
  chk.ok((root.headers.get('content-type') || '').includes('text/html'), `GET / content-type ${root.headers.get('content-type')}`)

  const scriptSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1])
  const linkHrefs = [...html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map(m => m[1])
  const assets = [...new Set([...scriptSrcs, ...linkHrefs])].filter(
    h => !/^([a-z][a-z0-9+.-]*:)?\/\//i.test(h) && !h.startsWith('data:'),
  )

  let okCount = 0
  for (const href of assets) {
    const assetUrl = new URL(href, ctx.url + '/index.html').toString()
    let res
    try {
      res = await fetch(assetUrl)
    } catch (e) {
      chk.fail(`GET ${href} threw: ${e.message}`)
      continue
    }
    chk.ok(res.status === 200, `GET ${href} status ${res.status}`)
    const want = mimeFor(href.split('?')[0])
    const got = res.headers.get('content-type') || ''
    chk.ok(got === want, `GET ${href} content-type ${JSON.stringify(got)} (want ${JSON.stringify(want)})`)
    if (res.status === 200) okCount++
  }

  const pdfHrefs = [...html.matchAll(/href=["']([^"']+\.pdf)["']/gi)].map(m => m[1])
  const cvHref = pdfHrefs[0] || '/Eli_Zamar_Bashan_CV.pdf'
  const cvUrl = new URL(cvHref, ctx.url + '/index.html').toString()
  let cvRes
  try {
    cvRes = await fetch(cvUrl)
  } catch (e) {
    chk.fail(`GET CV (${cvHref}) threw: ${e.message}`)
  }
  if (cvRes) {
    chk.ok(cvRes.status === 200, `GET CV (${cvHref}) status ${cvRes.status}`)
    chk.ok((cvRes.headers.get('content-type') || '') === 'application/pdf', `GET CV content-type ${cvRes.headers.get('content-type')}`)
  }

  return result(chk.reasons, `GET / 200; ${okCount}/${assets.length} assets 200 w/ correct type; CV ${cvRes ? cvRes.status : 'MISSING'}`)
}

export async function gContent(ctx) {
  const chk = makeCheck()
  if (!ctx.content) return { pass: false, notes: `content.ts failed to load: ${ctx.contentError}` }
  const c = ctx.content
  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) return { pass: false, notes: 'app did not reach data-app=ready within 20s' }
    await shot(ctx, page, 'content-ready')

    // content.ts itself must match the source facts (the DOM checks below compare against content.ts)
    const facts = {
      platforms: c.platformsCount, caseTypes: c.caseTypesCount, caseStats: c.caseStatsCount, roles: c.rolesCount,
      rolesActive: c.rolesActiveCount, trophies: c.trophiesCount, impactStats: c.impactStatsCount, metrics: c.metricsCount,
      stackGroups: c.stackGroupsCount, stackItems: c.stackItemsCount, articles: c.articlesCount, edu: c.eduCount,
      certs: c.certsCount, sectors: c.sectors, banks: c.banks,
    }
    for (const [k, want] of Object.entries(EXPECTED)) chk.ok(facts[k] === want, `content.ts ${k} is ${facts[k]} (source says ${want})`)

    const nameText = await textOf(page, '#top [data-name]')
    chk.ok(nameText != null, '#top [data-name] exists')
    if (nameText) for (const part of c.nameLines) chk.ok(nameText.includes(part), `#top [data-name] contains "${part}"`)

    const sectorsText = await textOf(page, '[data-stat="sectors"]')
    chk.ok(!!sectorsText && sectorsText.includes(c.sectors), `[data-stat="sectors"] shows ${c.sectors} (got ${JSON.stringify(sectorsText)})`)
    const banksText = await textOf(page, '[data-stat="banks"]')
    chk.ok(!!banksText && banksText.includes(c.banks), `[data-stat="banks"] shows ${c.banks} (got ${JSON.stringify(banksText)})`)

    const platforms = await page.eval(`[...document.querySelectorAll('[data-platform]')].map(el => ({
      name: el.querySelectorAll('[data-platform-name]').length,
      body: el.querySelectorAll('[data-platform-body]').length,
      tags: el.querySelectorAll('[data-stack-tag]').length,
    }))`)
    chk.ok(platforms.length === c.platformsCount, `[data-platform] count ${platforms.length} (want ${c.platformsCount})`)
    platforms.forEach((p, i) => {
      chk.ok(p.name >= 1, `platform ${i}: has [data-platform-name]`)
      chk.ok(p.body >= 1, `platform ${i}: has [data-platform-body]`)
      chk.ok(p.tags >= 1, `platform ${i}: has >=1 [data-stack-tag]`)
    })

    await countCheck(chk, page, '[data-case]', c.caseTypesCount, '[data-case]')
    await countCheck(chk, page, '[data-case-stat]', c.caseStatsCount, '[data-case-stat]')
    await countCheck(chk, page, '[data-role]', c.rolesCount, '[data-role]')
    await countCheck(chk, page, '[data-role][data-active="true"]', c.rolesActiveCount, '[data-role][data-active=true]')
    await countCheck(chk, page, '[data-trophy]:not([data-dup])', c.trophiesCount, '[data-trophy]:not([data-dup])')
    await countCheck(chk, page, '[data-impact-stat]', c.impactStatsCount, '[data-impact-stat]')
    await countCheck(chk, page, '[data-metric]', c.metricsCount, '[data-metric]')
    await countCheck(chk, page, '[data-stack-group]', c.stackGroupsCount, '[data-stack-group]')
    await countCheck(chk, page, '[data-stack-item]', c.stackItemsCount, '[data-stack-item]')
    await countCheck(chk, page, '[data-article]', c.articlesCount, '[data-article]')
    await countCheck(chk, page, '[data-edu]', c.eduCount, '[data-edu]')
    await countCheck(chk, page, '[data-cert]', c.certsCount, '[data-cert]')
    await countCheck(chk, page, '[data-game-launch]', c.gameIds.length, '[data-game-launch]')

    const kinds = await page.eval(`[...document.querySelectorAll('[data-contact-row]')].map(e=>e.getAttribute('data-kind'))`)
    chk.ok(kinds.length === 4, `[data-contact-row] count ${kinds.length} (want 4)`)
    for (const k of c.contactKinds) chk.ok(kinds.includes(k), `contact row kind "${k}" present`)

    const gids = await page.eval(`[...document.querySelectorAll('[data-game-launch]')].map(e=>e.getAttribute('data-game-id'))`)
    for (const g of c.gameIds) chk.ok(gids.includes(g), `game launcher id "${g}" present`)

    const zoneIds = await page.eval(`[...document.querySelectorAll('section.zone[data-zone]')].map(e=>e.id)`)
    chk.ok(JSON.stringify(zoneIds) === JSON.stringify(c.zoneIds), `zone order ${JSON.stringify(zoneIds)} (want ${JSON.stringify(c.zoneIds)})`)

    const itemTexts = await page.eval(`[...document.querySelectorAll('[data-stack-item]')].map(e=>e.textContent.replace(/\\s+/g,' ').trim())`)
    const { missing, extra } = diffMultiset(c.stackItems, itemTexts)
    chk.ok(missing.length === 0, `stack items missing from the page: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ...' : ''}`)
    chk.ok(extra.length === 0, `stack items in the page but not in content.ts: ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' ...' : ''}`)

    return result(chk.reasons, `${platforms.length} platforms, ${itemTexts.length} stack items, ${zoneIds.length} zones, ${kinds.length} contact rows`)
  } finally {
    await page.close()
  }
}

export async function gIcons(ctx) {
  const chk = makeCheck()
  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) return { pass: false, notes: 'app did not reach data-app=ready within 20s' }

    await page.eval(`(()=>{const el=document.querySelector('[data-zone="inventory"]')||document.getElementById('inventory');if(el)el.scrollIntoView({block:'start',behavior:'instant'})})()`)
    await sleep(300)

    const total = await page.eval(`(()=>{const imgs=[...document.querySelectorAll('[data-stack-item] img[data-icon]')];imgs.forEach(i=>{i.loading='eager'});return imgs.length})()`)
    chk.ok(total > 0, `found ${total} [data-stack-item] img[data-icon] elements`)

    await waitFor(
      () =>
        page.eval(`[...document.querySelectorAll('[data-stack-item] img[data-icon]')].every(i=>i.complete)`),
      { timeout: 8000, interval: 200 },
    )

    const info = await page.eval(
      browserExpr(`
      const imgs = [...document.querySelectorAll('[data-stack-item] img[data-icon]')]
      const bad = imgs.filter(i => !(i.complete && i.naturalWidth > 0)).map(__describe)
      const origin = location.origin
      const thirdParty = imgs.filter(i => { try { return new URL(i.currentSrc || i.src, location.href).origin !== origin } catch (e) { return true } }).map(i => i.currentSrc || i.src)
      // an item may carry more than one mark (e.g. "Next.js / React"); what matters is every item has one
      const items = [...document.querySelectorAll('[data-stack-item]')]
      const withIcon = items.filter(it => [...it.querySelectorAll('img[data-icon]')].some(i => i.complete && i.naturalWidth > 0)).length
      return { count: imgs.length, items: items.length, withIcon, bad, thirdParty }
    `),
    )
    chk.ok(info.bad.length === 0, `icons failing to load (complete && naturalWidth>0): ${info.bad.slice(0, 6).join(', ')}${info.bad.length > 6 ? ' ...' : ''}`)
    chk.ok(info.thirdParty.length === 0, `icons served from a third-party origin: ${info.thirdParty.slice(0, 6).join(', ')}`)
    if (ctx.content) chk.ok(info.withIcon === ctx.content.stackItemsCount, `stack items with a loaded icon ${info.withIcon} (want ${ctx.content.stackItemsCount})`)

    await shot(ctx, page, 'icons-inventory')
    return result(chk.reasons, `${info.withIcon}/${info.items} items iconed (${info.count} marks), ${info.bad.length} failed to load, ${info.thirdParty.length} third-party`)
  } finally {
    await page.close()
  }
}

const HUD_KEYS = ['clock-owner', 'clock-visitor', 'stopwatch', 'xy', 'xp', 'level', 'compass', 'terminal', 'sound', 'trophies']

export async function gHud(ctx) {
  const chk = makeCheck()
  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) return { pass: false, notes: 'app did not reach data-app=ready within 20s' }

    for (const k of HUD_KEYS) chk.ok(await isVisible(page, `[data-hud="${k}"]`), `[data-hud="${k}"] exists and is visible`)
    chk.ok(await isVisible(page, '[data-minimap]'), '[data-minimap] visible')
    // [data-scrolltop] is only promised visible "after the first zone" (CONTRACT.md) — at scrollY=0
    // it may legitimately be hidden, so only assert its presence in the DOM here; visibility is
    // asserted below, after scrolling past the hero.
    chk.ok((await page.eval(`!!document.querySelector('[data-scrolltop]')`)), '[data-scrolltop] present in the DOM')

    chk.ok(await pollForChange(page, '[data-hud="clock-owner"]', 2300), 'owner clock text changes within 2.2s')
    chk.ok(await pollForChange(page, '[data-hud="clock-visitor"]', 2300), 'visitor clock text changes within 2.2s')
    chk.ok(await pollForChange(page, '[data-hud="stopwatch"]', 2300), 'stopwatch text advances within 2.2s')

    await page.mouseMove(200, 220)
    await sleep(120)
    const xy1 = await textOf(page, '[data-hud="xy"]')
    await page.mouseMove(900, 640)
    await sleep(120)
    const xy2 = await textOf(page, '[data-hud="xy"]')
    chk.ok(xy1 !== xy2, `[data-hud="xy"] changes as the pointer moves (${JSON.stringify(xy1)} -> ${JSON.stringify(xy2)})`)

    const xpText = await textOf(page, '[data-hud="xp"]')
    chk.ok(/\d+\s*XP/.test(xpText || ''), `[data-hud="xp"] matches /\\d+ XP/ (got ${JSON.stringify(xpText)})`)
    const levelText = await textOf(page, '[data-hud="level"]')
    chk.ok(/LV\s*\d+/.test(levelText || ''), `[data-hud="level"] matches /LV \\d+/ (got ${JSON.stringify(levelText)})`)

    await page.click('[data-hud="compass"]')
    chk.ok(await waitFor(() => isVisible(page, '[data-levelmap]'), { timeout: 3000 }), 'clicking compass opens [data-levelmap]')
    await shot(ctx, page, 'hud-levelmap')
    await page.key('Escape')
    chk.ok(await waitFor(async () => !(await isVisible(page, '[data-levelmap]')), { timeout: 3000 }), 'Escape closes [data-levelmap]')

    await page.eval(`window.scrollTo(0, document.documentElement.scrollHeight/2)`)
    await sleep(400)
    chk.ok(await isVisible(page, '[data-scrolltop]'), '[data-scrolltop] visible after scrolling halfway')
    await page.click('[data-scrolltop]')
    chk.ok(await waitFor(async () => (await page.eval('window.scrollY')) < 40, { timeout: 3000 }), 'clicking [data-scrolltop] returns scrollY near 0')

    return result(chk.reasons, 'hud hooks visible; clocks/stopwatch tick; xy follows pointer; compass + scrolltop work')
  } finally {
    await page.close()
  }
}

export async function gRouting(ctx) {
  const chk = makeCheck()
  const zoneIds = ctx.content ? ctx.content.zoneIds : ZONE_IDS_EXPECTED

  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) chk.fail('app did not reach data-app=ready within 20s')
    else {
      for (const zone of zoneIds) {
        await page.eval(`document.getElementById(${JSON.stringify(zone)})?.scrollIntoView({block:'start',behavior:'instant'})`)
        await sleep(450)
        const hash = await page.eval('location.hash')
        const okHash = zone === 'top' ? hash === '' || hash === '#top' : hash === '#' + zone
        chk.ok(okHash, `zone "${zone}" in view -> location.hash ${JSON.stringify(hash)}`)
      }
    }
  } finally {
    await page.close()
  }

  const { page: page2, ready: ready2 } = await openReady(ctx, {}, '/index.html?noboot#inventory')
  try {
    if (!ready2) {
      chk.fail('fresh #inventory deep link did not reach data-app=ready within 20s')
    } else {
      const top = await page2.eval(`document.getElementById('inventory')?.getBoundingClientRect().top`)
      chk.ok(typeof top === 'number' && top > -150 && top < 500, `#inventory zone framed near the viewport top on load (top=${top})`)

      const minimap = await page2.eval(`(()=>{
        const links = [...document.querySelectorAll('[data-minimap] a')]
        return { hrefs: links.map(a=>a.getAttribute('href')), current: links.filter(a=>a.getAttribute('aria-current')==='true').map(a=>a.getAttribute('href')) }
      })()`)
      for (const zone of zoneIds) chk.ok((minimap.hrefs || []).includes('#' + zone), `[data-minimap] has a link for #${zone}`)
      chk.ok(
        minimap.current && minimap.current.length === 1 && minimap.current[0] === '#inventory',
        `minimap marks #inventory as aria-current (got ${JSON.stringify(minimap.current)})`,
      )
      await shot(ctx, page2, 'routing-inventory-deeplink')
    }
  } finally {
    await page2.close()
  }

  return result(chk.reasons, `routed through ${zoneIds.length} zones; #inventory deep-link framed; minimap wired`)
}

export async function gTerminal(ctx) {
  const chk = makeCheck()
  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) return { pass: false, notes: 'app did not reach data-app=ready within 20s' }

    await page.eval(`document.querySelector('[data-hud="sound"]')?.focus()`)
    const activeDesc = () => page.eval(`(()=>{const e=document.activeElement;return e&&e.getAttribute?(e.getAttribute('data-hud')||e.id||e.tagName):null})()`)
    const beforeFocus = await activeDesc()

    await page.key('Backquote')
    chk.ok(await waitFor(() => isVisible(page, '[data-terminal]'), { timeout: 3000 }), 'Backquote opens [data-terminal]')
    chk.ok(
      await waitFor(async () => (await page.eval(`document.activeElement && document.activeElement.id`)) === 'term-input', { timeout: 2000 }),
      '#term-input is focused when the terminal opens',
    )
    await shot(ctx, page, 'terminal-open')

    async function runCmd(cmd) {
      await page.eval(`document.getElementById('term-input')?.focus()`)
      await page.type('#term-input', '')
      await page.insertText(cmd)
      await page.key('Enter')
      await sleep(250)
    }
    const out = () => textOf(page, '[data-term-out]').then(t => t || '')

    await runCmd('help')
    let o = await out()
    const rootBefore = await page.eval(`window.__ezb.achievements().includes('root')`)
    chk.ok(/whoami/i.test(o), '`help` output mentions "whoami"')

    await runCmd('whoami')
    o = await out()
    chk.ok(/Eli Zamar Bashan/i.test(o), '`whoami` output contains "Eli Zamar Bashan"')

    const beforeLs = o.length
    await runCmd('ls')
    o = await out()
    chk.ok(o.length > beforeLs, '`ls` lists something (output grew)')

    const beforeCat = o.length
    await runCmd('cat about')
    let catOut = await out()
    if (catOut.length <= beforeCat || /not found|unknown|no such/i.test(catOut.slice(beforeCat))) {
      const skip = new Set(['help', 'whoami', 'cases', 'quests', 'inventory', 'games', 'play', 'contact', 'clear', 'exit'])
      const token = (o.match(/[a-z][a-z0-9_./-]{2,}/gi) || []).find(t => !skip.has(t.toLowerCase()))
      if (token) {
        await runCmd(`cat ${token}`)
        catOut = await out()
      }
    }
    chk.ok(/forensic|incident response/i.test(catOut), '`cat` prints bio text (mentions forensics/incident response)')

    await runCmd('play runner')
    chk.ok(await waitFor(() => isVisible(page, '[data-game-overlay]'), { timeout: 4000 }), '`play runner` opens [data-game-overlay]')
    // the game must paint on top of the terminal, not open invisibly underneath it
    const onTop = await page.eval(`(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return !!e && !!e.closest('[data-game-overlay]') })()`)
    chk.ok(onTop, 'the game opened from the terminal is the topmost layer (elementFromPoint at the centre)')
    await page.key('Escape')
    chk.ok(
      await waitFor(async () => !(await isVisible(page, '[data-game-overlay]')) && (await isVisible(page, '[data-terminal]')), { timeout: 3000 }),
      'Escape from the game returns to the terminal',
    )

    const beforeSudo = (await out()).length
    await runCmd('sudo hire-me')
    chk.ok((await out()).length > beforeSudo, '`sudo hire-me` answers with new output')
    const rootAfter = await page.eval(`window.__ezb.achievements().includes('root')`)
    chk.ok(rootAfter, `sudo unlocks the root achievement (before=${rootBefore}, after=${rootAfter})`)

    await page.key('Escape')
    chk.ok(await waitFor(async () => !(await isVisible(page, '[data-terminal]')), { timeout: 3000 }), 'Escape closes the terminal')
    const afterFocus = await activeDesc()
    chk.ok(afterFocus === beforeFocus, `focus restored to ${JSON.stringify(beforeFocus)} (got ${JSON.stringify(afterFocus)})`)

    await page.click('[data-hud="terminal"]')
    chk.ok(await waitFor(() => isVisible(page, '[data-terminal]'), { timeout: 3000 }), '[data-hud="terminal"] button opens the terminal')
    await page.key('Escape')

    return result(chk.reasons, 'terminal opens/closes; help/whoami/ls/cat/play/sudo respond; focus restored')
  } finally {
    await page.close()
  }
}

async function playKeyboard(page, id, chk, timeout) {
  const exists = await page.eval(`!!document.querySelector('[data-game-launch][data-game-id="${id}"]')`)
  if (!exists) return chk.fail(`${id} kbd: no [data-game-launch][data-game-id="${id}"] found`)
  await page.eval(`document.querySelector('[data-game-launch][data-game-id="${id}"]')?.focus()`)
  await page.key('Enter')
  chk.ok(await waitFor(() => isVisible(page, '[data-game-overlay]'), { timeout: 4000 }), `${id} kbd: Enter on the launcher opens [data-game-overlay]`)
  chk.ok(await waitFor(async () => (await gameState(page)) === 'ready', { timeout: 5000 }), `${id} kbd: root reaches data-state=ready`)
  await page.key('Space')
  await sleep(150)
  if ((await gameState(page)) === 'ready') {
    await page.key('Enter')
    await sleep(150)
  }
  chk.ok(
    (await gameState(page)) === 'playing' || (await waitFor(async () => (await gameState(page)) === 'playing', { timeout: 3000 })),
    `${id} kbd: Space/Enter reaches data-state=playing`,
  )
  if (id === 'phish') {
    let over = false
    for (let i = 0; i < 40 && !over; i++) {
      await page.key(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight')
      await sleep(150)
      over = (await gameState(page)) === 'over'
    }
    chk.ok(over, `${id} kbd: alternating ArrowLeft/ArrowRight reaches data-state=over`)
  } else {
    chk.ok(!!(await waitFor(async () => (await gameState(page)) === 'over', { timeout })), `${id} kbd: reaches data-state=over (fast mode)`)
  }
  await page.key('Escape')
  chk.ok(await waitFor(async () => !(await isVisible(page, '[data-game-overlay]')), { timeout: 3000 }), `${id} kbd: Escape closes the overlay`)
  chk.ok(
    await page.eval(`document.activeElement === document.querySelector('[data-game-launch][data-game-id="${id}"]')`),
    `${id} kbd: focus returns to the launcher`,
  )
}

async function playPointer(page, id, chk, timeout) {
  const exists = await page.eval(`!!document.querySelector('[data-game-launch][data-game-id="${id}"]')`)
  if (!exists) return chk.fail(`${id} ptr: no [data-game-launch][data-game-id="${id}"] found`)
  await page.click(`[data-game-launch][data-game-id="${id}"]`)
  chk.ok(await waitFor(() => isVisible(page, '[data-game-overlay]'), { timeout: 4000 }), `${id} ptr: clicking the launcher opens [data-game-overlay]`)
  chk.ok(await waitFor(async () => (await gameState(page)) === 'ready', { timeout: 5000 }), `${id} ptr: root reaches data-state=ready`)

  const startBtn = await firstVisibleButtonRect(page, '[data-game-root]')
  chk.ok(!!startBtn, `${id} ptr: a visible button exists inside [data-game-root] to start`)
  if (startBtn) await page.clickPoint(startBtn.x, startBtn.y)
  chk.ok(!!(await waitFor(async () => (await gameState(page)) === 'playing', { timeout: 4000 })), `${id} ptr: clicking start reaches data-state=playing`)

  if (id === 'phish') {
    let over = false
    for (let i = 0; i < 40 && !over; i++) {
      const rects = await visibleButtonRects(page, '[data-game-root]', 4)
      if (rects.length) await page.clickPoint(rects[i % rects.length].x, rects[i % rects.length].y)
      await sleep(200)
      over = (await gameState(page)) === 'over'
    }
    chk.ok(over, `${id} ptr: clicking answer buttons reaches data-state=over`)
  } else {
    chk.ok(!!(await waitFor(async () => (await gameState(page)) === 'over', { timeout })), `${id} ptr: reaches data-state=over (fast mode)`)
  }

  chk.ok(await isVisible(page, '[data-game-close]'), `${id} ptr: [data-game-close] is visible`)
  await page.click('[data-game-close]')
  chk.ok(await waitFor(async () => !(await isVisible(page, '[data-game-overlay]')), { timeout: 3000 }), `${id} ptr: [data-game-close] closes the overlay`)
}

export async function gGames(ctx) {
  const chk = makeCheck()
  const ids = ctx.content ? ctx.content.gameIds : GAME_IDS
  for (const id of ids) {
    const { page, ready } = await openReady(ctx)
    try {
      if (!ready) chk.fail(`${id}: (keyboard) app did not reach data-app=ready within 20s`)
      else {
        await playKeyboard(page, id, chk, 20000)
        await shot(ctx, page, `game-${id}-kbd`)
      }
    } catch (e) {
      chk.fail(`${id} kbd: threw ${e.message}`)
    } finally {
      await page.close()
    }

    const { page: page2, ready: ready2 } = await openReady(ctx)
    try {
      if (!ready2) chk.fail(`${id}: (pointer) app did not reach data-app=ready within 20s`)
      else {
        await playPointer(page2, id, chk, 20000)
        await shot(ctx, page2, `game-${id}-ptr`)
      }
    } catch (e) {
      chk.fail(`${id} ptr: threw ${e.message}`)
    } finally {
      await page2.close()
    }
  }
  return result(chk.reasons, `${ids.length} games x keyboard-only + pointer-only`)
}

export async function gXp(ctx) {
  const chk = makeCheck()
  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) return { pass: false, notes: 'app did not reach data-app=ready within 20s' }

    const hasEzb = await page.eval(`typeof window.__ezb === 'object' && window.__ezb && typeof window.__ezb.xp === 'function'`)
    chk.ok(hasEzb, 'window.__ezb.xp() exists')
    if (!hasEzb) return result(chk.reasons)

    const before = await page.eval('window.__ezb.xp()')
    const id = ctx.content ? ctx.content.gameIds[0] : GAME_IDS[0]
    const exists = await page.eval(`!!document.querySelector('[data-game-launch][data-game-id="${id}"]')`)
    if (!exists) return { pass: false, notes: `no [data-game-launch][data-game-id="${id}"] to finish a run with` }

    await page.eval(`document.querySelector('[data-game-launch][data-game-id="${id}"]')?.focus()`)
    await page.key('Enter')
    await waitFor(async () => (await gameState(page)) === 'ready', { timeout: 5000 })
    await page.key('Space')
    await sleep(150)
    if ((await gameState(page)) === 'ready') {
      await page.key('Enter')
      await sleep(150)
    }
    if (id === 'phish') {
      let over = false
      for (let i = 0; i < 40 && !over; i++) {
        await page.key(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight')
        await sleep(150)
        over = (await gameState(page)) === 'over'
      }
    } else {
      await waitFor(async () => (await gameState(page)) === 'over', { timeout: 20000 })
    }
    await sleep(400)

    const after = await page.eval('window.__ezb.xp()')
    chk.ok(after > before, `xp() increased after a run (${before} -> ${after})`)
    const reward = await page.eval(`Number(document.querySelector('[data-game-root]')?.dataset.lastReward || 0)`)
    chk.ok(reward > 0, `the game paid its own run reward via host.awardXP (data-last-reward=${reward})`)

    const hudXp = await textOf(page, '[data-hud="xp"]')
    const hudNum = parseInt((hudXp || '').match(/\d+/)?.[0] ?? '-1', 10)
    chk.ok(hudNum === after, `[data-hud="xp"] shows the new value (${JSON.stringify(hudXp)} vs xp()=${after})`)

    const toastCount = await countOf(page, '[data-toasts] [data-toast]')
    chk.ok(toastCount >= 1, `a [data-toast] appeared (count ${toastCount})`)
    await shot(ctx, page, 'xp-toast')

    await page.key('Escape')
    await page.goto(ctx.url + FAST_NOBOOT)
    const ready2 = await waitReady(page)
    chk.ok(ready2, 'page reloads and reaches data-app=ready again')
    const persisted = ready2 ? await page.eval('window.__ezb.xp()') : null
    chk.ok(persisted === after, `xp() persists across reload (${persisted} === ${after})`)

    return result(chk.reasons, `xp ${before} -> ${after}; toast shown; persisted after reload`)
  } finally {
    await page.close()
  }
}

const STORAGE_THROW_INIT = `(() => {
  const thrower = { get() { throw new Error('storage disabled for verify') }, configurable: true }
  try { Object.defineProperty(window, 'localStorage', thrower) } catch (e) {}
  try { Object.defineProperty(window, 'sessionStorage', thrower) } catch (e) {}
})()`

export async function gStorageOff(ctx) {
  const chk = makeCheck()
  const page = await ctx.newPage({ initScripts: [STORAGE_THROW_INIT] })
  try {
    await page.goto(ctx.url + FAST_NOBOOT)
    const ready = await waitReady(page)
    chk.ok(ready, 'app reaches data-app=ready within 20s with storage throwing')
    if (!ready) return result(chk.reasons)

    chk.ok(
      await page.eval(`(()=>{try{window.localStorage.getItem('x');return false}catch(e){return true}})()`),
      'localStorage genuinely throws in this page (sanity check on the init script)',
    )

    await page.key('Backquote')
    const opened = await waitFor(() => isVisible(page, '[data-terminal]'), { timeout: 3000 })
    chk.ok(opened, 'terminal still opens with storage disabled')
    if (opened) {
      await page.eval(`document.getElementById('term-input')?.focus()`)
      await page.type('#term-input', '')
      await page.insertText('help')
      await page.key('Enter')
      await sleep(250)
      const o = await textOf(page, '[data-term-out]')
      chk.ok(!!o && o.length > 0, '`help` still produces output with storage disabled')
      await page.key('Escape')
    }

    const id = ctx.content ? ctx.content.gameIds[0] : GAME_IDS[0]
    const launcherExists = await page.eval(`!!document.querySelector('[data-game-launch][data-game-id="${id}"]')`)
    chk.ok(launcherExists, `game launcher "${id}" present with storage disabled`)
    if (launcherExists) {
      await page.eval(`document.querySelector('[data-game-launch][data-game-id="${id}"]')?.focus()`)
      await page.key('Enter')
      chk.ok(await waitFor(async () => (await gameState(page)) === 'ready', { timeout: 5000 }), 'game reaches data-state=ready with storage disabled')
      await page.key('Space')
      chk.ok(await waitFor(async () => (await gameState(page)) === 'playing', { timeout: 3000 }), 'game reaches data-state=playing with storage disabled')
      await page.key('Escape')
    }

    await shot(ctx, page, 'storage-off')
    chk.ok(page.errors.length === 0, `zero page errors with storage disabled (got ${page.errors.length}: ${page.errors.slice(0, 3).join(' | ')})`)

    return result(chk.reasons, 'ready, terminal and a game work with storage throwing; zero page errors')
  } finally {
    await page.close()
  }
}

export async function gReducedMotion(ctx) {
  const chk = makeCheck()
  const page = await ctx.newPage({ reducedMotion: true })
  try {
    await page.goto(ctx.url + FAST_NOBOOT)
    const ready = await waitReady(page)
    chk.ok(ready, 'app reaches data-app=ready with prefers-reduced-motion: reduce')
    if (!ready) return result(chk.reasons)

    const motionAttr = await page.eval(`document.documentElement.getAttribute('data-motion')`)
    chk.ok(motionAttr === 'reduced', `html[data-motion] is "reduced" (got ${JSON.stringify(motionAttr)})`)

    const findStarfieldExpr = `[...document.querySelectorAll('canvas')].find(c => {
      const cs = getComputedStyle(c); const r = c.getBoundingClientRect()
      return cs.position === 'fixed' && r.width >= innerWidth * 0.7 && r.height >= innerHeight * 0.7
    })`
    const canvasInfo = await page.eval(`(()=>{const canvases=[...document.querySelectorAll('canvas')];const c=${findStarfieldExpr};return {total:canvases.length, found:!!c}})()`)
    chk.ok(canvasInfo.found, `found a fixed, viewport-covering <canvas> (starfield) among ${canvasInfo.total} canvases`)

    if (canvasInfo.found) {
      const shotExpr = `(()=>{const c=${findStarfieldExpr};try{return c.toDataURL()}catch(e){return 'ERR:'+e.message}})()`
      const a = await page.eval(shotExpr)
      await sleep(600)
      const b2 = await page.eval(shotExpr)
      chk.ok(a === b2 && !String(a).startsWith('ERR:'), 'starfield canvas pixels are frozen 600ms apart')
      await shot(ctx, page, 'reduced-motion')
    }

    const running = await page.eval(
      browserExpr(`
      const offenders = []
      for (const a of document.getAnimations()) {
        if (a.playState !== 'running') continue
        let dur = 0
        try { dur = a.effect.getComputedTiming().duration } catch (e) {}
        if (dur === 0) continue
        const t = a.effect && a.effect.target
        if (t && t.closest('[data-motion-ok]')) continue
        offenders.push(t ? __describe(t) : 'unknown')
      }
      return offenders
    `),
    )
    chk.ok(running.length === 0, `no running non-zero-duration animation outside [data-motion-ok]: ${running.slice(0, 6).join(', ')}`)

    return result(chk.reasons, `data-motion=reduced; starfield frozen; ${running.length} stray animations`)
  } finally {
    await page.close()
  }
}

const VIEWPORTS = [
  { width: 375, height: 812, mobile: true },
  { width: 768, height: 1024, mobile: false },
  { width: 1440, height: 900, mobile: false },
]

export async function gLayout(ctx) {
  const chk = makeCheck()
  const zoneIds = ctx.content ? ctx.content.zoneIds : ZONE_IDS_EXPECTED

  for (const vp of VIEWPORTS) {
    const { page, ready } = await openReady(ctx, vp)
    const tag = `${vp.width}x${vp.height}`
    try {
      if (!ready) {
        chk.fail(`${tag}: app did not reach data-app=ready within 20s`)
        continue
      }
      const sw = await page.eval(`document.scrollingElement.scrollWidth`)
      chk.ok(sw <= vp.width + 1, `${tag}: scrollWidth ${sw} <= innerWidth+1 (${vp.width + 1})`)

      const overflowing = await page.eval(
        browserExpr(`
        const vw = innerWidth
        const offenders = []
        for (const e of document.querySelectorAll('body *')) {
          const r = e.getBoundingClientRect()
          if (r.width <= 0 || r.right <= vw + 1) continue
          const cs = getComputedStyle(e)
          if (cs.position === 'fixed') continue
          let skip = false
          for (let p = e.parentElement; p; p = p.parentElement) {
            const pcs = getComputedStyle(p)
            if (['auto', 'hidden', 'clip', 'scroll'].includes(pcs.overflowX) || pcs.position === 'fixed') { skip = true; break }
          }
          if (skip) continue
          offenders.push(__describe(e) + '@right=' + Math.round(r.right))
          if (offenders.length >= 8) break
        }
        return offenders
      `),
      )
      chk.ok(overflowing.length === 0, `${tag}: elements extending beyond the viewport: ${overflowing.join(', ')}`)

      const zones = zoneIds.length ? zoneIds : await page.eval(`[...document.querySelectorAll('section.zone[data-zone]')].map(e=>e.id)`)
      for (const zone of zones) {
        await page.eval(`document.getElementById(${JSON.stringify(zone)})?.scrollIntoView({block:'start',behavior:'instant'})`)
        await sleep(450)
        const overlaps = await page.eval(
          browserExpr(`
          const zoneEl = document.getElementById(${JSON.stringify(zone)})
          if (!zoneEl) return []
          const leaves = []
          for (const e of zoneEl.querySelectorAll('*')) {
            if (leaves.length >= 200) break
            if (e.closest('canvas')) continue
            if (e.closest('[aria-hidden="true"]')) continue
            if (e.closest('[data-dup]')) continue
            const cs = getComputedStyle(e)
            if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue
            if (!__isVisible(e)) continue
            let hasOwnText = false
            for (const n of e.childNodes) { if (n.nodeType === 3 && n.textContent.trim().length > 0) { hasOwnText = true; break } }
            if (!hasOwnText) continue
            // getClientRects() (not getBoundingClientRect()) — a wrapping inline element (a long
            // stack-item label at 375px, say) returns one rect per line fragment; the bounding
            // box of a multi-line inline union-spans both lines and falsely "overlaps" a sibling
            // that only shares the first line.
            const rects = [...e.getClientRects()].filter(r => r.width > 0 && r.height > 0)
            if (!rects.length) continue
            leaves.push({ e, rects })
          }
          const offenders = []
          for (let i = 0; i < leaves.length; i++) {
            for (let j = i + 1; j < leaves.length; j++) {
              const a = leaves[i], b = leaves[j]
              if (a.e.contains(b.e) || b.e.contains(a.e)) continue
              let overlap = false
              for (const ra of a.rects) {
                for (const rb of b.rects) {
                  const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
                  const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
                  if (ox > 2 && oy > 2) { overlap = true; break }
                }
                if (overlap) break
              }
              if (overlap) offenders.push(__describe(a.e) + ' x ' + __describe(b.e))
              if (offenders.length >= 5) return offenders
            }
          }
          return offenders
        `),
        )
        chk.ok(overlaps.length === 0, `${tag} #${zone}: overlapping text: ${overlaps.join(' | ')}`)
      }
      await shot(ctx, page, `layout-${tag}`)
    } finally {
      await page.close()
    }
  }
  return result(chk.reasons, `checked ${VIEWPORTS.length} viewports x ${zoneIds.length || '?'} zones for overflow/overlap`)
}

export async function gBoot(ctx) {
  const chk = makeCheck()
  const page = await ctx.newPage()
  try {
    await page.goto(ctx.url + '/index.html?boot')
    const present = await waitFor(() => page.eval(`!!document.querySelector('[data-boot]')`), { timeout: 5000 })
    chk.ok(present, '[data-boot] present on a ?boot load')
    await shot(ctx, page, 'boot-shown')

    await page.key('Backquote') // the terminal hotkey must only skip boot, never also open the terminal
    await sleep(300)
    chk.ok(!(await isVisible(page, '[data-terminal]')), 'backquote on the boot screen skips boot without opening the terminal')
    const t0 = Date.now()
    await page.key('Enter')
    const gone = await waitFor(
      async () => !(await page.eval(`!!document.querySelector('[data-boot]')`)) && (await page.eval(`document.documentElement.getAttribute('data-app')==='ready'`)),
      { timeout: 3000, interval: 100 },
    )
    const elapsed = Date.now() - t0
    chk.ok(gone && elapsed <= 1750, `[data-boot] gone and html[data-app=ready] ${elapsed}ms after a keypress (want <=1500ms, +250ms polling slack)`)

    return result(chk.reasons, 'boot overlay shows on ?boot and a keypress skips it')
  } finally {
    await page.close()
  }
}

export async function gEndscreen(ctx) {
  const chk = makeCheck()
  const page = await ctx.newPage()
  try {
    await page.goto(ctx.url + FAST_NOBOOT)
    let ready = await waitReady(page)
    chk.ok(ready, 'app reaches data-app=ready')
    if (!ready) return result(chk.reasons)

    await page.eval(`window.scrollTo(0, document.documentElement.scrollHeight)`)
    const shown = await waitFor(() => isVisible(page, '[data-endscreen]'), { timeout: 6000 })
    chk.ok(shown, '[data-endscreen] visible after scrolling to the very bottom')
    if (shown) {
      await shot(ctx, page, 'endscreen-shown')
      const hasCountdown = await page.eval(
        `(()=>{const e=document.querySelector('[data-countdown]');if(!e)return false;return e.tagName.toLowerCase()==='svg'||!!e.querySelector('svg')})()`,
      )
      chk.ok(hasCountdown, '[data-countdown] svg present')
      await page.key('Escape')
      chk.ok(await waitFor(async () => !(await isVisible(page, '[data-endscreen]')), { timeout: 3000 }), 'Escape closes the endscreen')
    }

    await page.goto(ctx.url + FAST_NOBOOT)
    ready = await waitReady(page)
    chk.ok(ready, 'reload (same session) reaches data-app=ready again')
    if (ready) {
      await page.eval(`window.scrollTo(0, document.documentElement.scrollHeight)`)
      await sleep(1500)
      chk.ok(!(await isVisible(page, '[data-endscreen]')), 'endscreen does not show again in the same session after reload')
    }

    return result(chk.reasons, 'endscreen shows once at the bottom, closes on Escape, is session-gated')
  } finally {
    await page.close()
  }
}

export async function gMascot(ctx) {
  const chk = makeCheck()
  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) return { pass: false, notes: 'app did not reach data-app=ready within 20s' }
    const info = await page.eval(`(()=>{
      const els = [...document.querySelectorAll('[data-mascot]')]
      const boxed = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
      const inHero = boxed.filter(e => { const r = e.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight })
      return { total: els.length, boxed: boxed.length, inHero: inHero.length }
    })()`)
    chk.ok(info.total >= 2, `[data-mascot] count ${info.total} (want >=2)`)
    chk.ok(info.boxed === info.total, `all [data-mascot] elements have a non-zero box (${info.boxed}/${info.total})`)
    chk.ok(info.inHero >= 1, `at least one [data-mascot] visible in the initial (hero) viewport (got ${info.inHero})`)
    await shot(ctx, page, 'mascot-hero')
    return result(chk.reasons, `${info.total} mascots, ${info.inHero} visible in hero`)
  } finally {
    await page.close()
  }
}

export async function gA11y(ctx) {
  const chk = makeCheck()
  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) return { pass: false, notes: 'app did not reach data-app=ready within 20s' }

    const h1Count = await countOf(page, 'h1')
    chk.ok(h1Count === 1, `exactly one <h1> (got ${h1Count})`)

    const imgsNoAlt = await page.eval(`[...document.images].filter(i=>!i.hasAttribute('alt')).map(i=>i.getAttribute('src')||i.currentSrc||'?').slice(0,6)`)
    chk.ok(imgsNoAlt.length === 0, `every <img> has an alt attribute (missing on: ${imgsNoAlt.join(', ')})`)

    const NAME_FN = `function __name(e){
      const al=e.getAttribute('aria-label'); if (al && al.trim()) return al.trim()
      const lb=e.getAttribute('aria-labelledby')
      if (lb) { const t=lb.split(/\\s+/).map(id=>{const r=document.getElementById(id);return r?r.textContent.trim():''}).join(' ').trim(); if (t) return t }
      const t=e.textContent.trim(); if (t) return t
      return ''
    }`
    const btnsNoName = await page.eval(browserExpr(`${NAME_FN}\nreturn [...document.querySelectorAll('button')].filter(b=>!__name(b)).map(__describe).slice(0,6)`))
    chk.ok(btnsNoName.length === 0, `every <button> has an accessible name (missing on: ${btnsNoName.join(', ')})`)

    const dialogIssues = await page.eval(
      browserExpr(`${NAME_FN}
      const bad = []
      for (const d of document.querySelectorAll('[role=dialog]')) {
        if (d.getAttribute('aria-modal') !== 'true') bad.push(__describe(d) + ':no-aria-modal')
        if (!__name(d)) bad.push(__describe(d) + ':no-name')
      }
      return bad.slice(0, 8)`),
    )
    chk.ok(dialogIssues.length === 0, `every [role=dialog] has aria-modal=true and a name (issues: ${dialogIssues.join(', ')})`)

    const baseline = await page.eval(
      browserExpr(`
      const els = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(e => {
        if (e.hasAttribute('disabled')) return false
        if (e.tabIndex < 0) return false
        return __isVisible(e)
      })
      els.forEach((e, i) => e.setAttribute('data-focus-test-idx', String(i)))
      return els.slice(0, 25).map((e, i) => {
        const cs = getComputedStyle(e)
        return { idx: i, sel: __describe(e), outline: cs.outlineStyle + cs.outlineWidth + cs.outlineColor, shadow: cs.boxShadow }
      })
    `),
    )
    chk.ok(baseline.length > 0, `found ${baseline.length} focusable elements to Tab through`)

    const seen = new Set()
    const indicatorOk = new Map()
    for (let i = 0; i < baseline.length + 15 && seen.size < baseline.length; i++) {
      await page.key('Tab')
      await sleep(40)
      const cur = await page.eval(`(()=>{
        const e = document.activeElement
        if (!e || !e.hasAttribute('data-focus-test-idx')) return null
        const cs = getComputedStyle(e)
        return { idx: Number(e.getAttribute('data-focus-test-idx')), outline: cs.outlineStyle+cs.outlineWidth+cs.outlineColor, shadow: cs.boxShadow }
      })()`)
      if (!cur) continue
      seen.add(cur.idx)
      const base = baseline[cur.idx]
      indicatorOk.set(cur.idx, !!base && (cur.outline !== base.outline || cur.shadow !== base.shadow))
    }
    const missingIndicator = baseline.filter(b => indicatorOk.get(b.idx) !== true).map(b => b.sel)
    chk.ok(seen.size >= baseline.length, `Tab reached all ${baseline.length} sampled elements (reached ${seen.size})`)
    chk.ok(missingIndicator.length === 0, `every tabbed element shows a visible focus indicator (no change on: ${missingIndicator.slice(0, 6).join(', ')})`)

    return result(chk.reasons, `h1=1; imgs alt ok; buttons named; dialogs modal+named; ${baseline.length} focus stops checked`)
  } finally {
    await page.close()
  }
}

export async function gConsole(ctx) {
  const seen = new Set()
  const hard = []
  const ignored = []
  for (const p of ctx._allPages) {
    for (const e of p.errors) {
      const isFontIssue = FONT_HOST_RE.test(e) && /^(HTTP\d|NETFAIL)/.test(e)
      if (isFontIssue && ctx.offline) {
        if (!seen.has('IGNORED:' + e)) {
          seen.add('IGNORED:' + e)
          ignored.push(e)
        }
        continue
      }
      if (!seen.has(e)) {
        seen.add(e)
        hard.push(e)
      }
    }
  }
  if (hard.length === 0) {
    return {
      pass: true,
      notes: `0 errors across ${ctx._allPages.length} page loads${ignored.length ? `, ${ignored.length} ignored font failures (offline)` : ''}`,
    }
  }
  return { pass: false, notes: hard.join(' | ') }
}

// ---------------------------------------------------------------------------
// play: the gamified layer a visitor can actually trigger (flag, cheat code, counters, copy,
// constellation discovery) plus one full game run at phone width with pointer input.
// ---------------------------------------------------------------------------

export async function gPlay(ctx) {
  const chk = makeCheck()
  const has = (page, id) => page.eval(`window.__ezb.achievements().includes(${JSON.stringify(id)})`)
  const { page, ready } = await openReady(ctx)
  try {
    if (!ready) return { pass: false, notes: 'app did not reach data-app=ready within 20s' }

    // terminal CTF: ls -a -> cat .secret -> rot13 -> submit
    await page.key('Backquote')
    await waitFor(() => isVisible(page, '[data-terminal]'), { timeout: 3000 })
    const run = async (cmd) => {
      await page.eval(`document.getElementById('term-input')?.focus()`)
      await page.insertText(cmd)
      await page.key('Enter')
      await sleep(200)
      return (await textOf(page, '[data-term-out]')) || ''
    }
    chk.ok((await run('ls -a')).includes('.secret'), '`ls -a` reveals .secret')
    const secret = (await run('cat .secret')).match(/RMO\{[a-z_]+\}/)?.[0]
    chk.ok(!!secret, 'cat .secret prints a rot13 flag')
    const flag = secret ? (await run(`rot13 ${secret}`)).match(/EZB\{[a-z_]+\}/g)?.pop() : null
    chk.ok(!!flag, 'rot13 decodes the flag')
    if (flag) await run(`submit ${flag}`)
    chk.ok(await has(page, 'flag'), 'submitting the decoded flag unlocks "flag"')
    await run('submit EZB{nope}')
    chk.ok(/Wrong flag/i.test((await textOf(page, '[data-term-out]')) || ''), 'a wrong flag is rejected')
    await page.key('Escape')
    await waitFor(async () => !(await isVisible(page, '[data-terminal]')), { timeout: 3000 })

    // cheat code
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']) await page.key(k)
    await sleep(200)
    chk.ok(await has(page, 'konami'), 'the classic cheat code unlocks "konami"')

    // counters: cartridges, dossiers, badges
    await page.eval(`document.querySelectorAll('.cart__insert').forEach(b => b.click())`)
    await sleep(150)
    chk.ok(await has(page, 'collector'), 'inserting all 5 cartridges unlocks "collector"')
    await page.eval(`document.querySelectorAll('[data-case]').forEach(d => d.click())`)
    await waitFor(() => has(page, 'decryptor'), { timeout: 4000 })
    chk.ok(await has(page, 'decryptor'), 'decrypting all 8 case files unlocks "decryptor"')
    await page.eval(`document.querySelectorAll('[data-cert]').forEach(b => b.click())`)
    await sleep(150)
    const seen = await countOf(page, '[data-cert][data-seen="true"]')
    chk.ok(seen === (ctx.content ? ctx.content.certsCount : 16), `every badge shows its inspected state (${seen})`)
    chk.ok(/16\/16/.test((await textOf(page, '[data-badge-count]')) || ''), 'the badge counter reads 16/16')
    chk.ok(await has(page, 'librarian'), 'inspecting all badges unlocks "librarian"')

    // contact copy button gives feedback and counts as reaching out
    await page.eval(`document.querySelector('[data-contact-row][data-kind="email"] [data-copy]')?.click()`)
    await sleep(300)
    chk.ok((await countOf(page, '[data-contact-row][data-kind="email"] .row__copy.is-copied')) === 1, 'the email copy button shows feedback')
    chk.ok(await has(page, 'hello-world'), 'copying a contact unlocks "hello-world"')

    // constellation: inspecting every star by keyboard focus
    await page.eval(`document.querySelectorAll('[data-metric]').forEach(li => { li.focus(); li.blur() })`)
    await sleep(300)
    chk.ok(await has(page, 'stargazer'), 'inspecting all 21 stars unlocks "stargazer"')
    await shot(ctx, page, 'play-desktop')
  } finally {
    await page.close()
  }

  // a full game at phone width, pointer only
  const { page: phone, ready: ready2 } = await openReady(ctx, { width: 375, height: 812, mobile: true })
  try {
    if (!ready2) chk.fail('phone: app did not reach data-app=ready within 20s')
    else {
      await phone.click('[data-game-launch][data-game-id="runner"]')
      chk.ok(await waitFor(async () => (await gameState(phone)) === 'ready', { timeout: 6000 }), 'phone: runner reaches ready')
      const start = await firstVisibleButtonRect(phone, '[data-game-root]')
      if (start) await phone.clickPoint(start.x, start.y)
      chk.ok(await waitFor(async () => (await gameState(phone)) === 'playing', { timeout: 4000 }), 'phone: a tap on START begins the run')
      chk.ok(await waitFor(async () => (await gameState(phone)) === 'over', { timeout: 20000 }), 'phone: the run reaches game over')
      const fits = await phone.eval(`(() => { const r = document.querySelector('[data-game-root]').getBoundingClientRect(); return r.width <= innerWidth && r.right <= innerWidth + 1 })()`)
      chk.ok(fits, 'phone: the game fits the viewport width')
      await shot(ctx, phone, 'play-phone-runner')
    }
  } finally {
    await phone.close()
  }
  return result(chk.reasons, 'flag, cheat code, cartridges, dossiers, badges, copy, constellation, phone runner')
}

export const GROUP_ORDER = [
  'serve', 'content', 'icons', 'hud', 'routing', 'terminal', 'games', 'xp',
  'storage-off', 'reduced-motion', 'layout', 'boot', 'endscreen', 'mascot', 'a11y', 'play',
]

export const ALL_GROUPS = {
  serve: gServe,
  content: gContent,
  icons: gIcons,
  hud: gHud,
  routing: gRouting,
  terminal: gTerminal,
  games: gGames,
  xp: gXp,
  'storage-off': gStorageOff,
  'reduced-motion': gReducedMotion,
  layout: gLayout,
  boot: gBoot,
  endscreen: gEndscreen,
  mascot: gMascot,
  a11y: gA11y,
  play: gPlay,
  console: gConsole,
}
