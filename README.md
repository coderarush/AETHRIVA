# AETHRIVA

Your health, connected and understood. A personal wellness workspace built for the Founders Inc. Nighthack, with local Google Health and Lyfta history, a searchable device catalog, and evidence you can inspect.

[Public site](https://aethriva-nighthack.tan9uj.chatgpt.site) · [Source](https://github.com/coderarush/Bodha)

## Run locally

Requires Node.js 24+. The application uses built-in Node modules and browser ES modules; no package installation or API key is needed.

```sh
npm run dev
```

Open [the local workspace](http://127.0.0.1:4173). It reads saved history from the existing Ascend cache at `~/Library/Application Support/Ascend/data/ascend.sqlite`. The database remains outside this repository and is opened read-only. Set `AETHRIVA_DB_PATH` to use a different compatible cache. Set `AETHRIVA_ACCOUNT_ID` when the cache contains multiple accounts; accounts are never combined automatically.

The existing [Health app](http://localhost:3000) owns Google authorization, Lyfta credentials and synchronization. AETHRIVA's **Refresh history** rereads saved records; it does not start a provider sync. Authorize or synchronize in the Health app, then refresh this workspace.

The public static site starts with empty history and connection guides. It cannot read your computer's database. A missing or failed local connection never substitutes sample measurements.

## Explore your records

All seven main views remain: Overview, Connections, Recovery, Insights, Timeline, Intelligence and Reports, with About explaining provenance and limitations.

- Google Health supplies saved daily steps, sleep duration and resting heart rate when available. Sleep includes recorded sessions and naps; original sums, counts and units remain attached.
- Lyfta supplies saved workouts, exercises and sets. Completed sets are distinguished from other saved sets, and unknown weight units remain unknown.
- The initial view shows the latest available 30 days. Dates, source filters, chart selection, comparisons and printable reports share one validated snapshot.
- Missing measurements stay empty and recorded zero stays zero. Self-reported energy is never inferred from workouts or another measurement.
- Intelligence calculates five supported question types in the browser. Findings link to complete canonical calculation inputs; no live language model is called.

## Connect a device

Connections includes 36 guides across eight categories, searchable by brand, model, measurement and aliases such as ECG/EKG. Each guide names its integration route and limitations.

Browser adapters implement standard Bluetooth **Heart Rate**, **Blood Pressure** and **Pulse Oximeter** services. Pairing requires a supported browser, HTTPS or localhost, and a user-selected device in the browser chooser. Exact model and firmware compatibility remains hardware-unverified. ECG waveforms, proprietary protocols and manufacturer cloud connections require separate integrations.

The latest 120 accepted readings stay in page memory and can be downloaded as CSV with available device status, timing and quality warnings. No device readings are uploaded or added to the daily history. Invalid packets and pulse-oximeter demonstration, test, unavailable or invalid measurements are rejected. Live heart rate is distinct from resting heart rate and ECG.

## Development

```sh
npm test
npm run check
```

- `dist/`: buildless browser application, runtime data adapters, views and Bluetooth adapters.
- `server/`: local read-only cache bridge and same-origin HTTP server.
- `tests/`: isolated database, analytics, state, rendering and Bluetooth regressions. Synthetic fixtures live only in `tests/fixtures/`.
- `docs/`: current contracts, implementation notes and verification; earlier demonstration plans remain historical references.

AETHRIVA describes recorded data. It does not diagnose, recommend treatment or produce a readiness score. The Carbon + Nunito design and self-hosted OFL font remain intact.

Built by [TanujBuilds](https://github.com/TanujBuilds) and [coderarush](https://github.com/coderarush). Original contributor history and credits are retained. See [implementation](docs/IMPLEMENTATION.md), [contracts](docs/CONTRACTS.md), [source map](docs/SOURCE_MAP.md) and [verification](docs/VERIFICATION.md).
