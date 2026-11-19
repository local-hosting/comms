/**
 * Insert `ops` blocks (with formal `geography` in YAML) into profiles missing them.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const profilesDir = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  'profiles',
)

const LORAWAN_PLANS = [
  'EU868',
  'EU433',
  'US915',
  'AU915',
  'AS923-1',
  'AS923-2',
  'AS923-3',
  'AS923-4',
  'KR920',
  'IN865',
  'CN470',
  'CN470-510',
  'RU864',
]

const LORAWAN_MARKETS = [
  'eu',
  'uk',
  'us',
  'latam',
  'au-nz',
  'apac',
  'jp',
  'kr',
  'in',
  'cn',
  'mena',
  'africa',
  'ru',
]

const SIGFOX_RC = ['RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6', 'RC7']
const SIGFOX_MARKETS = [
  'eu',
  'uk',
  'us',
  'ca',
  'latam',
  'jp',
  'kr',
  'in',
  'apac',
  'au-nz',
  'mena',
  'africa',
  'ru',
]

const ZWAVE_RF = ['EU', 'US', 'JP', 'ANZ', 'HK', 'KR', 'IL', 'RU', 'CN']
const ZWAVE_MARKETS = ['eu', 'uk', 'us', 'ca', 'jp', 'au-nz', 'kr', 'mena', 'cn', 'apac', 'ru']

function cellular(notes, outageTypicalS = 60) {
  return {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'national',
    mobility: 'mobile',
    spectrum: 'licensed',
    outageTypicalS,
    storeAndForward: false,
    geography: { markets: ['ww'], notes },
  }
}

function lpwan(notes, extra = {}) {
  return {
    direction: 'bidirectional',
    availability: 'intermittent',
    coverage: 'regional',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 120,
    storeAndForward: true,
    usage: { dutyCyclePct: { min: 0.1, typical: 1, max: 10 } },
    geography: {
      markets: LORAWAN_MARKETS,
      rf: { lorawan: LORAWAN_PLANS },
      notes,
    },
    ...extra,
  }
}

/** @type {Record<string, object>} */
const OPS_BY_ID = {
  '2g': cellular('GSM/GPRS macro footprint; sunset in many regions — verify operator support.', 120),
  '3g': cellular('UMTS/HSPA; 3G cellular — coverage shrinking globally.', 90),
  '4g': cellular('LTE macro; roaming and rural dead zones affect continuity.', 60),
  '5g': cellular('NR sub-6 nationwide; mmWave pockets are local-only high capacity.', 45),
  '6lowpan': {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 5,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: 'IPv6 over 802.15.4; multi-hop mesh depends on powered routers.' },
  },
  'amazon-sidewalk': {
    direction: 'downlink-limited',
    availability: 'intermittent',
    coverage: 'regional',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 300,
    storeAndForward: true,
    geography: { markets: ['us'], notes: 'Sidewalk bridge density; not uniform nationally.' },
  },
  bluetooth: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'personal',
    mobility: 'nomadic',
    spectrum: 'unlicensed',
    outageTypicalS: 2,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: '2.4 GHz ISM; coexistence varies by site.' },
  },
  cv2x: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'mobile',
    spectrum: 'licensed',
    outageTypicalS: 2,
    storeAndForward: false,
    geography: { markets: ['us', 'eu', 'cn', 'kr', 'jp'], notes: 'PC5 / network mode; country-specific ITS bands.' },
  },
  dash7: {
    direction: 'bidirectional',
    availability: 'intermittent',
    coverage: 'regional',
    mobility: 'nomadic',
    spectrum: 'unlicensed',
    outageTypicalS: 60,
    storeAndForward: true,
    geography: { markets: ['eu', 'us'], notes: 'Sub-GHz bursty; sparse gateway plans.' },
  },
  'dect-nr-plus': {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'nomadic',
    spectrum: 'licensed-exempt',
    outageTypicalS: 5,
    storeAndForward: false,
    geography: { markets: ['eu', 'us', 'jp'], notes: 'DECT-2020 NR building / campus mesh.' },
  },
  dsrc: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'mobile',
    spectrum: 'unlicensed',
    outageTypicalS: 1,
    storeAndForward: false,
    geography: { markets: ['us', 'eu'], notes: '5.9 GHz ITS/WAVE; regional regulation driven.' },
  },
  eddystone: {
    direction: 'uplink-only',
    availability: 'intermittent',
    coverage: 'personal',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 0,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: 'BLE beacon burst; observer must be in range.' },
  },
  enocean: {
    direction: 'uplink-only',
    availability: 'intermittent',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 30,
    storeAndForward: false,
    geography: { markets: ['eu', 'us', 'jp'], notes: 'Sub-GHz ERP; band plans differ by market.' },
  },
  ethernet: {
    direction: 'bidirectional',
    availability: 'always-on',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'wired',
    outageTypicalS: 1,
    storeAndForward: false,
    geography: { markets: ['site'], notes: 'LAN plant; cable/fiber cuts and switch faults.' },
  },
  http: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'nomadic',
    spectrum: 'inherit',
    outageTypicalS: 0,
    storeAndForward: false,
    geography: { markets: ['inherit'] },
  },
  'ieee-802-15-4': {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 3,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: '2.4 GHz global; sub-GHz variants in some markets.' },
  },
  infrared: {
    direction: 'bidirectional',
    availability: 'intermittent',
    coverage: 'touch',
    mobility: 'fixed',
    spectrum: 'n/a',
    outageTypicalS: 0,
    storeAndForward: false,
    geography: { markets: ['n/a'], notes: 'LOS IR; occlusion ends the link instantly.' },
  },
  iridium: {
    direction: 'downlink-limited',
    availability: 'intermittent',
    coverage: 'global',
    mobility: 'mobile',
    spectrum: 'licensed',
    outageTypicalS: 600,
    storeAndForward: true,
    geography: { markets: ['ww'], notes: 'LEO MSS; sky view and weather affect SBD.' },
  },
  longfi: lpwan('Helium hotspot density — community coverage, not operator SLA.'),
  lora: lpwan('Regional ISM; private PHY without public WAN SLA.'),
  lorawan: lpwan('Public/private LoRaWAN; gateway duty cycle and regional params apply.'),
  'lte-m': cellular('Cat-M1 operator footprint; PSM/eDRX stretch apparent outages.', 45),
  matter: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'inherit',
    outageTypicalS: 0,
    storeAndForward: false,
    geography: { markets: ['inherit'], notes: 'Plan geography on Thread/Wi-Fi/Ethernet bearer.' },
  },
  meshtastic: {
    direction: 'bidirectional',
    availability: 'intermittent',
    coverage: 'regional',
    mobility: 'nomadic',
    spectrum: 'unlicensed',
    outageTypicalS: 180,
    storeAndForward: true,
    geography: {
      markets: LORAWAN_MARKETS,
      rf: { lorawan: LORAWAN_PLANS },
      notes: 'Ad-hoc mesh; partitions and multi-hop latency common.',
    },
  },
  mioty: {
    direction: 'bidirectional',
    availability: 'intermittent',
    coverage: 'regional',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 90,
    storeAndForward: true,
    usage: { dutyCyclePct: { min: 0.1, typical: 1, max: 10 } },
    geography: { markets: ['eu', 'us'], notes: 'TSMA LPWAN; ETSI duty cycle and base-station density.' },
  },
  'most-link': lpwan('MOSTLink LoRa private links; no public operator SLA.'),
  mqtt: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'nomadic',
    spectrum: 'inherit',
    outageTypicalS: 0,
    storeAndForward: false,
    geography: { markets: ['inherit'] },
  },
  websocket: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'nomadic',
    spectrum: 'inherit',
    outageTypicalS: 5,
    storeAndForward: false,
    geography: { markets: ['inherit'], notes: 'Path MTU and proxy idle timeouts follow the IP bearer.' },
  },
  webrtc: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'nomadic',
    spectrum: 'inherit',
    outageTypicalS: 30,
    storeAndForward: false,
    geography: { markets: ['inherit'], notes: 'ICE/TURN region and NAT shape matter more than RF market ids.' },
  },
  'nb-iot': cellular('NB-IoT operator bands; in-building depth often better than 2G.', 60),
  nfc: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'touch',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 0,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: '13.56 MHz near-field.' },
  },
  rfid: {
    direction: 'receive-only',
    availability: 'intermittent',
    coverage: 'personal',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 0,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: 'UHF gate reads vs HF NFC; yard geometry.' },
  },
  rpma: {
    direction: 'bidirectional',
    availability: 'intermittent',
    coverage: 'regional',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 120,
    storeAndForward: true,
    geography: { markets: ['us'], notes: 'Ingenu 2.4 GHz operator-style networks.' },
  },
  satellite: {
    direction: 'downlink-limited',
    availability: 'intermittent',
    coverage: 'global',
    mobility: 'mobile',
    spectrum: 'licensed',
    outageTypicalS: 900,
    storeAndForward: true,
    geography: { markets: ['ww'], notes: 'Generic MSS sat-IoT; vendor footprint differs.' },
  },
  sigfox: {
    direction: 'downlink-limited',
    availability: 'intermittent',
    coverage: 'national',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 300,
    storeAndForward: true,
    usage: { messagesPerDay: { min: 1, typical: 140, max: 140 } },
    geography: {
      markets: SIGFOX_MARKETS,
      rf: { sigfoxRc: SIGFOX_RC },
      notes: 'Operator UNB; RC bands and sunset timelines vary by market.',
    },
  },
  starlink: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'national',
    mobility: 'nomadic',
    spectrum: 'licensed',
    outageTypicalS: 30,
    storeAndForward: false,
    geography: {
      markets: ['us', 'ca', 'eu', 'uk', 'au-nz', 'jp', 'latam'],
      notes: 'LEO terminal; weather and obstruction on dish link.',
    },
  },
  thread: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 5,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: 'IPv6 mesh; border router for WAN.' },
  },
  weightless: {
    direction: 'bidirectional',
    availability: 'intermittent',
    coverage: 'regional',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 120,
    storeAndForward: true,
    geography: { markets: ['eu', 'uk', 'us'], notes: 'Weightless-N/P/W; sparse public infrastructure.' },
  },
  'wi-sun': {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'regional',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 15,
    storeAndForward: false,
    geography: { markets: ['us', 'eu', 'jp', 'au-nz'], notes: 'Utility FAN / AMI field area meshes.' },
  },
  'wifi-halow': {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'regional',
    mobility: 'nomadic',
    spectrum: 'unlicensed',
    outageTypicalS: 5,
    storeAndForward: false,
    geography: { markets: ['us', 'eu', 'jp'], notes: '802.11ah sub-GHz; country channel plans.' },
  },
  wifi: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'nomadic',
    spectrum: 'unlicensed',
    outageTypicalS: 3,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: '2.4/5/6 GHz WLAN; enterprise roaming vs home AP.' },
  },
  wimax: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'regional',
    mobility: 'nomadic',
    spectrum: 'licensed',
    outageTypicalS: 60,
    storeAndForward: false,
    geography: { markets: ['us', 'latam', 'mena', 'africa'], notes: '802.16 WISP footprints.' },
  },
  wmbus: {
    direction: 'bidirectional',
    availability: 'intermittent',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 86400,
    storeAndForward: true,
    geography: { markets: ['eu', 'uk'], notes: 'Walk/drive-by read windows; OMS band modes.' },
  },
  'z-wave': {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 5,
    storeAndForward: false,
    geography: {
      markets: ZWAVE_MARKETS,
      rf: { zwave: ZWAVE_RF },
      notes: 'Sub-GHz mesh; market-specific frequency map.',
    },
  },
  zigbee: {
    direction: 'bidirectional',
    availability: 'session',
    coverage: 'local',
    mobility: 'fixed',
    spectrum: 'unlicensed',
    outageTypicalS: 5,
    storeAndForward: false,
    geography: { markets: ['ww'], notes: '2.4 GHz global; 915 MHz sub-GHz in US-like markets.' },
  },
}

function yamlStringifyOps(ops) {
  return `${yaml.dump({ ops }, { lineWidth: 100, noRefs: true }).trimEnd()}\n`
}

const files = fs
  .readdirSync(profilesDir)
  .filter((f) => f.endsWith('.yml') && f !== 'aliases.yml')

let updated = 0
for (const file of files) {
  const id = path.parse(file).name
  const ops = OPS_BY_ID[id]
  if (!ops) throw new Error(`missing ops defaults for ${id}`)
  const filePath = path.join(profilesDir, file)
  let text = fs.readFileSync(filePath, 'utf8')
  if (text.includes('\nops:')) continue

  const marker = '\npacketNotes:'
  const idx = text.indexOf(marker)
  if (idx === -1) throw new Error(`${file}: no packetNotes`)
  text = `${text.slice(0, idx)}\n${yamlStringifyOps(ops)}${text.slice(idx + 1)}`
  fs.writeFileSync(filePath, text)
  updated++
  console.log(`ops → ${file}`)
}

console.log(`updated ${updated} profiles`)