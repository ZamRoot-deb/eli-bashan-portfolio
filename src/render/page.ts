// Build-time renderer: turns src/content.ts into the page's static HTML.
// Runs in Node inside the Vite plugin (vite.config.ts), so it must not touch the DOM.
// Every hook documented in docs/CONTRACT.md is emitted here.

import {
  ABOUT,
  ARCADE,
  BUILDS,
  CASEWORK,
  CERTS,
  CONTACT,
  EXPERIENCE,
  FOOTER,
  IMPACT,
  METRICS,
  PLATFORMS,
  PROFILE,
  ROLES,
  STACK,
  STACK_GROUPS,
  WRITING,
  ZONES,
  type Hue,
  type Role,
} from '../content'
import { CERT_ICONS, GLYPHS, STACK_ICONS, type GlyphName } from '../icons'
import { each, esc, pad2, slug } from './html'

const BUILD_DATE = new Date()
const YEAR = BUILD_DATE.getFullYear()

const glyph = (name: GlyphName, cls = 'glyph'): string => `<span class="${cls}" aria-hidden="true">${GLYPHS[name]}</span>`
const hueVar = (h: Hue): string => `--c:var(--${h})`
const zoneIndex = (id: string): string => pad2(ZONES.findIndex((z) => z.id === id) + 1)

function prompt(cmd: string, typed = true): string {
  return `<p class="cmd" data-cmd><span class="cmd__user">${esc(PROFILE.handle)}@${esc(PROFILE.host)}</span><span class="cmd__sep">:~$</span> <span class="cmd__text"${typed ? ' data-type' : ''}>${esc(cmd)}</span><span class="cmd__caret" aria-hidden="true"></span></p>`
}

interface HeadOpts { id: string; eyebrow: string; cmd: string; title: string; sub?: string; hue?: Hue }

function zoneHead(o: HeadOpts): string {
  return `<header class="zhead" data-zone-head>
    <div class="zhead__eyebrow"><span class="zhead__label">${esc(o.eyebrow)}</span><span class="zhead__rule" aria-hidden="true"></span><span class="zhead__zone" aria-hidden="true">ZONE ${zoneIndex(o.id)}</span></div>
    ${prompt(o.cmd)}
    <h2 class="zhead__title" id="${o.id}-title" data-scramble>${esc(o.title)}</h2>
    ${o.sub ? `<p class="zhead__sub">${esc(o.sub)}</p>` : ''}
  </header>`
}

// ---------------------------------------------------------------- icons

function iconImgs(key: string, size = 40, cls = 'ico'): string {
  const def = STACK_ICONS[key]
  if (!def || !def.files.length) return ''
  return each(def.files, (f) => `<img class="${cls}" data-icon src="${esc(f)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" />`)
}

// Platform stack tags use shorter names than the inventory; map them to inventory keys (file index).
const TAG_ICON: Record<string, [string, number][]> = {
  'Next.js': [['Next.js / React', 0]],
  'Python/FastAPI': [['Python', 0], ['FastAPI', 0]],
  FastAPI: [['FastAPI', 0]],
  PostgreSQL: [['PostgreSQL', 0]],
  Celery: [['Celery', 0]],
  Redis: [['Redis', 0]],
  Ollama: [['Ollama local LLM deployment', 0]],
  'Claude API': [['Claude API', 0]],
  'Rust (Tauri)': [['Rust (Tauri)', 0], ['Rust (Tauri)', 1]],
  YARA: [['YARA rule authoring & engine integration', 0]],
  Docker: [['Docker', 0]],
}

function tagIcons(tag: string): string {
  const refs = TAG_ICON[tag] ?? []
  return each(refs, ([key, i]) => {
    const f = STACK_ICONS[key]?.files[i]
    return f ? `<img class="tag__ico" src="${esc(f)}" alt="" width="16" height="16" loading="lazy" decoding="async" />` : ''
  })
}

// ---------------------------------------------------------------- hero

function letters(word: string, offset: number): string {
  return each([...word], (ch, i) => `<span class="title__ch" style="--i:${offset + i}" aria-hidden="true">${esc(ch)}</span>`)
}

function playerCard(): string {
  return `<aside class="pcard" aria-label="Player card" data-tilt>
    <div class="pcard__top"><span>PLAYER CARD</span><span class="pcard__lv" title="Level ${PROFILE.level}: ${PROFILE.level} years in the field">LV.${pad2(PROFILE.level)} <i>${PROFILE.level} YRS</i></span></div>
    <div class="pcard__portrait">
      <img src="sprites/portrait.png" alt="Pixel line portrait of Eli Zamar Bashan, arms crossed" width="560" height="638" decoding="async" />
      <span class="pcard__scan" aria-hidden="true"></span>
    </div>
    <dl class="pcard__stats">
      <div><dt>NAME</dt><dd>${esc(PROFILE.name.toUpperCase())}</dd></div>
      <div><dt>CLASS</dt><dd><span class="t-term">DFIR LEAD</span> / <span class="t-amber">AI ENGINEER</span></dd></div>
      <div><dt>GUILD</dt><dd>${esc(PROFILE.org.toUpperCase())}</dd></div>
    </dl>
    <p class="pcard__barcap">SKILL METER <i>(self-rated)</i></p>
    <ul class="pcard__bars">
      ${each(PROFILE.statBars, (b) => `<li><span class="pcard__bar-label">${esc(b.label)}</span><span class="bar" style="--pct:${b.pct};${hueVar(b.hue)}" role="img" aria-label="${b.pct} percent"><i></i></span><span class="pcard__pct">${b.pct}%</span></li>`)}
    </ul>
    <p class="pcard__status"><span class="dot" aria-hidden="true"></span> STATUS: ${esc(PROFILE.status.toUpperCase())}</p>
    <span class="pcard__corner pcard__corner--tl" aria-hidden="true"></span><span class="pcard__corner pcard__corner--tr" aria-hidden="true"></span><span class="pcard__corner pcard__corner--bl" aria-hidden="true"></span><span class="pcard__corner pcard__corner--br" aria-hidden="true"></span>
  </aside>`
}

function hero(): string {
  const [l1, l2, l3] = PROFILE.nameLines
  return `<section class="zone zone--hero" id="top" data-zone="top" aria-labelledby="hero-title">
  <div class="hero">
    <div class="hero__main">
      <p class="cmd hero__prompt" data-cmd><span class="cmd__user">${esc(PROFILE.handle)}@${esc(PROFILE.host)}</span><span class="cmd__sep">:~$</span> <span class="cmd__text hero__tagline" data-type>${esc(PROFILE.tagline)}</span><span class="cmd__caret" aria-hidden="true"></span></p>
      <h1 class="title" id="hero-title" data-name aria-label="${esc(PROFILE.name)}">
        <span class="title__line">${letters(l1, 0)}</span>
        <span class="title__line">${letters(l2, l1.length)}</span>
        <span class="title__line title__line--gold">${letters(l3, l1.length + l2.length)}</span>
      </h1>
      <p class="hero__roles">${esc(PROFILE.roles[0])} <i>/</i> ${esc(PROFILE.roles[1])} <i>@</i> ${esc(PROFILE.org)} <i>/</i> ${esc(PROFILE.city)}</p>
      <div class="hero__cta">
        <a class="btn btn--term" href="mailto:${esc(PROFILE.email)}">${glyph('mail')}<span>Email</span></a>
        <a class="btn btn--term" href="${esc(PROFILE.phoneHref)}">${glyph('phone')}<span>Call</span></a>
        <a class="btn btn--gold" href="${esc(PROFILE.cvFile)}" download data-save-cv><img class="px btn__floppy" src="sprites/floppy.png" alt="" width="20" height="23" /><span>Save CV</span></a>
      </div>
      <p class="hero__mandate"><span class="dot" aria-hidden="true"></span> ${esc(PROFILE.mandate[0])} <b aria-hidden="true">//</b> <span class="hero__num" data-stat="sectors">13</span> critical sectors <b aria-hidden="true">//</b> <span class="hero__num" data-stat="banks">24</span> member banks</p>
    </div>
    ${playerCard()}
  </div>
  <div class="hero__foot">
    <div class="guide" data-mascot data-mascot-role="guide">
      <button class="guide__poke" type="button" aria-label="Say hello to Sanko"><canvas class="guide__sprite" width="96" height="96" aria-hidden="true"></canvas></button>
      <p class="guide__bubble" data-guide-bubble>I'm Sanko. I go back and fetch what the past left behind. Scroll to play, or press <kbd>\`</kbd> for the terminal.</p>
    </div>
    <a class="press-start" href="#about" data-press-start>${glyph('play')}<span>Press start</span></a>
    <div class="hero__meta"><p>${esc(PROFILE.degree)}</p><p>${esc(PROFILE.disciplines.join(' / '))}</p></div>
  </div>
</section>`
}

// ---------------------------------------------------------------- about

const SCOPE_GLYPH: Record<string, GlyphName> = { Mobile: 'phone', Computer: 'cpu', Memory: 'database', Network: 'route', Cloud: 'cloud', Email: 'mail' }

function about(): string {
  return `<section class="zone" id="about" data-zone="about" aria-labelledby="about-title">
  ${zoneHead({ id: 'about', eyebrow: ABOUT.eyebrow, cmd: ABOUT.cmd, title: ABOUT.title, sub: ABOUT.sub })}
  <div class="about">
    <div class="about__text">
      <blockquote class="pull"><p>${esc(ABOUT.quote)}</p></blockquote>
      ${each(ABOUT.paragraphs, (p) => `<p class="prose"><span class="prose__gt" aria-hidden="true">&gt;</span> ${esc(p)}</p>`)}
      <div class="scope">
        <p class="label">Scope of practice</p>
        <ul class="chips">${each(ABOUT.scope, (s) => `<li class="chip">${glyph(SCOPE_GLYPH[s] ?? 'fingerprint')}<span>${esc(s)} forensics</span></li>`)}</ul>
      </div>
    </div>
    <ol class="rules">
      ${each(ABOUT.principles, (r, i) => `<li class="rule" data-tilt style="--d:${i}">
        <p class="rule__code">${esc(r.code)}</p>
        <h3 class="rule__title">${esc(r.title)}</h3>
        <p class="rule__body">${esc(r.body)}</p>
      </li>`)}
    </ol>
  </div>
</section>`
}

// ---------------------------------------------------------------- builds

const PLATFORM_GLYPH: Record<string, GlyphName> = { eye: 'eye', shield: 'shield', graph: 'graph', check: 'checklist', helmet: 'helmet' }

function builds(): string {
  return `<section class="zone" id="builds" data-zone="builds" aria-labelledby="builds-title">
  ${zoneHead({ id: 'builds', eyebrow: BUILDS.eyebrow, cmd: BUILDS.cmd, title: BUILDS.title, sub: BUILDS.sub })}
  <div class="carts">
    ${each(PLATFORMS, (p) => `<article class="cart" data-platform data-id="${esc(p.id)}" style="${hueVar(p.hue)}">
      <div class="cart__shell" aria-hidden="true">
        <div class="cart__notch"></div>
        <div class="cart__label">
          <span class="cart__n">${esc(p.n)}</span>
          ${glyph(PLATFORM_GLYPH[p.glyph], 'cart__glyph')}
          <span class="cart__brand">${esc(p.name.toUpperCase())}</span>
          <span class="cart__stripes"><i></i><i></i><i></i></span>
        </div>
        <div class="cart__pins">${'<i></i>'.repeat(9)}</div>
      </div>
      <div class="cart__body">
        <p class="cart__tag">${esc(p.tag)}</p>
        <h3 class="cart__name" data-platform-name>${esc(p.name)}${p.formerly ? ` <span class="cart__formerly">formerly ${esc(p.formerly)}</span>` : ''}</h3>
        <p class="cart__text" data-platform-body>${esc(p.body)}</p>
        <ul class="tags" aria-label="Stack">${each(p.stack, (t) => `<li class="tag" data-stack-tag>${tagIcons(t)}<span>${esc(t)}</span></li>`)}</ul>
      </div>
    </article>`)}
  </div>
</section>`
}

// ---------------------------------------------------------------- cases

function cases(): string {
  return `<section class="zone" id="cases" data-zone="cases" aria-labelledby="cases-title">
  ${zoneHead({ id: 'cases', eyebrow: CASEWORK.eyebrow, cmd: CASEWORK.cmd, title: CASEWORK.title, sub: CASEWORK.sub })}
  <div class="dossiers">
    ${each(CASEWORK.types, (c, i) => `<article class="dossier" data-case style="--d:${i}">
      <p class="dossier__code"><span>CASE_${pad2(i + 1)}</span><span class="dossier__stamp">Sealed</span></p>
      <h3 class="dossier__title" data-decrypt>${esc(c.title)}</h3>
      <p class="dossier__sub">${esc(c.sub)}</p>
      <span class="dossier__redact" aria-hidden="true"><i></i><i></i></span>
    </article>`)}
  </div>
  <div class="casestats">
    ${each(CASEWORK.stats, (s) => `<div class="casestat" data-case-stat>
      <p class="casestat__v"><span data-count="${s.v}" data-pad="2">${pad2(s.v)}</span>${esc(s.suffix)}</p>
      <p class="casestat__l">${esc(s.label)}</p>
    </div>`)}
  </div>
</section>`
}

// ---------------------------------------------------------------- quests

const ym = (s: string): number => {
  const [y, m] = s.split('-').map(Number)
  return y * 12 + (m - 1)
}
const nowYM = BUILD_DATE.getFullYear() * 12 + BUILD_DATE.getMonth()

function duration(r: Role): string {
  const months = (r.to ? ym(r.to) : nowYM) - ym(r.from) + 1
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y ? `${y} yr` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ') || '1 mo'
}

function careerMap(): string {
  const start = Math.min(...ROLES.map((r) => ym(r.from)))
  const end = nowYM + 1
  const span = end - start
  // greedy lane packing so overlapping roles stack instead of colliding
  const lanes: number[] = []
  const placed = [...ROLES]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => ym(a.r.from) - ym(b.r.from))
    .map(({ r, i }) => {
      const s = ym(r.from)
      const e = r.to ? ym(r.to) + 1 : end
      let lane = lanes.findIndex((free) => free <= s)
      if (lane < 0) lane = lanes.push(0) - 1
      lanes[lane] = e
      return { r, i, lane, left: ((s - start) / span) * 100, width: ((e - s) / span) * 100 }
    })
  const firstYear = Math.floor(start / 12)
  const years: number[] = []
  for (let y = firstYear + 1; y <= YEAR; y++) years.push(y)
  return `<figure class="cmap" aria-label="Career map, ${firstYear} to ${YEAR}">
    <div class="cmap__plot" style="--lanes:${lanes.length}">
      ${each(years, (y) => `<span class="cmap__year" style="left:${(((y * 12 - start) / span) * 100).toFixed(2)}%">${y}</span>`)}
      ${each(placed, (p) => `<a class="cmap__bar" href="#quest-${p.i + 1}" style="left:${p.left.toFixed(2)}%;width:${p.width.toFixed(2)}%;--lane:${p.lane};${hueVar(p.r.hue)}" title="${esc(`${p.r.title}, ${p.r.org} (${p.r.period})`)}"><span>${esc(p.r.title)}</span></a>`)}
    </div>
    <figcaption class="cmap__cap">Career map: ${ROLES.length} quests since ${firstYear}. Overlapping bars ran in parallel.</figcaption>
  </figure>`
}

function quests(): string {
  return `<section class="zone" id="quests" data-zone="quests" aria-labelledby="quests-title">
  ${zoneHead({ id: 'quests', eyebrow: EXPERIENCE.eyebrow, cmd: EXPERIENCE.cmd, title: EXPERIENCE.title, sub: EXPERIENCE.sub })}
  ${careerMap()}
  <div class="qlog">
    <div class="qlog__rail" aria-hidden="true"><span class="qlog__fill"></span><span class="qlog__traveller" data-mascot data-mascot-role="traveller"><canvas width="48" height="48"></canvas></span></div>
    <ol class="qlog__list">
      ${each(ROLES, (r, i) => `<li class="quest${r.active ? ' quest--active' : ''}" id="quest-${i + 1}" data-role data-active="${r.active}" style="${hueVar(r.hue)}">
        <span class="quest__node" aria-hidden="true"></span>
        <div class="quest__when">
          <p class="quest__period">${esc(r.period)}</p>
          <p class="quest__status">${r.active ? `${glyph('bolt')}<span>Active quest</span>` : `${glyph('check')}<span>Cleared</span>`}</p>
          <p class="quest__dur" ${r.active ? `data-since="${esc(r.from)}"` : ''}>${esc(duration(r))}</p>
        </div>
        <div class="quest__card">
          <p class="quest__n">QUEST ${pad2(ROLES.length - i)} / ${pad2(ROLES.length)}</p>
          <h3 class="quest__title">${esc(r.title)}</h3>
          <p class="quest__org">${esc(r.org)}, ${esc(r.place)}</p>
          <ul class="quest__points">${each(r.points, (pt) => `<li>${esc(pt)}</li>`)}</ul>
        </div>
      </li>`)}
    </ol>
  </div>
</section>`
}

// ---------------------------------------------------------------- trophies

function trophies(): string {
  const group = (dup: boolean) =>
    `<ul class="marquee__group"${dup ? ' aria-hidden="true"' : ''}>${each(IMPACT.trophies, (t) => `<li class="trophy" data-trophy${dup ? ' data-dup' : ''}>${glyph('star', 'trophy__star')}<span>${esc(t)}</span></li>`)}</ul>`
  return `<section class="zone" id="trophies" data-zone="trophies" aria-labelledby="trophies-title">
  ${zoneHead({ id: 'trophies', eyebrow: IMPACT.eyebrow, cmd: IMPACT.cmd, title: IMPACT.title, sub: IMPACT.sub })}
  <div class="marquee" data-marquee><div class="marquee__track">${group(false)}${group(true)}</div></div>
  <div class="istats">
    ${each(IMPACT.stats, (s) => `<div class="istat" data-impact-stat>
      <p class="istat__v">${esc(s.prefix)}<span data-count="${s.v}">${s.v}</span>${esc(s.suffix)}</p>
      <p class="istat__l">${esc(s.label)}</p>
      <p class="istat__d">${esc(s.body)}</p>
    </div>`)}
  </div>
  <div class="constellation" data-constellation>
    <ul class="constellation__list" aria-label="Impact metrics">
      ${each(METRICS, (m) => `<li data-metric data-id="${esc(m.id)}" data-cluster="${esc(m.cluster)}" tabindex="0"><b>${esc(m.value)}</b> <span>${esc(m.label)}</span></li>`)}
    </ul>
  </div>
  <p class="note">${esc(IMPACT.note)}</p>
</section>`
}

// ---------------------------------------------------------------- inventory

function inventory(): string {
  const total = STACK_GROUPS.reduce((n, g) => n + g.items.length, 0)
  return `<section class="zone zone--inventory" id="inventory" data-zone="inventory" aria-labelledby="inventory-title">
  <div class="inv">
    <div class="inv__aside">
      <div class="inv__sticky">
        ${zoneHead({ id: 'inventory', eyebrow: STACK.eyebrow, cmd: STACK.cmd, title: STACK.title, sub: STACK.sub })}
        <p class="inv__count"><b>${total}</b> items <i>/</i> <b>${STACK_GROUPS.length}</b> slots</p>
        <div class="inv__filters" role="group" aria-label="Filter inventory">
          <button class="filter is-on" type="button" data-filter="all" aria-pressed="true">All</button>
          ${each(STACK_GROUPS, (g) => `<button class="filter" type="button" data-filter="${esc(g.id)}" aria-pressed="false" style="${hueVar(g.hue)}">${esc(g.title)}</button>`)}
        </div>
      </div>
    </div>
    <div class="inv__groups">
      ${each(STACK_GROUPS, (g, gi) => `<section class="slot" data-stack-group data-group="${esc(g.id)}" style="${hueVar(g.hue)}" aria-labelledby="slot-${esc(g.id)}">
        <h3 class="slot__title" id="slot-${esc(g.id)}"><span class="slot__n">SLOT_${pad2(gi + 1)}</span><span class="slot__name">${esc(g.title)}</span><span class="slot__count">${g.items.length}</span></h3>
        <ul class="slot__grid">
          ${each(g.items, (it) => `<li class="item" data-stack-item data-kind="${STACK_ICONS[it]?.kind ?? 'concept'}" data-item="${esc(slug(it))}">
            <span class="item__icons">${iconImgs(it)}</span>
            <span class="item__name">${esc(it)}</span>
          </li>`)}
        </ul>
      </section>`)}
    </div>
  </div>
</section>`
}

// ---------------------------------------------------------------- logs

function logs(): string {
  return `<section class="zone" id="logs" data-zone="logs" aria-labelledby="logs-title">
  ${zoneHead({ id: 'logs', eyebrow: WRITING.eyebrow, cmd: WRITING.cmd, title: WRITING.title, sub: WRITING.sub })}
  <div class="logs">
    <div class="logs__col">
      <ol class="articles">
        ${each(WRITING.articles, (a, i) => `<li class="article" data-article>
          <span class="article__n">LOG_${pad2(i + 1)}</span>
          <p class="article__title">&ldquo;${esc(a)}&rdquo;</p>
          <span class="article__src">B&amp;FT Ghana</span>
        </li>`)}
      </ol>
      <p class="label">Education tree</p>
      <ol class="edu">
        ${each(WRITING.education, (e, i) => `<li class="edu__node" data-edu style="--d:${i}">
          ${glyph('school', 'edu__glyph')}
          <p class="edu__deg">${esc(e.degree)}</p>
          <p class="edu__school">${esc(e.school)}</p>
        </li>`)}
      </ol>
    </div>
    <div class="logs__col">
      <p class="label">Badges earned <span class="badges__count" data-badge-count>${CERTS.length} unlocked</span></p>
      <ul class="badges">
        ${each(CERTS, (c) => {
          const f = CERT_ICONS[c.issuer]?.files[0]
          return `<li><button class="badge" type="button" data-cert data-issuer="${esc(c.issuer)}" aria-pressed="false">
            <span class="badge__medal" aria-hidden="true">${f ? `<img class="badge__icon" src="${esc(f)}" alt="" width="28" height="28" loading="lazy" decoding="async" />` : glyph('certificate')}</span>
            <span class="badge__name">${esc(c.name)}</span>
          </button></li>`
        })}
      </ul>
    </div>
  </div>
</section>`
}

// ---------------------------------------------------------------- arcade

function arcade(): string {
  return `<section class="zone" id="arcade" data-zone="arcade" aria-labelledby="arcade-title">
  ${zoneHead({ id: 'arcade', eyebrow: ARCADE.eyebrow, cmd: ARCADE.cmd, title: ARCADE.title, sub: ARCADE.sub })}
  <div class="cabs">
    ${each(ARCADE.games, (g, i) => `<article class="cab" data-cab="${esc(g.id)}" style="${hueVar(g.hue)};--d:${i}">
      <div class="cab__marquee" aria-hidden="true"><span>${esc(g.title.toUpperCase())}</span></div>
      <div class="cab__screen" aria-hidden="true"><canvas class="cab__canvas" data-attract="${esc(g.id)}" width="240" height="150"></canvas></div>
      <div class="cab__body">
        <h3 class="cab__title">${esc(g.title)}</h3>
        <p class="cab__blurb">${esc(g.blurb)}</p>
        <p class="cab__controls">${glyph('gamepad')}<span>${esc(g.controls)}</span></p>
        <p class="cab__best">BEST <span data-best="${esc(g.id)}">0</span></p>
        <button class="btn btn--coin" type="button" data-game-launch data-game-id="${esc(g.id)}">Insert coin<span class="sr-only">: play ${esc(g.title)}</span></button>
      </div>
    </article>`)}
  </div>
</section>`
}

// ---------------------------------------------------------------- contact

function contact(): string {
  const row = (kind: string, icon: GlyphName, label: string, value: string, href: string, extra = '', attrs = '') =>
    `<li class="row" data-contact-row data-kind="${kind}">
      <a class="row__link" href="${esc(href)}" ${attrs}>
        ${glyph(icon, 'row__icon')}
        <span class="row__text"><span class="row__label">${esc(label)}</span><span class="row__value">${esc(value)}</span></span>
        ${glyph('arrow-up-right', 'row__arrow')}
      </a>${extra}
    </li>`
  const copy = (value: string, what: string) =>
    `<button class="row__copy" type="button" data-copy="${esc(value)}" aria-label="Copy ${what}">${glyph('copy')}<span class="row__copied" aria-hidden="true">Copied</span></button>`
  return `<section class="zone zone--contact" id="contact" data-zone="contact" aria-labelledby="contact-title">
  <header class="zhead" data-zone-head>
    <div class="zhead__eyebrow"><span class="zhead__label">${esc(CONTACT.eyebrow)}</span><span class="zhead__rule" aria-hidden="true"></span><span class="zhead__zone" aria-hidden="true">ZONE ${zoneIndex('contact')}</span></div>
    ${prompt(CONTACT.cmd)}
    <h2 class="zhead__title contact__title" id="contact-title">${esc(CONTACT.title[0])}<br />${esc(CONTACT.title[1])} <a class="coin-link" href="mailto:${esc(PROFILE.email)}">${esc(CONTACT.coin)}</a></h2>
  </header>
  <div class="contact">
    <div class="contact__left">
      <p class="status-chip"><span class="dot dot--red" aria-hidden="true"></span> ${esc(CONTACT.status)}</p>
      <p class="contact__body">${esc(CONTACT.body)}</p>
      <p class="contact__spawn">${glyph('map-pin')}<span>Spawn point: ${esc(PROFILE.city)}, GMT</span></p>
    </div>
    <ul class="rows">
      ${row('cv', 'file-download', 'Resume', PROFILE.cvFile, PROFILE.cvFile, '', 'download data-save-cv')}
      ${row('email', 'mail', 'Email', PROFILE.email, `mailto:${PROFILE.email}`, copy(PROFILE.email, 'email address'))}
      ${row('phone', 'phone', 'Phone', PROFILE.phone, PROFILE.phoneHref, copy(PROFILE.phone, 'phone number'))}
      ${row('location', 'map-pin', 'Location', `${PROFILE.city} (GMT)`, PROFILE.mapsUrl, '', 'target="_blank" rel="noopener noreferrer"')}
    </ul>
  </div>
  <div class="runway">
    <canvas class="runway__canvas" data-runway aria-hidden="true"></canvas>
    <button class="runway__btn" type="button" data-runway-play>Connection lost? Keep running.</button>
  </div>
</section>`
}

function footer(): string {
  return `<footer class="foot">
  <p>${esc(FOOTER.left)}</p>
  <p>${esc(FOOTER.right)}, &copy; ${YEAR}</p>
</footer>`
}

// ---------------------------------------------------------------- page

export function renderPage(): string {
  return `<a class="skip" href="#about">Skip to content</a>
<div class="sky" aria-hidden="true"><canvas class="sky__canvas" data-starfield></canvas><div class="sky__nebula"></div></div>
<main id="main" class="world">
${hero()}
${about()}
${builds()}
${cases()}
${quests()}
${trophies()}
${inventory()}
${logs()}
${arcade()}
${contact()}
</main>
${footer()}
<div class="crt" aria-hidden="true"></div>
<div id="ui-root"></div>`
}

const FONTS =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Press+Start+2P&family=Sixtyfour:BLED,SCAN@0..100,-53..100&family=VT323&display=swap'

export function renderHead(): string {
  const desc = `${PROFILE.name}: ${PROFILE.roles.join(' and ')} at ${PROFILE.org}, ${PROFILE.city}. Digital forensics, incident response, threat intelligence, OSINT and AI engineering, played as a terminal game.`
  return `<meta name="description" content="${esc(desc)}" />
    <meta name="theme-color" content="#04070a" />
    <meta name="color-scheme" content="dark" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${esc(PROFILE.name)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <link rel="canonical" href="${esc(PROFILE.siteUrl)}" />
    <meta property="og:url" content="${esc(PROFILE.siteUrl)}" />
    <meta property="og:image" content="${esc(PROFILE.siteUrl)}og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${FONTS}" />`
}
