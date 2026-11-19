# `@local-hosting/comms`

Catalog of **communication bearers** (not hyperlinks): RF, wired, and logical transports with planning envelopes for **frames** and future modeler tooling.

Every profile id must appear in at least one tag (`profiles/tags.yml`).

**Types:** `BearerProfile` (`rf` \| `wired`, pipe ≠ `none`), `OverlayProfile` (`app`, `pipe: none`), guards `isBearerProfile` / `isOverlayProfile`, helpers `defBearer` / `defOverlay`.

## Commands

```bash
yarn workspace @local-hosting/comms validate
yarn workspace @local-hosting/comms build
yarn workspace @local-hosting/comms test
```

`validate` runs JSON Schema (AJV), tags/stack rules, and **planning semantics** (bearer non-zero typicals; overlay inherit zeros; MSS `rangeNotes`; optional `specRefs` / directional payloads).

### Link planning API (canonical)

```ts
import {
  planBearer,
  planStack,
  resolveStackDefault,
  getDefaultLinkRegistry,
} from '@local-hosting/comms'
```

`getDefaultLinkRegistry()` loads `dist/catalog.json` on **first use** (after `comms build`). **`planBearer`**, **`planStack`**, and **`resolveStackDefault`** live here — canonical link planning (not in frames).

### Stack planning

Overlay **zeros** on bitrate/range inherit the bearer; overlay payload `typical: 0` inherits fully, otherwise `min(bearer, overlay)` caps apply. `resolveStackDefault` enforces overlay ↔ bearer rules from the built stack index.

### Frames integration

- **`@local-hosting/frames/core`** — codecs only; no comms catalog load.
- **`@local-hosting/frames/link`** or full **`@local-hosting/frames`** — consumes this catalog; **`planFrame(bearer, bytes, overlay?)`** = stack + budgets + **`preferEncode`**; **`forLink`** is bearer-only shorthand.

## Sources & references

Numbers in this catalog are **planning envelopes**, not operator SLAs. When you change a cap, add or update `specRefs` on that profile YAML (validated at build) and mention the profile in a PR.

### Committed on profiles (`specRefs`)

| Profile | Reference |
|---------|-----------|
| lorawan | [The Things Network — EU868 regional parameters](https://www.thethingsnetwork.org/docs/lorawan/regional-parameters/eu868/) |
| meshtastic | [Meshtastic overview](https://meshtastic.org/docs/overview/) |
| sigfox | [AWS — Sigfox LPWAN whitepaper](https://docs.aws.amazon.com/whitepapers/latest/implementing-lpwan-solutions-with-aws/sigfox.html) |
| wifi | [IEEE 802.11 working group](https://www.ieee802.org/11/) |
| uwb | [IEEE Std 802.15.4z-2020 (overview)](https://www.ieee802.org/15/pub/IEEE%20Std%20802154z-2020.pdf) |
| private-lte | [FCC — 3.5 GHz CBRS band](https://www.fcc.gov/wireless/bureau-divisions/mobility-division/35-ghz-band) |
| plc | [ITU-T G.9960 (G.hn)](https://www.itu.int/rec/T-REC-G.9960) |
| mqtt | [MQTT v3.1.1 (OASIS)](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html) |
| coap | [RFC 7252](https://www.rfc-editor.org/rfc/rfc7252) |
| lwm2m | [OMA LwM2M specifications](https://openmobilealliance.org/specifications/lwm2m/) |
| amqp | [AMQP 1.0 core (OASIS)](https://docs.oasis-open.org/amqp/core/v1.0/os/amqp-core-v1.0-os.html) |
| grpc | [gRPC over HTTP/2](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md) |
| opc-ua | [OPC Foundation reference](https://reference.opcfoundation.org/) |
| modbus-tcp | [Modbus Messaging Implementation Guide](https://modbus.org/docs/Modbus_Messaging_Implementation_Guide_V1_0b.pdf) |

### Planning review (envelope tuning; extend with `specRefs` as needed)

These informed caps and notes on profiles that do not yet carry their own `specRefs`:

| Topic | Used for | Reference |
|-------|----------|-----------|
| LoRaWAN EU868 max FRMPayload by DR | `lorawan` max **222**, `lorawan-planning.ts` DR tables | [TTN EU868](https://www.thethingsnetwork.org/docs/lorawan/regional-parameters/eu868/) |
| Meshtastic application payload | `meshtastic` max **233** | [Meshtastic protocol docs](https://github.com/meshtastic/meshtastic/blob/master/docs/protocol.md) (`DATA_PAYLOAD_LEN`) |
| Sigfox UL/DL sizes & bitrates | `sigfox` 12 B / 8 B, 100–600 bps | [What is Sigfox?](https://sigfox.com/what-is-sigfox/), AWS Sigfox whitepaper (above) |
| Iridium SBD MO/MT limits | `iridium` max **340** MO, notes for MT **270** | Iridium SBD developer guides (e.g. vendor PDF summaries of 9602-class limits) |
| BLE advertising payload (31 B AD) | `eddystone` max **31** B | [Silicon Labs — advertising data basics](https://docs.silabs.com/bluetooth/latest/bluetooth-fundamentals-advertising-scanning/advertising-data-basics) |
| RFID UHF tag EPC class | `rfid` bitrate / payload floors | EPC Gen2 air-interface planning figures |
| IEEE 802.11 MSDU | `dsrc` max **2304** | 802.11 / 802.11p MSDU size literature |
| MQTT maximum publish length | `mqtt` max **268435455** | [MQTT v3.1.1 §2.2.3 (errata)](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/errata01/os/mqtt-v3.1.1-errata01-os-complete.html) |
| WebSocket frame sizing | `websocket` max **65536** as common server policy | [RFC 6455](https://www.rfc-editor.org/rfc/rfc6455); deployment defaults such as [Centrifugo WebSocket limits](https://centrifugal.dev/docs/transports/websocket) |
| Matter transport set | `stack.yml` **matter** → thread / wifi / ethernet | [Matter specification](https://csa-iot.org/developer-resource/specifications/) (Thread + Wi‑Fi + Ethernet transports) |

Regulatory and band lists (`ops.geography.rf.lorawan`, Sigfox RC, Z-Wave) are constrained by `schema/geography-registry.yml`, which is aligned to public regional-parameter name lists rather than a single vendor doc.