export type { BearerLayout, OverlayLayout, ProfileLayout } from './profile-layout.js'
export { PROFILE_LAYOUTS } from './profile-layout.js'

export type {
  BearerCategory,
  OverlayCategory,
  ProfileCategory,
} from './profile-category.js'
export {
  PROFILE_CATEGORIES,
  isBearerCategory,
  isOverlayCategory,
} from './profile-category.js'

export type { BearerPipe, OverlayPipe, PipeFit } from './pipe.js'
export { isBearerPipe, isOverlayPipe } from './pipe.js'

export type { BitrateRange, ByteRange, NumericRange, RangeM } from './ranges.js'

export type {
  CovScope,
  Geo,
  GeoRf,
  Ops,
  OpsAvail,
  OpsDir,
  OpsMob,
  OpsUsage,
  SpectrumRegime,
} from './ops.js'

export type { CommsTag, CommsTagId, CommsTagsCatalog } from './comms-tag.js'

export type {
  BearerProfile,
  CommsProfile,
  OverlayProfile,
} from './comms-profile.js'
export {
  assertCommsProfile,
  categoryOf,
  defBearer,
  defCommsProfile,
  defOverlay,
  isBearerProfile,
  isOverlayProfile,
} from './comms-profile.js'

export type CommsCatalog = readonly import('./comms-profile.js').CommsProfile[]

export type {
  EffectiveEnvelope,
  ResolveStackResult,
  StackCatalog,
} from '../effective-envelope.js'
export { effectiveEnvelope, resolveStack } from '../effective-envelope.js'

export type { StackRulesArtifact } from '../stack-compatibility.js'
export { isStackCompatible, listCompatibleBearers } from '../stack-compatibility.js'

export {
  LORAWAN_EU868_APP_PAYLOAD_MAX,
  LORAWAN_PLANNING_PAYLOAD_MAX,
  LORAWAN_US915_APP_PAYLOAD_MAX,
  lorawanAppPayloadMax,
} from '../lorawan-planning.js'