import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const schemaPath = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  'schema',
  'comms-profile.schema.json',
)

let validateFn

function getValidator() {
  if (!validateFn) {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
    const ajv = new Ajv2020({ allErrors: true, strict: false })
    addFormats(ajv)
    validateFn = ajv.compile(schema)
  }
  return validateFn
}

/**
 * @param {object[]} profiles — YAML rows (no build-time `tags`).
 */
export function validateProfilesSchema(profiles) {
  const validate = getValidator()
  for (const profile of profiles) {
    if (!validate(profile)) {
      throw new Error(`${profile.id}: JSON Schema: ${validate.errors?.map((e) => e.message).join('; ')}`)
    }
  }
}