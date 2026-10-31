# Local functional dashboard verification

Verified October 30, 2026 (Pacific time).

- Full regression suite: **104 tests pass**, no failures. Includes immutable analytics/evidence, missing versus zero, dates, device protocol quality, local journal writes and restart persistence, deduplication, request/body/origin limits, cache degradation, provider-cache alias protection and field validation.
- `npm run check`: passes all 26 static runtime files. `git diff --check`: passes.
- Running local operational status: ready; provider cache available and private journal available. Google Health/Lyfta authorization and synchronization remain with the existing Health app.
- Backend storage gates passed before the typography pass began. No QA observations were written into the user's real journal or provider database.
- Isolated browser round trip: form submission -> API -> SQLite -> energy trend; after reload the saved rating is retained. Device fixture appears in Timeline and Reports with its original pressure units and movement warning. Provider-unavailable warning remains visible in the interface and report. These tests use a separate temporary database.
- Browser: all seven main views at 320, 390, 768, 1024 and 1440 CSS pixels (35 checks) load IBM Plex Sans without page or reading overflow or render-error states. Console contains no application errors/warnings in tested flows.
- Browser: removed-source bookmark stays empty rather than expanding to all private sources. Reset restores current sources; saved answer evidence resolves and receives keyboard focus.
- IBM Plex Sans loads locally. Computed desktop h1 is 30px/600; mobile is 28px. Body/tables16px, controls14px, metadata13px, consistent400/500/600 weights. Placeholder source contrast exceeds9:1.
- Independent code review identified four issues: hidden provider outages, report counts excluding non-daily records, edits possible while a check-in saves, and failure after a write committed against a corrupt existing journal. Fixes are covered by availability/report, disabled-field and preflight regression tests.
- Typography was independently audited and implemented; desktop/mobile Connections captures were inspected. The mechanical design scan reports advisory items only (no non-advisory findings).
- Reports include selected workouts, check-ins and device readings with reconciled source/day counts. Printable workout details are expanded; device tables paginate interactively but retain the full selected set for print.

## Actual boundaries

The current finished scope is the **local workspace**, as requested. The public Site serves the interface, empty first run and supported browser connection flow; it has no personal-data backend or private account system. Private records and the journal are excluded from Git and deployment. The original provider database remains read-only.

No physical Bluetooth device was paired during verification. Standard Heart Rate, Blood Pressure and Pulse Oximeter protocol/lifecycle tests do not establish compatibility with every model/firmware/browser. ECG, proprietary glucose/device protocols and manufacturer cloud integrations remain separate implementation work. PDF print rendering and every operating-system/browser combination have not been visually validated.

## Visual experience release

- 105 regression tests pass, including image coverage, valid raster signatures and local asset paths; static syntax/asset checks cover 60 runtime files.
- All 33 named guides have manufacturer photographs (32 unique assets); generic protocol categories remain explicit icons. Gallery search, inline full-photo details, close-focus restoration and pairing anchor focus were exercised at 320px. A pending search is canceled on a catalog pointer action to prevent result replacement during a click.
- 35 measured responsive checks across all 7 views at 320/390/768/1024/1440px passed with no document or reading overflow and no render-error states.
- Idle pairing is a Carbon panel without a giant placeholder value. Phone height was measured at 298px with compatibility/storage disclosure closed. Warnings and active measurements remain visible.
- The GPT-6.1 Sol visual worker reviewed the valid desktop gallery capture and mobile source/layout rules: no material visual blocker; the noted close-target width was raised to 44px. Other native capture files that showed the wrong route/viewport were discarded and are not treated as verification.
- This pass changes UI and image delivery only. Existing private databases, source normalization, calculations and connection protocols retain their previous behavior. No physical device pairing was performed.

The final static first visit was verified to open Connections with no records loaded. The design detector returned 75 advisory palette, radius and type-scale findings and no non-advisory findings; the intentional current Carbon/pastel treatments are documented in DESIGN.md.

## Bodha name and simpler Insights

105 regression tests and the static checks passed. The simplified view was exercised at measured widths of 320, 390, 768, 1024 and 1440px with the calculation disclosure open, without document overflow. Evidence opened with all 29 selected sleep input records, closing restored focus, metric filters narrowed the cards, and the seven-day comparison disclosed the excluded date. A local-only screenshot was inspected; personal readings are not added to published source. The app uses Bodha throughout visible runtime copy; existing local storage keys, database paths, environment variable names and the hosting URL remain compatible.
