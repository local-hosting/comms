import { effectiveEnvelope, resolveStack } from './effective-envelope.js'
import type { ResolveStackResult } from './effective-envelope.js'
import type { LinkRegistry } from './link-registry-core.js'
import { getDefaultLinkRegistry, getDefaultStackRules } from './link-registry.js'
import type { BearerProfile } from './types/comms-profile.js'
import type { PlanBearerResult } from './plan-bearer.js'
import { planBearer as planBearerWithRegistry } from './plan-bearer.js'

export type { PlanBearerResult } from './plan-bearer.js'

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

export function planBearer(
  linkId: string,
  payloadBytes: number,
  registry: LinkRegistry = getDefaultLinkRegistry(),
): PlanBearerResult {
  return planBearerWithRegistry(linkId, payloadBytes, registry)
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