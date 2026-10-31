# Verification

## Automated

`npm test`: 22 behavior tests pass. Coverage includes canonical provenance, unit consistency, zero versus missing values, inclusive Pacific dates, comparison windows, sample thresholds, evidence reconstruction, supported/unsupported/clinical questions, explicit query dates, low-energy groups, URL state and reset-related normalization.

`npm run check`: all runtime JavaScript syntax and entrypoint asset references pass. No dependency installation, model key or backend is needed.

## Independent review

Whole-branch code review identified three Important issues. A focused fix wave added six regressions; independent scoped re-review passed all three. Independent screenshot/source finish review returned ship with no material required fixes.

## Browser checks

All seven main views were checked at measured CSS widths 390, 768 and 1280. Every view had document scrollWidth equal to viewport width. Tables and navigation scroll within their own regions.

Confirmed source-card filtering updates the shared scope (110 to 82 records when activity is excluded), observed October 4 zero steps stays zero, all four measurements follow the same date, chart focus remains on the same series after selection, and day evidence resolves all four exact source records. The headline lower-energy question returns scoped calculated differences with complete evidence.

The public URL, final commit match, anonymous access, and two end-to-end demo runs are recorded in DELIVERY.md after publication.
