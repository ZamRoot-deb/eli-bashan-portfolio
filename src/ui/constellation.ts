// Impact constellation: an interactive star-map of delivered-work metrics.
//
// Progressively enhances the pre-rendered `[data-constellation]` markup (a `<ul>` of
// `[data-metric]` items). Lays out 5 cluster hubs in a pentagon and orbits each metric
// around its hub with a small hand-rolled force simulation, settled synchronously before
// the first paint. Everything decorative (hubs, links, nodes, sweep, particles) is drawn
// on a single canvas; only the floating info card, the "stars mapped" counter and the
// pre-rendered list are real DOM, so keyboard and screen-reader users get the same
// information sighted pointer users get from the canvas.
import { METRICS, METRIC_CLUSTERS, type MetricCluster } from '../content'
import { HUE, PAPER, DIM, LINE, rgba } from '../core/palette'
import './constellation.css'

export interface ConstellationOptions {
  reducedMotion: boolean
  /** First time a node is inspected (hover, tap or keyboard focus). */
  onDiscover?: (id: string, discovered: number, total: number) => void
  /** All metrics have been inspected at least once. */
  onComplete?: () => void
}

interface ConstellationHandle {
  destroy(): void
}

// ---------- tuning constants ----------

const IGNITE_HUB_MS = 220
const IGNITE_STAGGER_MS = 42
const IGNITE_NODE_DUR = 380
const DRIFT_AMP = 3
const HUB_DRIFT_AMP = 1.4
const SWEEP_PERIOD_MS = 7000
const SPRING_STIFFNESS = 0.16
const SPRING_DAMPING = 0.78
const SCALE_EASE = 0.22
const ACTIVE_SCALE = 1.3
const HIT_PAD = 7
const NODE_PAD = 20
const HUB_RELAX_ITERS = 90
const NODE_RELAX_ITERS = 160
const DUST_COUNT = 46
const RESIZE_DEBOUNCE_MS = 120

// ---------- small deterministic helpers ----------

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: tiny, fast, deterministic PRNG (public-domain algorithm). */
function mulberry32(seed: number): () => number {
  let a = seed | 0
  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function newRng(): () => number {
  return mulberry32(hashStr('ezb-constellation-v1'))
}

/** Reads the leading numeric magnitude out of a metric value string, e.g. "$240K+" -> 240000. */
function parseMagnitude(value: string): number {
  const cleaned = value.replace(/,/g, '')
  const m = cleaned.match(/([\d.]+)\s*(K|k)?/)
  if (!m) return 1
  const n = parseFloat(m[1])
  if (Number.isNaN(n)) return 1
  return Math.max(1, m[2] ? n * 1000 : n)
}

function easeOutBack(p: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  const x = p - 1
  return 1 + c3 * x * x * x + c1 * x * x
}

function roundRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  c.beginPath()
  c.moveTo(x + rr, y)
  c.arcTo(x + w, y, x + w, y + h, rr)
  c.arcTo(x + w, y + h, x, y + h, rr)
  c.arcTo(x, y + h, x, y, rr)
  c.arcTo(x, y, x + w, y, rr)
  c.closePath()
}

// ---------- runtime model ----------

interface RuntimeHub {
  id: string
  label: string
  hue: string
  angle0: number // ideal pentagon angle, radians
  seed: number
  x: number
  y: number
  labelGap: number // distance from hub centre to the label pill, set at layout time
  nodes: RuntimeNode[]
}

interface RuntimeNode {
  id: string
  value: string
  label: string
  clusterLabel: string
  hue: string
  hub: RuntimeHub
  radiusUnit: number // base radius at sizeFactor === 1
  radius: number // current radius, sizeFactor applied at layout time
  orbit: number // target distance from hub
  textHalfWidth: number // half-width of the rendered value text, for label-safe spacing
  homeX: number
  homeY: number
  x: number
  y: number
  vx: number
  vy: number
  scale: number // current rendered scale (ignition bloom, then hover/select grow)
  igniteAt: number // ms offset into the ignition sequence
  igniteDone: boolean
  igniteProgress: number // 0..1, linear; drives the line "drawing in" toward the node
  discovered: boolean
  dragging: boolean
  springing: boolean
  driftPhaseX: number
  driftPhaseY: number
  twinklePhase: number
  li: HTMLLIElement | null
}

interface Dust {
  tx: number
  ty: number
  r: number
  phase: number
}

interface Pulse {
  x: number
  y: number
  hue: string
  born: number
  life: number
}

interface Burst {
  x: number
  y: number
  vx: number
  vy: number
  hue: string
  born: number
  life: number
}

function buildDust(): Dust[] {
  const rng = mulberry32(hashStr('ezb-constellation-dust'))
  const out: Dust[] = []
  for (let i = 0; i < DUST_COUNT; i++) {
    out.push({ tx: rng(), ty: rng(), r: 0.6 + rng() * 1.1, phase: rng() * Math.PI * 2 })
  }
  return out
}

export function mountConstellation(root: HTMLElement, opts: ConstellationOptions): ConstellationHandle {
  const noop: ConstellationHandle = { destroy() {} }
  const originalHTML = root.innerHTML
  const reducedMotion = opts.reducedMotion
  const total = METRICS.length

  const ul = root.querySelector<HTMLUListElement>('.constellation__list')
  const liById = new Map<string, HTMLLIElement>()
  if (ul) {
    ul.querySelectorAll<HTMLLIElement>('[data-metric]').forEach((li) => {
      const id = li.dataset.id
      if (id) liById.set(id, li)
    })
  }

  const canvas = document.createElement('canvas')
  canvas.className = 'constellation__canvas'
  canvas.setAttribute('aria-hidden', 'true')
  const ctx2d = canvas.getContext('2d')
  if (!ctx2d) return noop // leave the pre-rendered list exactly as given; nothing was mutated yet
  // Re-bind to a const whose inferred type is the narrowed non-null context: nested
  // function declarations below close over `ctx`'s static type, not a flow-narrowed one.
  const ctx = ctx2d

  // ---------- DOM: stage, counter chip, info card ----------

  const stage = document.createElement('div')
  stage.className = 'constellation__stage'

  const counter = document.createElement('div')
  counter.className = 'constellation__counter'
  counter.setAttribute('aria-hidden', 'true')
  const counterValue = document.createElement('b')
  counterValue.textContent = '0'
  counter.append('STARS MAPPED ', counterValue, `/${total}`)

  const card = document.createElement('div')
  card.className = 'constellation__card'
  card.setAttribute('aria-live', 'polite')
  card.dataset.state = 'idle'
  const cardHint = document.createElement('span')
  cardHint.className = 'constellation__card-hint'
  cardHint.textContent = 'Hover or select a star'
  const cardValue = document.createElement('span')
  cardValue.className = 'constellation__card-value'
  const cardLabel = document.createElement('span')
  cardLabel.className = 'constellation__card-label'
  const cardCluster = document.createElement('span')
  cardCluster.className = 'constellation__card-cluster'
  card.append(cardHint, cardValue, cardLabel, cardCluster)

  stage.append(canvas, counter, card)
  root.insertBefore(stage, ul)

  // ---------- build hubs + nodes from content.ts ----------

  const clusterById = new Map<string, MetricCluster>(METRIC_CLUSTERS.map((c) => [c.id, c]))
  const hubs: RuntimeHub[] = METRIC_CLUSTERS.map((c, i) => ({
    id: c.id,
    label: c.label,
    hue: HUE[c.hue],
    angle0: -Math.PI / 2 + (i * 2 * Math.PI) / METRIC_CLUSTERS.length,
    seed: hashStr(`hub:${c.id}`),
    x: 0,
    y: 0,
    labelGap: 0,
    nodes: [],
  }))
  const hubById = new Map(hubs.map((h) => [h.id, h]))

  const mags = METRICS.map((m) => parseMagnitude(m.value))
  const logs = mags.map((v) => Math.log10(v + 1))
  const logLo = Math.min(...logs)
  const logHi = Math.max(...logs)

  const nodes: RuntimeNode[] = []
  METRICS.forEach((m, i) => {
    const hub = hubById.get(m.cluster)
    if (!hub) return // defensive: content.ts drift should never crash the map
    const cluster = clusterById.get(m.cluster)
    const t = logHi > logLo ? (logs[i] - logLo) / (logHi - logLo) : 0.5
    const node: RuntimeNode = {
      id: m.id,
      value: m.value,
      label: m.label,
      clusterLabel: cluster ? cluster.label : m.cluster,
      hue: hub.hue,
      hub,
      radiusUnit: lerp(7, 11, t),
      radius: 0,
      orbit: 0,
      textHalfWidth: 0,
      homeX: 0,
      homeY: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      scale: reducedMotion ? 1 : 0,
      igniteAt: IGNITE_HUB_MS + nodes.length * IGNITE_STAGGER_MS,
      igniteDone: reducedMotion,
      igniteProgress: reducedMotion ? 1 : 0,
      discovered: false,
      dragging: false,
      springing: false,
      driftPhaseX: 0,
      driftPhaseY: 0,
      twinklePhase: 0,
      li: liById.get(m.id) ?? null,
    }
    hub.nodes.push(node)
    nodes.push(node)
  })
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const dust = buildDust()

  // ---------- mutable runtime state ----------

  let width = 0
  let height = 0
  let sizeFactor = 1
  let clockNow = 0
  let hubGlow = reducedMotion ? 1 : 0
  let ignited = reducedMotion
  let allIgnited = reducedMotion
  let ignitionStart = 0
  let sweepAngle = 0
  let pulses: Pulse[] = []
  let bursts: Burst[] = []
  let discoveredCount = 0

  let pointerActiveId: string | null = null
  let tapActiveId: string | null = null
  let focusActiveId: string | null = null
  let lastActiveId: string | null | undefined
  let dragId: string | null = null
  let dragMoved = false
  let dragStartX = 0
  let dragStartY = 0
  let dragOffX = 0
  let dragOffY = 0

  let rafId = 0
  let isVisible = false
  let resizeTimer = 0

  function activeId(): string | null {
    return focusActiveId ?? pointerActiveId ?? tapActiveId
  }

  // ---------- layout: settle hubs + nodes synchronously ----------

  function layout(): void {
    const rect = stage.getBoundingClientRect()
    width = Math.max(240, Math.round(rect.width))
    height = Math.max(200, Math.round(rect.height))
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    sizeFactor = clamp(Math.min(width, height) / 560, 0.6, 1.15)

    const cx = width / 2
    const cy = height / 2
    const basis = Math.min(width, height * 1.5)
    const hubR = clamp(basis * 0.33, 70, 250)
    const pad = 40 * sizeFactor

    const rng = newRng()
    for (const hub of hubs) {
      const jitterAngle = (rng() - 0.5) * 0.35
      const jitterR = 1 + (rng() - 0.5) * 0.22
      hub.x = cx + Math.cos(hub.angle0 + jitterAngle) * hubR * jitterR
      hub.y = cy + Math.sin(hub.angle0 + jitterAngle) * hubR * jitterR
    }
    for (let iter = 0; iter < HUB_RELAX_ITERS; iter++) {
      for (const a of hubs) {
        let fx = 0
        let fy = 0
        for (const b of hubs) {
          if (a === b) continue
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy) || 0.001
          const minDist = hubR * 0.95
          if (dist < minDist) {
            const push = (minDist - dist) / dist
            fx += dx * push * 0.5
            fy += dy * push * 0.5
          }
        }
        const idealX = cx + Math.cos(a.angle0) * hubR
        const idealY = cy + Math.sin(a.angle0) * hubR
        fx += (idealX - a.x) * 0.02
        fy += (idealY - a.y) * 0.02
        a.x = clamp(a.x + fx, pad, width - pad)
        a.y = clamp(a.y + fy, pad, height - pad)
      }
    }

    for (const hub of hubs) {
      const k = hub.nodes.length
      const orbit = clamp((26 + k * 6) * sizeFactor, 20, 74)
      const spread = (2 * Math.PI) / Math.max(1, k)
      // Hub label sits outside the node ring, and the first node starts half a slot away
      // from the label's direction (hub.angle0) so no node's angular slot lands on it.
      hub.labelGap = orbit + 18 * sizeFactor
      hub.nodes.forEach((node, idx) => {
        const jitter = (rng() - 0.5) * spread * 0.5
        const angle = hub.angle0 + spread / 2 + idx * spread + jitter
        node.orbit = orbit
        node.radius = node.radiusUnit * sizeFactor
        node.x = hub.x + Math.cos(angle) * orbit
        node.y = hub.y + Math.sin(angle) * orbit
        node.textHalfWidth = fitNodeValueFont(node).width / 2
        node.driftPhaseX = rng() * Math.PI * 2
        node.driftPhaseY = rng() * Math.PI * 2
        node.twinklePhase = rng() * Math.PI * 2
        node.vx = 0
        node.vy = 0
      })
    }

    for (let iter = 0; iter < NODE_RELAX_ITERS; iter++) {
      for (const node of nodes) {
        let fx = 0
        let fy = 0
        for (const other of nodes) {
          if (other === node) continue
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.hypot(dx, dy) || 0.001
          // Padding grows with both nodes' value-text width so long labels ("8,500",
          // "1,500+") never render on top of a neighbour, not just their circles.
          const textPad = (node.textHalfWidth + other.textHalfWidth) * 0.6
          const minDist = node.radius + other.radius + NODE_PAD * sizeFactor + textPad
          if (dist < minDist) {
            const push = (minDist - dist) / dist
            fx += (dx / dist) * push * 1.6
            fy += (dy / dist) * push * 1.6
          }
        }
        const hdx = node.x - node.hub.x
        const hdy = node.y - node.hub.y
        const hdist = Math.hypot(hdx, hdy) || 0.001
        const diff = node.orbit - hdist
        fx += (hdx / hdist) * diff * 0.05
        fy += (hdy / hdist) * diff * 0.05
        for (const other of hubs) {
          if (other === node.hub) continue
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.hypot(dx, dy) || 0.001
          const guard = node.orbit + 30 * sizeFactor
          if (dist < guard) {
            const push = (guard - dist) / dist
            fx += (dx / dist) * push * 0.4
            fy += (dy / dist) * push * 0.4
          }
        }
        node.vx = (node.vx + fx) * 0.8
        node.vy = (node.vy + fy) * 0.8
        node.x = clamp(node.x + node.vx, pad, width - pad)
        node.y = clamp(node.y + node.vy, pad, height - pad)
      }
    }

    for (const node of nodes) {
      node.homeX = node.x
      node.homeY = node.y
      node.vx = 0
      node.vy = 0
      node.dragging = false
      node.springing = false
    }
  }

  // ---------- drawing ----------

  function focusFactorFor(node: RuntimeNode, active: string | null): number {
    if (!active) return 1
    return node.id === active ? 1 : 0.22
  }

  function hubFocusFactor(hub: RuntimeHub, active: string | null): number {
    if (!active) return 1
    const activeNode = nodeById.get(active)
    return activeNode && activeNode.hub === hub ? 1 : 0.35
  }

  function drawDust(): void {
    for (const d of dust) {
      const alpha = reducedMotion ? 0.35 : 0.2 + 0.25 * (0.5 + 0.5 * Math.sin(clockNow * 0.0007 + d.phase))
      ctx.beginPath()
      ctx.arc(d.tx * width, d.ty * height, d.r * sizeFactor, 0, Math.PI * 2)
      ctx.fillStyle = rgba(PAPER, alpha * 0.5)
      ctx.fill()
    }
  }

  function drawHubRing(): void {
    if (hubs.length < 2) return
    ctx.beginPath()
    hubs.forEach((hub, i) => {
      if (i === 0) ctx.moveTo(hub.x, hub.y)
      else ctx.lineTo(hub.x, hub.y)
    })
    ctx.closePath()
    ctx.strokeStyle = rgba(LINE, 0.4)
    ctx.lineWidth = 1
    ctx.stroke()
  }

  function drawNodeLine(node: RuntimeNode, active: string | null): void {
    if (node.igniteProgress <= 0) return
    const factor = focusFactorFor(node, active)
    const isActive = node.dragging || node.id === active
    // During ignition the line draws in from the hub out to the node, catching up to
    // its final endpoint once igniteProgress reaches 1.
    const ex = node.igniteProgress < 1 ? lerp(node.hub.x, node.x, node.igniteProgress) : node.x
    const ey = node.igniteProgress < 1 ? lerp(node.hub.y, node.y, node.igniteProgress) : node.y
    ctx.beginPath()
    ctx.moveTo(node.hub.x, node.hub.y)
    ctx.lineTo(ex, ey)
    ctx.strokeStyle = rgba(node.hue, (isActive ? 0.85 : 0.24) * factor * node.igniteProgress)
    ctx.lineWidth = isActive ? 1.6 : 1
    ctx.stroke()
  }

  function drawHubLabel(hub: RuntimeHub, x: number, y: number, factor: number): void {
    // Placed along the ray from the canvas centre through the hub, so adjacent hubs'
    // labels fan outward away from each other instead of stacking on the same side.
    const text = hub.label.toUpperCase()
    ctx.font = `9px 'Press Start 2P', 'IBM Plex Mono', monospace`
    const padX = 7
    const padY = 5
    const tw = ctx.measureText(text).width
    const pillW = tw + padX * 2
    const pillH = 9 + padY * 2
    const outward = Math.atan2(y - height / 2, x - width / 2)
    // Distance from the pill's centre to its own edge along the outward ray (the
    // rectangle's support function): pillW/2 for a horizontal ray, pillH/2 for a
    // vertical one, blended in between. A flat pillH/2 under-clears near-horizontal
    // hubs, where the pill's wide axis is the one pointing at the node ring.
    const halfExtent = Math.abs(Math.cos(outward)) * (pillW / 2) + Math.abs(Math.sin(outward)) * (pillH / 2)
    const gap = hub.labelGap + halfExtent
    const lcx = x + Math.cos(outward) * gap
    const lcy = y + Math.sin(outward) * gap
    const px = clamp(lcx - pillW / 2, 4, width - pillW - 4)
    const py = clamp(lcy - pillH / 2, 4, height - pillH - 4)
    roundRectPath(ctx, px, py, pillW, pillH, 4)
    ctx.fillStyle = rgba(hub.hue, 0.16 * factor)
    ctx.fill()
    ctx.strokeStyle = rgba(hub.hue, 0.7 * factor)
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = rgba(PAPER, 0.92 * factor)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, px + pillW / 2, py + pillH / 2 + 1)
  }

  function drawHub(hub: RuntimeHub, active: string | null): void {
    const factor = hubFocusFactor(hub, active)
    const dx = reducedMotion ? 0 : Math.sin(clockNow * 0.0003 + hub.seed) * HUB_DRIFT_AMP * sizeFactor
    const dy = reducedMotion ? 0 : Math.cos(clockNow * 0.00024 + hub.seed * 1.7) * HUB_DRIFT_AMP * sizeFactor
    const x = hub.x + dx
    const y = hub.y + dy
    const coreR = Math.max(0.01, 5 * sizeFactor * hubGlow)

    const glow = ctx.createRadialGradient(x, y, 0, x, y, coreR * 4)
    glow.addColorStop(0, rgba(hub.hue, 0.5 * factor * hubGlow))
    glow.addColorStop(1, rgba(hub.hue, 0))
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, coreR * 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, coreR, 0, Math.PI * 2)
    ctx.fillStyle = rgba(hub.hue, 0.95 * factor * hubGlow)
    ctx.fill()

    drawHubLabel(hub, x, y, factor)
  }

  /** Shrinks the value's font until it fits a per-node width budget. Shared by layout
   *  (to reserve enough room between neighbours) and drawNodeValue (to render it). */
  function fitNodeValueFont(node: RuntimeNode): { size: number; width: number } {
    let size = 11 * Math.max(0.72, sizeFactor)
    const maxW = Math.max(38, node.orbit * 0.9)
    let width = 0
    for (;;) {
      ctx.font = `${size.toFixed(1)}px 'Sixtyfour', 'IBM Plex Mono', monospace`
      width = ctx.measureText(node.value).width
      if (width <= maxW || size <= 7) break
      size -= 1
    }
    return { size, width }
  }

  function drawNodeValue(node: RuntimeNode, factor: number, r: number): void {
    const { size } = fitNodeValueFont(node)
    ctx.font = `${size.toFixed(1)}px 'Sixtyfour', 'IBM Plex Mono', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = rgba(node.discovered ? PAPER : DIM, (node.discovered ? 0.92 : 0.7) * factor)
    ctx.fillText(node.value, node.x, node.y + r + 5 * sizeFactor)
  }

  function drawNode(node: RuntimeNode, active: string | null): void {
    if (node.scale <= 0.02) return
    const isActive = node.dragging || node.id === active
    const factor = focusFactorFor(node, active)
    const twinkle = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(clockNow * 0.0015 + node.twinklePhase)
    const r = node.radius * node.scale

    if (isActive) {
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3.2)
      glow.addColorStop(0, rgba(node.hue, 0.35))
      glow.addColorStop(1, rgba(node.hue, 0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(node.x, node.y, r * 3.2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    if (node.discovered) {
      ctx.fillStyle = rgba(node.hue, 0.85 * twinkle * factor)
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = rgba(PAPER, 0.55 * factor)
      ctx.stroke()
    } else {
      ctx.fillStyle = rgba(node.hue, 0.1 * factor)
      ctx.fill()
      ctx.lineWidth = 1.4
      ctx.strokeStyle = rgba(node.hue, 0.6 * twinkle * factor)
      ctx.stroke()
    }

    drawNodeValue(node, factor, r)
  }

  function drawSweep(): void {
    const cx = width / 2
    const cy = height / 2
    const radius = Math.max(width, height) * 0.75
    const segments = 26
    const spread = 0.9
    for (let i = 0; i < segments; i++) {
      const t = i / segments
      const a = sweepAngle - t * spread
      const alpha = (1 - t) * 0.12
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
      ctx.strokeStyle = rgba(HUE.term, alpha)
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  function drawPulses(): void {
    if (!pulses.length) return
    const now = performance.now()
    pulses = pulses.filter((p) => now - p.born < p.life)
    for (const p of pulses) {
      const t = (now - p.born) / p.life
      const rr = lerp(4, 30, t) * sizeFactor
      ctx.beginPath()
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2)
      ctx.strokeStyle = rgba(p.hue, (1 - t) * 0.55)
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  function drawBursts(): void {
    if (!bursts.length) return
    const now = performance.now()
    bursts = bursts.filter((p) => now - p.born < p.life)
    for (const p of bursts) {
      const t = (now - p.born) / p.life
      const secs = (now - p.born) / 1000
      const x = p.x + p.vx * secs
      const y = p.y + p.vy * secs
      ctx.beginPath()
      ctx.arc(x, y, Math.max(0.5, 2.4 * (1 - t)), 0, Math.PI * 2)
      ctx.fillStyle = rgba(p.hue, Math.max(0, 1 - t))
      ctx.fill()
    }
  }

  function updateCard(active: string | null): void {
    const node = active ? nodeById.get(active) : null
    if (!node) {
      card.dataset.state = 'idle'
      card.style.removeProperty('--card-hue')
      return
    }
    card.dataset.state = 'active'
    card.style.setProperty('--card-hue', node.hue)
    cardValue.textContent = node.value
    cardLabel.textContent = node.label
    cardCluster.textContent = node.clusterLabel
  }

  function render(): void {
    const active = activeId()
    if (active !== lastActiveId) {
      lastActiveId = active
      updateCard(active)
    }
    ctx.clearRect(0, 0, width, height)
    drawDust()
    drawHubRing()
    for (const node of nodes) drawNodeLine(node, active)
    for (const hub of hubs) drawHub(hub, active)
    for (const node of nodes) drawNode(node, active)
    if (!reducedMotion) drawSweep()
    drawPulses()
    drawBursts()
  }

  // ---------- animation loop (full motion only) ----------

  function beginIgnition(now: number): void {
    if (ignited) return
    ignited = true
    ignitionStart = now
  }

  function update(now: number): void {
    if (!ignited) return
    clockNow = now
    const elapsed = now - ignitionStart

    if (!allIgnited) {
      let pending = false
      for (const node of nodes) {
        if (node.igniteDone) continue
        if (elapsed < node.igniteAt) {
          pending = true
          continue
        }
        const p = clamp((elapsed - node.igniteAt) / IGNITE_NODE_DUR, 0, 1)
        node.scale = Math.max(0, easeOutBack(p))
        node.igniteProgress = p
        if (p >= 1) node.igniteDone = true
        else pending = true
      }
      hubGlow = clamp(elapsed / IGNITE_HUB_MS, 0, 1)
      if (!pending) allIgnited = true
    } else {
      hubGlow = 1
      const active = activeId()
      for (const node of nodes) {
        if (node.dragging) {
          // position already driven by the pointer handler
        } else if (node.springing) {
          const dx = node.homeX - node.x
          const dy = node.homeY - node.y
          node.vx = (node.vx + dx * SPRING_STIFFNESS) * SPRING_DAMPING
          node.vy = (node.vy + dy * SPRING_STIFFNESS) * SPRING_DAMPING
          node.x += node.vx
          node.y += node.vy
          if (Math.hypot(dx, dy) < 0.35 && Math.hypot(node.vx, node.vy) < 0.35) {
            node.x = node.homeX
            node.y = node.homeY
            node.vx = 0
            node.vy = 0
            node.springing = false
          }
        } else {
          node.x = node.homeX + Math.sin(now * 0.00026 + node.driftPhaseX) * DRIFT_AMP * sizeFactor
          node.y = node.homeY + Math.cos(now * 0.00021 + node.driftPhaseY) * DRIFT_AMP * sizeFactor
        }
        const target = node.dragging || node.id === active ? ACTIVE_SCALE : 1
        node.scale += (target - node.scale) * SCALE_EASE
      }
    }

    sweepAngle = ((now % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS) * Math.PI * 2
  }

  function ensureLoop(): void {
    if (rafId || reducedMotion) return
    rafId = requestAnimationFrame(tick)
  }

  function stopLoop(): void {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
  }

  function tick(now: number): void {
    rafId = 0
    update(now)
    render()
    if (isVisible && !document.hidden) ensureLoop()
  }

  // ---------- gamification ----------

  function markDiscovered(id: string): void {
    const node = nodeById.get(id)
    if (!node || node.discovered) return
    node.discovered = true
    discoveredCount++
    if (node.li) node.li.dataset.discovered = 'true'
    counterValue.textContent = String(discoveredCount)
    if (!reducedMotion) {
      pulses.push({ x: node.homeX, y: node.homeY, hue: node.hue, born: performance.now(), life: 520 })
      ensureLoop()
    }
    opts.onDiscover?.(id, discoveredCount, total)
    if (discoveredCount === total) {
      counter.classList.add('is-complete')
      if (!reducedMotion) spawnCompletionBurst()
      opts.onComplete?.()
    }
  }

  function spawnCompletionBurst(): void {
    const cx = width / 2
    const cy = height / 2
    const hues = hubs.map((h) => h.hue)
    const now = performance.now()
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + Math.random() * 0.2
      const speed = 70 + Math.random() * 90
      bursts.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        hue: hues[i % hues.length],
        born: now,
        life: 750 + Math.random() * 300,
      })
    }
    ensureLoop()
  }

  // ---------- interaction ----------

  function hitTestNode(px: number, py: number): RuntimeNode | null {
    let best: RuntimeNode | null = null
    let bestDist = Infinity
    for (const node of nodes) {
      const d = Math.hypot(node.x - px, node.y - py)
      const pad = node.radius * node.scale + HIT_PAD
      if (d <= pad && d < bestDist) {
        best = node
        bestDist = d
      }
    }
    return best
  }

  function toLocal(e: PointerEvent): { x: number; y: number } {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function onPointerDown(e: PointerEvent): void {
    const p = toLocal(e)
    const hit = hitTestNode(p.x, p.y)
    if (!hit) {
      if (tapActiveId) {
        tapActiveId = null
        render()
      }
      return
    }
    canvas.setPointerCapture(e.pointerId)
    dragId = hit.id
    dragMoved = false
    dragStartX = e.clientX
    dragStartY = e.clientY
    dragOffX = p.x - hit.x
    dragOffY = p.y - hit.y
  }

  function onPointerMove(e: PointerEvent): void {
    if (dragId) {
      const dx = e.clientX - dragStartX
      const dy = e.clientY - dragStartY
      if (!dragMoved && Math.hypot(dx, dy) > 4) dragMoved = true
      if (dragMoved) {
        const node = nodeById.get(dragId)
        if (node) {
          const p = toLocal(e)
          const pad = node.radius + 4
          node.x = clamp(p.x - dragOffX, pad, width - pad)
          node.y = clamp(p.y - dragOffY, pad, height - pad)
          node.dragging = true
          node.springing = false
        }
        canvas.classList.add('is-dragging')
        render()
      }
      return
    }
    if (e.pointerType !== 'mouse') return
    const p = toLocal(e)
    const hit = hitTestNode(p.x, p.y)
    const id = hit ? hit.id : null
    if (id !== pointerActiveId) {
      pointerActiveId = id
      canvas.classList.toggle('is-hoverable', !!id)
      if (id) markDiscovered(id)
      render()
    }
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragId) return
    const node = nodeById.get(dragId)
    if (node) {
      if (!dragMoved) {
        tapActiveId = dragId
        markDiscovered(dragId)
      } else {
        node.dragging = false
        node.springing = true
        if (reducedMotion) {
          node.x = node.homeX
          node.y = node.homeY
          node.springing = false
        } else {
          ensureLoop()
        }
      }
    }
    canvas.classList.remove('is-dragging')
    dragId = null
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    render()
  }

  function onPointerLeave(): void {
    if (dragId) return
    if (pointerActiveId) {
      pointerActiveId = null
      canvas.classList.remove('is-hoverable')
      render()
    }
  }

  function onFocusIn(e: FocusEvent): void {
    const target = e.target
    if (!(target instanceof HTMLElement)) return
    const li = target.closest<HTMLLIElement>('[data-metric]')
    const id = li?.dataset.id
    if (!li || !id) return
    focusActiveId = id
    li.dataset.active = 'true'
    markDiscovered(id)
    render()
  }

  function onFocusOut(e: FocusEvent): void {
    const target = e.target
    if (target instanceof HTMLElement) {
      const li = target.closest<HTMLLIElement>('[data-metric]')
      if (li) delete li.dataset.active
    }
    focusActiveId = null
    render()
  }

  // ---------- lifecycle wiring ----------

  layout()
  render()

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('pointerleave', onPointerLeave)
  if (ul) {
    ul.addEventListener('focusin', onFocusIn)
    ul.addEventListener('focusout', onFocusOut)
  }

  let io: IntersectionObserver | null = null
  function onVisibilityChange(): void {
    if (document.hidden) stopLoop()
    else if (isVisible) ensureLoop()
  }
  if (!reducedMotion) {
    io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        isVisible = entry.isIntersecting
        if (isVisible) {
          beginIgnition(performance.now())
          ensureLoop()
        } else {
          stopLoop()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(root)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  const ro = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      layout()
      render()
    }, RESIZE_DEBOUNCE_MS)
  })
  ro.observe(root)

  return {
    destroy() {
      stopLoop()
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      ro.disconnect()
      window.clearTimeout(resizeTimer)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      if (ul) {
        ul.removeEventListener('focusin', onFocusIn)
        ul.removeEventListener('focusout', onFocusOut)
      }
      root.innerHTML = originalHTML
    },
  }
}
