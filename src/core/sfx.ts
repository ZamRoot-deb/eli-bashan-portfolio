// 8-bit sound effects synthesised with WebAudio. Muted by default; audio only starts after a
// user gesture (the sound toggle), which satisfies every autoplay policy.

import type { SfxName } from '../games/types'
import { emit } from './bus'
import { local } from './store'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = local.get<boolean>('ezb.muted', true)

export const isMuted = (): boolean => muted

function ensure(): AudioContext | null {
  if (ctx) return ctx
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.09
    master.connect(ctx.destination)
  } catch {
    ctx = null
  }
  return ctx
}

export function setMuted(value: boolean): void {
  muted = value
  local.set('ezb.muted', value)
  if (!value) {
    const c = ensure()
    void c?.resume().catch(() => undefined)
  }
  emit('sound', { on: !value })
}

type Wave = OscillatorType

function tone(freq: number, start: number, dur: number, type: Wave = 'square', vol = 1, slideTo?: number): void {
  if (!ctx || !master) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(vol, start + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g).connect(master)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

let noiseBuf: AudioBuffer | null = null
function noise(start: number, dur: number, vol = 0.6): void {
  if (!ctx || !master) return
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  src.buffer = noiseBuf
  g.gain.setValueAtTime(vol, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  src.connect(g).connect(master)
  src.start(start)
  src.stop(start + dur + 0.02)
}

const arp = (t: number, notes: number[], step: number, type: Wave = 'square', vol = 0.8) =>
  notes.forEach((f, i) => tone(f, t + i * step, step * 1.3, type, vol))

let lastType = 0

export function sfx(name: SfxName): void {
  if (muted) return
  const c = ensure()
  if (!c || c.state !== 'running') {
    void c?.resume().catch(() => undefined)
    if (!c || c.state !== 'running') return
  }
  const t = c.currentTime + 0.005
  switch (name) {
    case 'blip':
      tone(880, t, 0.04, 'square', 0.35)
      break
    case 'select':
      tone(660, t, 0.05, 'square', 0.6)
      tone(990, t + 0.05, 0.07, 'square', 0.6)
      break
    case 'start':
      arp(t, [523, 659, 784, 1047], 0.07)
      break
    case 'jump':
      tone(320, t, 0.14, 'square', 0.6, 720)
      break
    case 'coin':
      tone(988, t, 0.06, 'square', 0.6)
      tone(1319, t + 0.06, 0.18, 'square', 0.6)
      break
    case 'hit':
      noise(t, 0.14, 0.7)
      tone(140, t, 0.16, 'square', 0.6, 70)
      break
    case 'whack':
      noise(t, 0.05, 0.5)
      tone(260, t, 0.1, 'triangle', 0.9, 120)
      break
    case 'powerup':
      arp(t, [392, 523, 659, 784, 1047, 1319], 0.045)
      break
    case 'win':
      arp(t, [523, 659, 784, 1047, 784, 1047], 0.09)
      break
    case 'lose':
      tone(440, t, 0.45, 'square', 0.6, 90)
      break
    case 'tick':
      tone(1250, t, 0.025, 'square', 0.35)
      break
    case 'type': {
      const now = performance.now()
      if (now - lastType < 28) return
      lastType = now
      noise(t, 0.012, 0.18)
      break
    }
    case 'levelup':
      arp(t, [523, 659, 784, 1047, 1319, 1568], 0.06, 'square', 0.7)
      arp(t + 0.4, [1047, 1568], 0.12, 'triangle', 0.8)
      break
    case 'error':
      tone(220, t, 0.1, 'square', 0.6)
      tone(160, t + 0.11, 0.16, 'square', 0.6)
      break
  }
}
