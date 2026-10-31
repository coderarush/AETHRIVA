# Bodha

Bodha brings saved wellness measurements and workouts into a readable timeline, and makes the calculation behind each finding inspectable. It retains Overview, Connections, Recovery, Insights, Timeline, Intelligence and Reports, plus About, in the Carbon + IBM Plex Sans design.

## Local history and public first run

The local application reads a selected account's existing Ascend cache through a read-only bridge, and keeps a separate private SQLite journal for energy check-ins and saved Bluetooth measurements. Google Health contributes saved daily steps, total sleep duration and resting heart rate where available. Lyfta contributes saved workouts, exercises and sets. The existing local Health app continues to own provider authorization, credentials and synchronization. Refreshing Bodha rereads that cache.

The public static application contains no personal history or sample measurements. It opens an empty workspace with connection guides and available browser Bluetooth controls. A missing local API is an empty first run; a failed API is an explicit load error. Failed refreshes preserve the previous snapshot. Successful refreshes clear earlier answers so their evidence cannot be confused with the new snapshot.

The initial date scope is the latest available 30 days, bounded by saved history. An empty workspace uses the current Pacific date. Sources with no records, genuine missing observations and observations hidden by filters remain distinct states.

## Connections

The searchable catalog contains 36 guides across heart rate, ECG/EKG, blood pressure, pulse oximeters, thermometers, wearables, glucose and scales. A catalog listing explains a connection route; it does not imply that a nearby device was detected or that an exact model was tested.

Standard Bluetooth Heart Rate, Blood Pressure and Pulse Oximeter adapters can receive real measurements through a supported browser's user-driven chooser. Exact device and firmware compatibility still needs hardware validation. ECG waveforms, proprietary device protocols and manufacturer cloud account integrations remain unimplemented.

Bluetooth readings are separate from daily history. The last 120 accepted readings remain in page memory. In the local workspace, Save readings persists them into the separate journal, available after reload and restart in Timeline and Reports. CSV downloads preserve available measurement status and quality warnings. Invalid packets and pulse-oximeter demonstration/test/unavailable/invalid status reports do not become accepted readings. Quality warnings remain visible on accepted readings. Device records remain local. A live heart-rate stream is never substituted for resting heart rate or ECG.

## Measurements and evidence

Canonical daily metrics are sleep duration in minutes, steps, resting heart rate in bpm and self-reported energy on a personal 1–10 scale. Energy is entered through the daily check-in form (1–10) and saved once per Pacific date; the cache adapter does not derive it. Sleep totals include saved sleep sessions and naps. Workouts retain their recorded set values and distinguish completed sets; missing units are not invented.

Daily aggregates keep the source record ID, original sum and unit, contributing count, aggregation method, transformation version and snapshot import time. Their timestamps mark Pacific civil dates, not exact observation times. Calculation evidence resolves every canonical daily input used; the private provider records underlying those aggregates remain in the existing local service.

Intelligence supports five deterministic question intents using local calculations. Missing observations are excluded rather than replaced with zero. Associations require seven complete paired days and carry a small-sample warning below fourteen. Comparisons use equal adjacent periods and disclose excluded dates. Findings describe recorded data; they do not establish cause, diagnose, predict disease, prescribe treatment or provide a readiness score.

Current behavior is documented in `docs/CONTRACTS.md` and `docs/IMPLEMENTATION.md`. Earlier synthetic demonstration plans and preserved PRD material are historical context. Synthetic fixtures now live only under `tests/fixtures/` and are not part of the browser runtime.

The active local backend supports same-origin validated writes, deduplication, operational status and unavailable-provider handling. Reports include daily measurements, workouts and saved device readings, with consistent source/day counts and visible provider-outage notices. Interactive device tables paginate at 100 rows; printable reports retain the full selected set.

The current visual pass adds a manufacturer-photo device gallery with short definitions, a compact Carbon pairing panel and a more prominent real-data coverage calendar. Empty first visits start at Connections; recorded workspaces retain Overview.
