import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { assertGeo } from './geography-registry.mjs'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const profilesDir = path.join(packageRoot, 'profiles')
const aliasesPath = path.join(profilesDir, 'aliases.yml')
const tagsPath = path.join(profilesDir, 'tags.yml')

/** Top-level `profiles/` folders. */
export const PROFILE_LAYOUTS = new Set(['bearer', 'overlay'])

function layoutForProfile(raw) {
  if (raw.kind === 'app') return 'overlay'
  if (raw.kind === 'rf' || raw.kind === 'wired') return 'bearer'
  return null
}

const KINDS = new Set(['rf', 'wired', 'app'])
const PIPES = new Set(['thin', 'fat', 'both', 'none'])
const DIRECTIONS = new Set([
  'receive-only',
  'uplink-only',
  'downlink-limited',
  'bidirectional',
])
const AVAILABILITY = new Set(['intermittent', 'session', 'always-on'])
const COVERAGE = new Set(['touch', 'personal', 'local', 'regional', 'national', 'global'])
const MOBILITY = new Set(['fixed', 'nomadic', 'mobile'])
const SPECTRUM = new Set(['unlicensed', 'licensed', 'licensed-exempt', 'wired', 'inherit', 'n/a'])

const META_YML = new Set(['aliases.yml', 'tags.yml', 'groups.yml', 'stack.yml'])

export function packageRootDir() {
  return packageRoot
}

function assertRange(name, r) {
  for (const key of ['min', 'typical', 'max']) {
    if (typeof r?.[key] !== 'number' || !Number.isFinite(r[key])) {
      throw new Error(`${name}.${key} must be a finite number`)
    }
  }
  if (r.min > r.typical || r.typical > r.max) {
    throw new Error(`${name}: expected min ≤ typical ≤ max`)
  }
}

function assertOps(file, ops) {
  if (!ops || typeof ops !== 'object') {
    throw new Error(`${file}: ops required`)
  }
  if (!DIRECTIONS.has(ops.direction)) {
    throw new Error(`${file}: ops.direction invalid`)
  }
  if (!AVAILABILITY.has(ops.availability)) {
    throw new Error(`${file}: ops.availability invalid`)
  }
  if (!COVERAGE.has(ops.coverage)) {
    throw new Error(`${file}: ops.coverage invalid`)
  }
  if (!MOBILITY.has(ops.mobility)) {
    throw new Error(`${file}: ops.mobility invalid`)
  }
  if (!SPECTRUM.has(ops.spectrum)) {
    throw new Error(`${file}: ops.spectrum invalid`)
  }
  if (typeof ops.outageTypicalS !== 'number' || ops.outageTypicalS < 0) {
    throw new Error(`${file}: ops.outageTypicalS must be >= 0`)
  }
  if (typeof ops.storeAndForward !== 'boolean') {
    throw new Error(`${file}: ops.storeAndForward must be boolean`)
  }
  assertGeo(ops.geography, file)
  if (ops.usage != null) {
    if (typeof ops.usage !== 'object') throw new Error(`${file}: ops.usage must be object`)
    if (ops.usage.messagesPerDay) {
      assertRange(`${file}.ops.usage.messagesPerDay`, ops.usage.messagesPerDay)
    }
    if (ops.usage.dutyCyclePct) {
      assertRange(`${file}.ops.usage.dutyCyclePct`, ops.usage.dutyCyclePct)
    }
  }
}

function listProfileFiles() {
  const files = []
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        walk(abs)
        continue
      }
      if (!ent.name.endsWith('.yml') && !ent.name.endsWith('.yaml')) continue
      if (META_YML.has(ent.name)) continue
      files.push(abs)
    }
  }
  walk(profilesDir)
  return files.sort()
}

function relProfilePath(absPath) {
  return path.relative(profilesDir, absPath).split(path.sep).join('/')
}

export function loadProfiles() {
  const links = []
  for (const absPath of listProfileFiles()) {
    const rel = relProfilePath(absPath)
    const raw = yaml.load(fs.readFileSync(absPath, 'utf8'))
    if (!raw?.id || !raw.name || !raw.kind || !raw.pipe) {
      throw new Error(`invalid profile: ${rel}`)
    }
    if (!KINDS.has(raw.kind)) {
      throw new Error(`${rel}: kind must be one of ${[...KINDS].join(', ')}`)
    }
    if (!PIPES.has(raw.pipe)) {
      throw new Error(`${rel}: pipe must be one of ${[...PIPES].join(', ')}`)
    }
    assertRange(`${rel}.payloadBytes`, raw.payloadBytes)
    assertRange(`${rel}.bitrateBps`, raw.bitrateBps)
    assertRange(`${rel}.rangeM`, raw.rangeM)
    assertOps(rel, raw.ops)
    if (typeof raw.packetNotes !== 'string' || !raw.packetNotes.trim()) {
      throw new Error(`${rel}: packetNotes required`)
    }
    if (raw.rangeNotes != null && typeof raw.rangeNotes !== 'string') {
      throw new Error(`${rel}: rangeNotes must be a string`)
    }
    if (raw.catalog != null && typeof raw.catalog !== 'string') {
      throw new Error(`${rel}: catalog must be a string`)
    }
    if (raw.latencyMs != null) {
      assertRange(`${rel}.latencyMs`, raw.latencyMs)
    }
    if (raw.payloadBytesUplink != null) {
      assertRange(`${rel}.payloadBytesUplink`, raw.payloadBytesUplink)
    }
    if (raw.payloadBytesDownlink != null) {
      assertRange(`${rel}.payloadBytesDownlink`, raw.payloadBytesDownlink)
    }
    if (raw.specRefs != null) {
      if (!Array.isArray(raw.specRefs) || raw.specRefs.some((u) => typeof u !== 'string' || !u.trim())) {
        throw new Error(`${rel}: specRefs must be an array of non-empty strings`)
      }
    }
    if (path.parse(absPath).name !== raw.id) {
      throw new Error(`${rel}: filename must match id ${raw.id}`)
    }
    if (raw.kind === 'app') {
      if (raw.pipe !== 'none') {
        throw new Error(`${rel}: overlay (kind app) must have pipe none`)
      }
    } else if (raw.pipe === 'none') {
      throw new Error(`${rel}: bearer (kind ${raw.kind}) cannot have pipe none`)
    }
    links.push(raw)
  }
  return links
}

/** Enforce `profiles/bearer|<overlay>/<id>.yml`. */
export function validateProfileLayout(links) {
  const byId = new Map(links.map((l) => [l.id, l]))
  for (const absPath of listProfileFiles()) {
    const rel = relProfilePath(absPath)
    const parts = rel.split('/')
    if (parts.length !== 2) {
      throw new Error(
        `profile must live at profiles/bearer/<id>.yml or profiles/overlay/<id>.yml — got ${rel}`,
      )
    }
    const [layoutDir, file] = parts
    if (!PROFILE_LAYOUTS.has(layoutDir)) {
      throw new Error(`${rel}: unknown layout folder — use bearer | overlay`)
    }
    const id = path.parse(file).name
    const link = byId.get(id)
    if (!link) {
      throw new Error(`orphan profile file: ${rel}`)
    }
    const expectedLayout = layoutForProfile(link)
    if (layoutDir !== expectedLayout) {
      throw new Error(
        `${rel}: folder ${layoutDir} does not match profile (expected ${expectedLayout})`,
      )
    }
  }
  for (const link of links) {
    const layout = layoutForProfile(link)
    const expected = path.join(profilesDir, layout, `${link.id}.yml`)
    if (!fs.existsSync(expected)) {
      throw new Error(`missing profile file: profiles/${layout}/${link.id}.yml`)
    }
  }
}

export function loadAliases() {
  const raw = yaml.load(fs.readFileSync(aliasesPath, 'utf8'))
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('profiles/aliases.yml must be a string map')
  }
  for (const [alias, target] of Object.entries(raw)) {
    if (typeof alias !== 'string' || typeof target !== 'string') {
      throw new Error('aliases: keys and values must be strings')
    }
  }
  return raw
}

export function validateCatalog(links, aliases) {
  const ids = new Set(links.map((l) => l.id))
  if (ids.size !== links.length) {
    throw new Error('duplicate profile ids')
  }
  for (const target of Object.values(aliases)) {
    if (!ids.has(target)) {
      throw new Error(`alias target missing profile: ${target}`)
    }
  }
}

export function loadTags() {
  const raw = yaml.load(fs.readFileSync(tagsPath, 'utf8'))
  if (!raw?.tags || !Array.isArray(raw.tags)) {
    throw new Error('profiles/tags.yml must define `tags:` array')
  }
  const tags = []
  for (const t of raw.tags) {
    if (!t?.id || typeof t.id !== 'string') {
      throw new Error('tags.yml: each tag needs string `id`')
    }
    if (!t.name || typeof t.name !== 'string') {
      throw new Error(`tags.yml: tag ${t.id} needs string \`name\``)
    }
    if (!Array.isArray(t.profiles) || t.profiles.length === 0) {
      throw new Error(`tags.yml: tag ${t.id} needs non-empty \`profiles\``)
    }
    for (const pid of t.profiles) {
      if (typeof pid !== 'string') {
        throw new Error(`tags.yml: tag ${t.id} profiles must be strings`)
      }
    }
    tags.push({
      id: t.id,
      name: t.name,
      description: typeof t.description === 'string' ? t.description : undefined,
      profileIds: [...t.profiles],
    })
  }
  return tags
}

/** @returns {Map<string, string[]>} profile id → sorted tag ids */
export function validateTags(links, tags) {
  const ids = new Set(links.map((l) => l.id))
  const profileToTags = new Map()

  for (const t of tags) {
    for (const pid of t.profileIds) {
      if (!ids.has(pid)) {
        throw new Error(`tags.yml: unknown profile ${pid} in tag ${t.id}`)
      }
      const list = profileToTags.get(pid) ?? []
      if (list.includes(t.id)) {
        throw new Error(`tags.yml: duplicate tag ${t.id} for profile ${pid}`)
      }
      list.push(t.id)
      profileToTags.set(pid, list)
    }
  }

  for (const id of ids) {
    if (!profileToTags.has(id)) {
      throw new Error(`tags.yml: profile ${id} has no tags`)
    }
  }

  for (const [pid, list] of profileToTags) {
    list.sort()
  }

  return profileToTags
}

export function attachTags(links, profileToTags) {
  return links.map((link) => ({
    ...link,
    tags: [...(profileToTags.get(link.id) ?? [])],
  }))
}

export function buildTagsArtifact(tags, profileToTags) {
  const profileTags = {}
  for (const [pid, tagIds] of profileToTags) {
    profileTags[pid] = tagIds
  }
  return {
    tags: tags.map(({ profileIds, ...rest }) => ({
      ...rest,
      profileIds,
    })),
    profileTags,
  }
}