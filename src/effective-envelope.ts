import { isBearerProfile, isOverlayProfile } from './types/comms-profile.js'
import type { BearerProfile, CommsProfile, OverlayProfile } from './types/comms-profile.js'
import type { BearerPipe } from './types/pipe.js'
import type { BitrateRange, ByteRange, NumericRange, RangeM } from './types/ranges.js'
import { isStackCompatible, type StackRulesArtifact } from './stack-compatibility.js'

export type EffectiveEnvelope = {
  bearerId: string
  overlayId?: string
  pipe: BearerPipe
  payloadBytes: ByteRange
  bitrateBps: BitrateRange
  rangeM: RangeM
  latencyMs?: NumericRange
}

export type StackCatalog = {
  getProfile(id: string): CommsProfile | undefined
}

export type ResolveStackResult =
  | {
      ok: true
      bearer: BearerProfile
      overlay?: OverlayProfile
      envelope: EffectiveEnvelope
    }
  | {
      ok: false
      reason:
        | 'unknown_bearer'
        | 'unknown_overlay'
        | 'not_a_bearer'
        | 'not_an_overlay'
        | 'incompatible_stack'
      bearerId: string
      overlayId?: string
    }

function inheritsFromBearer(range: NumericRange): boolean {
  return range.min === 0 && range.typical === 0 && range.max === 0
}

function intersectRange(bearer: NumericRange, overlay: NumericRange): NumericRange {
  if (inheritsFromBearer(overlay)) {
    return { ...bearer }
  }
  const typical = Math.min(bearer.typical, overlay.typical)
  const max = Math.min(bearer.max, overlay.max)
  const min = Math.min(bearer.min, Math.min(overlay.min > 0 ? overlay.min : bearer.min, typical))
  return { min, typical, max }
}

function mergeOptionalLatency(
  bearer: BearerProfile,
  overlay?: OverlayProfile,
): NumericRange | undefined {
  const b = bearer.latencyMs
  const o = overlay?.latencyMs
  if (!b) return o ? { ...o } : undefined
  if (!o || inheritsFromBearer(o)) return { ...b }
  return intersectRange(b, o)
}

/**
 * Effective planning envelope: overlay caps intersect bearer; zeros on overlay mean inherit.
 */
export function effectiveEnvelope(
  bearer: BearerProfile,
  overlay?: OverlayProfile,
): EffectiveEnvelope {
  return {
    bearerId: bearer.id,
    overlayId: overlay?.id,
    pipe: bearer.pipe,
    payloadBytes: overlay ? intersectRange(bearer.payloadBytes, overlay.payloadBytes) : { ...bearer.payloadBytes },
    bitrateBps: overlay ? intersectRange(bearer.bitrateBps, overlay.bitrateBps) : { ...bearer.bitrateBps },
    rangeM: overlay ? intersectRange(bearer.rangeM, overlay.rangeM) : { ...bearer.rangeM },
    latencyMs: mergeOptionalLatency(bearer, overlay),
  }
}

export function resolveStack(
  bearerId: string,
  catalog: StackCatalog,
  overlayId?: string,
  stackRules?: StackRulesArtifact,
): ResolveStackResult {
  const link = catalog.getProfile(bearerId)
  if (!link) {
    return { ok: false, reason: 'unknown_bearer', bearerId, overlayId }
  }
  if (!isBearerProfile(link)) {
    return { ok: false, reason: 'not_a_bearer', bearerId, overlayId }
  }
  const bearer = link
  if (!overlayId) {
    return {
      ok: true,
      bearer,
      envelope: effectiveEnvelope(bearer),
    }
  }
  const overlayLink = catalog.getProfile(overlayId)
  if (!overlayLink) {
    return { ok: false, reason: 'unknown_overlay', bearerId, overlayId }
  }
  if (!isOverlayProfile(overlayLink)) {
    return { ok: false, reason: 'not_an_overlay', bearerId, overlayId }
  }
  if (stackRules && !isStackCompatible(overlayId, bearerId, stackRules)) {
    return { ok: false, reason: 'incompatible_stack', bearerId, overlayId }
  }
  return {
    ok: true,
    bearer,
    overlay: overlayLink,
    envelope: effectiveEnvelope(bearer, overlayLink),
  }
}