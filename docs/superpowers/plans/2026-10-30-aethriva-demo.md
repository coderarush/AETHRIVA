# AETHRIVA implementation

Approved 2026-10-30. Goal: a usable Carbon + Nunito public product and reliable 60-second Connect → Recovery → Intelligence → Evidence demonstration by 21:00 America/Los_Angeles.

## Decisions
Reuse selected vanilla HTML/CSS/JS preview. Static buildless browser app in dist/, tests/, docs/. Single fictional October 1–30 2026 Pacific dataset. No real connectors, backend, live model, accounts, uploads or composite health scores. All calculations local; missing values never become zero. Five supported query types with complete evidence. Existing private apps remain intact. GitHub canonical source; Sites anonymous public hosting.

## Tasks
1. Foundation: dedicated clone, scope and source map, shared contracts, selected Nunito license.
2. Data: canonical fixture, validation, deterministic selectors/calculations, five supported question intents, evidence resolution and focused tests.
3. Experience: Overview, Recovery, reusable charts, Carbon/Nunito styling, synchronized day interactions, mobile and reduced motion.
4. Workspace: Connect, Insights, Timeline, Reports/About using shared service data.
5. Integration: shell, accessible routing, filters/reset, Intelligence, inline evidence with scope snapshots.
6. Verify: unit/syntax/asset checks, desktop/mobile/keyboard browser smoke, clinical and unknown questions, two timed demos.
7. Deliver: commit under verified Tanuj identity, preserve Arush history, publish same verified source commit to GitHub and anonymous Sites URL.

## Parallel ownership
Data agent owns dist/data/ and tests/data*. Experience agent owns dist/pages/experience.js, dist/charts.js, dist/styles.css. Workspace agent owns dist/pages/workspace.js. Integrator owns everything else. No agent edits another owner's files; no agent commits or pushes. Integrator reviews and commits coherent stages.

## Acceptance
All views agree with one fixture; all citations resolve to complete calculation inputs; valid units/Pacific dates; 7-pair association minimum with warnings below14; correct comparisons and zero denominator; filters/reset/back/forward/focus work; all five questions function without network; public URL works signed out; two 60-second rehearsals succeed.
