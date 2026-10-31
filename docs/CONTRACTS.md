# Integration contracts

The application uses ES modules and built-in Node/browser APIs, with no runtime package dependencies. The public artifact is `dist/`. Synthetic fixtures and their compatibility helpers belong only in `tests/fixtures/`; runtime modules must not import them.

## Workspace boundary

`GET /api/workspace` returns a sanitized snapshot from the local read-only cache bridge. Provider authorization and synchronization remain in the existing Health app at `http://localhost:3000`. AETHRIVA's local server runs at `http://127.0.0.1:4173` and does not forward credentials or start provider syncs.

`dist/data/workspace-data.js` exports `loadWorkspace(options)`, `validateWorkspace(payload)` and `emptyWorkspace(options)`. The dataset is:

```js
{
  version: 1,
  mode: 'local' | 'empty',
  profile: {name, initials},
  sources: [{id, name, sourceType, status, metricKeys, isSynthetic: false,
             lastSyncedAt, syncStatus, description}],
  events: [/* canonical daily HealthEvent records */],
  workouts: [/* sanitized Lyfta workouts */],
  range: {from, to},
  importedAt, timezone, notices: [],
  available, error
}
```

The loader requests the same-origin endpoint without caching. HTTP 404 means an empty public first run with `available:false` and no error. Other failures retain an error message and never load a sample dataset. A successful local response has `available:true`. The app preserves existing records on failed refresh; successful refresh replaces the snapshot and clears earlier conversations/evidence.

Validation copies only approved fields and checks dates, finite measurements, units, source references, unique record/source IDs, provenance and bounded payload sizes. `range` is the available history, including workouts. Empty history uses the current 30 Pacific calendar days.

## Records and provenance

`dist/data/metrics.js` defines the four canonical daily metrics: `sleep_duration` in minutes, `steps`, `resting_heart_rate` in bpm, and `energy` on the self-reported `/10` scale. The current bridge reads Google Health daily steps sums, sleep-hour sums converted to minutes, and resting-heart-rate means. Sleep includes saved sessions and naps. There is no inferred energy or substitution of ordinary heart rate for resting heart rate.

Events retain `id`, `sourceId`, `sourceRecordId`, `metricKey`, `metricLabel`, `category`, `value`, `unit`, `originalValue`, `originalUnit`, `observedAt`, `importedAt`, `timezone`, `quality`, `provenance` and `metadata`. Provenance includes source name/type, import batch, transformation version and contributing record count when available. Daily metadata preserves `civilDate`, `aggregate:true`, `timestampPrecision:'day'`, aggregation method and original summary sum/count.

For daily summaries, `observedAt` is a day marker and `importedAt` is the workspace read time. Display the civil date and “Daily aggregate,” not an exact observation time. Analytics groups and filters by `metadata.civilDate` when present. The marker may fall later in the current day than the read clock; a future civil date is still invalid.

Lyfta workouts are separate from canonical health events. Each has `id`, `sourceId`, `sourceRecordId`, `title`, `date`, optional `timestamp`/`weightUnit`, `exercises`, counts and `isSynthetic:false`. Exercises contain named sets with nullable weight, reps, RIR, duration and distance plus `completed` and type. Saved and completed sets are counted separately. Unknown weight units stay null. Timeline applies the shared source/date scope; workouts are excluded by a specific daily-metric filter.

A source's local connection/sync status does not establish a current provider session. Source capability and record availability are distinct. Historical sources remain selectable after disconnection when their records are present.

## State and analytics

`createWorkspaceState(dataset)` in `dist/workspace-state.js` provides `createInitialState`, `normalizeState`, `stateFromSearch`, `searchFromState`, `rangeState`, `toggleSource`, `scopeFromEvidence`, `bounds` and `sourceIds`.

- State is `{screen,from,to,selectedDate,sourceIds,metricKey,plotMetric}`. `connect` remains the route key for the **Connections** view.
- Inclusive dates use Pacific civil days. The initial range is the latest available 30 days, clamped to history; selected day defaults to the latest available day and stays within the active range.
- Presets end at the dataset's latest available date and clamp to its earliest date. They are independent of the current wall clock when history exists.
- URL keys remain `screen`, `from`, `to`, `day`, `sources`, `metric` and `plot`. An omitted source scope means all applicable sources; `[]` means none.
- `metricKey` accepts `all` or a canonical metric. `plotMetric` accepts only a canonical metric and defaults to sleep. It selects the Overview plot and must never become an analytics filter.

`createHealthService(dataset)` in `dist/data/health-service.js` owns an isolated validated snapshot and six async methods:

```js
selectEvents(filters)
summarize(filters)
comparePeriods(filters)
buildInsights(filters)
answerQuestion(question, filters)
resolveEvidence(ids)
```

Filters are `{from,to,sourceIds,metricKey?}`. `createAnalytics(dataset)` in `dist/data/analytics-core.js` supplies the underlying pure operations; that module also exports the fixture-free `datesInRange` helper.

Intelligence supports summaries, equal-period comparisons, lower-energy comparisons, sleep evidence and neutral appointment summaries. Explicit ISO dates and named months are supported. “Last N days” ends at the selected period's end, or the dataset end when no dates are supplied. Unresolved dates and unsupported/mixed measurements return insufficient data. Questions and calculations stay in the browser; no live language model is called.

## Results and evidence

`summary` contains `coverage`, `seriesByMetric` and `calculations`. Coverage includes record/source/day counts, latest observation and per-metric observed/missing days. Series points are `{date,value:number|null,recordIds:string[]}`. Summary calculation values are `{mean,median,min,max,total,observedDays,missingDays}`; only steps has a total.

`comparison` contains `status`, `previousRange`, `currentRange`, `excludedDates`, `calculations` and `limitations`. Each period calculation keeps earlier/later means, delta, percentage change, counts and missing-day counts. Odd ranges disclose the earliest date excluded to form equal adjacent windows. A zero earlier mean yields a null percentage change.

Every calculation retains its method, period, values, limitations and complete canonical input IDs. These inputs may themselves be provider daily aggregates; their original sums/counts remain in provenance rather than claiming to expose each raw provider observation. `resolveEvidence` accepts event/calculation IDs and returns `{records,calculations}`; unknown IDs reject. Returned values are copies of the service snapshot.

Retained answers save their effective dates, source names and metric scope. Toolbar changes do not rewrite them. Show **Hidden by filters** only for genuinely excluded measurements; show **Not recorded** for absence. Preserve zero. Coverage tracks describe record availability, never health or readiness. Associations require seven complete pairs, with a warning below fourteen.

## Connections and Bluetooth

`dist/connections/catalog.js` exports `deviceCatalog`, categories and `searchCatalog(query,{category})`. The current inventory has 36 guides across eight categories. Entries describe manufacturer/model, measurements, aliases, connection route, support status, hardware-validation status and official reference URLs. Catalog results are not nearby-device discovery.

`createBluetoothController(options)` exposes `connect(selection)`, `disconnect()` and `getSnapshot()`, with `onChange` updates. It implements standard `heart_rate`, `blood_pressure` and `pulse_oximeter` profiles. The browser chooser runs from the user's click and filters advertised services. Secure context and browser capability checks gate pairing. Selecting a catalog-only ECG/proprietary entry cannot establish a simulated connection.

The controller distinguishes connection from receiving usable measurements. It preserves available optional fields, units, device timestamps without invented time zones, status flags and quality warnings. Malformed packets are ignored. Pulse-oximeter demonstration/test/unavailable/invalid statuses are rejected. Accepted warnings remain visible; a previous accepted value is marked stale after a rejection or disconnection.

Default retention is the last 120 accepted readings in page memory. CSV download preserves available received/device times, values/units, measurement and sensor status, sensor contact, RR intervals and warnings. The local Save readings action persists accepted readings to the separate journal; it does not write the provider cache or merge spot values into daily analytics. Exact-model/firmware compatibility and ECG waveform support are not established by protocol tests.

## Rendering and delegated actions

Renderers return HTML and receive `ctx={state,filters,summary,comparison,insights,sources,events,workspace,connectionUI}`. Shared UI helpers escape text, format complete metric units and Pacific dates, and build inline evidence buttons. Root owns interaction listeners; renderers must not bind duplicates.

| Action | Behavior |
| --- | --- |
| `data-screen`, `data-day`, `data-selected-day`, `data-view-day` | Navigation and synchronized bounded day selection. |
| `data-metric`, `data-plot-metric`, `data-plot-scroll` | Shared metric filter or independent Overview plot selection/focus. |
| `data-range`, `data-view-source` | Dataset-bound date presets or source-scoped Timeline. |
| `data-reset`, `data-clear-filters`, `data-restore-measurements` | Reset view, restore defaults on the current screen, or restore source/metric scope. No records are deleted. |
| `data-ask`, `data-question`, `data-new-chat` | Submit supported questions or clear the in-memory conversation. |
| `data-evidence`, `data-close-evidence` | Open inline evidence and restore its trigger focus on close. |
| `data-refresh-workspace` | Reread the local cache; never start provider synchronization. |
| `data-device-id`, `data-device-close`, `data-device-category`, `data-device-clear` | Catalog details, category filtering and search reset. |
| `data-bluetooth-connect`, `data-bluetooth-profile`, `data-bluetooth-disconnect`, `data-bluetooth-download` | User-driven pairing/session control and CSV export. |
| `data-print`, `data-motion` | Print or toggle reduced motion; OS reduced-motion preference is respected. |

Source inputs use `name='source'`. Date and question forms remain `#custom-range` and `#question-form`; device search is `#device-search`. Full charts keep one keyboard entry point and Left/Right/Home/End date navigation. Mini charts are noninteractive. Evidence remains inline in a labelled focusable scroll region. Scope popovers dismiss on Escape/outside interaction, and rerenders retain focus and horizontal scroll where applicable.

## Local journal additions

Workspace snapshots optionally contain `cache:{available:boolean}` and `journal:{available:boolean}` plus `deviceReadings:[{id,sourceId:'bluetooth',deviceName,receivedAt,sample}]`. These flags survive validation; unknown fields are discarded. `sample` uses the supported decoder shape and recomputed quality warnings, retaining units/nulls/zero/status metadata. It is never a daily resting-heart-rate observation.

The `checkins` source advertises only canonical `energy`. The `bluetooth` source advertises no canonical daily metrics. `journalUI` supplies pending-write state, check-in draft and device table page to renderers. Source/date/metric filters apply to all record types; spot device records and workouts require All metrics. Successful writes replace the immutable service snapshot and clear old answer evidence. New browser mutation methods live in `dist/data/journal-client.js`; failures keep the user's draft and current data.

POST check-ins returns `{checkin:{id,date,energy},workspace}`; POST device readings returns `{accepted,inserted,duplicates,workspace}`. GET status returns `{status,cache,journal,capabilities}` without identity or health values. Original cache and new local journal are separate storage boundaries.
