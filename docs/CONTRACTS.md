# Frozen integration contracts

ES modules, no new runtime dependencies. Shared helpers in `dist/ui.js`: `escapeHtml(value)`, `icon(name,size=20)`, `formatMetric(value,metricKey)`, `formatDate(iso,{short=false,time=false}={})`, `metricLabel(metricKey)`, and `evidenceButton(ids,label='View evidence')`. `formatMetric` returns complete text including units. `formatDate` always uses America/Los_Angeles.

## State and service boundary

Page renderers return an HTML string and receive `ctx={state,filters,summary,comparison,insights,sources,events}`.

- `state={screen,from,to,selectedDate,sourceIds,metricKey,plotMetric}`.
- Service `filters={from,to,sourceIds,metricKey?}`. **Never send `plotMetric` as a data filter.** It chooses only the Overview trend; the other measurements retain their shared scope.
- `metricKey` accepts `all` or one of `sleep_duration`, `steps`, `resting_heart_rate`, `energy`. `plotMetric` accepts only those four measurements and defaults to `sleep_duration`.
- URL keys are `screen`, `from`, `to`, `day`, `sources`, `metric`, and `plot`. Legacy/invalid `plot` values fall back to sleep. Range/source changes preserve the plot choice; Reset restores sleep and the complete demo.
- Dates are inclusive Pacific civil dates within Oct 1–30, 2026. `selectedDate` defaults to Oct 30 and clamps to the selected range. Source selection omitted means all; `[]` means none.

The six async methods in `dist/data/demo-service.js` remain `selectEvents(filters)`, `summarize(filters)`, `comparePeriods(filters)`, `buildInsights(filters)`, `answerQuestion(question,filters)`, and `resolveEvidence(ids)`.

`dist/data/demo-data.js` exports `sources`, `events`, `checkins`, keyed `metrics` (each `{key,label,unit,color}`), `demoProfile`, `DEMO_START='2026-10-01'`, `DEMO_END='2026-10-30'`, and `TIME_ZONE='America/Los_Angeles'`. All records are synthetic.

## Results and evidence

`summary={coverage:{records,sources,daysWithRecords,daysWithCheckins,latestObservedAt,metrics:{[key]:{observedDays,missingDays}}},seriesByMetric:{[key]:Array<{date,value:number|null,recordIds:string[]}>},calculations:CalculationResult[]}`.

Summary calculations have `metricKeys:[key]`, `calculationType:'summary'`, and `values:{mean,median,min,max,total,observedDays,missingDays}`. Total applies to steps; otherwise it is null.

`comparison={status:'supported'|'insufficient_data',previousRange:{from,to}|null,currentRange:{from,to}|null,excludedDates:string[],calculations:CalculationResult[],limitations:string[]}`. Period calculation values are `{previousMean,currentMean,delta,percentageChange,previousCount,currentCount,previousMissingDays,currentMissingDays}`. Odd-window excluded dates must remain visible.

CalculationResult, Insight, and IntelligenceResponse retain the PRD camelCase fields. `insight.calculationId` links complete inputs; `evidenceRecordIds` contains actual event IDs. `resolveEvidence` accepts event/calculation IDs and returns `{records,calculations}`; unknown IDs reject. Retained answers store their own effective filters; opening their evidence must use that saved scope rather than the current toolbar. Display saved dates, source names, and metric scope beside each answer.

A global metric/source filter can empty other series. Show **Hidden by filters** for excluded measurements and **Not recorded** for genuine missing observations. Keep zero as a value. Coverage-circle segments represent date/metric record availability only, never a health score.

## Root-delegated interactions

Do not bind duplicate events in page renderers. Root owns these attributes:

| Attribute | Behavior |
| --- | --- |
| `data-screen` | Navigate to overview, connect, recovery, insights, timeline, intelligence, reports, or about. |
| `data-day=ISODate` | Select a day across readings/charts. |
| `data-selected-day` | Native date input; root handles change. Keep `min`/`max` at the selected range and endpoint buttons disabled. |
| `data-view-day=ISODate` | Open Timeline scoped to that single day. |
| `data-metric=key` | Set the global metric filter (`all` clears it). |
| `data-plot-metric=key` | Set only the Overview plot metric. |
| `data-plot-scroll=true` | On a plot action, focus/scroll to the Overview trend heading after updating. |
| `data-range=7\|14\|30` | Choose an inclusive preset ending Oct 30. |
| `data-view-source=sourceId` | Open Timeline with that source selected. |
| `data-ask=question` / `data-question=question` | Open Intelligence and submit the question. |
| `data-evidence=JSON array` | Resolve inline evidence; use `evidenceButton`. |
| `data-close-evidence` | Close evidence and return to its originating action. |
| `data-restore-measurements` | Restore all loaded sources and all metrics, preserving dates/plot. |
| `data-reset` / `data-clear-filters` | Reset the complete demo / restore initial state while retaining the current screen. |
| `data-new-chat` | Clear the in-memory conversation. |
| `data-print` / `data-motion` | Print / toggle reduced motion. OS reduced-motion preference is always respected. |

Source inputs use `name='source'` and `value=sourceId`; toolbar checkboxes and Connect switches share the same selection. The custom date form is `#custom-range` with `from`/`to` fields. The question form is `#question-form`, with `#question-input`; Enter submits and Shift+Enter inserts a line break.

Interactive charts use `data-chart-keyboard`, point buttons `.chart-hit[data-day]`, and a stable `data-chart-scroll` ID. Only one point per chart has `tabindex=0`; Left/Right/Home/End select dates. Mini charts are noninteractive. Root preserves scroll/focus through renders. `data-coverage-date`, `data-coverage-metric`, and `data-coverage` describe circle segments; they are not click actions.

All evidence is inline, with a labelled focusable table-scroll region; no drawers. Scope disclosures open one at a time, dismiss on Escape/outside interaction, and return focus after date application. Keep stable control IDs for focus restoration.
