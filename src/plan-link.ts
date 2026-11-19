import { effectiveEnvelope, resolveStack } from './effective-envelope.js'
import type { ResolveStackResult } from './effective-envelope.js'
import type { LinkRegistry } from './link-registry.js'
import { getDefaultLinkRegistry, getDefaultStackRules } from './link-registry.js'
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

export type PlanStackResult =
  | {
      ok: true
      bearer: BearerProfile
      overlay?: import('./types/comms-profile.js').OverlayProfile
      envelope: ReturnType<typeof effectiveEnvelope>
      budgetBytes: number
      allowFatHeal: boolean
      fitsTypical: boolean
      fitsMax: boolean
    }
  | Exclude<ResolveStackResult, { ok: true }>

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

export function planBearer(
  linkId: string,
  payloadBytes: number,
  registry: LinkRegistry = getDefaultLinkRegistry(),
): PlanBearerResult {
  const link = registry.getLink(linkId)
  if (!link) return { ok: false, reason: 'unknown_link', linkId }
  if (!isBearerProfile(link)) {
    return { ok: false, reason: 'no_pipe', linkId, link }
  }
  return planBearerOnLink(link, linkId, payloadBytes, registry)
}

export function planStack(
  bearerId: string,
  payloadBytes: number,
  overlayId?: string,
  registry: LinkRegistry = getDefaultLinkRegistry(),
  stackRules = getDefaultStackRules(),
): PlanStackResult {
  const stack = resolveStack(
    bearerId,
    { getProfile: (id) => registry.getLink(id) },
    overlayId,
    stackRules,
  )
  if (!stack.ok) return stack
  const env = stack.envelope
  return {
    ok: true,
    bearer: stack.bearer,
    overlay: stack.overlay,
    envelope: env,
    budgetBytes: env.payloadBytes.typical,
    allowFatHeal: stack.bearer.pipe === 'fat' || stack.bearer.pipe === 'both',
    fitsTypical: payloadBytes <= env.payloadBytes.typical,
    fitsMax: payloadBytes <= env.payloadBytes.max,
  }
}

export function isThinLink(linkId: string, registry: LinkRegistry = getDefaultLinkRegistry()): boolean {
  const pipe = registry.getLink(linkId)?.pipe
  return pipe === 'thin'
}

export function canFatHealLink(
  linkId: string,
  registry: LinkRegistry = getDefaultLinkRegistry(),
): boolean {
  const pipe = registry.getLink(linkId)?.pipe
  return pipe === 'fat' || pipe === 'both'
}