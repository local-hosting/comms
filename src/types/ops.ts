import type { ByteRange } from './ranges.js'

export type OpsDir = 'receive-only' | 'uplink-only' | 'downlink-limited' | 'bidirectional'

export type OpsAvail = 'intermittent' | 'session' | 'always-on'

export type CovScope =
  | 'touch'
  | 'personal'
  | 'local'
  | 'regional'
  | 'national'
  | 'global'

export type OpsMob = 'fixed' | 'nomadic' | 'mobile'

export type SpectrumRegime =
  | 'unlicensed'
  | 'licensed'
  | 'licensed-exempt'
  | 'wired'
  | 'inherit'
  | 'n/a'

export type OpsUsage = {
  messagesPerDay?: ByteRange
  dutyCyclePct?: ByteRange
}

export type GeoRf = {
  lorawan?: readonly string[]
  sigfoxRc?: readonly string[]
  zwave?: readonly string[]
}

export type Geo = {
  markets: readonly string[]
  rf?: GeoRf
  notes?: string
}

export type Ops = {
  direction: OpsDir
  availability: OpsAvail
  coverage: CovScope
  mobility: OpsMob
  spectrum: SpectrumRegime
  outageTypicalS: number
  storeAndForward: boolean
  usage?: OpsUsage
  geography: Geo
}