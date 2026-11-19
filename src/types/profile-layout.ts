/** Top-level `profiles/` folders — not tags. */
export const PROFILE_LAYOUTS = ['bearer', 'overlay'] as const

export type ProfileLayout = (typeof PROFILE_LAYOUTS)[number]

export type BearerLayout = Extract<ProfileLayout, 'bearer'>
export type OverlayLayout = Extract<ProfileLayout, 'overlay'>