import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = path.dirname(fileURLToPath(import.meta.url))

export function readDistJson<T>(filename: string): T {
  const file = path.join(distDir, filename)
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
    if (code === 'ENOENT') {
      throw new Error(
        `missing ${filename} beside comms dist — run: yarn workspace @local-hosting/comms build`,
        { cause: err },
      )
    }
    throw err
  }
}