export type { CommsTagId } from './generated/comms-tag-ids.js'
export { COMMS_TAG_IDS } from './generated/comms-tag-ids.js'

export type CommsTag = {
  id: import('./generated/comms-tag-ids.js').CommsTagId
  name: string
  description?: string
  profileIds: readonly string[]
}

export type CommsTagsCatalog = {
  tags: readonly CommsTag[]
  profileTags: Readonly<
    Record<string, readonly import('./generated/comms-tag-ids.js').CommsTagId[]>
  >
}