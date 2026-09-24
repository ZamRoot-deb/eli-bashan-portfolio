// Zone interactions that turn reading into play: insert cartridges, decrypt case files, filter
// the inventory, inspect badges, copy contacts. Each counts toward an achievement.

import { PLATFORMS } from '../content'
import { sfx } from '../core/sfx'
import { count, counted, unlock } from '../core/xp'
import { $, $$, h } from './dom'
import { scramble } from './fx'

function initCartridges(): void {
  const carts = $$<HTMLElement>('[data-platform]')
  const done = new Set(counted('carts'))
  for (const cart of carts) {
    const id = cart.dataset.id ?? ''
    const p = PLATFORMS.find((x) => x.id === id)
    const status = h('span', { class: 'cart__status', 'aria-live': 'polite' })
    const btn = h('button', { class: 'cart__insert', type: 'button', 'aria-pressed': 'false' }, 'Insert cartridge')
    const body = cart.querySelector('.cart__body')
    body?.append(h('div', { class: 'cart__deck' }, btn, status))
    const insert = () => {
      const on = !cart.classList.contains('is-inserted')
      cart.classList.toggle('is-inserted', on)
      btn.setAttribute('aria-pressed', String(on))
      btn.textContent = on ? 'Eject' : 'Insert cartridge'
      if (!on) {
        status.textContent = ''
        return
      }
      sfx('start')
      const name = cart.querySelector<HTMLElement>('.cart__name')
      if (name) {
        name.classList.add('is-glitching')
        window.setTimeout(() => name.classList.remove('is-glitching'), 450)
      }
      status.textContent = `${(p?.name ?? id).toUpperCase().replace(/\s+/g, '_')}.ROM loaded, ${p?.stack.length ?? 0} stack modules, status: live in production`
      const n = count('carts', id)
      if (n >= PLATFORMS.length) unlock('collector')
    }
    btn.addEventListener('click', insert)
    cart.querySelector('.cart__shell')?.addEventListener('click', insert)
    if (done.has(id)) cart.dataset.visited = 'true'
  }
}

function initDossiers(): void {
  const total = $$('[data-case]').length
  for (const d of $$<HTMLElement>('[data-case]')) {
    const title = d.querySelector<HTMLElement>('[data-decrypt]')
    if (!title) continue
    d.tabIndex = 0
    d.setAttribute('aria-label', `Case file: ${title.textContent ?? ''}`)
    let busy = false
    const decrypt = () => {
      if (busy) return
      busy = true
      const stamp = d.querySelector('.dossier__stamp')
      void scramble(title, 650).then(() => {
        busy = false
        if (stamp) stamp.textContent = 'Opened'
        d.dataset.open = 'true'
        const n = count('cases', title.dataset.text ?? title.textContent ?? '')
        if (n >= total) unlock('decryptor')
      })
      sfx('blip')
    }
    d.addEventListener('pointerenter', decrypt)
    d.addEventListener('focus', decrypt)
    d.addEventListener('click', decrypt)
  }
}

function initInventory(): void {
  const buttons = $$<HTMLButtonElement>('[data-filter]')
  const groups = $$<HTMLElement>('[data-stack-group]')
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const f = b.dataset.filter
      for (const x of buttons) {
        const on = x === b
        x.classList.toggle('is-on', on)
        x.setAttribute('aria-pressed', String(on))
      }
      for (const g of groups) g.hidden = f !== 'all' && g.dataset.group !== f
      sfx('select')
    })
  }
  let lastBlip = 0
  for (const item of $$('[data-stack-item]')) {
    item.addEventListener('pointerenter', () => {
      const now = performance.now()
      if (now - lastBlip > 90) {
        lastBlip = now
        sfx('blip')
      }
    })
  }
}

function initBadges(): void {
  const badges = $$<HTMLButtonElement>('[data-cert]')
  const counter = $('[data-badge-count]')
  const seen = new Set(counted('certs'))
  const paint = () => {
    if (counter) counter.textContent = `${seen.size}/${badges.length} inspected`
  }
  badges.forEach((b, i) => {
    const key = String(i)
    if (seen.has(key)) {
      b.dataset.seen = 'true'
      b.setAttribute('aria-pressed', 'true')
    }
    b.addEventListener('click', () => {
      b.classList.remove('is-flipping')
      void b.offsetWidth
      b.classList.add('is-flipping')
      b.dataset.seen = 'true'
      b.setAttribute('aria-pressed', 'true')
      sfx('coin')
      seen.add(key)
      const n = count('certs', key)
      paint()
      if (n >= badges.length) unlock('librarian')
    })
  })
  paint()
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fallback: select a temporary field so the player can press copy themselves
    const ta = h('textarea', { class: 'sr-only', readonly: true })
    ta.value = text
    document.body.append(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}

function initContact(): void {
  for (const b of $$<HTMLButtonElement>('[data-copy]')) {
    b.addEventListener('click', () => {
      const value = b.dataset.copy ?? ''
      void copyText(value).then((ok) => {
        const label = b.querySelector('.row__copied')
        if (label) label.textContent = ok ? 'Copied' : 'Select it'
        b.classList.add('is-copied')
        window.setTimeout(() => b.classList.remove('is-copied'), 1400)
        sfx(ok ? 'coin' : 'error')
        unlock('hello-world')
      })
    })
  }
  for (const a of $$<HTMLAnchorElement>('a[href^="mailto:"], a[href^="tel:"]')) a.addEventListener('click', () => unlock('hello-world'))
  for (const a of $$<HTMLAnchorElement>('[data-save-cv]')) {
    a.addEventListener('click', () => {
      sfx('coin')
      unlock('save-game')
    })
  }
}

export function initInteract(): void {
  initCartridges()
  initDossiers()
  initInventory()
  initBadges()
  initContact()
}
