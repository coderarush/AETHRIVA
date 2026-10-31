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
  secondary: "#b1bdcd"
  accent: "#86b0ff"
  on-accent: "#10203c"
  sleep: "#b9a4ff"
  steps: "#ff9a62"
  energy: "#69d5ba"
typography:
  display:
    fontFamily: "Nunito, sans-serif"
    fontSize: "clamp(29px,2.6vw,37px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Nunito, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  title:
    fontFamily: "Nunito, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  body:
    fontFamily: "Nunito, sans-serif"
    fontSize: "15px"
    fontWeight: 450
    lineHeight: 1.6
  label:
    fontFamily: "Nunito, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.4
rounded:
  chip: "5px"
  field: "8px"
  control: "9px"
  message: "12px"
  panel: "14px"
spacing:
  inline: "9px"
  control-y: "8px"
  control-x: "15px"
  grid: "20px"
  columns: "24px"
  panel: "26px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 15px"
    height: "42px"
  button-secondary:
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 15px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "26px"
  chip:
    backgroundColor: "{colors.chip}"
    textColor: "#bed4ff"
    rounded: "{rounded.chip}"
    padding: "3px 9px"
  field:
    backgroundColor: "{colors.input}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
---

# Design System: AETHRIVA

## Overview

**Creative North Star: "Carbon + Nunito"**

The selected existing world is a calm dark workspace with rounded Nunito typography, generous primary plots, quiet supporting prose, and evidence close to the finding. This is a record of the shipped code, not a proposal for a replacement identity.

Tonal surfaces carry hierarchy while blue marks navigation, actions, and selection. Metric color provides continuity across charts and readings. The implementation is code-led reuse; it has no generated imagery or approved image composition dependency.

**Key Characteristics:**

- Dark carbon surfaces and restrained blue interaction accents.
- Locally bundled Nunito throughout, with tabular numerals for measurements.
- Expansive focus plots balanced by contextual prose.
- Inline, inspectable evidence and explicit synthetic-data context.

## Colors

### Primary

- **Accent blue** (`accent`): actions, selected navigation labels, focus outlines, findings, and resting-heart-rate graphics. `on-accent` supplies text on filled blue controls.

### Secondary

- **Sleep lavender**, **steps orange**, and **energy mint** (`sleep`, `steps`, `energy`): stable metric identifiers. Energy mint also indicates source/status success.

### Neutral

- `canvas` is the page ground; `nav` carries the shell and inset elements; `surface` carries panels; `raised` carries popovers and hovered question cards.
- `input` separates editable fields. `hover`, `selection`, and `chip` provide interaction and annotation layers.
- `text` is primary copy; `secondary` also supplies the CSS `muted` alias. `line` divides content; `control-line` gives controls and evidence stronger boundaries.
- Chart tips and toasts use a pale blue inversion (`#d4e3fb` background, `#152139` text), rather than the normal dark surface.

**The Metric Continuity Rule.** Keep each metric's identity consistent between its label, numeric value, plot, and selected point; retain units and explicit missingness.

## Typography

Nunito is a locally bundled variable face (supported weights 200–1000, normal style, swap loading) with a sans-serif fallback. No separate display or label family is used. The frontmatter records the base hierarchy; contextual overrides remain intentional.

Page headings use the display role; the mobile page heading is (30px). Section headings commonly use (19px), with workspace section headings at (21px). Navigation is (14px, 650), secondary annotations commonly (12–13px). Primary trend values use (clamp(32px,3.4vw,48px), 650); recovery values use (37px, 650). Measurements and tables use tabular numerals. Body paragraphs cap at (75ch); answer prose uses (1.85) line height and an (80ch) cap. At the mobile breakpoint the root becomes (14px); many component sizes are explicitly overridden.

## Layout

The centered workspace caps at (1440px), with desktop padding (36px 44px 26px). The header is a horizontal brand/navigation/action row. The overview focus grid is (2.1fr / minmax(250px,1fr)) with a (28px) gap; Recovery is two columns with a (22px) gap. General cards begin at three columns, and selected-day readings at four. Reports cap at (1100px), Intelligence at (1000px).

At (max-width:1279px), navigation wraps onto its own row and workspace padding narrows. At (max-width:900px), focus content stacks, navigation becomes a single horizontally scrolling row with hidden icons, general cards become two columns, and day readings become two columns. At (max-width:600px), workspace padding becomes (26px 17px 22px), Recovery, question cards, and general card/two-column groups become one column. Some metric and comparison grids remain two columns. Navigation and the day strip intentionally scroll horizontally; tables have their own overflow wrapper. The body minimum width is (320px).

Main plots are (220px) tall, overview plots increase to (245px) above (1280px), and Recovery/mobile plots are (180px). On mobile, scope popovers anchor to the toolbar and fit its available width. Print switches to light surfaces, removes interactive shell/composer controls, and flattens panels for paper.

## Elevation & Depth

Depth primarily comes from tonal layering and separators. Resting content panels have no shadow. Shadows identify transient overlays: chart tips (`0 7px 22px #0005`), scope popovers (`0 12px 26px #0006`), and toasts (`0 12px 30px #0005`).

## Shapes

Panels use the panel radius, becoming (12px) on mobile. Controls and table clipping use the control radius; fields use the field radius. Messages, the composer, and question cards use the message radius. Small chips are compact rounded rectangles, not capsules. The avatar is circular. Content divisions are thin, muted rules; controls use a stronger visible stroke.

## Components

### Buttons and navigation

Primary buttons fill with accent blue; secondary buttons use a transparent ground and control stroke. Hover lightens primary fill to (`#a1c2ff`); secondary hover uses the hover surface and accent border. Both keep a (42px) minimum height. Small buttons use a (34px) minimum. Text/evidence actions are blue with an underline on hover. Navigation uses a selected tonal blue surface, rounded corners, and blue text; neutral labels brighten on hover. Disabled buttons have (0.5) opacity and a not-allowed cursor.

### Fields and composer

Select/date fields use the inset input surface and a visible control stroke with a (40px) minimum height. The composer is a surface container with a (12px) radius, (16px) padding, and an editable textarea of at least (83px). Focus within changes its border to blue; the textarea suppresses its own outline because the container carries this state. General interactive focus uses a (2px) blue outline offset by (4px).

### Chips and panels

Chips use compact (12px, 650) text with a pale blue label; success chips use mint. Panels use generous padding and tonal separation. Question cards add a thin rule, category label, and trailing action cue; hover raises the tonal surface and strengthens the border.

### Charts and day selection

SVG lines use rounded caps/joins and a (2.2px) stroke. Missing observations remain gaps. Selected points gain a primary-text stroke, with a dashed vertical guide. Transparent button targets expose keyboard focus and tooltips. The day strip uses compact dark buttons with a filled blue selected state and a separate selected-date label.

### Answers and inline evidence

Answers are reading surfaces: qualified prose, separated findings, limitations disclosure, and tracing actions. User messages align right on the selection surface. Evidence expands in the page after the current view content; it is not a modal or drawer. Its bordered panel receives focus, shows scope and calculation disclosures, and provides a horizontally scrollable records table with stable IDs, timestamps, sources, values, and provenance. Record rows and calculation inputs preserve genuine zero values and absent observations.

### Motion

State transitions use (0.18s) and `cubic-bezier(.16,1,.3,1)`; tips fade over (0.15s). Selected chart marks fade from (0.35) opacity over (0.24s) when motion is permitted. OS reduced-motion preferences and the explicit Motion off setting disable animations/transitions and smooth CSS scrolling. No decorative continuous motion is present.

## Do's and Don'ts

### Do:

- **Do** reuse the Carbon + Nunito world and existing metric colors.
- **Do** keep readable prose, visible keyboard focus, scoped calculations, units, and evidence actions together.
- **Do** preserve chart gaps, explicit missing states, and valid recorded zero values.
- **Do** preserve responsive stacking and intentional internal scrolling.

### Don't:

- **Don't** replace the selected visual world during incremental work.
- **Don't** add a composite health/readiness score or imply clinical or causal conclusions.
- **Don't** present synthetic source cards or locally calculated answers as live integrations or live AI.

Source of truth: `dist/styles.css`, `dist/app.js`, `dist/pages/experience.js`, and `dist/pages/workspace.js`. Context: `docs/IMPLEMENTATION.md`, `docs/SOURCE_MAP.md`. Visual disposition: `.superpowers/visual-review.md` (ship; no required fixes). This scan documents current implementation, including later CSS overrides; it does not amend earlier reference-world documents.
