import type { CommsTagId } from './comms-tag.js'
import type { Ops } from './ops.js'
import type { BearerPipe, OverlayPipe } from './pipe.js'
import type {
  BearerCategory,
  OverlayCategory,
  ProfileCategory,
} from './profile-category.js'
import type { BitrateRange, ByteRange, NumericRange, RangeM } from './ranges.js'

type CommsProfileCore = {
  id: string
  name: string
  payloadBytes: ByteRange
  bitrateBps: BitrateRange
  rangeM: RangeM
  ops: Ops
  packetNotes: string
  rangeNotes?: string
  /** Round-trip / one-way latency budget (optional). */
  latencyMs?: NumericRange
  /** Directional caps when `payloadBytes` is uplink-first planning (optional). */
  payloadBytesUplink?: ByteRange
  payloadBytesDownlink?: ByteRange
  /** URIs for spec / vendor docs used when reviewing this profile. */
  specRefs?: readonly string[]
  catalog?: string
  /** Navigation tags from `profiles/tags.yml` (not top-level categories). */
  tags: readonly CommsTagId[]
}

/** RF or wired bearer — always has a plannable pipe. */
export type BearerProfile = CommsProfileCore & {
  kind: BearerCategory
  pipe: BearerPipe
}

/** Application overlay — never a frame pipe; plan on a {@link BearerProfile}. */
export type OverlayProfile = CommsProfileCore & {
  kind: OverlayCategory
  pipe: OverlayPipe
}

export type CommsProfile = BearerProfile | OverlayProfile

export function isOverlayProfile(profile: CommsProfile): profile is OverlayProfile {
  return profile.kind === 'app'
}

export function isBearerProfile(profile: CommsProfile): profile is BearerProfile {
  return profile.kind === 'rf' || profile.kind === 'wired'
}

export function assertCommsProfile(profile: CommsProfile): void {
  const row = profile as { id: string; kind: string; pipe: string }
  if (row.kind === 'app' && row.pipe !== 'none') {
    throw new Error(`overlay ${row.id}: kind app requires pipe none`)
  }
  if ((row.kind === 'rf' || row.kind === 'wired') && row.pipe === 'none') {
    throw new Error(`bearer ${row.id}: kind ${row.kind} cannot use pipe none`)
  }
}

export function defBearer(profile: BearerProfile): BearerProfile {
  if (!isBearerProfile(profile)) {
    throw new Error(`defBearer: invalid bearer ${(profile as CommsProfile).id}`)
  }
  return profile
}

export function defOverlay(profile: OverlayProfile): OverlayProfile {
  if (profile.kind !== 'app' || profile.pipe !== 'none') {
    throw new Error(`defOverlay: invalid overlay ${profile.id}`)
  }
  return profile
}

export function defCommsProfile(profile: CommsProfile): CommsProfile {
  assertCommsProfile(profile)
  return profile
}

export function categoryOf(profile: CommsProfile): ProfileCategory {
  return profile.kind
}