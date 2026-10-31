---
name: AETHRIVA
description: Carbon + Nunito wellness evidence workspace
colors:
  canvas: "#0d0f12"
  nav: "#13161b"
  surface: "#1a1e24"
  raised: "#222831"
  input: "#12161c"
  hover: "#252e3d"
  selection: "#233755"
  chip: "#233149"
  line: "#333b48"
  control-line: "#63758f"
  text: "#f2f5fb"
  secondary: "#b8c3d2"
  accent: "#86b0ff"
  on-accent: "#10203c"
  sleep: "#b9a4ff"
  steps: "#ff9a62"
  energy: "#69d5ba"
  sleep-panel: "#ded3ff"
  steps-panel: "#ffd5b9"
  heart-rate-panel: "#c9dfff"
  energy-panel: "#c0eedf"
  reading-ink: "#182027"
  reading-label: "#29333e"
  reading-secondary: "#37414a"
typography:
  display:
    fontFamily: "Nunito, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 750
    lineHeight: 1.15
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Nunito, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1.25
  title:
    fontFamily: "Nunito, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 750
    lineHeight: 1.25
  body:
    fontFamily: "Nunito, sans-serif"
    fontSize: "16px"
    fontWeight: 450
    lineHeight: 1.65
  label:
    fontFamily: "Nunito, sans-serif"
    fontSize: ".875rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  chip: "5px"
  field: "8px"
  control: "9px"
  panel: "14px"
  journal: "16px"
spacing:
  inline: "9px"
  control-y: "10px"
  control-x: "16px"
  grid: "22px"
  columns: "24px"
  panel: "28px"
  reading: "22px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "28px"
  sleep-reading:
    backgroundColor: "{colors.sleep-panel}"
    textColor: "{colors.reading-ink}"
    rounded: "{rounded.panel}"
    padding: "22px"
  chip:
    backgroundColor: "{colors.chip}"
    textColor: "#c7daff"
    rounded: "{rounded.chip}"
    padding: "4px 9px"
  field:
    backgroundColor: "{colors.input}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
---

# Design System: AETHRIVA

## Overview

**Creative North Star: "Carbon + Nunito"**

A dark, calm evidence workspace with rounded Nunito typography, clear readings, and restrained blue navigation. Pastel measurement panels make the selected day the first thing to read; charts and source records provide the context around it.

The seven main views share one validated local-history snapshot when available. Connections adds a searchable device catalog and real standard Bluetooth pairing; About explains provenance and limits. The public site starts with empty history. Intelligence calculates locally, and the runtime contains no sample measurements.

## Colors

Carbon neutrals carry the shell, reading surfaces, fields, and separators. Accent blue marks actions and focus. The brighter metric colors identify sleep (lavender), steps (orange), resting heart rate (blue), and self-reported energy (mint) across full charts and coverage tracks.

Overview's reading panels use `#ded3ff`, `#ffd5b9`, `#c9dfff`, and `#c0eedf` in that order. Primary readings use dark ink `#182027`; labels use `#29333e`, and mini-chart/context text uses `#37414a`. Keep these dark foregrounds on pastel panels rather than carrying over light shell text. Tooltips and toasts use `#d4e3fb` with `#152139` text.

**Metric continuity:** retain the same measurement identity across its panel, full chart, coverage track, units, and evidence. Color supports the written metric name; it does not encode health quality.

The Bluetooth session panel deliberately reuses the mint reading surface `#c0eedf` and dark ink `#182027`. Its local tonal accents are `#aedfce` for the icon tile, `#254f44` for status text, `#547d70` for control borders, `#f0fff9` for text on the dark primary button, and `#99c2b4` for the supporting rule. These are component-specific tones within the existing palette, not a new theme or a signal that a measurement is healthy. Labels, warnings and connection state carry the meaning.

## Typography

Nunito is bundled locally as a variable font (weights 200–1000, normal style, swap loading). The base remains 16px with 1.65 line height on phones. Main headings are 40px on desktop, 34px below 800px, and 32px below 600px. General text stays around 16px; supporting labels and chart axes are usually 14px. IDs and minor metadata may use 12px.

Overview readings use `clamp(29px,3vw,42px)` with weight 750; phone readings use `clamp(24px,6.8vw,32px)`. Recovery readings are 32px above 600px and 36px on phones, with narrower-screen adjustments. Supporting workspace views use 16px prose/tables, 25px section headings, and 18px finding summaries. Intelligence answer prose is 17px on desktop and 16px on phones. Use tabular numerals and retain complete units.

Connections extends those steps for its specific content: section headings are 25px, general component headings 19px, catalog result titles 18px, and manufacturer/status metadata 13px. The empty-workspace heading is 34px, reducing to 28px below 700px. A live numeric reading is 60px on desktop and 52px below 700px, with 20px units; blood-pressure pairs use `clamp(30px,4vw,48px)` to keep both values readable. Workout titles use 18px, reducing to 17px below 700px. Nunito, tabular numerals and the existing weight hierarchy remain unchanged.

## Layout

At >=1200px, a sticky 196px left navigation rail sits beside the workspace; it becomes 220px at >=1600px. The workspace caps at 1510px including padding. Below 1200px, navigation becomes a horizontally scrolling row under the brand. The body minimum width is 320px; tables and charts scroll within their own containers.

With recorded history, Overview places the coverage calendar beside a two-by-two reading grid. An empty workspace shows a direct connection action without placeholder readings. The calendar/grid composition stacks below 780px. At <=560px the visible order is heading, bounded day controls, four reading panels, coverage calendar, then the supporting trend section. Reading panels remain two columns. This gives phones immediate measurements before the month map.

Recovery uses four aligned full-width rows, each with a reading column and a shared-width chart. Above 600px the plot height is 120px so several measurements fit together; on phones each reading precedes its 180px chart. Earlier/later comparisons follow these rows. Odd ranges explicitly name dates excluded to make comparison windows equal.

Connections uses a labelled search field, category controls, readable device rows and inline setup details. Its source history and Bluetooth session sections reuse the existing surfaces, typography and action styles. Connection status, hardware-validation limits and measurement warnings remain written text alongside the readings.

On phones, full charts use a minimum width derived from date count, allowing horizontal panning with readable targets. The value axis stays sticky at the left; a swipe hint explains the overflow. Supporting source rows, findings, and About sections stack at their own content breakpoints. Print uses light surfaces and removes interactive shell controls.

## Elevation & Depth

Tonal layering and rules separate resting content. Shadows identify transient content: chart tips (`0 7px 22px #0005`), scope popovers (`0 12px 30px #0009`), and toasts (`0 12px 30px #0005`). Reading panels stay flat.

## Shapes

General panels and readings use 14px corners; the daily journal uses 16px. Phone readings reduce to 12px. Controls use 9px, fields 8px, and annotation chips 5px. Coverage uses four segmented circular tracks; the center contains the selected calendar date.

## Components

- **Navigation and actions:** selected routes use a blue tonal background and `aria-current`. Primary buttons use accent blue/dark text with a 44px minimum height; secondary actions use a visible outline. Evidence remains a labelled text action. Interactive focus uses a 2px outline offset by 4px, with dark focus on pastel panels.
- **Coverage calendar:** every segment maps to a civil date in the selected range. Tracks run outside to inside: sleep, steps, resting heart rate, energy. Recorded values color their segment; missing values remain neutral and excluded metrics have dim dashed segments. A radial guide marks the selected day. This is record coverage, never a health, completion, or readiness score.
- **Selected day:** dates follow the available history, initially its latest 30 days. Previous/next buttons and a native date input stay within the current range; endpoint buttons disable. Selecting a day synchronizes readings and charts. Genuine absence says “Not recorded”; source/metric exclusion says “Hidden by filters” with a restore action.
- **Overview trend:** panel Explore actions and metric tabs change `plotMetric` (URL `plot`) only. Global dates, sources, and `metricKey` remain independent. Mini charts are descriptive and noninteractive; full plots expose exact points and preserve gaps/zero values.
- **Chart keyboard use:** one point per full chart is in the tab order. Left/Right move by date; Home/End select the first/last date. Focus and selected-point visibility survive rerenders. Mobile panning retains the value axis.
- **Scope controls:** source/date disclosures share one open state. Escape and outside interaction close them; applying dates returns focus to the date summary. Source switches update the same global selection as the toolbar.
- **Connection states:** catalog discovery is separate from nearby-device pairing. Show the actual chooser, connection, waiting, receiving, rejection and disconnection states. Exact-model hardware compatibility remains unverified. Accepted measurements retain quality warnings; a rejected latest packet or disconnected session marks a previous value stale.
- **Daily provenance:** display a civil date and “Daily aggregate” for provider summaries. Keep original sums, counts, units and aggregation method inspectable; day-marker timestamps are not exact observation times.
- **Intelligence and evidence:** the labelled composer shows current dates, named sources, and metric scope. Each retained answer separately displays its saved dates, named sources, and metric scope; later filter changes do not rewrite its evidence context. “Trace this finding” opens inline evidence with complete calculation inputs, provenance, and a labelled keyboard-focusable scroll region. Closing it returns to its originating action.
- **Motion:** state transitions use 180ms and `cubic-bezier(.16,1,.3,1)`. The user's Reduce motion setting and OS preference both disable animated transitions and programmatic smooth scrolling. No continuous decorative motion is used.

## Do's and Don'ts

- **Do** keep Carbon + Nunito, dark ink on the four pastel reading panels, readable type, and measurement units.
- **Do** distinguish records hidden by filters from genuinely absent observations; preserve recorded zero.
- **Do** keep date bounds, keyboard chart navigation, saved answer scope, and complete inline evidence together.
- **Don't** interpret coverage tracks as a health or readiness score or infer causation from association.
- **Don't** show invented measurements, imply a catalog listing is a tested connection, turn live heart rate into resting heart rate or ECG, or present locally calculated answers as live AI.

Source of truth: `dist/styles.css`, `dist/experience.css`, `dist/workspace.css`, `dist/connections.css`, `dist/app.js`, `dist/charts.js`, and the page renderers. This document records current source behavior; validation evidence belongs in `docs/VERIFICATION.md`.
