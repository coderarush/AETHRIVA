# AETHRIVA day-first UI refinement

**Goal:** Make the existing synthetic wellness workspace immediately readable, distinctive, and easier to operate.

**Direction:** Keep Carbon + Nunito, as the user explicitly confirmed. A daily journal leads with a chosen date and four separate readings; the month supplies context. Large readable values, quiet controls, consistent metric colors, aligned recovery charts, and adjacent evidence provide the visual character. No invented scores, imagery, or decorative gauges.

**Architecture:** Buildless ES modules. Preserve data and service contracts. Work on `codex/ui-refinement` in the dedicated AETHRIVA checkout; original applications stay intact. Parallel work has disjoint file ownership. Root integrates, reviews, verifies, and republishes the existing authorized public Site and GitHub main.

## Constraints

- Keep the fixed synthetic October 1–30, 2026 fixture, Pacific dates, all seven views, local calculations and complete evidence.
- Distinguish excluded measurements from absent observations. Preserve genuine zero values.
- Body text 16px, functional labels generally 14px or larger; compact technical metadata at least 12px. High contrast, explicit units and readable line length.
- Use native controls, visible focus, reduced motion, URL history and inline evidence.
- Do not add dependencies, backend, live integrations, clinical claims, or new health data.

## Tasks

- [x] Experience: day-first Overview, visible local chart metric selector (not a global data filter), previous/next/date controls, aligned Recovery trends, chart keyboard roving focus and adequate date selection alternative. Own experience.js, charts.js, experience.css, focused chart/rendering tests.
- [x] Supporting views: clearer Connect source registry and provenance, readable Insights/Timeline/Reports/About, explicit source exclusions and concise copy. Own workspace.js and workspace.css.
- [x] Integration: clean shared CSS and shell, clearer Intelligence entry and saved answer scope, working filter popovers, focus and horizontal scroll preservation, date/metric interactions, accessible evidence.
- [ ] Verification: tests, syntax/assets, independent review, desktop/tablet/mobile visual inspection, empty/filtered/missing/zero states, keyboard controls, Back/Forward, both demo flow runs, public deployment and commit match.
- [ ] Document actual design, update preview and verification notes, publish to existing Site and GitHub main.

## Review focus

1. A selected day remains visible and keyboard focus remains meaningful after rerender.
2. A plotted metric does not silently filter other measurements; exclusions never masquerade as missing data.
3. Source/date popovers do not overlap or trap focus, and Escape/outside click dismiss them.
4. Answer and evidence labels retain exact date/source/metric context after later navigation.
5. Narrow screens, large text, reduced motion, zero records and one-day scopes remain usable.

## Verification approach

Add regression tests where behavior has substantive pure boundaries; use browser interactions for focus, keyboard, scrolling, menus, history, and layout. Visual-only adjustments are verified in rendered views, not tests that mirror markup. Keep analytical tests unchanged unless exposing a real defect.

## Added inspiration direction

The user supplied two dashboard images and a short dashboard animation during implementation. Keep Carbon + Nunito and the verified product functionality. Incorporate pastel measurement panels, an expressive circular coverage calendar, roomy composition and tactile selection. The circular graphic represents dates with recorded observations, never overall health or readiness. Every mini trend uses the existing fixture. Motion answers interaction and respects reduced motion; no auto-rotating carousel. Source/status controls remain truthful.
