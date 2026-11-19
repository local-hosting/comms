/** Top-level profile category (= `profiles/<category>/` folder, matches `kind`). */
export const PROFILE_CATEGORIES = ['rf', 'wired', 'app'] as const

export type ProfileCategory = (typeof PROFILE_CATEGORIES)[number]

export type BearerCategory = Extract<ProfileCategory, 'rf' | 'wired'>

/** Application overlay — always `kind: app`, `pipe: none`. */
export type OverlayCategory = Extract<ProfileCategory, 'app'>

export function isOverlayCategory(kind: ProfileCategory): kind is OverlayCategory {
  return kind === 'app'
}

export function isBearerCategory(kind: ProfileCategory): kind is BearerCategory {
  return kind === 'rf' || kind === 'wired'
}