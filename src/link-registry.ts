import type { CommsProfile } from './types/comms-profile.js'
import { createLinkRegistry } from './link-registry-core.js'
import type { LinkRegistry } from './link-registry-core.js'
import { readDistJson } from './runtime-json.js'
import type { StackRulesArtifact } from './stack-compatibility.js'

export type { LinkRegistry } from './link-registry-core.js'
export { createLinkRegistry } from './link-registry-core.js'

let defaultRegistry: LinkRegistry | undefined

export function getDefaultLinkRegistry(): LinkRegistry {
  if (!defaultRegistry) {
    const links = readDistJson<CommsProfile[]>('catalog.json')
    const aliases = readDistJson<Record<string, string>>('aliases.json')
    defaultRegistry = createLinkRegistry(links, aliases)
  }
  return defaultRegistry
}

let defaultStackRules: StackRulesArtifact | undefined

export function getDefaultStackRules(): StackRulesArtifact {
  if (!defaultStackRules) {
    defaultStackRules = readDistJson<StackRulesArtifact>('stack.json')
  }
  return defaultStackRules
}