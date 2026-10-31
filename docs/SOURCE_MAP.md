# Source and decision map

## Visual and application reuse

The selected existing `design-preview` supplied Carbon colors, bundled Nunito, focus layouts, inline details and segmented chart/day-selection patterns. The current application keeps those choices and all seven main views. `DESIGN.md` records the design; the Nunito font and its SIL Open Font License remain bundled under `dist/assets/`.

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
