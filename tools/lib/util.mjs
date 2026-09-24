// Small Node-side helpers shared by every group in groups.mjs, plus browser-side JS source
// snippets (strings injected into page.eval) so the same visibility/selector logic isn't
// duplicated across groups.
import { setTimeout as sleep } from 'node:timers/promises'

/** Poll `fn` (sync or async) until it returns a truthy value or `timeout` ms elapse. */
export async function waitFor(fn, { timeout = 5000, interval = 150 } = {}) {
  const start = Date.now()
  let last
  while (Date.now() - start < timeout) {
    last = await fn()
    if (last) return last
  }
  return last
}

export function makeCheck() {
  const reasons = []
  return {
    ok(cond, msg) {
      if (!cond) reasons.push(msg)
      return !!cond
    },
    fail(msg) {
      reasons.push(msg)
    },
    reasons,
  }
}

export function result(reasons, evidence) {
  return reasons.length === 0 ? { pass: true, notes: evidence } : { pass: false, notes: reasons.join(' | ') }
}

/**
 * Wrap a browser-side JS snippet in an async IIFE with __isVisible/__describe helpers already
 * in scope, so every group builds page.eval() calls the same safe way instead of hand-rolling
 * IIFE strings. `body` should `return` its result.
 */
export function browserExpr(body) {
  return `(async function(){\n${IS_VISIBLE_FN}\n${DESCRIBE_FN}\n${body}\n})()`
}

export { sleep }

// ---- Browser-side JS source fragments (used inside page.eval template strings) ----

// A visible element: attached, non-zero box, not display:none/visibility:hidden, opacity != 0.
export const IS_VISIBLE_FN = `
function __isVisible(e){
  if(!e||!e.isConnected) return false
  const r=e.getBoundingClientRect()
  if(r.width<=0||r.height<=0) return false
  const cs=getComputedStyle(e)
  if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0) return false
  // screen-reader-only content (sr-only / clip patterns) is not visible text
  for(let a=e;a&&a.nodeType===1;a=a.parentElement){
    const s=a===e?cs:getComputedStyle(a)
    if(s.clipPath==='inset(50%)'||s.clip==='rect(0px, 0px, 0px, 0px)') return false
    if(s.overflow!=='visible'){const b=a.getBoundingClientRect();if(b.width<=1&&b.height<=1) return false}
  }
  return true
}`

// Short, human-readable selector for an element (for FAIL evidence).
export const DESCRIBE_FN = `
function __describe(e){
  if(!e) return 'null'
  let s=e.tagName.toLowerCase()
  if(e.id) s+='#'+e.id
  const cls=(typeof e.className==='string'?e.className:'').split(/\\s+/).filter(Boolean).slice(0,2)
  if(cls.length) s+='.'+cls.join('.')
  for(const a of ['data-zone','data-hud','data-kind','data-game-id']){
    if(e.getAttribute&&e.getAttribute(a)) s+='['+a+'='+e.getAttribute(a)+']'
  }
  return s
}`
