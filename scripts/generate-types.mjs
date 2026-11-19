import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProfiles, loadTags, packageRootDir, validateTags } from './load-profiles.mjs'

const root = packageRootDir()
const outDir = path.join(root, 'src', 'types', 'generated')
const tagIdsFile = path.join(outDir, 'comms-tag-ids.ts')
const profileIdsFile = path.join(outDir, 'comms-profile-ids.ts')

const links = loadProfiles()
const tags = loadTags()
validateTags(links, tags)

const tagIds = tags.map((t) => t.id).sort()
const profileIds = links.map((l) => l.id).sort()

fs.mkdirSync(outDir, { recursive: true })

const tagUnion = tagIds.map((id) => `  | '${id}'`).join('\n')
fs.writeFileSync(
  tagIdsFile,
  `/** Generated from profiles/tags.yml — do not edit. */\n` +
    `export const COMMS_TAG_IDS = ${JSON.stringify(tagIds, null, 2)} as const\n\n` +
    `export type CommsTagId =\n${tagUnion}\n`,
)

fs.writeFileSync(
  profileIdsFile,
  `/** Generated from comms profiles — do not edit. */\n` +
    `export const COMMS_PROFILE_IDS = ${JSON.stringify(profileIds, null, 2)} as const\n\n` +
    `export type CommsProfileId = (typeof COMMS_PROFILE_IDS)[number]\n`,
)

console.log(`wrote tag ids (${tagIds.length}), profile ids (${profileIds.length})`)