// Minimal zero-dependency CDP driver: headless Chrome talking raw DevTools Protocol over WebSocket.
// Adapted from the owner's kharis-aletheia tools/browser/cdp.mjs for a *served* (http://) page instead
// of file://, with GPU on (canvas/WebGL), key-event dispatch, media emulation and 4xx/5xx tracking.
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const CHROME_PATH = process.env.CHROME_PATH || DEFAULT_CHROME

// Well-known key definitions for the special keys this site's contract needs.
export const KEYS = {
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
  Backquote: { key: '`', code: 'Backquote', windowsVirtualKeyCode: 192, text: '`' },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 },
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
  KeyA: { key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, text: 'a' },
  KeyB: { key: 'b', code: 'KeyB', windowsVirtualKeyCode: 66, text: 'b' },
}

export async function launch({ port = 9700 + Math.floor(Math.random() * 200) } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'ezb-verify-chrome-'))
  mkdirSync(profile, { recursive: true })
  const proc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--mute-audio',
      '--use-angle=metal',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  // A bad CHROME_PATH (or any spawn failure) fires an async 'error' event on the child process;
  // without a handler here that's an unhandled-error crash with a raw stack trace instead of the
  // clean message below.
  let spawnError = null
  proc.on('error', e => { spawnError = e })
  let ver
  for (let i = 0; i < 80; i++) {
    if (spawnError) break
    try {
      ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
      break
    } catch {
      await sleep(250)
    }
  }
  if (!ver) {
    try { proc.kill() } catch {}
    const why = spawnError ? `: ${spawnError.message}` : ' (timed out waiting for the DevTools endpoint)'
    throw new Error(`Chrome did not start (binary: ${CHROME_PATH}; set CHROME_PATH to override)${why}`)
  }
  const ws = new WebSocket(ver.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  let id = 0
  const pending = new Map()
  const listeners = new Set()
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? rej(new Error(m.error.message)) : res(m.result)
    } else if (m.method) {
      listeners.forEach(fn => fn(m))
    }
  }
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const i = ++id
      pending.set(i, { res, rej })
      ws.send(JSON.stringify({ id: i, method, params, sessionId }))
    })
  return {
    send,
    on: fn => listeners.add(fn),
    off: fn => listeners.delete(fn),
    async close() {
      try {
        await send('Browser.close')
      } catch {}
      try {
        ws.close()
      } catch {}
      try {
        proc.kill('SIGKILL')
      } catch {}
      try {
        rmSync(profile, { recursive: true, force: true })
      } catch {}
    },
  }
}

/**
 * @param {*} b browser handle from launch()
 * @param {{width?:number,height?:number,mobile?:boolean,reducedMotion?:boolean,initScripts?:string[]}} opts
 */
export async function openPage(b, opts = {}) {
  const { width = 1440, height = 900, mobile = false, reducedMotion = false, initScripts = [] } = opts
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true })
  const s = (m, p) => b.send(m, p, sessionId)
  const errors = []
  const reqs = new Map()
  const onEvt = m => {
    if (m.sessionId !== sessionId) return
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      errors.push(`EXCEPTION ${d.exception?.description || d.text} @${(d.url || '').split('/').pop()}:${d.lineNumber}`)
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('CONSOLE ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300))
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      errors.push(`LOG ${m.params.entry.text} ${(m.params.entry.url || '').split('/').slice(-2).join('/')}`)
    } else if (m.method === 'Network.loadingFailed' && !m.params.canceled) {
      errors.push(`NETFAIL ${m.params.errorText} ${reqs.get(m.params.requestId) || ''}`)
    } else if (m.method === 'Network.requestWillBeSent') {
      reqs.set(m.params.requestId, m.params.request.url)
    } else if (m.method === 'Network.responseReceived') {
      const { status, url } = m.params.response
      // Collect everything faithfully here, including 4xx/5xx on third-party font hosts; the
      // "ignore only when offline" policy is a reporting decision applied later by the console
      // group (groups.mjs), which knows whether this run has internet access.
      if (status >= 400) errors.push(`HTTP${status} ${url}`)
    }
  }
  b.on(onEvt)
  await s('Page.enable')
  await s('Runtime.enable')
  await s('Log.enable')
  await s('Network.enable')
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile })
  if (mobile) await s('Emulation.setTouchEmulationEnabled', { enabled: true })
  await s('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }],
  })
  for (const source of initScripts) {
    await s('Page.addScriptToEvaluateOnNewDocument', { source })
  }
  const page = {
    s,
    sessionId,
    errors,
    width,
    height,
    async goto(url, settle = 400) {
      const loaded = new Promise(res => {
        const fn = m => {
          if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') {
            b.off(fn)
            res()
          }
        }
        b.on(fn)
      })
      await s('Page.navigate', { url })
      await Promise.race([loaded, sleep(20000)])
      await sleep(settle)
    },
    // Runs `expr` inside the *browser under test* via CDP Runtime.evaluate (like Puppeteer's
    // page.evaluate) — not Node's eval(). Only ever called with hardcoded assertion snippets
    // from this repo's own verify code against a throwaway, isolated headless Chrome instance.
    async eval(expr) {
      const r = await s('Runtime.evaluate', {
        expression: expr,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
      })
      if (r.exceptionDetails) {
        throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
      }
      return r.result.value
    },
    async shot(file, full = false) {
      const r = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full })
      const { writeFileSync, mkdirSync: mkd } = await import('node:fs')
      const { dirname } = await import('node:path')
      mkd(dirname(file), { recursive: true })
      writeFileSync(file, Buffer.from(r.data, 'base64'))
    },
    async mouseMove(x, y) {
      await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    },
    async clickPoint(x, y) {
      await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
      await s('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
      await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    },
    async click(sel) {
      const r = await page.eval(
        `(()=>{let e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'center',inline:'center',behavior:'instant'});const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2,w:b.width,h:b.height}})()`,
      )
      if (!r) return 'MISSING'
      await sleep(60)
      await page.clickPoint(r.x, r.y)
      return 'ok'
    },
    /** Real keyboard event for one of the KEYS above. */
    async key(name, extra = {}) {
      const def = KEYS[name]
      if (!def) throw new Error(`unknown key ${name}`)
      await s('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...def, ...extra })
      if (def.text) await s('Input.dispatchKeyEvent', { type: 'char', ...def, ...extra })
      await s('Input.dispatchKeyEvent', { type: 'keyUp', ...def, ...extra })
    },
    /** Insert text into the currently-focused editable element (real insertion, fires input events). */
    async insertText(text) {
      await s('Input.insertText', { text })
    },
    async type(sel, val) {
      return page.eval(
        `(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'MISSING';const d=Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value');d.set.call(e,${JSON.stringify(val)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'})()`,
      )
    },
    async close() {
      b.off(onEvt)
      try {
        await b.send('Target.closeTarget', { targetId })
      } catch {}
    },
  }
  return page
}

export { sleep }
