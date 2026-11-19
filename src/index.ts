export * from './types/index.js'

export type { LinkRegistry } from './link-registry.js'
export {
  createLinkRegistry,
  getDefaultLinkRegistry,
  getDefaultStackRules,
} from './link-registry.js'

export type { PlanBearerResult, PlanStackResult } from './plan-link.js'
export { canFatHealLink, isThinLink, planBearer, planStack } from './plan-link.js'

export { resolveStackDefault } from './resolve-stack-default.js'