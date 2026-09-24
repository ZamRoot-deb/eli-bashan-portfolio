// DOM helpers for the runtime layer.

import { GLYPHS, type GlyphName } from '../icons'

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null => root.querySelector<T>(sel)
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => [...root.querySelectorAll<T>(sel)]

type Attrs = Record<string, string | number | boolean | null | undefined>

/** Create an element. Strings become text nodes; there is deliberately no raw-markup path. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = String(v)
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of children) {
    if (c === null || c === false) continue
    el.append(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return el
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Create an SVG element with attributes (for rings and other small runtime drawings). */
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, ...children: SVGElement[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  el.append(...children)
  return el
}

// Glyph markup is the static, vendored Tabler set in src/icons.ts; parsed once per glyph and cloned.
const glyphTemplates = new Map<GlyphName, HTMLTemplateElement>()

export function glyph(name: GlyphName, cls = 'glyph'): HTMLSpanElement {
  let t = glyphTemplates.get(name)
  if (!t) {
    t = document.createElement('template')
    t.innerHTML = GLYPHS[name]
    glyphTemplates.set(name, t)
  }
  return h('span', { class: cls, 'aria-hidden': 'true' }, t.content.cloneNode(true))
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
