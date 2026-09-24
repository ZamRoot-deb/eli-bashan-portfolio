// "Phish or Legit": a swipe-card quiz. Eight fictional messages (email + SMS), shuffled each
// run. Half are phishing attempts modelled on the tells a DFIR analyst actually looks for
// (lookalike domains, urgency, secrecy, credential/PIN/gift-card asks, changed bank details,
// mismatched reply-to, too-good-to-be-true). Every organisation, domain and number below is
// invented for teaching purposes only.
import type { GameHost, GameInstance, GameModule } from './types'
import './phish.css'

type Channel = 'email' | 'sms'

interface Tell {
  label: string
  note: string
  target: 'sender' | 'subject' | 'body'
  /** Exact substring inside `body` to highlight. Required when target === 'body'. */
  match?: string
}

interface CardDef {
  id: string
  channel: Channel
  phish: boolean
  time: string
  senderName: string
  senderAddr: string
  subject?: string
  body: string[]
  /** 1-3 red flags for phish cards, empty for legit cards. */
  tells: Tell[]
  /** One-line reassurance shown on reveal for legit cards. */
  why?: string
}

const DECK: CardDef[] = [
  {
    id: 'bank-lookalike',
    channel: 'email',
    phish: true,
    time: '08:14',
    senderName: 'Goldcoast Bank',
    senderAddr: 'alerts@g0ldcoast-bank.co',
    subject: 'URGENT: Verify your account within 24 hours',
    body: [
      'Dear Customer, we have detected unusual sign-in activity on your Goldcoast Bank account.',
      'Your account will be suspended in 24 hours unless you verify your login details now.',
      'Verify here: secure-goldcoast-bank.co/verify and enter your online banking username and password to restore access.',
    ],
    tells: [
      {
        label: 'Lookalike domain',
        note: 'g0ldcoast-bank.co swaps a zero for the letter O. The real bank is goldcoastbank.com.gh.',
        target: 'sender',
      },
      {
        label: 'Urgency',
        note: 'A fixed countdown is designed to make you act before you check.',
        target: 'body',
        match: 'suspended in 24 hours',
      },
      {
        label: 'Credential request',
        note: 'A real bank never asks you to type your password into a link from an email.',
        target: 'body',
        match: 'enter your online banking username and password',
      },
    ],
  },
  {
    id: 'ceo-giftcards',
    channel: 'email',
    phish: true,
    time: '13:52',
    senderName: 'Kwame Osei (CEO)',
    senderAddr: 'k.osei@northbridgefreight-mail.com',
    subject: 'Quick favour, need this today',
    body: [
      "Hi, are you at your desk? I'm stuck in a board meeting and need a quick favour handled quietly.",
      "Buy five 100 dollar gift cards from any store nearby, scratch the back and send me the codes by reply. I will explain and reimburse you later, don't mention this to finance yet.",
      "Do this before 3pm today, it's time sensitive. Thanks, Kwame.",
    ],
    tells: [
      {
        label: 'Secrecy',
        note: 'Real approvals do not ask you to hide the request from finance or colleagues.',
        target: 'body',
        match: "don't mention this to finance yet",
      },
      {
        label: 'Gift card codes',
        note: 'Asking for scratched gift card codes by reply is a classic BEC cash-out method.',
        target: 'body',
        match: 'send me the codes by reply',
      },
      {
        label: 'Urgency',
        note: 'A tight deadline leaves no time to call and confirm.',
        target: 'body',
        match: "before 3pm today, it's time sensitive",
      },
    ],
  },
  {
    id: 'invoice-bankchange',
    channel: 'email',
    phish: true,
    time: '11:03',
    senderName: 'Meridian Supplies, Accounts',
    senderAddr: 'accounts@meridiansupplies.com',
    subject: 'Updated bank details for outstanding invoice INV-2291',
    body: [
      'Hello, please note that Meridian Supplies has changed bank accounts with immediate effect.',
      'Kindly update your records and send the payment for invoice INV-2291 to our new account: Accra Trust Bank, account 021 774 4180, before it falls further overdue.',
      'For any questions, reply to our payments desk at payments.meridian@swiftpost-mail.com rather than this address.',
    ],
    tells: [
      {
        label: 'Changed bank details',
        note: 'A sudden change of payment account is the single biggest invoice-fraud signal. Always verify by phone on a known number.',
        target: 'body',
        match: 'changed bank accounts with immediate effect',
      },
      {
        label: 'Mismatched reply-to',
        note: "Replies are redirected to a free mailbox that has nothing to do with the vendor's domain.",
        target: 'body',
        match: 'reply to our payments desk at payments.meridian@swiftpost-mail.com rather than this address',
      },
    ],
  },
  {
    id: 'momo-reversal',
    channel: 'sms',
    phish: true,
    time: '19:47',
    senderName: 'SikaFlex Money',
    senderAddr: 'SIKA-4433',
    body: [
      'SikaFlex: A reversal of GHS 1,450.00 sent to you by mistake is pending. To confirm and release it to the sender, reply with your 4-digit PIN within 10 minutes or the funds will be locked.',
    ],
    tells: [
      {
        label: 'Too good to be true',
        note: 'Unexpected free money that only needs your PIN to release is the hook, not a real reversal.',
        target: 'body',
        match: 'sent to you by mistake',
      },
      {
        label: 'PIN request',
        note: 'SikaFlex never asks for your PIN by SMS reply. Your PIN unlocks your account, not a reversal.',
        target: 'body',
        match: 'reply with your 4-digit PIN',
      },
      {
        label: 'Urgency',
        note: 'A short window and a threat push you to react before checking.',
        target: 'body',
        match: 'within 10 minutes or the funds will be locked',
      },
    ],
  },
  {
    id: 'it-maintenance',
    channel: 'email',
    phish: false,
    time: '09:00',
    senderName: 'IT Helpdesk',
    senderAddr: 'it-helpdesk@northbridgefreight.com',
    subject: 'Scheduled maintenance, Saturday 10pm to 2am',
    body: [
      'Hi all, the file server and VPN will be offline for scheduled patching this Saturday from 10pm to 2am.',
      'No action is needed on your part. If you are working late that night, save your files before 10pm. Questions go to the helpdesk ticket queue as usual.',
    ],
    tells: [],
    why: 'Matches the real company domain, makes no requests, and points you to the normal ticket queue to verify.',
  },
  {
    id: 'newsletter',
    channel: 'email',
    phish: false,
    time: '07:30',
    senderName: 'Field Notes Weekly',
    senderAddr: 'newsletter@fieldnotesweekly.com',
    subject: 'This week: three read-worthy incident write-ups',
    body: [
      "Hello, here is this week's digest: three public incident write-ups worth your time, a new open-source triage script, and a roundup of upcoming conference talks.",
      'Read online or reply if you want fewer emails. No sign-in, no attachments, no links to anything but our own site.',
    ],
    tells: [],
    why: 'An opt-in digest with no login request and no attachment, easy to unsubscribe.',
  },
  {
    id: 'delivery',
    channel: 'sms',
    phish: false,
    time: '14:02',
    senderName: 'QuickDash Courier',
    senderAddr: 'QDASH',
    body: [
      'QuickDash: your parcel 4471 is out for delivery today between 2pm and 5pm. Someone must be available to receive it. No payment is needed on delivery.',
    ],
    tells: [],
    why: 'States the facts, makes no payment or link request, nothing sensitive is asked for.',
  },
  {
    id: 'momo-confirm',
    channel: 'sms',
    phish: false,
    time: '16:21',
    senderName: 'SikaFlex Money',
    senderAddr: 'SIKA-4433',
    body: [
      'SikaFlex: payment confirmed. You received GHS 50.00 from Ama K. New balance GHS 320.00. Ref 88213. Reply 0 for a receipt.',
    ],
    tells: [],
    why: 'A routine confirmation of money already received. No PIN or reply with sensitive data is required.',
  },
]

function gradeFor(correct: number): string {
  if (correct === 8) return 'PHISH SLAYER'
  if (correct >= 6) return 'SOC ANALYST'
  if (correct >= 4) return 'TRAINEE'
  return 'CLICKED THE LINK'
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function fieldTellIndex(card: CardDef, target: 'sender' | 'subject'): number | null {
  const i = card.tells.findIndex((t) => t.target === target)
  return i === -1 ? null : i + 1
}

function paragraphEntries(card: CardDef, paraIndex: number): { n: number; match: string }[] {
  const text = card.body[paraIndex]
  const out: { n: number; match: string }[] = []
  card.tells.forEach((t, i) => {
    if (t.target === 'body' && t.match && text.includes(t.match)) out.push({ n: i + 1, match: t.match })
  })
  return out
}

/** Splits `text` into plain text + <mark> nodes for each tell match. Matches are literal
 * substrings authored alongside the card copy, so a plain indexOf is safe and exact. */
function highlightParagraph(text: string, entries: { n: number; match: string }[]): DocumentFragment {
  const frag = document.createDocumentFragment()
  const found: { start: number; end: number; n: number }[] = []
  for (const e of entries) {
    const start = text.indexOf(e.match)
    if (start === -1) continue
    found.push({ start, end: start + e.match.length, n: e.n })
  }
  found.sort((a, b) => a.start - b.start)
  let cursor = 0
  for (const f of found) {
    if (f.start < cursor) continue
    if (f.start > cursor) frag.append(document.createTextNode(text.slice(cursor, f.start)))
    const mark = el('mark', 'pl-mark', text.slice(f.start, f.end))
    mark.setAttribute('data-tell', String(f.n))
    frag.append(mark)
    cursor = f.end
  }
  if (cursor < text.length) frag.append(document.createTextNode(text.slice(cursor)))
  return frag
}

function mount(host: GameHost): GameInstance {
  host.root.replaceChildren()
  host.root.classList.add('pl-root')
  if (host.reducedMotion) host.root.classList.add('pl-reduced')

  const live = el('div', 'pl-live')
  live.setAttribute('role', 'status')
  live.setAttribute('aria-live', 'polite')
  const view = el('div', 'pl-view')
  host.root.append(live, view)

  const stage = el('div', 'pl-stage')
  const statusCardEl = el('span', 'pl-status-item')
  const statusScoreEl = el('span', 'pl-status-item')
  const statusStreakEl = el('span', 'pl-status-item')

  let state: 'ready' | 'playing' | 'over' = 'ready'
  let runDeck: CardDef[] = []
  let index = 0
  let score = 0
  let streak = 0
  let correctCount = 0
  let falsePositives = 0
  let answerable = false
  let pausedPending = false
  const missedTells: { label: string; note: string }[] = []

  let revealTimer: number | undefined

  host.root.dataset.state = state

  function announce(msg: string): void {
    live.textContent = msg
  }

  function clearRevealTimer(): void {
    if (revealTimer !== undefined) {
      window.clearTimeout(revealTimer)
      revealTimer = undefined
    }
  }

  function updateStatus(): void {
    statusCardEl.textContent = `CARD ${Math.min(index + 1, runDeck.length)}/${runDeck.length}`
    statusScoreEl.textContent = `SCORE ${score}`
    statusStreakEl.textContent = `STREAK x${streak}`
  }

  function attachDrag(cardEl: HTMLDivElement): void {
    const stampEl = el('div', 'pl-drag-stamp')
    cardEl.append(stampEl)
    let dragging = false
    let startX = 0
    let dx = 0

    function onDown(e: PointerEvent): void {
      if (!answerable) return
      if ((e.target as HTMLElement).closest('button')) return
      dragging = true
      startX = e.clientX
      dx = 0
      cardEl.classList.add('pl-card-dragging')
      cardEl.setPointerCapture(e.pointerId)
    }
    function onMove(e: PointerEvent): void {
      if (!dragging) return
      dx = e.clientX - startX
      const rot = host.reducedMotion ? 0 : Math.max(-15, Math.min(15, dx * 0.04))
      cardEl.style.transform = `translateX(${dx}px) rotate(${rot}deg)`
      const w = cardEl.clientWidth || 1
      const progress = Math.min(1, Math.abs(dx) / (w * 0.5))
      stampEl.style.opacity = String(progress)
      stampEl.textContent = dx < 0 ? 'PHISH' : 'LEGIT'
      stampEl.className = `pl-drag-stamp ${dx < 0 ? 'pl-drag-stamp-phish' : 'pl-drag-stamp-legit'}`
    }
    function onUp(e: PointerEvent): void {
      if (!dragging) return
      dragging = false
      cardEl.classList.remove('pl-card-dragging')
      const w = cardEl.clientWidth || 1
      const threshold = Math.max(60, w * 0.26)
      const committed = Math.abs(dx) > threshold && answerable
      const wentLeft = dx < 0
      dx = 0
      if (committed) {
        submitAnswer(wentLeft)
      } else {
        cardEl.style.transform = ''
        stampEl.style.opacity = '0'
      }
      void e
    }
    cardEl.addEventListener('pointerdown', onDown)
    cardEl.addEventListener('pointermove', onMove)
    cardEl.addEventListener('pointerup', onUp)
    cardEl.addEventListener('pointercancel', onUp)
  }

  function buildCardElement(card: CardDef, revealed: boolean, choice?: boolean): HTMLDivElement {
    const wrap = el('div', 'pl-card')
    wrap.setAttribute('data-channel', card.channel)

    const head = el('div', 'pl-card-head')
    const dots = el('span', 'pl-dots')
    dots.setAttribute('aria-hidden', 'true')
    dots.append(el('i'), el('i'), el('i'))
    const chip = el('span', 'pl-chip', card.channel === 'email' ? 'MAIL' : 'SMS')
    const time = el('span', 'pl-time', card.time)
    head.append(dots, chip, time)

    const senderN = revealed ? fieldTellIndex(card, 'sender') : null
    const senderRow = el('div', 'pl-sender')
    if (senderN) {
      senderRow.classList.add('pl-tellfield')
      senderRow.setAttribute('data-tell', String(senderN))
    }
    senderRow.append(el('span', 'pl-sender-name', card.senderName), el('span', 'pl-sender-addr', card.senderAddr))

    const rows: HTMLElement[] = [head, senderRow]

    if (card.subject) {
      const subjN = revealed ? fieldTellIndex(card, 'subject') : null
      const subjectRow = el('div', 'pl-subject')
      if (subjN) {
        subjectRow.classList.add('pl-tellfield')
        subjectRow.setAttribute('data-tell', String(subjN))
      }
      subjectRow.append(el('span', 'pl-subject-label', 'Subject: '), el('span', 'pl-subject-text', card.subject))
      rows.push(subjectRow)
    }

    const bodyEl = el('div', 'pl-card-body')
    card.body.forEach((para, pi) => {
      const p = document.createElement('p')
      if (revealed) p.append(highlightParagraph(para, paragraphEntries(card, pi)))
      else p.textContent = para
      bodyEl.append(p)
    })
    rows.push(bodyEl)
    wrap.append(...rows)

    if (revealed) {
      if (card.tells.length) {
        const legend = el('ol', 'pl-legend')
        card.tells.forEach((t, i) => {
          const li = document.createElement('li')
          const badge = el('span', 'pl-legend-badge', String(i + 1))
          badge.setAttribute('aria-hidden', 'true')
          li.append(badge, el('b', undefined, `${t.label}: `), document.createTextNode(t.note))
          legend.append(li)
        })
        wrap.append(legend)
      } else if (card.why) {
        wrap.append(el('p', 'pl-why', card.why))
      }
      const correct = choice === card.phish
      wrap.append(el('div', `pl-stamp ${correct ? 'pl-stamp-correct' : 'pl-stamp-wrong'}`, correct ? 'CORRECT' : 'WRONG'))
    } else {
      attachDrag(wrap)
    }

    return wrap
  }

  function scheduleAdvance(delay: number): void {
    clearRevealTimer()
    revealTimer = window.setTimeout(() => {
      revealTimer = undefined
      index += 1
      if (index >= runDeck.length) finishRun()
      else renderNextCard()
    }, delay)
  }

  function submitAnswer(choicePhish: boolean): void {
    if (!answerable || state !== 'playing') return
    answerable = false
    const card = runDeck[index]
    const correct = choicePhish === card.phish
    if (correct) {
      streak += 1
      score += 100 + (streak - 1) * 25
      correctCount += 1
      host.sfx('coin')
    } else {
      streak = 0
      if (card.phish) {
        for (const t of card.tells) missedTells.push({ label: t.label, note: t.note })
      } else {
        falsePositives += 1
      }
      host.sfx('hit')
    }
    host.setScore(score)
    stage.replaceChildren(buildCardElement(card, true, choicePhish))
    const tellSummary = card.tells.length ? ` Tells: ${card.tells.map((t) => t.label).join(', ')}.` : ''
    announce(`${correct ? 'Correct' : 'Wrong'}. This message was ${card.phish ? 'a phishing attempt' : 'legitimate'}.${tellSummary}`)
    updateStatus()
    scheduleAdvance(host.fast ? 150 : 2600)
  }

  function renderNextCard(): void {
    const card = runDeck[index]
    const cardEl = buildCardElement(card, false)
    cardEl.classList.add(host.reducedMotion ? 'pl-card-fade' : 'pl-card-enter')
    stage.replaceChildren(cardEl)
    answerable = true
    updateStatus()
  }

  function renderPlayingShell(): void {
    view.replaceChildren()
    const wrap = el('div', 'pl-playing')
    const status = el('div', 'pl-status')
    status.append(statusCardEl, statusScoreEl, statusStreakEl)
    stage.replaceChildren()

    const controls = el('div', 'pl-controls')
    const phishBtn = el('button', 'pl-btn pl-btn-phish', 'PHISH')
    phishBtn.type = 'button'
    const legitBtn = el('button', 'pl-btn pl-btn-legit', 'LEGIT')
    legitBtn.type = 'button'
    phishBtn.addEventListener('click', () => submitAnswer(true))
    legitBtn.addEventListener('click', () => submitAnswer(false))
    controls.append(phishBtn, legitBtn)

    wrap.append(status, stage, controls)
    view.append(wrap)
  }

  function startRun(): void {
    clearRevealTimer()
    runDeck = shuffle(DECK)
    index = 0
    score = 0
    streak = 0
    correctCount = 0
    falsePositives = 0
    missedTells.length = 0
    state = 'playing'
    host.root.dataset.state = state
    host.sfx('start')
    host.setScore(0)
    renderPlayingShell()
    renderNextCard()
    announce('Round started. Card 1 of 8.')
  }

  function finishRun(): void {
    clearRevealTimer()
    const prevBest = host.best
    const isNewBest = host.reportScore(score)
    const bestShown = isNewBest ? score : prevBest
    const xp = Math.min(correctCount * 5, 40)
    host.awardXP(xp, `Phish or Legit: ${correctCount}/${runDeck.length} correct`)
    if (correctCount === runDeck.length) host.unlock('phish-perfect')
    host.sfx(correctCount >= 6 ? 'win' : 'lose')
    state = 'over'
    host.root.dataset.state = state
    renderOver(isNewBest, bestShown, xp)
  }

  function renderOver(isNewBest: boolean, bestShown: number, xp: number): void {
    view.replaceChildren()
    const wrap = el('div', 'pl-over')
    wrap.append(
      el('p', 'pl-grade', gradeFor(correctCount)),
      el('p', 'pl-correct', `${correctCount}/${runDeck.length} correct`),
      el('p', 'pl-scoreline', `SCORE ${score}`),
      el('p', 'pl-bestline', `BEST ${bestShown}`),
    )
    if (isNewBest) wrap.append(el('p', 'pl-newbest', 'NEW BEST'))
    wrap.append(el('p', 'pl-xpline', `+${xp} XP`))

    if (missedTells.length || falsePositives) {
      const recap = el('div', 'pl-recap')
      recap.append(el('p', 'pl-recap-title', 'TELLS YOU MISSED'))
      if (missedTells.length) {
        const ul = document.createElement('ul')
        const seen = new Set<string>()
        for (const m of missedTells) {
          if (seen.has(m.label)) continue
          seen.add(m.label)
          const li = document.createElement('li')
          li.append(el('b', undefined, `${m.label}: `), document.createTextNode(m.note))
          ul.append(li)
        }
        recap.append(ul)
      }
      if (falsePositives) {
        recap.append(
          el('p', 'pl-recap-fp', `Also flagged ${falsePositives} genuine message${falsePositives > 1 ? 's' : ''} as phishing.`),
        )
      }
      wrap.append(recap)
    }

    const actions = el('div', 'pl-overactions')
    const againBtn = el('button', 'pl-btn pl-btn-again', 'PLAY AGAIN')
    againBtn.type = 'button'
    const exitBtn = el('button', 'pl-btn pl-btn-exit', 'EXIT')
    exitBtn.type = 'button'
    againBtn.addEventListener('click', () => startRun())
    exitBtn.addEventListener('click', () => {
      host.sfx('select')
      host.exit()
    })
    actions.append(againBtn, exitBtn)
    wrap.append(actions)

    view.append(wrap)
    announce(`Game over. ${correctCount} of ${runDeck.length} correct. ${gradeFor(correctCount)}. Score ${score}.`)
    againBtn.focus({ preventScroll: true })
  }

  function renderReady(): void {
    state = 'ready'
    host.root.dataset.state = state
    view.replaceChildren()
    const wrap = el('div', 'pl-ready')
    wrap.append(
      el('h1', 'pl-title', 'PHISH OR LEGIT'),
      el('p', 'pl-rules', '8 messages, mixed email and SMS. Call each one PHISH or LEGIT before the tells give it away.'),
      el('p', 'pl-controlshint', 'ArrowLeft / P = PHISH   ArrowRight / L = LEGIT   or drag the card'),
    )
    if (host.best > 0) wrap.append(el('p', 'pl-best', `BEST ${host.best}`))
    const startBtn = el('button', 'pl-btn pl-btn-start', 'START')
    startBtn.type = 'button'
    startBtn.addEventListener('click', () => startRun())
    wrap.append(startBtn)
    view.append(wrap)
    startBtn.focus({ preventScroll: true })
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLButtonElement) return
    if (state === 'ready' || state === 'over') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        startRun()
      }
      return
    }
    if (state === 'playing' && answerable) {
      if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        submitAnswer(true)
      } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        submitAnswer(false)
      }
    }
  }
  document.addEventListener('keydown', onKeydown)

  renderReady()

  return {
    destroy(): void {
      clearRevealTimer()
      document.removeEventListener('keydown', onKeydown)
      host.root.classList.remove('pl-root', 'pl-reduced')
      host.root.replaceChildren()
    },
    pause(): void {
      if (revealTimer !== undefined) {
        clearRevealTimer()
        pausedPending = true
      }
    },
    resume(): void {
      if (pausedPending) {
        pausedPending = false
        scheduleAdvance(host.fast ? 150 : 400)
      }
    },
  }
}

const phish: GameModule = {
  id: 'phish',
  title: 'Phish or Legit',
  blurb: 'Swipe scam messages left, real ones right. Eight cards, spot the tells before they catch you.',
  controls: 'ArrowLeft / P = PHISH, ArrowRight / L = LEGIT, or drag the card',
  mount,
}

export default phish
