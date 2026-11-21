import { Buffer } from 'buffer'
import aliases from '../../dist/aliases.json'
import catalog from '../../dist/catalog.json'
import { createLinkRegistry } from '../../dist/link-registry-core.js'
import { planBearer } from '../../dist/plan-bearer.js'
import type {
  BearerPipe,
  BearerProfile,
  CommsProfile,
} from '../../dist/types/comms-profile.js'
import { composeWords } from '@local-hosting/compose'
import {
  FRAME_ILLOCUTIONS,
  SYMBOL_INTENT,
  SYMBOL_QUERY,
  SYMBOL_READING,
  SYMBOL_REPORT,
  codesCodec,
  codesToCompact,
  createVocabSnapshot,
  createVocabStore,
  decodeCompactFrame,
  encodePackedBytes,
  expandWithStore,
  frameSymbolName,
  intentCodec,
  intentToCompact,
  labelsForIds,
  packedCodec,
  snapshotToTable,
  type CompactFrame,
  type LabelMap,
  type SymbolTableEntry,
} from '@local-hosting/frames'
import './style.css'

function preferEncodeFor(
  pipe: BearerPipe,
  typicalBudgetBytes: number,
): 'packed' | 'text' {
  if (pipe === 'thin' || typicalBudgetBytes <= 180) return 'packed'
  return 'text'
}

;(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer

type DemoLinkId = 'meshtastic' | 'bluetooth'

const DEMO_LINK_IDS: DemoLinkId[] = ['meshtastic', 'bluetooth']

let selectedLinkId: DemoLinkId = 'meshtastic'

const linkRegistry = createLinkRegistry(
  catalog as CommsProfile[],
  aliases as Record<string, string>,
)

type LinkPlanResult =
  | {
      ok: true
      bearer: BearerProfile
      budgetBytes: number
      fitsTypical: boolean
      fitsMax: boolean
      preferEncode: ReturnType<typeof preferEncodeFor>
    }
  | Extract<ReturnType<typeof planBearer>, { ok: false }>

function planLinkFrame(linkId: string, bytes: number): LinkPlanResult {
  const plan = planBearer(linkId, bytes, linkRegistry)
  if (!plan.ok) return plan
  return {
    ok: true,
    bearer: plan.link,
    budgetBytes: plan.budgetBytes,
    fitsTypical: plan.fitsTypical,
    fitsMax: plan.fitsMax,
    preferEncode: preferEncodeFor(plan.link.pipe, plan.budgetBytes),
  }
}

function bearerProfile(linkId: string): BearerProfile | undefined {
  return linkRegistry.getBearer(linkId)
}

function isDemoLinkId(value: string): value is DemoLinkId {
  return DEMO_LINK_IDS.includes(value as DemoLinkId)
}

const DEMO_VOCAB_HINT =
  'hello · need medicine shelter ops high · query lobby · flood evacuate shelter'

function composeFailureHint(reason: string): string {
  if (!reason.includes('no vocab')) return reason
  return `${reason} — demo lexicon: ${DEMO_VOCAB_HINT}`
}

const seed: SymbolTableEntry[] = [
  { id: 'E_FLOOD', code: 1, kind: 'event' },
  { id: 'E_POWER', code: 2, kind: 'event' },
  { id: 'E_HELLO', code: 3, kind: 'event' },
  { id: 'E_HI', code: 4, kind: 'event' },
  { id: 'A_EVAC', code: 10, kind: 'action' },
  { id: 'A_CONFIRM', code: 11, kind: 'action' },
  { id: 'P_SHELTER', code: 20, kind: 'place' },
  { id: 'P_LOBBY', code: 21, kind: 'place' },
  { id: 'PR_OPS', code: 40, kind: 'actor' },
  { id: 'R_MED', code: 50, kind: 'resource' },
  { id: 'R_FOOD', code: 51, kind: 'resource' },
]

const store = createVocabStore(
  createVocabSnapshot({
    lineage: 'community:link-demo',
    epoch: 1,
    entries: seed,
    label: 'link-0.1.0',
  }),
)
const tip = store.active
const table = snapshotToTable(store.byFingerprint.get(tip)!)

const labels: Record<string, LabelMap> = {
  E_FLOOD: { en: 'flood', es: 'inundación' },
  E_POWER: { en: 'power outage' },
  E_HELLO: { en: 'hello' },
  E_HI: { en: 'hi' },
  A_EVAC: { en: 'evacuate' },
  A_CONFIRM: { en: 'confirm' },
  P_SHELTER: { en: 'shelter' },
  P_LOBBY: { en: 'lobby' },
  PR_OPS: { en: 'ops' },
  R_MED: { en: 'medicine' },
  R_FOOD: { en: 'food' },
}

const starterFrames: CompactFrame[] = [
  intentToCompact(tip, {
    event_code: 1,
    band: 4,
    actor_codes: [40],
    action_codes: [10],
    place_codes: [20],
  }),
  codesToCompact(SYMBOL_REPORT, tip, {
    resource: [50],
    place: [20],
  }),
  codesToCompact(SYMBOL_QUERY, tip, {
    place: [20],
    actor: [40],
  }),
  codesToCompact(SYMBOL_READING, tip, {
    event: [2],
    place: [21],
  }),
]

type WireViews = {
  text: string
  textChars: number
  packedHex: string
  packedBytes: number
}

type SendPhase = 'rejected' | 'queued' | 'hop' | 'delivered'

type SendAttempt = {
  id: string
  linkId: DemoLinkId
  frame: CompactFrame
  views: WireViews
  plan: Extract<LinkPlanResult, { ok: true }> | null
  failReason?: string
  phase: SendPhase
  hopsTotal: number
  hopIndex: number
  composedFrom?: string
}

let attemptSeq = 0
const attempts: SendAttempt[] = starterFrames.map((frame) =>
  seedAttempt(frame, 'meshtastic'),
)
let selected = 0
const hopTimers = new Map<string, ReturnType<typeof setTimeout>>()

function viewsFor(frame: CompactFrame): WireViews {
  const text =
    frame.symbol === SYMBOL_INTENT
      ? intentCodec.encode(frame)
      : codesCodec.encode(frame)
  const bytes = encodePackedBytes(frame)
  return {
    text,
    textChars: text.length,
    packedHex: packedCodec.encode(frame),
    packedBytes: bytes.length,
  }
}

function planForSelectedLink(bytes: number): LinkPlanResult {
  return planLinkFrame(selectedLinkId, bytes)
}

function seedAttempt(frame: CompactFrame, linkId: DemoLinkId): SendAttempt {
  const views = viewsFor(frame)
  const plan = planLinkFrame(linkId, views.packedBytes)
  return {
    id: `seed-${attemptSeq++}`,
    linkId,
    frame,
    views,
    plan: plan.ok ? plan : null,
    failReason: plan.ok ? undefined : plan.reason,
    phase: plan.ok ? 'delivered' : 'rejected',
    hopsTotal: 0,
    hopIndex: 0,
  }
}

function hopsForBearer(bearer: BearerProfile): number {
  if (bearer.id === 'meshtastic') return 1 + Math.floor(Math.random() * 3)
  return 1
}

function hopDelayMs(hop: number, bearer: BearerProfile | undefined): number {
  const base = bearer?.latencyMs?.typical ?? 2000
  if (bearer?.id === 'bluetooth') {
    return Math.min(80, 12 + hop * 8)
  }
  return Math.min(800, base * 0.15) + hop * 180
}

function clearHopTimer(id: string): void {
  const t = hopTimers.get(id)
  if (t) clearTimeout(t)
  hopTimers.delete(id)
}

function sendHintForAttempt(attempt: SendAttempt): void {
  if (attempts[selected]?.id !== attempt.id) return
  switch (attempt.phase) {
    case 'delivered':
      showSendHint(`Delivered ${attempt.views.packedBytes} B on ${attempt.linkId}`, 'ok')
      break
    case 'rejected':
      showSendHint(attempt.failReason ?? 'rejected by bearer plan', 'err')
      break
    case 'hop':
      showSendHint(
        attempt.linkId === 'bluetooth'
          ? `Session open — ${attempt.views.packedBytes} B`
          : `Hop ${attempt.hopIndex}/${attempt.hopsTotal} — ${attempt.views.packedBytes} B`,
        'ok',
      )
      break
    case 'queued':
      showSendHint(`Queued ${attempt.views.packedBytes} B on ${attempt.linkId}…`, 'ok')
      break
    default:
      break
  }
}

function advanceHop(attempt: SendAttempt): void {
  if (attempt.phase !== 'hop' && attempt.phase !== 'queued') return
  attempt.hopIndex += 1
  if (attempt.hopIndex >= attempt.hopsTotal) {
    attempt.phase = 'delivered'
    clearHopTimer(attempt.id)
    sendHintForAttempt(attempt)
    render()
    return
  }
  const bearer = attempt.plan?.bearer
  const delay = hopDelayMs(attempt.hopIndex, bearer)
  clearHopTimer(attempt.id)
  hopTimers.set(
    attempt.id,
    setTimeout(() => {
      advanceHop(attempt)
      sendHintForAttempt(attempt)
      render()
    }, delay),
  )
  sendHintForAttempt(attempt)
  render()
}

function startLinkSim(attempt: SendAttempt): void {
  if (!attempt.plan) return
  const bearer = attempt.plan.bearer
  attempt.hopsTotal = hopsForBearer(bearer)
  attempt.hopIndex = 0
  attempt.phase = 'queued'
  render()
  const delay = hopDelayMs(0, bearer)
  clearHopTimer(attempt.id)
  hopTimers.set(
    attempt.id,
    setTimeout(() => {
      attempt.phase = 'hop'
      advanceHop(attempt)
      sendHintForAttempt(attempt)
    }, delay),
  )
  sendHintForAttempt(attempt)
}

function typicalOverBudgetMessage(
  bytes: number,
  plan: Extract<LinkPlanResult, { ok: true }>,
): string {
  const over = `over typical budget (${bytes} B > ${plan.budgetBytes} B)`
  if (plan.bearer.ops?.storeAndForward) {
    return `${over} — store-and-forward`
  }
  return over
}

function attemptSend(frame: CompactFrame, composedFrom?: string): void {
  const linkId = selectedLinkId
  const views = viewsFor(frame)
  const plan = planLinkFrame(linkId, views.packedBytes)
  const id = `tx-${attemptSeq++}`

  if (!plan.ok) {
    attempts.push({
      id,
      linkId,
      frame,
      views,
      plan: null,
      failReason: plan.reason,
      phase: 'rejected',
      hopsTotal: 0,
      hopIndex: 0,
      composedFrom,
    })
    selected = attempts.length - 1
    render()
    finishSend(views, 'rejected')
    scrollToSelectedTransmission()
    return
  }

  if (!plan.fitsMax) {
    attempts.push({
      id,
      linkId,
      frame,
      views,
      plan,
      failReason: `payload ${views.packedBytes} B exceeds ${plan.bearer.name} max ${plan.bearer.payloadBytes.max} B`,
      phase: 'rejected',
      hopsTotal: 0,
      hopIndex: 0,
      composedFrom,
    })
    selected = attempts.length - 1
    render()
    finishSend(views, 'rejected')
    scrollToSelectedTransmission()
    return
  }

  const attempt: SendAttempt = {
    id,
    linkId,
    frame,
    views,
    plan,
    failReason: plan.fitsTypical
      ? undefined
      : typicalOverBudgetMessage(views.packedBytes, plan),
    phase: 'queued',
    hopsTotal: 0,
    hopIndex: 0,
    composedFrom,
  }
  attempts.push(attempt)
  selected = attempts.length - 1
  render()
  startLinkSim(attempt)
  scrollToSelectedTransmission()
  finishSend(views, 'queued')
}

function scrollToSelectedTransmission(): void {
  requestAnimationFrame(() => {
    const row = rows.querySelector(`button[data-index="${selected}"]`)
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

function showSendHint(message: string, kind: 'ok' | 'err' | 'neutral' = 'neutral'): void {
  composerHint.textContent = message
  composerHint.classList.remove('hint-ok', 'hint-err')
  if (kind === 'ok') composerHint.classList.add('hint-ok')
  if (kind === 'err') composerHint.classList.add('hint-err')
}

const app = document.querySelector('#app')!
app.innerHTML = `
  <div class="app-shell">
    <header class="link-banner">
      <div class="banner-lead">
        <p class="app-eyebrow">@local-hosting/comms</p>
        <h1 class="app-title">Link simulator</h1>
        <p id="link-banner-text" class="banner-desc" aria-live="polite"></p>
      </div>
      <div class="banner-tools">
        <label class="bearer-field">
          Bearer
          <select id="link-type" class="link-select" name="link"></select>
        </label>
      </div>
    </header>
    <div class="layout-grid">
      <section class="panel">
        <header class="panel-head">Transmissions</header>
        <ul id="rows" role="listbox" aria-label="Transmissions"></ul>
      </section>
      <section class="panel">
        <header class="panel-head">On-air bytes</header>
        <div id="hex" class="panel-body"></div>
      </section>
      <section class="panel">
        <header class="panel-head">Plan check</header>
        <div id="out" class="panel-body"></div>
      </section>
    </div>
  </div>
  <footer class="send-bar">
    <form id="composer" class="send-bar-inner composer-form">
      <div class="send-input">
        <label for="message" class="sr-only">Message</label>
        <textarea
          rows="1"
          name="message"
          id="message"
          class="msg-input"
          placeholder="hello · medicine shelter ops · or paste a compact frame"
        ></textarea>
      </div>
      <button type="submit" class="send-btn">Send</button>
    </form>
    <p id="composer-hint" class="send-bar-inner composer-hint" aria-live="polite"></p>
  </footer>
`

const linkBannerText = document.querySelector('#link-banner-text')!
const linkSelect = document.querySelector('#link-type') as HTMLSelectElement
const rows = document.querySelector('#rows')!
const hex = document.querySelector('#hex')!
const out = document.querySelector('#out')!
const composer = document.querySelector('#composer') as HTMLFormElement
const messageInput = document.querySelector('#message') as HTMLTextAreaElement
const composerHint = document.querySelector('#composer-hint')!

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function messageTags(frame: CompactFrame): string[] {
  const expanded = expandWithStore(store, frame)
  if (!expanded.ok) return []
  return Object.values(expanded.ids).flatMap((ids) =>
    labelsForIds(ids ?? [], labels, 'en').map(({ id, label }) =>
      (label ?? id).toLowerCase(),
    ),
  )
}

function tagsHtml(tags: string[]): string {
  return tags
    .map((tag) => `<span class="row-tag">${escapeHtml(tag)}</span>`)
    .join('')
}

function phaseLabel(attempt: SendAttempt): string {
  switch (attempt.phase) {
    case 'rejected':
      return 'rejected'
    case 'queued':
      return 'queued'
    case 'hop':
      return attempt.linkId === 'bluetooth'
        ? 'session'
        : `hop ${attempt.hopIndex}/${attempt.hopsTotal}`
    case 'delivered':
      return 'delivered'
    default: {
      const _exhaustive: never = attempt.phase
      return _exhaustive
    }
  }
}

function phaseClass(attempt: SendAttempt): string {
  if (attempt.phase === 'rejected') return 'status-rejected'
  if (attempt.phase === 'delivered') return 'status-delivered'
  return 'status-air'
}

function hopsHtml(attempt: SendAttempt): string {
  if (attempt.hopsTotal < 1 || attempt.linkId === 'bluetooth') return ''
  const dots = Array.from({ length: attempt.hopsTotal }, (_, i) => {
    let cls = 'hop-dot'
    if (attempt.phase === 'delivered' || i < attempt.hopIndex) cls += ' hop-dot-done'
    else if (attempt.phase === 'hop' && i === attempt.hopIndex) cls += ' hop-dot-active'
    return `<span class="${cls}" title="hop ${i + 1}"></span>`
  }).join('')
  return `<span class="hop-dots" aria-hidden="true">${dots}</span>`
}

function colorJson(json: string): string {
  return escapeHtml(json).replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (
      match,
      stringLiteral: string | undefined,
      keyColon: string | undefined,
      keyword: string | undefined,
    ) => {
      if (stringLiteral !== undefined) {
        if (keyColon !== undefined) {
          return `<span class="json-key">${stringLiteral}</span>${keyColon}`
        }
        return `<span class="json-string">${stringLiteral}</span>`
      }
      if (keyword !== undefined) {
        return `<span class="json-keyword">${keyword}</span>`
      }
      return `<span class="json-number">${match}</span>`
    },
  )
}

function fitLabel(ok: boolean): string {
  return ok ? 'fits' : 'over'
}

function planCheckHtml(attempt: SendAttempt): string {
  if (!attempt.plan) {
    return `<p class="status-rejected">${escapeHtml(attempt.failReason ?? 'plan failed')}</p>`
  }
  const bytes = attempt.views.packedBytes
  const lines = [
    `Typical — <span class="${attempt.plan.fitsTypical ? 'status-delivered' : 'status-air'}">${fitLabel(attempt.plan.fitsTypical)}</span>`,
    `Encode <span class="encode-badge">${escapeHtml(attempt.plan.preferEncode)}</span>`,
  ]
  if (!attempt.plan.fitsMax) {
    lines.unshift(
      `<span class="status-rejected">${bytes} B exceeds max ${attempt.plan.bearer.payloadBytes.max} B</span>`,
    )
  }
  if (attempt.failReason) {
    lines.push(`<span class="status-air">${escapeHtml(attempt.failReason)}</span>`)
  }
  return `<ul class="plan-check">${lines.map((line) => `<li>${line}</li>`).join('')}</ul>`
}

function detailHtml(attempt: SendAttempt): string {
  const expanded = expandWithStore(store, attempt.frame)
  if (!expanded.ok) {
    return `<pre class="json-out">${colorJson(JSON.stringify(expanded, null, 2))}</pre>`
  }
  const named = Object.fromEntries(
    Object.entries(expanded.ids).map(([kind, ids]) => [
      kind,
      labelsForIds(ids ?? [], labels, 'en').map(({ id, label }) => label ?? id),
    ]),
  )
  const meta = FRAME_ILLOCUTIONS.find((f) => f.symbol === expanded.symbol)
  const body = JSON.stringify(
    {
      symbol: frameSymbolName(expanded.symbol) ?? expanded.symbol,
      role: meta?.role,
      direction: meta?.direction,
      tip: expanded.vocab_base,
      fields: expanded.fields,
      ids: named,
    },
    null,
    2,
  )
  const composeNote = attempt.composedFrom
    ? `<p class="pane-meta">from “${escapeHtml(attempt.composedFrom)}”</p>`
    : ''
  return `
    ${composeNote}
    ${planCheckHtml(attempt)}
    <div class="frame-json">
      <p class="frame-json-label">Frame JSON</p>
      <pre class="json-out">${colorJson(body)}</pre>
    </div>
  `
}

function budgetMeterHtml(
  bytes: number,
  profile: BearerProfile | undefined,
  plan: Extract<LinkPlanResult, { ok: true }> | null,
): string {
  if (!profile || !plan) return ''
  const max = profile.payloadBytes.max
  const typical = plan.budgetBytes
  const pct = Math.min(100, (bytes / max) * 100)
  const typicalPct = Math.min(100, (typical / max) * 100)
  const overMax = bytes > max
  const overTypical = bytes > typical
  return `
    <div class="budget-block">
      <div class="budget-head">
        <span>On-air payload</span>
        <span class="budget-bytes">${bytes} / ${max} B</span>
      </div>
      <div class="budget-track" role="meter" aria-valuenow="${bytes}" aria-valuemin="0" aria-valuemax="${max}">
        <div class="budget-fill" style="width: ${pct}%${overMax ? '; background: var(--status-fail)' : overTypical ? '; background: var(--status-warn)' : ''}"></div>
        <span class="budget-mark" style="left: ${typicalPct}%" title="typical ${typical} B"></span>
        <span class="budget-mark budget-mark-max" style="left: 100%" title="max ${max} B"></span>
      </div>
    </div>
  `
}

function linkSelectOptionsHtml(): string {
  return DEMO_LINK_IDS.map((id) => {
    const row = bearerProfile(id)
    const label = row?.name ?? id
    const selected = id === selectedLinkId ? ' selected' : ''
    return `<option value="${escapeHtml(id)}"${selected}>${escapeHtml(label)}</option>`
  }).join('')
}

function renderBanner(): void {
  const profile = bearerProfile(selectedLinkId)
  document.body.dataset.link = selectedLinkId
  if (linkSelect.options.length !== DEMO_LINK_IDS.length) {
    linkSelect.innerHTML = linkSelectOptionsHtml()
  } else if (linkSelect.value !== selectedLinkId) {
    linkSelect.value = selectedLinkId
  }
  if (!profile) {
    linkBannerText.textContent =
      'Bearer profiles not loaded — run yarn build in comms, then restart the demo.'
    return
  }
  const sAndF = profile.ops?.storeAndForward ? 'Store-and-forward on this bearer.' : ''
  const budgets = `Typical ${profile.payloadBytes.typical} B, max ${profile.payloadBytes.max} B. ~${profile.latencyMs.typical} ms.`
  linkBannerText.textContent = [profile.rangeNotes ?? '', sAndF, budgets]
    .filter(Boolean)
    .join(' ')
}

function render() {
  renderBanner()

  rows.innerHTML = attempts
    .map((attempt, i) => {
      const rowCls = i === selected ? 'row-btn row-selected' : 'row-btn'
      const sym =
        frameSymbolName(attempt.frame.symbol) ?? String(attempt.frame.symbol)
      const linkPill =
        attempt.linkId !== selectedLinkId
          ? `<span class="link-pill">${escapeHtml(attempt.linkId)}</span>`
          : ''
      return `
        <li role="option" aria-selected="${i === selected}">
          <button type="button" data-index="${i}" class="${rowCls}">
            <span class="row-line">
              ${linkPill}
              <span class="row-phase ${phaseClass(attempt)}">${escapeHtml(phaseLabel(attempt))}</span>
              ${hopsHtml(attempt)}
              <span class="row-meta">${escapeHtml(sym)}</span>
            </span>
            <span class="row-tags">${tagsHtml(messageTags(attempt.frame))}</span>
          </button>
        </li>
      `
    })
    .join('')

  const current = attempts[selected]
  if (!current) {
    hex.innerHTML = `<p class="pane-meta">No messages yet.</p>`
    out.innerHTML = ''
    return
  }

  const profile = current.plan?.bearer ?? bearerProfile(current.linkId)
  hex.innerHTML = `
    ${budgetMeterHtml(current.views.packedBytes, profile, current.plan)}
    <p class="pane-msg">${escapeHtml(current.views.packedHex)}</p>
  `
  if (current.failReason && current.phase === 'rejected') {
    hex.innerHTML += `<p class="status-rejected">${escapeHtml(current.failReason)}</p>`
  }

  out.innerHTML = detailHtml(current)

  if (!messageInput.value.trim()) {
    sendHintForAttempt(current)
  }
}

rows.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest('button[data-index]')
  if (!target) return
  selected = Number((target as HTMLButtonElement).dataset.index)
  render()
})

function previewCompose(text: string): void {
  const trimmed = text.trim()
  if (!trimmed) {
    showSendHint('')
    return
  }
  const pasted = decodeCompactFrame(trimmed)
  if (pasted) {
    const views = viewsFor(pasted)
    const plan = planForSelectedLink(views.packedBytes)
    const suffix = plan.ok
      ? ` · ${plan.preferEncode} · fits max ${plan.fitsMax}`
      : ` · ${!plan.ok ? plan.reason : ''}`
    showSendHint(`frame paste → ${views.packedBytes} B${suffix}`)
    return
  }
  const result = composeWords(trimmed, table, labels)
  if (!result.ok) {
    showSendHint(composeFailureHint(result.reason), 'err')
    return
  }
  const views = viewsFor(result.frame)
  const plan = planForSelectedLink(views.packedBytes)
  const names = result.matched.map((m) => m.label).join(', ')
  const linkHint =
    plan.ok && !plan.fitsMax
      ? ' · exceeds link max'
      : plan.ok && !plan.fitsTypical
        ? plan.bearer.ops?.storeAndForward
          ? ' · over typical (S&F)'
          : ' · over typical'
        : plan.ok
          ? ` · ${plan.preferEncode}`
          : ''
  showSendHint(`${names} → ${views.packedBytes} B${linkHint}`)
}

function finishSend(views: WireViews, phase: SendPhase): void {
  if (phase === 'rejected') {
    showSendHint('rejected by bearer plan', 'err')
    return
  }
  showSendHint(`Sent ${views.packedBytes} B — check Transmissions for hop progress`, 'ok')
}

linkSelect.addEventListener('change', () => {
  const value = linkSelect.value
  if (!isDemoLinkId(value)) return
  selectedLinkId = value
  renderBanner()
  previewCompose(messageInput.value)
})

function handleSend(): void {
  const text = messageInput.value.trim()
  if (!text) {
    showSendHint('Type a message or paste a compact frame', 'err')
    return
  }

  try {
    const pasted = decodeCompactFrame(text)
    if (pasted) {
      attemptSend(pasted)
      messageInput.value = ''
      return
    }

    const result = composeWords(text, table, labels)
    if (!result.ok) {
      showSendHint(composeFailureHint(result.reason), 'err')
      return
    }
    attemptSend(result.frame, text)
    messageInput.value = ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    showSendHint(`send failed: ${msg}`, 'err')
  }
}

composer.addEventListener('submit', (event) => {
  event.preventDefault()
  handleSend()
})

messageInput.addEventListener('input', () => {
  previewCompose(messageInput.value)
})

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    composer.requestSubmit()
  }
})

render()