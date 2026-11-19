import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const registryPath = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  'schema',
  'geography-registry.yml',
)

let cached

export function loadGeo() {
  if (!cached) {
    cached = yaml.load(fs.readFileSync(registryPath, 'utf8'))
  }
  return cached
}

export function marketIdSet(registry = loadGeo()) {
  return new Set(registry.markets.map((m) => m.id))
}

export function lorawanPlanIdSet(registry = loadGeo()) {
  return new Set(registry.lorawanBandPlans.map((p) => p.id))
}

export function sigfoxRcIdSet(registry = loadGeo()) {
  return new Set(registry.sigfoxRadioConfigs.map((p) => p.id))
}

export function zwaveRegionIdSet(registry = loadGeo()) {
  return new Set(registry.zwaveRegions.map((p) => p.id))
}

/**
 * @param {unknown} geography
 * @param {string} file
 */
export function assertGeo(geography, file) {
  const registry = loadGeo()
  const markets = marketIdSet(registry)
  const lorawan = lorawanPlanIdSet(registry)
  const sigfox = sigfoxRcIdSet(registry)
  const zwave = zwaveRegionIdSet(registry)

  if (!geography || typeof geography !== 'object') {
    throw new Error(`${file}: ops.geography required`)
  }

  if (!Array.isArray(geography.markets) || geography.markets.length === 0) {
    throw new Error(`${file}: ops.geography.markets must be a non-empty array`)
  }

  for (const id of geography.markets) {
    if (typeof id !== 'string' || !markets.has(id)) {
      throw new Error(`${file}: unknown market id "${id}"`)
    }
  }

  const specials = new Set(['inherit', 'n/a'])
  const hasSpecial = geography.markets.some((id) => specials.has(id))
  if (hasSpecial && geography.markets.length > 1) {
    throw new Error(`${file}: inherit/n/a cannot be combined with other markets`)
  }

  if (geography.rf != null) {
    if (typeof geography.rf !== 'object') {
      throw new Error(`${file}: ops.geography.rf must be an object`)
    }
    if (geography.rf.lorawan) {
      for (const id of geography.rf.lorawan) {
        if (!lorawan.has(id)) throw new Error(`${file}: unknown lorawan band plan "${id}"`)
      }
    }
    if (geography.rf.sigfoxRc) {
      for (const id of geography.rf.sigfoxRc) {
        if (!sigfox.has(id)) throw new Error(`${file}: unknown sigfox RC "${id}"`)
      }
    }
    if (geography.rf.zwave) {
      for (const id of geography.rf.zwave) {
        if (!zwave.has(id)) throw new Error(`${file}: unknown z-wave region "${id}"`)
      }
    }
  }

  if (geography.notes != null && typeof geography.notes !== 'string') {
    throw new Error(`${file}: ops.geography.notes must be a string`)
  }
}