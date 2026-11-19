import { isBearerProfile, isOverlayProfile } from './types/comms-profile.js'
import type { BearerProfile, CommsProfile, OverlayProfile } from './types/comms-profile.js'
import type { CommsTagId } from './types/comms-tag.js'

export type LinkRegistry = {
  readonly links: readonly CommsProfile[]
  readonly aliases: Readonly<Record<string, string>>
  resolveId(id: string): string
  getLink(id: string): CommsProfile | undefined
  getBearer(id: string): BearerProfile | undefined
  getOverlay(id: string): OverlayProfile | undefined
  listLinks(): readonly CommsProfile[]
  listBearers(): BearerProfile[]
  listOverlays(): OverlayProfile[]
  listTags(): string[]
  listByTag(tagId: CommsTagId): CommsProfile[]
  listThin(): BearerProfile[]
  listFat(): BearerProfile[]
  fitsLink(id: string, payloadBytes: number, opts?: { useMax?: boolean }): boolean
}

export function createLinkRegistry(
  links: readonly CommsProfile[],
  aliases: Readonly<Record<string, string>>,
): LinkRegistry {
  const byId = new Map(links.map((row) => [row.id, row]))

  function resolveId(id: string): string {
    return aliases[id] ?? id
  }

  function getLink(id: string): CommsProfile | undefined {
    return byId.get(resolveId(id))
  }

  function getBearer(id: string): BearerProfile | undefined {
    const link = getLink(id)
    return link && isBearerProfile(link) ? link : undefined
  }

  function getOverlay(id: string): OverlayProfile | undefined {
    const link = getLink(id)
    return link && isOverlayProfile(link) ? link : undefined
  }

  return {
    links,
    aliases,
    resolveId,
    getLink,
    getBearer,
    getOverlay,
    listLinks: () => links,
    listBearers: () => links.filter(isBearerProfile),
    listOverlays: () => links.filter(isOverlayProfile),
    listTags: () => {
      const ids = new Set<string>()
      for (const link of links) {
        for (const tag of link.tags ?? []) ids.add(tag)
      }
      return [...ids].sort()
    },
    listByTag: (tagId) => links.filter((l) => l.tags?.includes(tagId)),
    listThin: () =>
      links.filter(isBearerProfile).filter((l) => l.pipe === 'thin' || l.pipe === 'both'),
    listFat: () =>
      links.filter(isBearerProfile).filter((l) => l.pipe === 'fat' || l.pipe === 'both'),
    fitsLink: (id, payloadBytes, opts = {}) => {
      const link = getBearer(id)
      if (!link) return false
      const limit = opts.useMax ? link.payloadBytes.max : link.payloadBytes.typical
      return payloadBytes <= limit
    },
  }
}