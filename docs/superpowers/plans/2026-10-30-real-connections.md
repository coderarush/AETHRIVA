# Real Connections Implementation Plan

**Goal:** Replace the fictional workspace with real local health history and a useful searchable Connections surface.

**Architecture:** Keep Carbon + Nunito and the six analytics methods. Load a validated runtime snapshot from a loopback-only read-only adapter over the existing Ascend database. The existing service remains the owner of Google Health authorization, Lyfta credentials, and synchronization. Public static hosting starts empty and provides the device catalog and browser Bluetooth flow; personal history is never packaged into source or public assets.

**Tech stack:** Browser ES modules, Node 24 built-in SQLite and HTTP, Web Bluetooth Heart Rate service, existing SVG charts.

## Implementation

- [x] Read-only local bridge: canonical daily steps, total sleep including naps, resting heart rate, sanitized Lyfta workouts. Preserve zero, missing data, original aggregate inputs and provenance. Do not infer energy from workouts or heart rate.
- [x] Runtime data/service/state: inject source IDs and date bounds, latest available 30-day view, non-October dates, complete calculation evidence, distinguish empty public state from backend failures. Keep fixture-only regression tests independent.
- [x] Connections: searchable product/provider catalog, category filters, clear integration method, setup details, connected source coverage and real refresh from the cache. Separate analysis source filters from connection actions.
- [x] Browser Bluetooth: a user-triggered standard Heart Rate chooser, real GATT notifications, explicit waiting/receiving/disconnected states, timestamps, bounded in-memory samples, disconnect and download. Never label live BPM as resting heart rate or ECG.
- [x] Integrate all current views, real workout details and appropriate first-run states. Remove fictional profile and demo messaging from the active runtime. Never disguise synthetic values as personal measurements.
- [x] Validate mapping/security/parser/state tests and full regressions. Inspect desktop/mobile and test empty/error/real-data flows. Publish only static code, with a separate local URL for private history.

## Review focus

1. Cross-origin access, DNS rebinding, static traversal and personal data accidentally entering published files.
2. Instantaneous versus resting heart rate, daily sums versus sample averages, and absent self-reported energy.
3. Actual Bluetooth cancellation/disconnect/invalid packets, unsupported browsers, and devices requiring manufacturer integrations.
4. Non-October dates, DST, missing observations, zero, and retained answer evidence after data refresh.
5. Unavailable backend versus genuinely empty records, source filters versus connection state, and mobile search/details readability.

## Scope boundaries

The catalog is curated and extensible, not a claim of universal compatibility. ECG, cuffs, glucose monitors, and proprietary wearables require device-specific adapters or manufacturer authorization; their catalog entries must expose that truth. No real hardware has been provided for a hardware verification claim. No cloud authentication/backend is created by static deployment. Personal records stay local; credentials and original applications remain untouched.
