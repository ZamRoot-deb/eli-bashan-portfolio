// Accessible modal dialogs with a stack (a game can open on top of the terminal).
// Escape closes the top dialog, Tab is trapped inside it, focus returns to where it came from,
// and the page behind is made inert while any dialog is open.

import { $$, glyph, h, uiRoot } from './dom'
import type { GlyphName } from '../icons'

export interface Dialog {
  el: HTMLElement
  panel: HTMLElement
  head: HTMLElement
  body: HTMLElement
  titleEl: HTMLElement
  open(): void
  close(): void
  isOpen(): boolean
}

interface Opts {
  id: string
  title: string
  variant: 'terminal' | 'game' | 'end' | 'map' | 'trophies'
  hook: string // data attribute name set on the root, e.g. 'data-terminal'
  hue?: string
  closeHook?: string
  bodyClass?: string
  onOpen?: () => void
  onClose?: () => void
  icon?: GlyphName
}

const stack: { d: Dialog; opts: Opts; returnTo: HTMLElement | null }[] = []

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function setInert(on: boolean): void {
  for (const el of $$('.world, .foot, .hud, .minimap, .scrolltop, .skip')) {
    if (on) el.setAttribute('inert', '')
    else el.removeAttribute('inert')
  }
}

function syncLayers(): void {
  stack.forEach((entry, i) => {
    if (i < stack.length - 1) entry.d.el.setAttribute('inert', '')
    else entry.d.el.removeAttribute('inert')
  })
  setInert(stack.length > 0)
}

document.addEventListener('keydown', (e) => {
  const top = stack[stack.length - 1]
  if (!top) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    top.d.close()
    return
  }
  if (e.key === 'Tab') {
    const items = $$<HTMLElement>(FOCUSABLE, top.d.panel).filter((el) => el.offsetParent !== null || el === document.activeElement)
    if (!items.length) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    } else if (!top.d.panel.contains(document.activeElement)) {
      e.preventDefault()
      first.focus()
    }
  }
}, true)

export function createDialog(opts: Opts): Dialog {
  const titleId = `${opts.id}-title`
  const titleEl = h('h2', { class: 'dlg__title', id: titleId }, opts.title)
  const closeBtn = h('button', { class: 'dlg__close', type: 'button', 'aria-label': 'Close (Escape)', [opts.closeHook ?? 'data-close']: '' }, glyph('x'))
  const head = h('div', { class: 'dlg__head' }, titleEl, closeBtn)
  const body = h('div', { class: opts.bodyClass ?? 'dlg__body' })
  const panel = h('div', { class: 'dlg__panel', style: opts.hue ? `--c:${opts.hue}` : undefined }, head, body)
  const el = h('div', {
    class: `dlg dlg--${opts.variant}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': titleId,
    [opts.hook]: '',
    hidden: true,
  }, panel)
  uiRoot().append(el)

  // click on the backdrop (outside the panel) closes
  el.addEventListener('pointerdown', (e) => {
    if (e.target === el) d.close()
  })
  closeBtn.addEventListener('click', () => d.close())

  const d: Dialog = {
    el,
    panel,
    head,
    body,
    titleEl,
    isOpen: () => !el.hidden,
    open() {
      if (!el.hidden) return
      const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
      stack.push({ d, opts, returnTo })
      el.hidden = false
      syncLayers()
      opts.onOpen?.()
      if (!panel.contains(document.activeElement)) {
        const first = panel.querySelector<HTMLElement>('[autofocus], input, ' + FOCUSABLE)
        ;(first ?? closeBtn).focus({ preventScroll: true })
      }
    },
    close() {
      if (el.hidden) return
      const i = stack.findIndex((s) => s.d === d)
      const entry = i >= 0 ? stack.splice(i, 1)[0] : null
      el.hidden = true
      syncLayers()
      opts.onClose?.()
      const back = entry?.returnTo
      if (back && document.contains(back)) back.focus({ preventScroll: true })
    },
  }
  return d
}

export const anyDialogOpen = (): boolean => stack.length > 0
export const topDialog = (): Dialog | null => stack[stack.length - 1]?.d ?? null
