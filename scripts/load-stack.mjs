import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { packageRootDir } from './load-profiles.mjs'

const stackPath = path.join(packageRootDir(), 'profiles', 'stack.yml')

export function loadStackConfig() {
  const raw = yaml.load(fs.readFileSync(stackPath, 'utf8'))
  if (!raw?.overlays || typeof raw.overlays !== 'object') {
    throw new Error('profiles/stack.yml must define overlays map')
  }
  const bearerSets = raw.bearerSets && typeof raw.bearerSets === 'object' ? raw.bearerSets : {}
  return { bearerSets, overlays: raw.overlays }
}

/**
 * @param {object} cfg
 * @param {Set<string>} bearerIds
 * @param {Set<string>} overlayIds
 */
export function expandStackRules(cfg, bearerIds, overlayIds) {
  const { bearerSets, overlays } = cfg
  /** @type {Record<string, string[]>} */
  const byOverlay = {}

  for (const overlayId of overlayIds) {
    const rule = overlays[overlayId]
    if (!rule) {
      throw new Error(`profiles/stack.yml: missing overlays entry for ${overlayId}`)
    }
    let list = []
    if (Array.isArray(rule.use)) {
      for (const setName of rule.use) {
        const set = bearerSets[setName]
        if (!set) throw new Error(`profiles/stack.yml: unknown bearer set "${setName}" for ${overlayId}`)
        list.push(...set)
      }
    }
    if (Array.isArray(rule.bearers)) {
      list.push(...rule.bearers)
    }
    if (list.length === 0) {
      throw new Error(`profiles/stack.yml: ${overlayId} needs bearers and/or use`)
    }
    const unique = [...new Set(list)].sort()
    for (const bid of unique) {
      if (!bearerIds.has(bid)) {
        throw new Error(`profiles/stack.yml: ${overlayId} references unknown bearer "${bid}"`)
      }
    }
    byOverlay[overlayId] = unique
  }

  for (const oid of Object.keys(overlays)) {
    if (!overlayIds.has(oid)) {
      throw new Error(`profiles/stack.yml: stale overlay key "${oid}" (no profile)`)
    }
  }

  return {
    bearerSets,
    overlays: byOverlay,
  }
}

/**
 * @param {Record<string, string[]>} overlaysMap
 */
export function isStackCompatible(overlayId, bearerId, overlaysMap) {
  const allow = overlaysMap[overlayId]
  if (!allow) return false
  return allow.includes(bearerId)
}