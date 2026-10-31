# Source and decision map

## Visual and application reuse

The selected existing `design-preview` supplied Carbon colors, bundled IBM Plex Sans, focus layouts, inline details and segmented chart/day-selection patterns. The current application keeps those choices and all seven main views. `DESIGN.md` records the design; the IBM Plex Sans font and its SIL Open Font License remain bundled under `dist/assets/`.

Original local applications remain outside this repository. Their private credentials, databases, archives and installers are not copied into the public artifact. The current source repository is [coderarush/Bodha](https://github.com/coderarush/Bodha); the AETHRIVA product name, TanujBuilds/coderarush credits and original Git history are retained.

## Real data reuse

The local bridge reads approved fields from the existing Ascend cache. The existing Health app owns Google Health authorization and synchronization and Lyfta credentials/imports. AETHRIVA adds a read-only projection rather than another provider credential store.

Google Health daily summaries supply saved steps, total sleep and resting-heart-rate values. Original units, sums, counts, aggregation methods and stable source record IDs stay attached. The displayed dates reflect saved Pacific daily aggregates; no precise measurement time is reconstructed. Lyfta supplies sanitized workouts and sets separately. No self-reported energy is inferred.

The public static build starts with empty history. Personal records are returned only by the local same-origin API and are not embedded in static files or documentation.

## Device sources

The connection catalog records official manufacturer and Bluetooth specification links per entry. Its 36 guides describe eight device categories and distinguish implemented standard BLE adapters from manufacturer or proprietary integrations. Standard Heart Rate, Blood Pressure and Pulse Oximeter adapters are implemented; exact-model hardware validation remains separate. ECG listings do not imply waveform support.

Bluetooth readings remain in page memory, with an explicit local CSV download. Measurement flags and warnings are preserved where available. The catalog and adapter source files are the current capability inventory.

## Historical references

`docs/reference/AETHRIVA_PRD.md`, `docs/reference/AETHRIVA_CODEX_HANDOFF.md`, the earlier plans under `docs/superpowers/`, and `docs/DEMO.md` preserve the original synthetic demonstration scope. Their implementation restrictions do not describe the current real-data release. Domain meanings, provenance, complete calculation inputs and descriptive wellness boundaries still apply.

The fictional October fixture and its legacy helpers now live only under `tests/fixtures/` for regression testing. The runtime dependency graph does not import them. Current behavior is documented in `PRODUCT.md`, `docs/CONTRACTS.md` and `docs/IMPLEMENTATION.md`; delivery and verification evidence are recorded separately.

## Current additions

IBM Plex Sans variable Roman font and OFL license come from IBM's official `IBM/plex` repository; exact URLs and hashes are recorded in `dist/assets/ibm-plex-sans-provenance.json`. The previous font remains in Git history.

`server/local-journal.mjs` and new journal client/rendering modules are original AETHRIVA work. They reuse the existing provider-cache mapping and shared Bluetooth quality interpretation, preserving original source credit. The original Health app folders, installed synchronization service, credentials and provider database remain outside this publishable source tree.

## Product imagery

`dist/assets/devices/` contains 32 official manufacturer image assets used by 33 named catalog guides (the same Polar H10 photo serves its two measurement guides). No product photographs were generated. `dist/assets/devices/provenance.json` records exact model, manufacturer page/image URLs, attribution and verification. The 3 generic Bluetooth service entries use labeled category icons. `dist/connections/product-media.js` holds concise display definitions and local image paths; original compatibility/setup facts remain in the catalog.
