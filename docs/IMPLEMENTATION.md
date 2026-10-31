# AETHRIVA implementation

The current implementation retains the buildless Carbon + IBM Plex Sans application and all existing views, adds real local history and device discovery, and removes synthetic data from the runtime. Earlier demonstration-only plans remain in the historical documents.

## Runtime architecture

1. `npm run dev` starts `scripts/serve.mjs` at `127.0.0.1:4173`. `server/http-server.mjs` serves `dist/` and the read-only `GET /api/workspace` endpoint. It checks the local host and request origin, restricts static paths, and returns sanitized errors.
2. `server/local-workspace.mjs` opens the existing Ascend SQLite cache read-only in a consistent read transaction. It selects one account and reads approved daily summary, workout and sync-status fields. It does not load credentials, alter the database, authorize accounts or start synchronization.
3. `dist/data/workspace-data.js` validates and sanitizes the returned snapshot. Public hosting without the endpoint starts empty. Other load errors remain visible; there is no synthetic fallback.
4. `createHealthService(dataset)` and `createWorkspaceState(dataset)` bind analytics, evidence and navigation to that snapshot. Initial dates cover the latest available 30 days. Refresh creates a new snapshot and clears retained answers; a failed refresh leaves the existing data available.
5. Page renderers retain the shared shell, date/source scope, selected day, charts, evidence, print support and accessible keyboard behavior. Connections has its own catalog search and pairing state.

## Saved-data semantics

Google Health steps use the saved daily sum. Sleep uses the saved sum of hours, converted to minutes, including sessions and naps. Resting heart rate uses the saved daily arithmetic mean; ordinary heart rate is not substituted. Counts, original units, aggregation methods and stable source IDs remain available in evidence. Daily timestamps are explicit calendar-day markers rather than invented exact observation times.

Lyfta workouts preserve sanitized exercises and sets, separate completed-set counts, and unknown units. Workouts are not converted into steps or self-reported energy. Malformed or future saved observations are excluded with a notice. Source connection and sync status are separate from the presence of usable records.

Default cache location: `~/Library/Application Support/Ascend/data/ascend.sqlite`. `AETHRIVA_DB_PATH` overrides it. `AETHRIVA_ACCOUNT_ID` selects an account and is required when more than one exists. The existing Health app at `http://localhost:3000` owns Google authorization, Lyfta credentials and provider sync.

## Bluetooth and catalog

`dist/connections/catalog.js` supplies 36 guides across eight categories, including official manufacturer/specification references and explicit integration status. `dist/connections/bluetooth.js` implements user-selected BLE sessions for standard Heart Rate, Blood Pressure and Pulse Oximeter services. ECG and proprietary integrations remain separate future work; no universal device compatibility is claimed.

The controller distinguishes selection, connection, waiting for measurements, receiving, rejection and disconnection. It handles optional fields, units, medical floating-point special values, measurement status and quality warnings. Pulse-oximeter demonstration/test/unavailable/invalid reports are rejected, and an earlier accepted value is visibly marked stale when the latest packet is rejected. Cancelled or disconnected sessions cannot resume through late callbacks.

The controller retains the last 120 accepted readings in memory. CSV export includes available device timing, measurement and sensor status, contact state, RR intervals and warnings. Readings are not sent to a cloud service or merged into daily analytics. Save readings persists them in the separate local journal, preserving the provider cache. Protocol decoding and lifecycle tests do not establish hardware compatibility; physical-device validation remains outstanding.

## Boundaries and validation

The public artifact is `dist/`; private databases, credentials and legacy application archives stay outside it. Synthetic fixtures and compatibility helpers live under `tests/fixtures/` only. The source repository is [coderarush/Bodha](https://github.com/coderarush/Bodha), with original contributor history and credits retained.

Run `npm test` for analytics, evidence, state, rendering, cache-bridge and Bluetooth regressions. HTTP tests need permission to bind loopback. Run `npm run check` for syntax and asset checks. Browser, publication and hardware validation status belongs in `docs/VERIFICATION.md`.

## Durable local journal

`server/local-journal.mjs` manages a separate `.local/aethriva.sqlite` (mode 0600), configurable through `AETHRIVA_JOURNAL_PATH`. It never opens the provider cache for writing and rejects path/inode aliases. `GET /api/workspace` combines saved provider history, daily check-ins and separate spot device readings. Snapshot dates cover at most the latest ten years through Pacific today; older stored records remain untouched.

`POST /api/checkins` accepts `{date,energy}` (integer1–10), upserting one day. `POST /api/device-readings` accepts `{device:{name},samples}` (1–120 accepted decoder samples), validates status/units/time server-side and inserts by content ID. Writes require exact Origin, JSON, a 256KB body limit and a five-second body deadline. Preflight validation prevents an unreadable existing journal causing a failed response after a new observation has committed. Mutations return an updated validated workspace; retained answers are cleared when its inputs change.

`GET /api/status` contains operational availability only. An unavailable provider cache preserves the journal, with a warning in the interface and report. Journal failures are explicit. Device readings stay outside resting-heart-rate/energy analytics, while actual check-ins enter canonical energy calculations. Timeline and Reports include workouts and device readings. The UI's Save readings action persists the bounded current buffer; ongoing capture remains in memory until saved.

IBM Plex Sans is served locally as WOFF2 with 400/500/600 roles; native controls, fields, tables and chart labels share its scale. No hosted account backend is part of this local-first release.
