import { resolveStack, type ResolveStackResult } from './effective-envelope.js'
import { getDefaultLinkRegistry, getDefaultStackRules } from './link-registry.js'

/** Registry- and stack-backed {@link resolveStack} for Node consumers. */
export function resolveStackDefault(bearerId: string, overlayId?: string): ResolveStackResult {
  const registry = getDefaultLinkRegistry()
  return resolveStack(
    bearerId,
    { getProfile: (id) => registry.getLink(id) },
    overlayId,
    getDefaultStackRules(),
  )
}