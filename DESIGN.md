---
name: Bodha
description: Carbon + IBM Plex Sans wellness evidence workspace
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
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  headline:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: ".875rem"
    fontWeight: 500
    lineHeight: 1.45
  metadata:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: ".8125rem"
    fontWeight: 400
    lineHeight: 1.5
  reading:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.015em"
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

# Design System: Bodha

## Overview

**Creative North Star: "Carbon + IBM Plex Sans"**

A dark, calm evidence workspace with precise IBM Plex Sans typography, clear readings, and restrained blue navigation. Pastel measurement panels make the selected day the first thing to read; charts and source records provide the context around it.

The seven main views share one validated local-history snapshot when available. Connections adds a searchable device catalog and real standard Bluetooth pairing; About explains provenance and limits. The public site starts with empty history. Intelligence calculates locally, and the runtime contains no sample measurements.

## Colors

Carbon neutrals carry the shell, reading surfaces, fields, and separators. Accent blue marks actions and focus. The brighter metric colors identify sleep (lavender), steps (orange), resting heart rate (blue), and self-reported energy (mint) across full charts and coverage tracks.

Overview's reading panels use `#ded3ff`, `#ffd5b9`, `#c9dfff`, and `#c0eedf` in that order. Primary readings use dark ink `#182027`; labels use `#29333e`, and mini-chart/context text uses `#37414a`. Keep these dark foregrounds on pastel panels rather than carrying over light shell text. Tooltips and toasts use `#d4e3fb` with `#152139` text.

**Metric continuity:** retain the same measurement identity across its panel, full chart, coverage track, units, and evidence. Color supports the written metric name; it does not encode health quality.

The Bluetooth panel uses the Carbon surface `#1a1e24`, light text and a restrained blue action. Idle state omits the large numeric placeholder and keeps static compatibility/storage guidance in a native disclosure. Accepted values and quality warnings remain prominent during a session. Product photos use a light neutral `#f3f5f7` frame so the physical hardware remains identifiable without tinting its appearance.

## Typography

IBM Plex Sans is bundled locally as a variable Roman WOFF2 (weight axis 100–700). The interface uses only 400, 500 and 600, with `font-display: swap` and a preloaded WOFF2. System UI fonts provide the fallback. The font and its SIL Open Font License are distributed in `dist/assets`; `ibm-plex-sans-provenance.json` records the official IBM repository source and verified file hashes. No runtime font requests go to another service.

Use a fixed product type scale: page titles are 30px/1.25 at weight 600, reducing to 28px below 600px. Section headings are 22px/1.3 at 600 and component headings are 18px/1.4 at 600. Body copy and data tables use 16px/1.6 at 400, including on phones. Controls and functional labels use 14px at 500; supporting chart axes use 14px at 400. Minor metadata and record IDs use 13px at 400. Prose stays near 65–75 characters per line. Headings and labels use normal letter spacing.

Selected-day, Recovery and Bluetooth readings use 36px at weight 600 on desktop and 30px on phones, with complete units and tabular numerals. Supporting numeric summaries use 22px; Timeline values use 18px. Only numeric readings use slightly tighter `-.015em` tracking. Missing or hidden reading messages use 22px on desktop and 18px on phones, so state explanations remain distinct from observed numbers. The coverage calendar center keeps a large date and weekday. The legend adds actual recorded-day counts, never a health score.

Controls retain at least 44px height across responsive layouts. Chart points keep their existing date spacing, with a 44px high hit area and the equivalent bounded day controls. Placeholder text uses the existing secondary foreground at full opacity; table headers align to the top and use 14px medium weight, while table values retain 16px and tabular numerals. Print retains its compact reading scale.

## Layout

At >=1200px, a sticky 196px left navigation rail sits beside the workspace; it becomes 220px at >=1600px. The workspace caps at 1510px including padding. Below 1200px, navigation becomes a horizontally scrolling row under the brand. The body minimum width is 320px; tables and charts scroll within their own containers.

With recorded history, Overview places the coverage calendar beside a two-by-two reading grid. An empty workspace shows a direct connection action without placeholder readings. The calendar/grid composition stacks below 780px. At <=560px the visible order is heading, bounded day controls, four reading panels, coverage calendar, then the supporting trend section. Reading panels remain two columns. This gives phones immediate measurements before the month map.

Recovery uses four aligned full-width rows, each with a reading column and a shared-width chart. Above 600px the plot height is 120px so several measurements fit together; on phones each reading precedes its 180px chart. Earlier/later comparisons follow these rows. Odd ranges explicitly name dates excluded to make comparison windows equal.

Connections uses a labelled search field, category controls and a three-column hardware gallery (two columns below 1000px; one compact photo-and-copy column below 700px). All 33 named guides have actual manufacturer product photos; the 3 generic protocol categories use explicit type icons. Each item shows its name, a short physical-device type, a definition of at most 100 characters and an honest connection status. Detailed setup expands inline, with a larger product photo. Its source history and Bluetooth session sections reuse the existing surfaces, typography and action styles. Connection status, hardware-validation limits and measurement warnings remain written text alongside the readings.

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
- **Motion:** state transitions use 180ms and `cubic-bezier(.16,1,.3,1)`. Navigation uses a single 260ms visible-page arrival; the coverage SVG has a 600ms rotation/clip reveal when motion is allowed. The user's Reduce motion setting and OS preference both disable animated transitions and programmatic smooth scrolling. No continuous decorative motion is used.

## Do's and Don'ts

- **Do** keep Carbon + IBM Plex Sans, the 400/500/600 hierarchy, dark ink on the four pastel reading panels, readable type, and measurement units.
- **Do** distinguish records hidden by filters from genuinely absent observations; preserve recorded zero.
- **Do** keep date bounds, keyboard chart navigation, saved answer scope, and complete inline evidence together.
- **Don't** interpret coverage tracks as a health or readiness score or infer causation from association.
- **Don't** show invented measurements, imply a catalog listing is a tested connection, turn live heart rate into resting heart rate or ECG, or present locally calculated answers as live AI.

Source of truth: `dist/styles.css`, `dist/experience.css`, `dist/workspace.css`, `dist/connections.css`, `dist/app.js`, `dist/charts.js`, and the page renderers. This document records current source behavior; validation evidence belongs in `docs/VERIFICATION.md`.

The shell uses a quieter selected-navigation treatment, consistent scope controls and compact two-row phone filters. No-data first visits without an explicit route open Connections so people can identify a source or device immediately; recorded workspaces still open Overview.

Insights leads with plain-language period changes and labeled Earlier/Later comparison bars. Values, observed-day counts and evidence actions stay visible. Repeated findings, full tables and method notes are grouped in a native disclosure. Metric colors describe the measurement, never health quality.
