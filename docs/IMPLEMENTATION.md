# AETHRIVA implementation

The current implementation retains the buildless Carbon + Nunito application and all existing views, adds real local history and device discovery, and removes synthetic data from the runtime. Earlier demonstration-only plans remain in the historical documents.

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

The controller retains the last 120 accepted readings in memory. CSV export includes available device timing, measurement and sensor status, contact state, RR intervals and warnings. Readings are not sent to a cloud service, persisted to the cache or merged into daily analytics. Protocol decoding and lifecycle tests do not establish hardware compatibility; physical-device validation remains outstanding.

## Boundaries and validation

The public artifact is `dist/`; private databases, credentials and legacy application archives stay outside it. Synthetic fixtures and compatibility helpers live under `tests/fixtures/` only. The source repository is [coderarush/Bodha](https://github.com/coderarush/Bodha), with original contributor history and credits retained.

Run `npm test` for analytics, evidence, state, rendering, cache-bridge and Bluetooth regressions. HTTP tests need permission to bind loopback. Run `npm run check` for syntax and asset checks. Browser, publication and hardware validation status belongs in `docs/VERIFICATION.md`.
