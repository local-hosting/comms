/**
 * LoRaWAN application payload caps (FRMPayload) for planning — not a runtime MAC calculator.
 * Source: LoRaWAN Regional Parameters rev (EU868 / US915 DR tables, repeater-compatible).
 */

/** EU863-870 / EU868 max FRMPayload by DR (with repeater, N=0). */
export const LORAWAN_EU868_APP_PAYLOAD_MAX: Readonly<Record<number, number>> = {
  0: 51,
  1: 51,
  2: 51,
  3: 115,
  4: 222,
  5: 222,
  6: 222,
  7: 222,
}

/** US902-928 hybrid / US915 style max FRMPayload by DR (repeater-compatible subset). */
export const LORAWAN_US915_APP_PAYLOAD_MAX: Readonly<Record<number, number>> = {
  0: 11,
  1: 53,
  2: 51,
  3: 115,
  4: 222,
  5: 222,
  6: 222,
  7: 222,
  8: 222,
  9: 222,
  10: 222,
  11: 51,
  12: 51,
  13: 51,
}

const BY_BAND: Readonly<Record<string, Readonly<Record<number, number>>>> = {
  EU868: LORAWAN_EU868_APP_PAYLOAD_MAX,
  EU433: LORAWAN_EU868_APP_PAYLOAD_MAX,
  US915: LORAWAN_US915_APP_PAYLOAD_MAX,
  AU915: LORAWAN_US915_APP_PAYLOAD_MAX,
}

/**
 * @param bandPlanId — e.g. `EU868`, `US915` (see geography RF lists on lorawan profile).
 * @param dataRate — LoRaWAN DR for that band plan.
 * @returns Max application payload bytes, or undefined if unknown plan/DR.
 */
export function lorawanAppPayloadMax(bandPlanId: string, dataRate: number): number | undefined {
  const table = BY_BAND[bandPlanId]
  if (!table) return undefined
  return table[dataRate]
}

/** Conservative catalog max (EU868 DR4–7 repeater path). */
export const LORAWAN_PLANNING_PAYLOAD_MAX = 222