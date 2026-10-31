# Verification

## UI refinement, October 30–31, 2026

`npm test`: 37 behavior tests pass. The original analytical checks remain, with new cases for independent plot selection, URL round-trips, bounded date controls, omitted source scopes, missing versus excluded observations, one keyboard entry per chart, coverage-calendar counts and compact trend gaps/zeros.

`npm run check`: JavaScript syntax and entrypoint assets pass across 16 runtime files. The application has no added dependencies.

Independent code review identified a navigator focus issue; stable button IDs and a disabled-endpoint fallback resolved it. Independent review of the inspiration pass returned PASS with no material issues. The circular display represents observed-day coverage, never health or readiness.

## Browser checks

All seven main views were checked at measured CSS widths 320, 390, 768, 1024 and 1440. Every document's scroll width matched the viewport; primary readings did not overflow. Tables and mobile charts scroll within their own regions. Desktop and mobile screenshots were inspected for actual text, hierarchy, selected states and layout.

Verified interactions:

- Previous/next date controls retain focus. At the end of the range, focus moves to the date input when Next becomes disabled.
- Chart arrow keys select adjacent days and keep focus on the same series. Each chart has one Tab entry.
- Mobile source/date popovers are mutually exclusive; Escape dismisses them and restores focus. Applying a range returns focus to its control.
- Source switches update every view. Excluded readings say “Hidden by filters”; restoring measurements retains dates. No-source selections show no fabricated values.
- October 4 remains sleep 5h54m, steps 0, resting heart rate 66 bpm and energy 3/10.
- Overview plot selection changes the chart independently of the global metric filter.
- All five suggested questions return supported, calculated answers. Clinical and unavailable-measurement requests return appropriate scoped responses.
- The lower-energy sleep finding resolves one calculation and all 52 input records. Inline evidence receives focus; closing it restores the original finding action.
- Saved answer dates, source names and metric scope remain unchanged when the active range changes.
- Back/Forward retains range and view. Reset clears conversation and restores full October. Motion controls retain focus; CSS and JavaScript respect reduced-motion preferences.

No browser console errors or warnings appeared in these flows. Print styles and the existing native print action remain in place; no automated PDF rendering was added.

Publication, anonymous access and hosted demo-flow verification are retained in the ignored local delivery record. This is a tested synthetic demonstration, not a claim of exhaustive bug freedom or clinical validation.
