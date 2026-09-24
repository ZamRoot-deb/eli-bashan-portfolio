// The in-game terminal: a quake-style drop-down shell over the real content.
// Every piece of user input is rendered with textContent, never as markup.

import { ABOUT, ARCADE, CASEWORK, CERTS, IMPACT, PLATFORMS, PROFILE, ROLES, STACK_GROUPS, WRITING, ZONES } from '../content'
import { isMuted, setMuted, sfx } from '../core/sfx'
import { ACHIEVEMENTS, getLevel, getXP, unlock, unlockedIds, xpForLevel, zonesSeen } from '../core/xp'
import type { GameId } from '../games/types'
import { createDialog, type Dialog } from './dialog'
import { h } from './dom'
import { formatDuration, sessionSeconds } from './hud'
import { openTrophies } from './panels'
import { warpTo } from './zones'

type Tone = 'dim' | 'amber' | 'red' | 'cyan' | 'paper' | ''
type Seg = string | [string, Tone]

let dlg: Dialog
let out: HTMLElement
let input: HTMLInputElement
let playGame: (id: GameId) => void = () => undefined
const history: string[] = []
let hIndex = -1

const FLAG = 'EZB{sankofa_go_back_and_fetch_it}'
const rot13 = (s: string) => s.replace(/[a-z]/gi, (c) => {
  const base = c <= 'Z' ? 65 : 97
  return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base)
})

const FILES: Record<string, () => Seg[][]> = {
  'bio.txt': (): Seg[][] => [
    ...ABOUT.paragraphs.map((p): Seg[] => [p]),
    [['Scope: ' + ABOUT.scope.map((s) => `${s} forensics`).join(', '), 'dim']],
  ],
  'cases.gpg': () => [[['This file is encrypted. Try: gpg --decrypt cases.gpg', 'amber']]],
  'quest_log.dat': () => ROLES.map((r) => [[r.period.padEnd(22), 'dim'], [r.title, r.active ? 'amber' : 'paper'], [`  ${r.org}`, 'dim']]),
  'trophies.txt': () => IMPACT.trophies.map((t) => [['* ', 'amber'], t]),
  'inventory.db': () => STACK_GROUPS.map((g) => [[`${g.title} (${g.items.length})`.padEnd(38), 'cyan'], g.items.join(', ')]),
  'published.log': () => WRITING.articles.map((a, i) => [[`LOG_0${i + 1} `, 'dim'], `"${a}"`, [' B&FT Ghana', 'dim']]),
  'contact.vcf': () => [
    ['BEGIN:VCARD'],
    [`FN:${PROFILE.name}`],
    [`TITLE:${PROFILE.roles.join(', ')}`],
    [`ORG:${PROFILE.org}`],
    [`EMAIL:${PROFILE.email}`],
    [`TEL:${PROFILE.phone}`],
    [`ADR:${PROFILE.city}`],
    ['END:VCARD'],
  ],
  'certs.txt': () => CERTS.map((c) => [['[x] ', 'amber'], c.name]),
  '.secret': () => [[[rot13(FLAG), 'amber']], [['rot13 is a start, not a strategy.', 'dim']]],
  '.bash_history': () => [['ls -a'], ['cat .secret'], ['rot13 <text>'], ['submit <flag>'], [['# note to self: never leave flags in history', 'dim']]],
}

const BUILD_FILES = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]))

// friendly names people will try first
const ALIASES: Record<string, string> = {
  about: 'bio.txt', bio: 'bio.txt', cases: 'cases.gpg', quests: 'quest_log.dat', experience: 'quest_log.dat',
  trophies: 'trophies.txt', inventory: 'inventory.db', stack: 'inventory.db', logs: 'published.log',
  articles: 'published.log', contact: 'contact.vcf', certs: 'certs.txt', secret: '.secret',
}

function line(...segs: Seg[]): void {
  const el = h('div')
  for (const s of segs) {
    if (typeof s === 'string') el.append(document.createTextNode(s))
    else el.append(h('span', { class: s[1] ? `t-${s[1]}` : '' }, s[0]))
  }
  out.append(el)
}
const lines = (rows: Seg[][]) => rows.forEach((r) => line(...r))
const blank = () => line('')

function echoCommand(cmd: string): void {
  line([`${PROFILE.handle}@${PROFILE.host}:~$ `, 'dim'], [cmd, 'paper'])
}

const COMMANDS = ['help', 'whoami', 'ls', 'cat', 'cd', 'goto', 'builds', 'cases', 'quests', 'inventory', 'trophies', 'logs', 'games', 'play', 'stats', 'achievements', 'contact', 'sound', 'neofetch', 'clear', 'exit', 'date', 'echo', 'uname', 'pwd', 'history', 'sudo', 'gpg', 'rot13', 'submit', 'hint']
const GAMES = ARCADE.games.map((g) => g.id) as GameId[]
const ZONE_IDS = ZONES.map((z) => z.id)

function help(): void {
  lines([
    [['Commands', 'amber']],
    [['  whoami           ', 'cyan'], 'who is behind the keyboard'],
    [['  ls [-a]          ', 'cyan'], 'list files'],
    [['  cat <file>       ', 'cyan'], 'print a file, e.g. cat bio.txt'],
    [['  cd <zone>        ', 'cyan'], `warp to a zone: ${ZONE_IDS.join(', ')}`],
    [['  builds cases quests inventory trophies logs', 'cyan']],
    [['  games            ', 'cyan'], 'list the arcade cabinets'],
    [['  play <game>      ', 'cyan'], GAMES.join(', ')],
    [['  stats            ', 'cyan'], 'your XP, level and progress'],
    [['  achievements     ', 'cyan'], 'open the trophy room'],
    [['  contact          ', 'cyan'], 'how to reach Eli'],
    [['  sound on|off     ', 'cyan'], 'chiptune effects'],
    [['  neofetch  clear  exit', 'cyan']],
    [['Tab completes, arrow keys walk the history. Some commands are not listed.', 'dim']],
  ])
}

function run(raw: string): void {
  const cmdline = raw.trim()
  echoCommand(cmdline)
  if (!cmdline) return
  history.push(cmdline)
  hIndex = history.length
  const [cmd, ...args] = cmdline.split(/\s+/)
  const arg = args.join(' ')
  switch (cmd.toLowerCase()) {
    case 'help':
    case '?':
      help()
      break
    case 'whoami':
      line([PROFILE.handle, 'amber'])
      line(`${PROFILE.name}, ${PROFILE.roles.join(' and ')} at ${PROFILE.org}. ${PROFILE.city}.`)
      break
    case 'ls': {
      const all = args.includes('-a') || args.includes('-la')
      if (args.some((a) => a.startsWith('builds'))) {
        line(PLATFORMS.map((p) => p.id).join('   '))
        break
      }
      const names = Object.keys(FILES).filter((f) => all || !f.startsWith('.'))
      line(['builds/   ', 'cyan'], ['arcade/   ', 'cyan'], names.join('   '))
      break
    }
    case 'cat': {
      if (!arg) {
        line(['usage: cat <file>', 'dim'])
        break
      }
      const b = arg.replace(/^builds\//, '')
      if (arg.startsWith('builds/') && BUILD_FILES[b]) {
        const p = BUILD_FILES[b]
        line([p.name, 'amber'], [`  ${p.tag}`, 'dim'])
        line(p.body)
        line(['stack: ' + p.stack.join(', '), 'cyan'])
        break
      }
      const f = FILES[arg] ?? FILES[ALIASES[arg.toLowerCase()] ?? '']
      if (f) lines(f())
      else line([`cat: ${arg}: no such file. Try ls.`, 'red'])
      break
    }
    case 'gpg':
      if (/--decrypt/.test(arg)) {
        line(['gpg: decrypting with key 0xEZB ... ok', 'dim'])
        CASEWORK.types.forEach((c, i) => line([`CASE_0${i + 1} `, 'amber'], c.title, [`  ${c.sub}`, 'dim']))
        line(['50+ reports, 5 legal reports in court, 1 expert witness testimony.', 'cyan'])
        unlock('decryptor')
      } else line(['usage: gpg --decrypt cases.gpg', 'dim'])
      break
    case 'cd':
    case 'goto': {
      const z = arg.replace(/^[#/~]+/, '').toLowerCase()
      if (!z || z === '~' || z === '..') {
        line(['/home/eli', 'dim'])
        break
      }
      if (ZONE_IDS.includes(z)) {
        line([`warping to ${z}...`, 'amber'])
        window.setTimeout(() => {
          dlg.close()
          warpTo(z)
        }, 280)
      } else line([`cd: ${z}: no such zone. Zones: ${ZONE_IDS.join(', ')}`, 'red'])
      break
    }
    case 'builds':
      PLATFORMS.forEach((p) => line([`${p.n} `, 'dim'], [p.name.padEnd(15), 'amber'], p.tag))
      line(['cat builds/<name> for details, cd builds to look.', 'dim'])
      break
    case 'cases':
      run('gpg --decrypt cases.gpg')
      break
    case 'quests':
      lines(FILES['quest_log.dat']())
      break
    case 'inventory':
      lines(FILES['inventory.db']())
      break
    case 'trophies':
      lines(FILES['trophies.txt']())
      break
    case 'logs':
      lines(FILES['published.log']())
      line(['certs.txt has the 16 certifications.', 'dim'])
      break
    case 'games':
    case 'arcade':
      ARCADE.games.forEach((g) => line([g.id.padEnd(12), 'cyan'], [g.title.padEnd(18), 'amber'], g.blurb))
      line(['play <game> to start one.', 'dim'])
      break
    case 'play': {
      const id = arg.toLowerCase() as GameId
      if (GAMES.includes(id)) {
        line([`inserting coin: ${id}`, 'amber'])
        playGame(id)
      } else line([`play: unknown game. Try: ${GAMES.join(', ')}`, 'red'])
      break
    }
    case 'stats':
    case 'xp':
    case 'level':
      line(['LEVEL  ', 'dim'], [String(getLevel()), 'amber'], ['   XP  ', 'dim'], [String(getXP()), 'amber'], ['   next level at  ', 'dim'], String(xpForLevel(getLevel() + 1)))
      line(['ZONES  ', 'dim'], `${zonesSeen().length}/${ZONES.length}`, ['   ACHIEVEMENTS  ', 'dim'], `${unlockedIds().length}/${ACHIEVEMENTS.length}`, ['   SESSION  ', 'dim'], formatDuration(sessionSeconds()))
      break
    case 'achievements':
      openTrophies()
      break
    case 'contact':
      line(['email     ', 'dim'], PROFILE.email)
      line(['phone     ', 'dim'], PROFILE.phone)
      line(['location  ', 'dim'], `${PROFILE.city} (GMT)`)
      line(['resume    ', 'dim'], PROFILE.cvFile)
      break
    case 'sound':
      if (arg === 'on' || arg === 'off') {
        setMuted(arg === 'off')
        if (arg === 'on') unlock('sound-on')
        line([`sound ${arg}`, 'amber'])
      } else line([`sound is ${isMuted() ? 'off' : 'on'}. usage: sound on|off`, 'dim'])
      break
    case 'neofetch':
      lines([
        [['   .--.     ', 'amber'], [`${PROFILE.handle}@${PROFILE.host}`, 'cyan']],
        [['  /  * \\    ', 'amber'], ['OS      ', 'dim'], 'EZB-OS 3.0 (forensic kernel)'],
        [[' |  <*> |   ', 'amber'], ['Player  ', 'dim'], PROFILE.name],
        [['  \\  *  /   ', 'amber'], ['Class   ', 'dim'], PROFILE.roles.join(' / ')],
        [["   '--'     ", 'amber'], ['Base    ', 'dim'], PROFILE.city],
        [['            ', ''], ['Level   ', 'dim'], `${getLevel()}  (${getXP()} XP)`],
        [['            ', ''], ['Uptime  ', 'dim'], formatDuration(sessionSeconds())],
        [['            ', ''], ['Mascot  ', 'dim'], 'Sanko, the bird that goes back for the egg'],
      ])
      break
    case 'date':
      line(new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'medium', timeZone: PROFILE.timeZone }).format(new Date()) + ' (Accra)')
      break
    case 'echo':
      line(arg)
      break
    case 'uname':
      line(args.includes('-a') ? 'EZB-OS 3.0.0 forensic-kernel x86_64 GNU/Accra' : 'EZB-OS')
      break
    case 'pwd':
      line('/home/eli')
      break
    case 'history':
      history.forEach((c, i) => line([String(i + 1).padStart(4) + '  ', 'dim'], c))
      break
    case 'sudo':
      unlock('root')
      if (/hire[- ]?me/i.test(arg)) {
        line(['[sudo] password for recruiter: ********', 'dim'])
        line(['Access granted. Opening a secure line to Eli.', 'amber'])
        line(`email ${PROFILE.email}   phone ${PROFILE.phone}`)
        sfx('win')
      } else {
        line([`${PROFILE.handle} is not in the sudoers file. This incident has been logged, hashed and added to the case file.`, 'red'])
        sfx('error')
      }
      break
    case 'rot13':
      line(rot13(arg))
      break
    case 'submit':
      if (arg === FLAG) {
        line(['Flag accepted. Nicely fetched.', 'amber'])
        unlock('flag')
        sfx('win')
      } else {
        line(['Wrong flag. The format is EZB{...}.', 'red'])
        sfx('error')
      }
      break
    case 'hint':
      line(['Analysts read what others skip: ls -a', 'dim'])
      break
    case 'clear':
    case 'cls':
      out.replaceChildren()
      break
    case 'exit':
    case 'quit':
      dlg.close()
      break
    default:
      line([`${cmd}: command not found. Type help.`, 'red'])
      sfx('error')
  }
}

function complete(): void {
  const v = input.value
  const parts = v.split(/\s+/)
  let pool: string[] = []
  if (parts.length <= 1) pool = COMMANDS
  else if (parts[0] === 'cat') pool = [...Object.keys(FILES), ...PLATFORMS.map((p) => `builds/${p.id}`)]
  else if (parts[0] === 'play') pool = GAMES
  else if (parts[0] === 'cd' || parts[0] === 'goto') pool = ZONE_IDS
  else if (parts[0] === 'sound') pool = ['on', 'off']
  const last = parts[parts.length - 1]
  const hits = pool.filter((p) => p.startsWith(last))
  if (hits.length === 1) {
    parts[parts.length - 1] = hits[0]
    input.value = parts.join(' ') + (parts.length === 1 ? ' ' : '')
  } else if (hits.length > 1) {
    line([hits.join('   '), 'dim'])
    out.scrollTop = out.scrollHeight
  }
}

export function initTerminal(play: (id: GameId) => void): void {
  playGame = play
  dlg = createDialog({
    id: 'terminal',
    title: `${PROFILE.handle}@${PROFILE.host}: ~  (tty1)`,
    variant: 'terminal',
    hook: 'data-terminal',
    bodyClass: 'term',
    onOpen: () => window.setTimeout(() => input.focus(), 30),
  })
  out = h('div', { class: 'term__out', 'data-term-out': '', role: 'log', 'aria-live': 'polite' })
  input = h('input', { class: 'term__input', id: 'term-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Terminal command' })
  const ps = h('label', { class: 'term__ps', for: 'term-input' }, h('b', {}, `${PROFILE.handle}@${PROFILE.host}`), ':~$')
  dlg.body.append(out, h('div', { class: 'term__line' }, ps, input), h('p', { class: 'term__hint' }, 'ESC or ` to close   TAB to complete   try: help, ls, play runner'))

  line(['EZB-OS 3.0 (tty1). Type ', 'dim'], ['help', 'amber'], [' to list commands.', 'dim'])
  blank()

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const v = input.value
      input.value = ''
      run(v)
      out.scrollTop = out.scrollHeight
      sfx('select')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      complete()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length) {
        hIndex = Math.max(0, hIndex - 1)
        input.value = history[hIndex] ?? ''
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      hIndex = Math.min(history.length, hIndex + 1)
      input.value = history[hIndex] ?? ''
    } else if (e.key === '`' && !input.value) {
      e.preventDefault()
      dlg.close()
    } else if (e.key.length === 1) sfx('type')
  })

  window.addEventListener('keydown', (e) => {
    if (e.key !== '`' || e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if (document.querySelector('[data-game-overlay]:not([hidden])')) return
    e.preventDefault()
    if (dlg.isOpen()) dlg.close()
    else dlg.open()
  })
}

export const openTerminal = (): void => dlg.open()
export const closeTerminal = (): void => dlg.close()
export const runCommand = (cmd: string): void => run(cmd)
