export type StackRulesArtifact = {
  bearerSets: Record<string, readonly string[]>
  overlays: Record<string, readonly string[]>
}

export function isStackCompatible(
  overlayId: string,
  bearerId: string,
  rules: StackRulesArtifact,
): boolean {
  const allow = rules.overlays[overlayId]
  if (!allow) return false
  return allow.includes(bearerId)
}

export function listCompatibleBearers(
  overlayId: string,
  rules: StackRulesArtifact,
): readonly string[] {
  return rules.overlays[overlayId] ?? []
}