import type { LinkRegistry } from './link-registry-core.js'
import { isBearerProfile } from './types/comms-profile.js'
import type { BearerProfile, CommsProfile } from './types/comms-profile.js'

export type PlanBearerResult =
  | {
      ok: true
      link: BearerProfile
      budgetBytes: number
      allowFatHeal: boolean
      fitsTypical: boolean
      fitsMax: boolean
    }
  | {
      ok: false
      reason: 'unknown_link' | 'no_pipe'
      linkId: string
      link?: CommsProfile
    }

function planBearerOnLink(
  link: BearerProfile,
  linkId: string,
  payloadBytes: number,
  registry: LinkRegistry,
): PlanBearerResult {
  const budgetBytes = link.payloadBytes.typical
  return {
    ok: true,
    link,
    budgetBytes,
    allowFatHeal: link.pipe === 'fat' || link.pipe === 'both',
    fitsTypical: registry.fitsLink(linkId, payloadBytes),
    fitsMax: registry.fitsLink(linkId, payloadBytes, { useMax: true }),
  }
}

/** Browser-safe: requires an explicit registry (no dist JSON load). */
export function planBearer(
  linkId: string,
  payloadBytes: number,
  registry: LinkRegistry,
): PlanBearerResult {
  const link = registry.getLink(linkId)
  if (!link) return { ok: false, reason: 'unknown_link', linkId }
  if (!isBearerProfile(link)) {
    return { ok: false, reason: 'no_pipe', linkId, link }
  }
  return planBearerOnLink(link, linkId, payloadBytes, registry)
}