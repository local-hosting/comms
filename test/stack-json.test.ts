import { describe, expect, it } from 'vitest'
import stack from '../dist/stack.json' with { type: 'json' }
import { getDefaultStackRules, isStackCompatible } from '../dist/index.js'

describe('stack.json artifact', () => {
  it('matches getDefaultStackRules()', () => {
    expect(getDefaultStackRules().overlays).toEqual(stack.overlays)
  })

  it('lists every overlay profile from catalog', () => {
    const overlayIds = Object.keys(stack.overlays).sort()
    expect(overlayIds).toContain('mqtt')
    expect(overlayIds).toContain('modbus-tcp')
    expect(overlayIds.length).toBeGreaterThanOrEqual(11)
  })

  it('matter allowlist is thread/wifi/ethernet only', () => {
    const matter = stack.overlays.matter
    expect(matter?.sort()).toEqual(['ethernet', 'thread', 'wifi'])
    expect(isStackCompatible('matter', 'lorawan', stack)).toBe(false)
    expect(isStackCompatible('matter', 'thread', stack)).toBe(true)
  })
})