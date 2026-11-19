/** Planning semantics beyond shape checks (bearers vs overlays, MSS sentinels). */

const MSS_RANGE_SENTINEL_IDS = new Set(['starlink', 'satellite', 'iridium'])

function allZero(range) {
  return range.min === 0 && range.typical === 0 && range.max === 0
}

function assertOverlayInheritRanges(rel, raw) {
  if (!allZero(raw.bitrateBps)) {
    throw new Error(
      `${rel}: overlay bitrateBps must be 0/0/0 (inherit bearer) — got ${JSON.stringify(raw.bitrateBps)}`,
    )
  }
  if (!allZero(raw.rangeM)) {
    throw new Error(
      `${rel}: overlay rangeM must be 0/0/0 (inherit bearer) — got ${JSON.stringify(raw.rangeM)}`,
    )
  }
  const pb = raw.payloadBytes
  if (pb.typical === 0) {
    if (!allZero(pb)) {
      throw new Error(
        `${rel}: overlay payloadBytes with typical 0 must be 0/0/0 (full inherit) — got ${JSON.stringify(pb)}`,
      )
    }
  } else if (pb.typical <= 0) {
    throw new Error(`${rel}: overlay payloadBytes.typical must be 0 (inherit) or > 0 (cap)`)
  }
}

function assertBearerPlanning(rel, raw) {
  if (raw.payloadBytes.typical <= 0) {
    throw new Error(`${rel}: bearer payloadBytes.typical must be > 0`)
  }
  if (raw.bitrateBps.typical <= 0) {
    throw new Error(`${rel}: bearer bitrateBps.typical must be > 0`)
  }
  if (MSS_RANGE_SENTINEL_IDS.has(raw.id)) {
    if (typeof raw.rangeNotes !== 'string' || !raw.rangeNotes.trim()) {
      throw new Error(
        `${rel}: MSS profile requires non-empty rangeNotes (rangeM is not a ground hop in meters)`,
      )
    }
  }
}

/** @param {object[]} links */
export function validatePlanningSemantics(links) {
  for (const raw of links) {
    const rel = `profiles/${raw.kind === 'app' ? 'overlay' : 'bearer'}/${raw.id}.yml`
    if (raw.kind === 'app') {
      assertOverlayInheritRanges(rel, raw)
    } else {
      assertBearerPlanning(rel, raw)
    }
  }
}