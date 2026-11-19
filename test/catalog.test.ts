import { describe, expect, it } from 'vitest'
import catalog from '../dist/catalog.json' with { type: 'json' }
import stackRules from '../dist/stack.json' with { type: 'json' }
import {
  LORAWAN_PLANNING_PAYLOAD_MAX,
  effectiveEnvelope,
  isBearerProfile,
  isOverlayProfile,
  isStackCompatible,
  lorawanAppPayloadMax,
  planBearer,
  resolveStack,
  type BearerProfile,
  type CommsProfile,
  type OverlayProfile,
  type StackCatalog,
  type StackRulesArtifact,
} from '../dist/index.js'

const rules = stackRules as StackRulesArtifact

function bearer(id: string): BearerProfile {
  const p = (catalog as CommsProfile[]).find((row) => row.id === id)
  if (!p || !isBearerProfile(p)) throw new Error(`missing bearer ${id}`)
  return p
}

function overlay(id: string): OverlayProfile {
  const p = (catalog as CommsProfile[]).find((row) => row.id === id)
  if (!p || !isOverlayProfile(p)) throw new Error(`missing overlay ${id}`)
  return p
}

describe('comms catalog goldens', () => {
  it('sigfox asymmetric payloads', () => {
    const s = bearer('sigfox')
    expect(s.payloadBytes.max).toBe(12)
    expect(s.payloadBytesDownlink?.max).toBe(8)
    expect(s.payloadBytesUplink?.typical).toBe(12)
  })

  it('lorawan EU868 DR7 cap', () => {
    expect(lorawanAppPayloadMax('EU868', 7)).toBe(222)
    expect(bearer('lorawan').payloadBytes.max).toBe(LORAWAN_PLANNING_PAYLOAD_MAX)
  })

  it('meshtastic on-air payload max', () => {
    expect(bearer('meshtastic').payloadBytes.max).toBe(233)
  })

  it('mqtt protocol max publish', () => {
    expect(overlay('mqtt').payloadBytes.max).toBe(268435455)
  })
})

describe('effectiveEnvelope', () => {
  it('intersects mqtt on lorawan', () => {
    const env = effectiveEnvelope(bearer('lorawan'), overlay('mqtt'))
    expect(env.payloadBytes.typical).toBe(51)
    expect(env.payloadBytes.max).toBe(222)
    expect(env.bitrateBps.typical).toBe(bearer('lorawan').bitrateBps.typical)
  })

  it('http inherit payload from bearer', () => {
    const env = effectiveEnvelope(bearer('wifi'), overlay('http'))
    expect(env.payloadBytes).toEqual(bearer('wifi').payloadBytes)
  })
})

describe('planBearer', () => {
  it('rejects overlay ids', () => {
    const plan = planBearer('mqtt', 10)
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.reason).toBe('no_pipe')
  })

  it('accepts lorawan bearer', () => {
    const plan = planBearer('lorawan', 40)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.allowFatHeal).toBe(false)
    expect(plan.fitsTypical).toBe(true)
  })
})

describe('stack matrix', () => {
  const memCatalog: StackCatalog = {
    getProfile: (id) => (catalog as CommsProfile[]).find((r) => r.id === id),
  }

  it('matter allows thread', () => {
    expect(isStackCompatible('matter', 'thread', rules)).toBe(true)
  })

  it('matter rejects nfc', () => {
    expect(isStackCompatible('matter', 'nfc', rules)).toBe(false)
  })

  it('modbus-tcp allows plc', () => {
    expect(isStackCompatible('modbus-tcp', 'plc', rules)).toBe(true)
  })

  it('resolveStack enforces matrix', () => {
    const bad = resolveStack('nfc', memCatalog, 'matter', rules)
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.reason).toBe('incompatible_stack')
    const ok = resolveStack('thread', memCatalog, 'matter', rules)
    expect(ok.ok).toBe(true)
  })
})