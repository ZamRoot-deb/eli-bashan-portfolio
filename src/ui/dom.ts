// DOM helpers for the runtime layer.

import { GLYPHS, type GlyphName } from '../icons'

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel)
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(sel)]

type Attrs = Record<string, string | number | boolean | null | undefined>

/** Create an element; `html` children are inserted as markup, others as text. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = String(v)
    else if (k === 'html') el.innerHTML = String(v)
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of children) {
    if (c === null || c === false) continue
    el.append(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return el
}

export function glyph(name: GlyphName, cls = 'glyph'): HTMLSpanElement {
  return h('span', { class: cls, 'aria-hidden': 'true', html: GLYPHS[name] })
}

export const uiRoot = (): HTMLElement => {
  let el = document.getElementById('ui-root')
  if (!el) {
    el = h('div', { id: 'ui-root' })
    document.body.append(el)
  }
  return el
}

/** Run init functions without letting one failure take the page down. */
export function safe(name: string, fn: () => void): void {
  try {
    fn()
  } catch (err) {
    console.error(`[ezb] ${name} failed to start`, err)
  }
}

/** Observe an element entering the viewport once. */
export function onceVisible(el: Element, fn: () => void, rootMargin = '0px 0px -8% 0px'): void {
  if (!('IntersectionObserver' in window)) {
    fn()
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.disconnect()
          fn()
        }
      }
    },
    { rootMargin },
  )
  io.observe(el)
}

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))
