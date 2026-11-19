import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  attachTags,
  buildTagsArtifact,
  loadAliases,
  loadProfiles,
  loadTags,
  packageRootDir,
  validateCatalog,
  validateProfileLayout,
  validateTags,
} from './load-profiles.mjs'
import { expandStackRules, loadStackConfig } from './load-stack.mjs'
import { validatePlanningSemantics } from './validate-planning.mjs'
import { validateProfilesSchema } from './validate-schema.mjs'

const validateOnly = process.argv.includes('--validate-only')
const root = packageRootDir()
const outDir = path.join(root, 'dist')

const links = loadProfiles()
const aliases = loadAliases()
const tags = loadTags()
validateCatalog(links, aliases)
validateProfileLayout(links)
validateProfilesSchema(links)
validatePlanningSemantics(links)
const overlayIds = new Set(links.filter((l) => l.kind === 'app').map((l) => l.id))
const bearerIds = new Set(links.filter((l) => l.kind !== 'app').map((l) => l.id))
const stackExpanded = expandStackRules(loadStackConfig(), bearerIds, overlayIds)
const profileToTags = validateTags(links, tags)
const catalog = attachTags(links, profileToTags)
const tagsArtifact = buildTagsArtifact(tags, profileToTags)

function runGenerateTypes() {
  const gen = spawnSync(process.execPath, ['scripts/generate-types.mjs'], {
    cwd: root,
    stdio: 'inherit',
  })
  if (gen.status !== 0) process.exit(gen.status ?? 1)
}

runGenerateTypes()

if (validateOnly) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'stack.json'), `${JSON.stringify(stackExpanded, null, 2)}\n`)
  console.log(
    `validated ${links.length} profiles, ${tags.length} tags, ${Object.keys(aliases).length} aliases, ${Object.keys(stackExpanded.overlays).length} stack rules`,
  )
  process.exit(0)
}

fs.mkdirSync(outDir, { recursive: true })
const catalogPath = path.join(outDir, 'catalog.json')
const aliasesPath = path.join(outDir, 'aliases.json')
const tagsOutPath = path.join(outDir, 'tags.json')
const stackOutPath = path.join(outDir, 'stack.json')
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
fs.writeFileSync(aliasesPath, `${JSON.stringify(aliases, null, 2)}\n`)
fs.writeFileSync(tagsOutPath, `${JSON.stringify(tagsArtifact, null, 2)}\n`)
fs.writeFileSync(stackOutPath, `${JSON.stringify(stackExpanded, null, 2)}\n`)
const legacyGroupsPath = path.join(outDir, 'groups.json')
if (fs.existsSync(legacyGroupsPath)) fs.unlinkSync(legacyGroupsPath)
console.log(
  `wrote ${catalog.length} profiles, ${tags.length} tags → ${path.relative(root, outDir)}`,
)