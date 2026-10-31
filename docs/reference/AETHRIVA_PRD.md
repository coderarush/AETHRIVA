# AETHRIVA
## Product Requirements Document & Engineering Specification

**Working tagline:** Your health, connected and understood.  
**Product category:** Personal health-data intelligence and recovery insights  
**Document version:** 1.0  
**Status:** Hackathon build specification  
**Target build window:** Five hours  
**Build team:** Two people directing AI coding agents  
**Primary deliverable:** Publicly deployed, browser-accessible web application  
**Brand status:** AETHRIVA is a provisional working name, not a cleared trademark or confirmed domain.

---

# 0. Read This First: Product and Build Decisions

This document is the single source of truth for the AETHRIVA hackathon MVP. Codex should implement the requirements in this document rather than inventing additional product scope.

## 0.1 Product in one sentence

AETHRIVA is a personal health-information intelligence platform that organizes a person's authorized health and wellness records into one longitudinal view, helps them explore patterns across sleep, activity, recovery, and self-reported experience, and produces evidence-linked summaries that are useful for personal reflection and conversations with qualified professionals.

## 0.2 The three products combined into one platform

The original MEDGRAPH, VITALTRACE, and REBOUND concepts become three integrated product capabilities under one brand:

- **AETHRIVA Connect:** The data-unification layer. It organizes source records, measurements, timestamps, units, and provenance into a consistent health-data model.
- **AETHRIVA Intelligence:** The longitudinal analysis and explanation layer. It calculates trends, compares time periods, searches records, and explains findings using linked evidence.
- **AETHRIVA Recovery:** The recovery and wellness context layer. It presents sleep, activity, resting-heart-rate trends where available, and user-reported energy or recovery check-ins without prescribing exercise or making medical judgments.

These are modules within one product, not separate apps or separate codebases.

## 0.3 Five-hour reality check

A five-hour hackathon cannot responsibly deliver production-grade medical-record integrations, a validated clinical model, true continuous wearable synchronization, or regulatory compliance certification. The MVP must demonstrate the core product thesis with reliable software behavior and synthetic data.

**The hackathon build must:**

1. Run as a public HTTPS website; judges must not need localhost or a developer environment.
2. Open in a modern desktop browser.
3. Include a polished, working dashboard.
4. Load a prebuilt, clearly labeled synthetic 30-day health dataset.
5. Normalize the synthetic data into a structured model.
6. Calculate trends and associations deterministically in code.
7. Show recovery and wellness patterns with charts.
8. Provide an AI analyst that answers questions using retrieved records and computed results.
9. Attach visible evidence to every generated insight.
10. Clearly distinguish observed facts, statistical associations, interpretations, and unknowns.
11. Work in Demo Mode without requiring a visitor to submit personal health information.

**The hackathon build must not:**

- Claim to diagnose, predict, prevent, monitor, or treat a disease or medical condition.
- Recommend medication changes, treatment, supplements, calorie restriction, or exercise intensity.
- Present an invented readiness score, health score, disease-risk score, or clinically meaningful threshold.
- Claim direct Apple Health or Android Health Connect synchronization from a browser-only app.
- Ask judges to upload actual medical records or personal health data.
- Claim HIPAA compliance, FDA clearance, clinical validation, or medical-grade accuracy.
- Use LLM-generated numbers as if they were calculated statistics.

## 0.4 Target launch mode

The hackathon deployment is a **synthetic-data demonstration environment**. Personal health-data ingestion is disabled by default. Any future release that accepts real health information requires a separate privacy, security, legal, and product-readiness review.

---

# 1. Executive Summary

Health information is fragmented across wearable applications, phone health repositories, activity trackers, clinical documents, laboratory reports, and personal notes. Each source can show a useful slice of a person's history, but people often lack a single, understandable view of how the information fits together over time.

AETHRIVA aims to make that information easier to organize, inspect, and discuss. It is not a diagnostic product. Its role is to improve access to a person's own recorded information and make descriptive patterns easier to understand.

AETHRIVA combines three capabilities:

1. **Connect:** normalize and organize records from multiple authorized sources.
2. **Understand:** calculate descriptive patterns, compare time ranges, and answer questions with traceable evidence.
3. **Recover:** present sleep, activity, and self-reported recovery context in one coherent view.

The initial experience should feel like a premium personal health intelligence workspace rather than a conventional fitness tracker or chatbot. The home screen presents the data landscape, recent changes, and a small set of grounded insights. Dedicated sections provide connected data, historical trends, recovery context, and an evidence-backed assistant.

The product's core differentiator is not that an LLM can summarize health data. The differentiator is a **structured longitudinal data layer** that preserves source, time, unit, and meaning; a deterministic analysis engine that calculates results; and an explanation layer that can trace statements to the underlying records.

AETHRIVA should be designed so that the hackathon demonstration can grow into a larger product architecture without requiring a rewrite. The immediate build proves the workflow with synthetic data. Future phases can add user-authorized imports, native mobile connectors, FHIR-based clinical record exchange where available, and stronger governance controls.

---

# 2. Vision, Mission, and Positioning

## 2.1 Vision

Give people a clear, trustworthy way to understand the health information they already generate and collect.

## 2.2 Mission

Turn disconnected health and wellness records into a coherent, user-controlled, longitudinal view with evidence-backed explanations.

## 2.3 Positioning statement

For people who use wearables, health applications, and wellness tools, AETHRIVA is a personal health-data intelligence platform that brings records together, makes historical patterns easier to inspect, and helps people prepare better questions for qualified professionals. Unlike a generic AI health chatbot, AETHRIVA grounds its explanations in structured records and reproducible calculations.

## 2.4 Brand personality

- Calm, precise, trustworthy, and sophisticated.
- Scientific without pretending to be clinical.
- Personal without being intrusive.
- Encouraging without body-image pressure, shame, or competitive rankings.
- Transparent about data limitations and uncertainty.

## 2.5 Product principles

1. **Evidence before explanation:** retrieve and calculate first; generate prose second.
2. **Provenance always:** every imported measurement retains its source and timestamp.
3. **No false precision:** no unsupported composite health score or fabricated confidence percentage.
4. **User control:** future real-data features must provide consent, source revocation, export, and deletion controls.
5. **No diagnosis:** the hackathon MVP is descriptive wellness software, not clinical decision support.
6. **No shame-based engagement:** no body comparisons, weight-loss pressure, calorie restriction nudges, streak punishment, or appearance-based feedback.
7. **Honest integrations:** do not label a source “connected” unless a real authorized connection exists.
8. **Demo resilience:** the main demonstration must work even if a third-party AI service is unavailable.

---

# 3. Users, Jobs to Be Done, and Use Cases

## 3.1 Primary user: health-data-aware individual

A person who uses one or more wearables or wellness applications and wants a clearer view of their own records over time.

**Jobs to be done:**
- See key recorded measurements in one place.
- Understand how a metric changed over a selected period.
- Compare sleep, activity, and self-reported experiences without overstating causation.
- Find the records behind an apparent trend.
- Prepare a concise, sourced summary to discuss with a healthcare professional.

## 3.2 Secondary user: recreational athlete

A person who tracks workouts, sleep, and recovery-related experiences and wants to review patterns in their routines.

**Jobs to be done:**
- Review recent activity and sleep history.
- Record how they felt after a training day.
- See whether recorded variables tended to move together in their own history.
- Organize observations before speaking with a coach or clinician.

AETHRIVA must not provide prescriptive training loads, performance guarantees, or medical clearance.

## 3.3 Secondary user: appointment-preparation user

A person who wants help organizing questions and relevant historical information before an appointment.

**Jobs to be done:**
- Select a time range.
- Generate a neutral summary of selected records.
- See exact timestamps, units, sources, and missing-data notes.
- Export a simple report for review.

The report must not interpret a record as a diagnosis or recommend treatment.

## 3.4 Hackathon evaluator

A judge opens the public application and wants to understand its capabilities quickly.

**Jobs to be done:**
- Explore a realistic fictional user profile.
- Inspect connected-source cards and a unified timeline.
- See calculated trends.
- Ask an analytical question.
- Click an insight and inspect supporting records.

The judge should not need to sign up, connect a device, or share personal information.

---

# 4. Product Scope and Release Boundaries

## 4.1 Hackathon MVP — P0 scope

P0 means the feature is required for the five-hour demonstration.

- Publicly hosted desktop-first web application.
- Demo Mode with a preloaded synthetic 30-day dataset.
- Overview dashboard.
- Unified metric and event timeline.
- Source/provenance indicators.
- Sleep trend visualization.
- Activity trend visualization.
- Resting-heart-rate trend visualization if included in demo fixture.
- Self-reported energy/recovery check-ins.
- Deterministic descriptive statistics.
- Period comparison (current selected period versus previous comparable period).
- Simple correlation/association exploration with caveats and minimum sample requirements.
- AETHRIVA Intelligence question-and-answer interface.
- Evidence cards linking insights to source records.
- Recovery dashboard.
- Data-source overview using clearly labeled synthetic connectors.
- Privacy and limitations page.
- Empty, loading, error, and no-data states.
- Public deployment on HTTPS.

## 4.2 P1 — Implement only if P0 is complete

- CSV upload using a strict sample schema, only for synthetic/demo records in the hackathon deployment.
- Column mapping preview.
- Export a selected date-range summary as CSV or printable page.
- Saved questions.
- Multi-environment visual personalization (theme preference only; not a medical feature).
- Interactive metric explorer.
- Advanced source filtering.

## 4.3 P2 — Post-hackathon roadmap

- Real personal CSV imports after privacy and security review.
- Native iOS companion app integrating HealthKit with granular user permission.
- Native Android companion app integrating Health Connect with granular user permission.
- FHIR-based clinical-data import where the user and relevant systems authorize it.
- Additional wearable/provider integrations under their respective terms and permission models.
- User-controlled longitudinal reports.
- Care-team or coach sharing with explicit authorization and access expiration.
- Audit logs and data-retention controls.
- Stronger privacy and security assessments.
- Research/clinical validation only if the company deliberately enters that domain with qualified partners.

## 4.4 Explicitly out of scope

- Diagnosis or differential diagnosis.
- Disease detection or prediction.
- Medication or supplement recommendations.
- Treatment planning.
- Emergency triage.
- Medical device functionality.
- Automated exercise prescription or training-load prescription.
- Calorie-deficit targets, weight-loss gamification, or body-composition judgments.
- Social leaderboards or comparisons between users.
- Real-time physiological monitoring.
- Background data collection without clear consent.
- Real health-data ingestion in the public hackathon demo.

---

# 5. Core User Experience

## 5.1 First-visit experience

The first screen should present two clear actions:

1. **Explore demo workspace** — opens the synthetic profile immediately.
2. **Learn how AETHRIVA works** — opens a short explanation of its data and evidence model.

Do not put authentication in front of the hackathon demo. Real accounts can be added after the event.

A visible banner must say: “Demo workspace — all records are synthetic.”

## 5.2 Primary navigation

Use a persistent left sidebar on desktop:

- Overview
- Connect
- Insights
- Recovery
- Timeline
- Reports
- Settings / About

The selected section should be visually obvious. Navigation must work; do not create decorative or dead controls.

## 5.3 Overview page

The overview is the product's command center.

**Header:**
- “Your health, connected.”
- Selected date range.
- Demo workspace label.
- Last data update timestamp.

**Top summary cards:**
- Records in selected period.
- Data sources represented.
- Days with check-ins.
- Most recent observation date.

These are data-coverage metrics, not health scores.

**Trend panels:**
- Sleep duration.
- Activity duration or steps (choose one consistent measure for the demo).
- Resting heart rate, where present.
- Self-reported energy or recovery.

**Insights panel:**
- Two or three evidence-backed observations.
- Each insight includes a category, concise sentence, date range, and “View evidence” action.
- Label associations as associations, not causes.

**Recent activity:**
- Latest imported/recorded synthetic events.
- Event date and source.

## 5.4 Connect page

The hackathon version is a demonstration of the data-unification model, not a live connector marketplace.

Show source cards such as:
- Wearable export (synthetic).
- Activity tracker export (synthetic).
- Daily check-ins (synthetic).
- Clinical records (not connected; future capability).

Source cards must display one of:
- “Demo data loaded.”
- “Not connected.”
- “Available in a future release.”

Do not use misleading green “Connected” badges for sources that have not actually authenticated.

## 5.5 Insights page

The Insights page should include:
- Time range selector.
- Metric selector.
- Trend charts.
- Descriptive statistics.
- Period comparison.
- Association explorer.
- Evidence drawer.

All calculations must be performed in TypeScript or SQL. The LLM may explain calculated findings but may not calculate or invent metrics from raw text.

## 5.6 Recovery page

Show recovery-related context without producing a single clinical or prescriptive readiness score.

Panels:
- Sleep history.
- Activity history.
- Resting-heart-rate history (if data exists).
- Self-reported energy/recovery check-ins.
- Consistency/coverage indicators.
- Observed associations with explicit limitations.

Avoid green/yellow/red medical status colors. A missing or unusual value should not automatically be called unhealthy.

## 5.7 Timeline page

A chronological feed of normalized events and observations.

Each event row shows:
- Display name.
- Value and unit where relevant.
- Event time.
- Source.
- Data-quality or coverage indicator.
- Link to related insights.

Timeline filtering:
- Date range.
- Metric type.
- Source.

## 5.8 Reports page

The hackathon MVP may generate a printable or downloadable summary from synthetic data.

Report content:
- Selected date range.
- Sources included.
- Metrics included.
- Summary of measured changes.
- Evidence references.
- Missing-data note.
- Explicit statement: “This is an informational summary of recorded wellness data, not a medical assessment.”

## 5.9 Intelligence assistant

The assistant should be an evidence-first query interface.

Suggested questions:
- “Summarize sleep and activity patterns over the last 30 days.”
- “Compare the first and second halves of this month.”
- “What was different on days with lower self-reported energy?”
- “Show the records behind the sleep trend.”
- “Prepare a neutral summary I can discuss with a healthcare professional.”

Answer layout:
1. Direct answer.
2. Findings with exact values and units where calculated.
3. Evidence cards with source and timestamp.
4. Limitations and missing-data notes.
5. Optional follow-up query chips.

The assistant must refuse or safely redirect requests for diagnosis, medication changes, treatment, supplements, or urgent medical advice. It should advise the user to consult an appropriate qualified professional for clinical concerns, and emergency services for an immediate emergency. Do not simulate a clinical triage system.

---

# 6. Detailed Functional Requirements

## FR-001 — Demo workspace bootstrap

**Priority:** P0

On first visit, load a static, version-controlled synthetic dataset into the client or a read-only server fixture. The demo must not require an account or store visitor-specific personal information.

Acceptance criteria:
- Demo opens in one click.
- A persistent visual banner identifies synthetic records.
- The same fixture produces stable results across reloads.
- A reset-demo control returns the dataset to its original state.

## FR-002 — Synthetic source registry

**Priority:** P0

Represent each fictional source with an ID, display name, category, description, source type, demo flag, and connection status.

Acceptance criteria:
- Source cards show accurate states.
- Every record links to one source or is explicitly labeled user-entered.
- No source is shown as live-connected unless a real integration is implemented.

## FR-003 — Canonical health event model

**Priority:** P0

Convert source-specific records into a canonical event representation (see Section 9).

Acceptance criteria:
- Every record has a stable ID.
- Every quantitative metric includes a numeric value and unit.
- Every event includes event time and source provenance.
- Invalid values are rejected or quarantined with an error reason.
- Original source payload is retained in the synthetic fixture or import record for traceability.

## FR-004 — Metric charts

**Priority:** P0

Render charts from actual canonical records.

Acceptance criteria:
- Correct axis labels and units.
- Date range selection changes the data shown.
- Missing observations are not silently represented as zero.
- Tooltips display date, value, and unit.
- Charts remain usable at common laptop widths.

## FR-005 — Deterministic descriptive analytics

**Priority:** P0

Implement calculations in code:
- Count of records.
- Count of days with records.
- Mean and median where appropriate.
- Minimum and maximum.
- Period-over-period delta and percentage change where mathematically valid.
- Rolling averages where enough samples exist.
- Association/correlation only when the selected pair has adequate paired data.

Minimum sample policy:
- Fewer than 7 paired observations: do not calculate an association; report insufficient data.
- 7–13 paired observations: show exploratory association only with a prominent small-sample warning.
- 14 or more paired observations: show a descriptive association with sample count and no causal wording.

The product must not show statistical significance unless a valid, documented statistical procedure has actually been implemented and reviewed. Do not show a proprietary “confidence score.”

## FR-006 — Period comparison

**Priority:** P0

Compare two adjacent, equal-length periods selected by the user.

Acceptance criteria:
- The comparison labels both ranges.
- Missing records are disclosed.
- A delta is not calculated across incompatible units.
- The UI explains whether the displayed change is absolute or relative.

## FR-007 — Recovery context

**Priority:** P0

Aggregate the selected recovery-related metrics into a chronological view.

Acceptance criteria:
- Sleep, activity, and self-reported check-in data remain separate measures.
- No combined medical readiness score is created.
- User-reported measures are explicitly labeled as self-reported.
- Missing data is shown as missing, not inferred.

## FR-008 — Evidence-linked insights

**Priority:** P0

An insight must reference the exact metric records and computed result that support it.

Acceptance criteria:
- Every generated insight links to at least one supporting record or calculation.
- The user can open an evidence drawer.
- The evidence drawer lists dates, values, units, and sources.
- Insights without sufficient evidence are not generated.

## FR-009 — Natural-language query

**Priority:** P0

The user can ask a question about the synthetic dataset.

Processing sequence:
1. Classify the query into a supported query type.
2. Extract metric names, time range, and comparison intent.
3. Retrieve matching records.
4. Run deterministic calculations.
5. Generate a natural-language explanation from the calculated result and evidence.
6. Validate that cited record IDs exist in the retrieved set.
7. Display the answer and evidence.

Acceptance criteria:
- The answer only uses retrieved evidence and computed results.
- The model cannot invent an unseen source, record, value, or timestamp.
- If the question is unsupported, explain the limitation.
- If AI API access is unavailable, use a deterministic fallback for the supported demo questions.

## FR-010 — Association explorer

**Priority:** P1 (promote to P0 only if time permits)

Allow comparison of two selected measures, such as sleep duration and self-reported energy.

Acceptance criteria:
- Shows paired sample count.
- Shows a scatter plot or aligned time series.
- Uses “associated with” or “co-occurred with” rather than “caused.”
- Displays a small-sample warning when fewer than 14 pairs are available.
- Does not present the result as medical advice.

## FR-011 — CSV fixture import

**Priority:** P1 and disabled for real health data in the public hackathon deployment

Implement only a schema-constrained sample import or a sample-file loader. The public demo must not invite real medical record uploads.

Acceptance criteria if implemented:
- Shows a preview before import.
- Requires the user to map date, metric, value, and unit.
- Rejects unsupported columns or invalid units clearly.
- Labels imported rows as user-provided demo data.
- Provides a delete/reset function.

## FR-012 — Exportable summary

**Priority:** P1

Export a neutral, printable summary for the selected range.

Acceptance criteria:
- Includes source and date context.
- Includes values, units, and evidence references.
- Includes missing-data caveats.
- Includes informational-use disclaimer.

---

# 7. Analytics and Insight Methodology

## 7.1 Core rule

**The application calculates; the language model explains.**

Never ask the LLM to derive averages, percentage differences, correlations, or trend values from a long unstructured list of records. The backend must produce calculations in typed, testable code.

## 7.2 Metric handling

Each metric has:
- Canonical metric key.
- Display label.
- Data type (quantity, duration, count, categorical, check-in scale).
- Canonical unit.
- Allowed source units.
- Aggregation rule.
- Display precision.
- Whether higher/lower/mixed has an obvious non-clinical interpretation. Default to neutral if not established.

Do not apply a global “higher is better” or “lower is better” rule.

## 7.3 Baselines

AETHRIVA may show a user's historical baseline as a descriptive reference only.

Recommended MVP policy:
- Fewer than 7 observations: no baseline; show insufficient history.
- 7–13 observations: show a limited-history descriptor, not a stable baseline.
- 14 or more observations: calculate a descriptive median and interquartile range where appropriate.
- For longer-term comparisons, use a selected prior window and disclose its dates.

Never compare a user's body or health data to peers or a demographic ideal in this MVP.

## 7.4 Trend detection

For the hackathon, use simple transparent methods:
- Compare the median or mean of the first and second halves of the selected range.
- Optionally add a 7-day rolling mean when enough observations exist.
- Label a trend only when the change exceeds a configurable display threshold and sample coverage is sufficient.
- Do not call a trend “abnormal,” “dangerous,” or “concerning.”

## 7.5 Association analysis

An association is descriptive, not causal. For example, “lower self-reported energy co-occurred with shorter recorded sleep in this sample” is permitted. “Short sleep caused low energy” is not.

Association UI must show:
- Variables compared.
- Sample count.
- Time window.
- Method used (e.g., Pearson correlation for exploratory visualization, if implemented).
- Warning that the sample may be incomplete and the relationship does not establish causality.

If the data has strong outliers or missingness, disclose that limitation. Do not over-interpret a correlation coefficient.

## 7.6 Insight object format

A generated insight should follow a structured schema:

```json
{
  "id": "insight_001",
  "type": "descriptive_association",
  "title": "Sleep and reported energy varied together",
  "summary": "In this synthetic sample, days with shorter recorded sleep often coincided with lower self-reported energy.",
  "period_start": "2026-10-01",
  "period_end": "2026-10-30",
  "sample_count": 18,
  "evidence_record_ids": ["evt_003", "evt_008"],
  "calculation_id": "calc_004",
  "limitations": [
    "This is an association, not proof of causation.",
    "The records are synthetic demonstration data."
  ],
  "safety_category": "general_wellness_information"
}
```

The displayed content must be based on actual fixture data. The example above is illustrative only.

---

# 8. Data Sources and Integration Strategy

## 8.1 Hackathon data strategy

Use one version-controlled fictional dataset. All dashboard totals, charts, assistant answers, and evidence cards must derive from this same dataset.

Suggested synthetic data:
- 30 days of sleep duration records.
- 30 days of activity records.
- 20–30 resting-heart-rate observations.
- 20–30 self-reported energy or recovery check-ins.
- A few deliberately missing days.
- Several deliberately varied weeks to make comparisons visually meaningful.

All synthetic data must be labeled as synthetic. Do not present fabricated values as real user or clinical data.

## 8.2 Future connector architecture

The platform should eventually support connector adapters, but a browser-only MVP must not claim it can access mobile health repositories directly.

- Apple HealthKit is an Apple platform framework used by authorized apps on supported Apple operating systems. A true integration requires an appropriately entitled native app and user permission; it is not a generic web API.
- Android Health Connect is accessed through Android app APIs and user permissions. A normal desktop browser application cannot directly read the device's Health Connect store.
- FHIR is a healthcare data-exchange standard. It can support future clinical-data exchange where an authorized endpoint, patient access mechanism, and appropriate permissions exist. The existence of the standard does not mean any arbitrary provider makes records available.

For the hackathon, show these as roadmap items and demonstrate the connector architecture with synthetic source records.

## 8.3 Connector interface

Define a provider-neutral interface:

```ts
export interface HealthDataConnector {
  id: string;
  displayName: string;
  sourceType: "wearable" | "activity" | "manual" | "clinical" | "file";
  getStatus(): Promise<ConnectorStatus>;
  fetchRecords?(options: FetchOptions): Promise<RawHealthRecord[]>;
  disconnect?(): Promise<void>;
}
```

The hackathon synthetic connector can implement `getStatus` and return fixture data. Real connectors should be implemented later as separate adapters.

## 8.4 Provenance requirements

Every record needs:
- Source system or source label.
- Source record ID when available.
- Import time.
- Event time.
- Time zone or offset when available.
- Original unit and normalized unit.
- Import batch ID.
- Transformation version.

Never discard provenance during normalization.

---

# 9. Canonical Data Model

The following is the target schema for the hackathon MVP. Codex may adapt names to the chosen ORM/database, but fields and meaning must remain consistent.

## 9.1 HealthEvent

```ts
export type HealthEvent = {
  id: string;
  userId: string | null; // null only for read-only synthetic demo fixture
  sourceId: string;
  sourceRecordId?: string;
  metricKey: string;
  metricLabel: string;
  category: "sleep" | "activity" | "cardiovascular" | "wellness_checkin" | "other";
  value: number | string | boolean;
  unit: string | null;
  originalValue?: number | string | boolean;
  originalUnit?: string | null;
  observedAt: string; // ISO 8601 timestamp
  importedAt: string; // ISO 8601 timestamp
  timezone?: string;
  durationSeconds?: number;
  quality: "valid" | "estimated" | "incomplete" | "invalid";
  provenance: {
    sourceName: string;
    sourceType: string;
    importBatchId?: string;
    transformationVersion: string;
  };
  metadata?: Record<string, unknown>;
};
```

## 9.2 Source

```ts
export type HealthSource = {
  id: string;
  name: string;
  sourceType: "wearable" | "activity" | "manual" | "clinical" | "file";
  status: "demo_loaded" | "connected" | "not_connected" | "error" | "planned";
  isSynthetic: boolean;
  lastSyncedAt?: string;
  description?: string;
};
```

## 9.3 WellnessCheckIn

```ts
export type WellnessCheckIn = {
  id: string;
  observedAt: string;
  energy: number | null; // e.g. user-reported 1–10 scale in demo only
  perceivedRecovery: number | null;
  stress: number | null;
  note?: string;
  sourceId: string;
  isSynthetic: boolean;
};
```

If a 1–10 scale is used, label it “self-reported” and explain that values are personal check-ins, not clinical instruments.

## 9.4 CalculationResult

```ts
export type CalculationResult = {
  id: string;
  calculationType: "summary" | "period_comparison" | "rolling_average" | "association";
  metricKeys: string[];
  periodStart: string;
  periodEnd: string;
  pairedSampleCount?: number;
  values: Record<string, number | string | null>;
  method: string;
  sourceRecordIds: string[];
  limitations: string[];
  createdAt: string;
};
```

## 9.5 Insight

```ts
export type Insight = {
  id: string;
  type: "trend" | "period_change" | "descriptive_association" | "coverage_note";
  title: string;
  summary: string;
  periodStart: string;
  periodEnd: string;
  evidenceRecordIds: string[];
  calculationId?: string;
  limitations: string[];
  generatedAt: string;
  isSyntheticDemo: boolean;
};
```

---

# 10. Technical Architecture

## 10.1 Recommended stack

| Layer | Technology | Purpose |
|---|---|---|
| Web app | Next.js + TypeScript | Public browser application |
| Styling | Tailwind CSS | Consistent UI system |
| Components | shadcn/ui or equivalent | Accessible reusable components |
| Charts | Recharts | Time-series and comparison charts |
| Graph visualization | React Flow, only if time permits | Future/optional knowledge graph |
| Validation | Zod | Runtime validation of data and AI output |
| Data | Static typed JSON fixture for hackathon; Supabase-ready architecture | One consistent source of demo truth |
| Hosting | Vercel or equivalent HTTPS host | Public deployment |
| AI | One server-side LLM provider adapter | Question explanation and synthesis |
| Tests | Vitest + Playwright smoke test if time permits | Calculation and route validation |

Do not add unnecessary libraries. Do not spend hackathon time implementing a complex vector database.

## 10.2 Recommended deployment architecture

Browser → HTTPS-hosted Next.js app → server route → deterministic analytics and retrieval → optional LLM provider.

The synthetic fixture can be shipped as read-only application data. If Supabase is already available and configuration is straightforward, use it for future-ready schema work, but do not let database provisioning block the functioning demo.

The first deployment should happen early, not at the end.

## 10.3 Server/client separation

Client:
- UI and interaction state.
- Chart rendering.
- Read-only demo fixture display, if no user data is involved.
- Query submission.

Server:
- AI provider calls.
- Secret management.
- Query validation.
- Analytics calculations when practical.
- Any future authenticated data operations.

Never expose model API keys or service-role credentials in client bundles.

## 10.4 API routes

Minimum routes or server actions:

- `GET /api/demo/overview` — returns synthetic overview metrics.
- `GET /api/demo/events?from=&to=&metric=` — returns filtered events.
- `GET /api/demo/sources` — returns synthetic source registry.
- `GET /api/demo/insights?from=&to=` — returns deterministic insight objects.
- `POST /api/demo/query` — accepts a natural-language question and returns a grounded answer plus evidence references.
- `GET /api/demo/report?from=&to=` — returns report-ready summary data.

If API routes add more friction than value in the five-hour window, local server-side fixture functions are acceptable. Maintain the same typed contracts so the frontend can be connected without rewrites.

## 10.5 Query response contract

```ts
export type IntelligenceResponse = {
  answer: string;
  findings: Array<{
    label: string;
    value?: string;
    explanation: string;
    evidenceRecordIds: string[];
    calculationId?: string;
  }>;
  evidence: Array<{
    recordId: string;
    metricLabel: string;
    value: string;
    observedAt: string;
    sourceName: string;
  }>;
  limitations: string[];
  responseType: "supported" | "insufficient_data" | "out_of_scope";
};
```

## 10.6 AI provider abstraction

Create one provider wrapper, for example:

```ts
export interface IntelligenceProvider {
  generateGroundedExplanation(input: {
    question: string;
    computedFindings: CalculationResult[];
    evidence: HealthEvent[];
    limitations: string[];
  }): Promise<string>;
}
```

Provider failure must not break the dashboard. Fall back to a deterministic explanation template for the preselected demo questions.

---

# 11. AI Safety, Evidence, and Output Controls

## 11.1 Allowed behavior

The assistant may:
- Explain what a chart displays.
- Summarize recorded values over a date range.
- Compare two periods descriptively.
- Identify a co-occurrence or association when calculations support it.
- Explain limitations and missing records.
- Help draft neutral questions for a healthcare professional.
- Clarify metric units and source provenance.

## 11.2 Disallowed behavior

The assistant must not:
- Diagnose or speculate that the user has a disease.
- Predict whether the user will develop a condition.
- Recommend medication or treatment changes.
- Recommend supplements or dosage.
- Tell a user to ignore a clinician's advice.
- Tell a user to stop seeking care.
- Generate a medical clearance decision.
- Interpret a single measurement as an emergency threshold.
- Give prescriptive exercise or dietary plans.
- Encourage restrictive eating, body surveillance, or weight-focused behavior.

## 11.3 Safety response pattern

For clinical requests, respond briefly and clearly: AETHRIVA can organize recorded information, but it cannot diagnose or recommend treatment. Encourage the user to discuss the concern with an appropriately qualified healthcare professional. For an immediate emergency, use local emergency services rather than the app.

## 11.4 Evidence enforcement

- Model input must include only retrieved records and computed findings relevant to the query.
- The model may not create new evidence IDs.
- Returned evidence IDs must be checked against the retrieved set.
- If validation fails, discard the generated citation and fall back to a safe response.
- Every quantitative statement must originate from a calculation result or an exact retrieved record.

## 11.5 Prompt-injection and untrusted data

Imported text, notes, filenames, or source metadata must be treated as data, not instructions. Do not let a record change system behavior, override safety rules, or request secrets. Escape or sanitize user-provided text before displaying it.

---

# 12. Visual Design System

## 12.1 Direction

Premium health intelligence workspace: calm, restrained, high signal, and visually precise.

Do not make the product look like a neon sci-fi medical scanner or generic admin template.

## 12.2 Suggested palette

- Main background: `#080B10`
- Primary surface: `#101722`
- Secondary surface: `#151F2B`
- Border: `#243140`
- Primary text: `#F4F7FA`
- Secondary text: `#98A6B5`
- Accent blue: `#8DB9FF`
- Accent mint: `#79D8BA`
- Warm note: `#E4BE82`

Use color for hierarchy and status, not to imply clinical risk.

## 12.3 Typography

Use Geist or Inter. Use tabular numerals for values, consistent unit spacing, and a clear contrast between page titles, panel titles, and metadata.

## 12.4 Component standards

- Cards with restrained borders and consistent radius.
- Clear chart legends and accessible tooltips.
- Loading skeletons that reflect final layout.
- Empty states with next-step guidance.
- Visible demo-data badge.
- Accessible color contrast.
- Keyboard-accessible navigation.
- Responsive layout for laptop and tablet widths.

## 12.5 Responsive behavior

Desktop is the primary judging context. At widths below 900px, collapse the sidebar into a compact navigation. At mobile widths, stack panels and keep charts readable. Do not claim native mobile integration.

---

# 13. Privacy, Security, and Regulatory Readiness

## 13.1 Hackathon data policy

The public hackathon app should use synthetic, fictional records only. Do not ask judges to upload health records, laboratory reports, or wearable exports. Do not collect camera, microphone, location, or medical information.

## 13.2 Future real-data controls

Before enabling personal health-data ingestion, implement and review:
- Clear informed consent and purpose limitation.
- Data minimization.
- Encryption in transit and at rest.
- Per-user authorization and row-level access controls.
- Secure secrets management.
- Access logging and auditability.
- Source revocation.
- User export and deletion.
- Retention limits and deletion verification.
- Vendor review and data-processing terms.
- Incident response and breach notification procedures.
- Security testing and independent review appropriate to launch scope.

Do not assume that a consumer health application is automatically covered by HIPAA or automatically exempt from health-data obligations. Applicability depends on the product, role, data flows, counterparties, and jurisdiction. Obtain qualified legal and security review before real-data launch. The FTC Health Breach Notification Rule may apply to certain personal health record vendors and related entities.

## 13.3 Regulatory scope

The intended hackathon experience is descriptive general-wellness information and personal data organization. Product classification depends on intended use, functionality, claims, and actual behavior; disclaimers alone do not determine regulatory status. The FDA issued an updated General Wellness: Policy for Low Risk Devices guidance in January 2026. Review the current FDA guidance and obtain regulatory counsel before making product claims or expanding into clinical functionality.

## 13.4 No health claims in marketing

Avoid statements such as:
- “Detects disease before symptoms.”
- “Predicts your health future.”
- “Knows what is wrong with your body.”
- “Prevents injury.”
- “Clinically proven” unless supported by appropriate evidence and review.

Permitted positioning for the MVP:
- “Organizes your recorded health and wellness data.”
- “Makes historical patterns easier to explore.”
- “Creates source-linked summaries of recorded information.”
- “Helps prepare questions for a healthcare professional.”

---

# 14. Non-Functional Requirements

## NFR-001 — Availability

The public demo URL must be reachable during judging. Hosting provider status and third-party provider availability are external dependencies; Demo Mode must remain usable if the LLM provider is down.

## NFR-002 — Performance

Targets, not guarantees:
- First useful dashboard render: under 3 seconds on a typical broadband connection.
- Local synthetic chart rendering: under 1 second after data is loaded.
- Supported demo query response: target under 8 seconds with LLM; deterministic fallback should be effectively immediate.
- No full-page reload for primary navigation.

## NFR-003 — Reliability

- Invalid fixture records should fail validation at build/test time.
- Query failure must not crash the dashboard.
- Empty data ranges must have intentional UI states.
- Charts must not misrepresent missing data as zero.

## NFR-004 — Accessibility

- Keyboard-operable primary navigation and controls.
- Text labels for icon-only buttons.
- Visible focus state.
- Sufficient contrast.
- Charts include textual summaries or accessible labels.

## NFR-005 — Maintainability

- TypeScript strict mode.
- Shared domain types.
- Centralized date and unit utilities.
- Separate calculation logic from presentation.
- No duplicated synthetic data across separate components.

---

# 15. Test Plan and Acceptance Criteria

## 15.1 Demo acceptance tests

**AT-001 — Public access:** A judge opens the HTTPS URL on a separate laptop and reaches the demo without installing software.

**AT-002 — Demo labeling:** The interface clearly states that all displayed health data is synthetic.

**AT-003 — Overview consistency:** Summary counts reconcile with the underlying fixture.

**AT-004 — Chart accuracy:** Chart points match the canonical event values and units.

**AT-005 — Missing data:** Missing days create gaps or explicit missing states, never zero-value substitutions.

**AT-006 — Date filters:** Selecting a different range updates charts, calculations, timeline, and insights consistently.

**AT-007 — Period comparison:** The app compares correctly labeled date ranges using the same metric and unit.

**AT-008 — Evidence:** Clicking an insight displays its supporting records and calculation details.

**AT-009 — Query grounding:** Asking a supported question returns facts present in the fixture and citations to valid IDs.

**AT-010 — Unknown questions:** Asking for unsupported or absent information returns an explicit insufficient-data response.

**AT-011 — Clinical request safety:** Asking for a diagnosis or treatment recommendation does not produce one.

**AT-012 — Provider outage:** Disabling the AI key does not prevent the core demo from working.

**AT-013 — Responsive layout:** Dashboard remains usable at 1280px laptop width and at tablet width.

**AT-014 — No secret leakage:** No provider keys appear in the browser bundle, page source, or network responses.

## 15.2 Unit tests

At minimum, test:
- Mean and median.
- Date-range filtering.
- Period comparison.
- Unit consistency validation.
- Missing-value handling.
- Paired observation matching.
- Minimum sample threshold.
- Evidence-ID validation.
- Insight schema validation.

## 15.3 Manual regression script

1. Open public URL in a private/incognito window.
2. Enter Demo Mode.
3. Confirm synthetic-data banner.
4. Inspect overview cards and note values.
5. Change date range.
6. Open sleep trend and inspect point tooltips.
7. Open Recovery.
8. Ask the suggested question about lower self-reported energy.
9. Open evidence for the answer.
10. Ask for a fact absent from the fixture.
11. Ask for a diagnosis; verify safe response.
12. Reload and confirm the demo remains stable.
13. Repeat with AI provider credentials disabled if possible.

---

# 16. Five-Hour Execution Plan for Two People

The team is directing coding agents. Keep agent ownership separate and integrate continuously.

## 0:00–0:20 — Project foundation

**Person A / Agent A — UI:**
- Inspect repository.
- Create or configure Next.js application.
- Establish theme tokens and responsive shell.
- Implement sidebar and routes.

**Person B / Agent B — Data/logic:**
- Create typed domain models.
- Create synthetic dataset fixture.
- Implement Zod schemas.
- Implement calculation utilities.

**Exit gate:** App deploys with navigation shell and fixture loads.

## 0:20–1:20 — Dashboard and analytics

**Person A:**
- Build Overview cards.
- Build chart panels.
- Build Recovery page.
- Build Timeline page.

**Person B:**
- Implement filters and date-range calculations.
- Implement summary stats and period comparisons.
- Implement deterministic insight generation.
- Add unit tests for calculations.

**Exit gate:** All visible charts and metrics derive from the same fixture.

## 1:20–2:20 — Connect and evidence

**Person A:**
- Build Connect page and source cards.
- Build insight cards and evidence drawer.
- Refine typography, layout, and empty states.

**Person B:**
- Implement canonical event filtering.
- Implement evidence-ID linking.
- Implement report-ready summary.
- Add insight validation.

**Exit gate:** Clicking any insight exposes actual source records.

## 2:20–3:20 — Intelligence assistant

**Person A:**
- Build assistant UI.
- Add suggested queries.
- Add response and evidence cards.

**Person B:**
- Implement query classification and retrieval.
- Implement deterministic calculations for supported query types.
- Add one LLM provider adapter.
- Add deterministic fallback and safety guard.

**Exit gate:** One headline question works end-to-end with evidence and fallback.

## 3:20–4:15 — Integration and polish

Both:
- Resolve TypeScript issues.
- Check date filters across pages.
- Check chart labels and units.
- Validate all evidence links.
- Add privacy/limitations page.
- Check keyboard and responsive behavior.

## 4:15–5:00 — Production verification and demo rehearsal

- Verify public HTTPS deployment.
- Test on a second laptop/browser.
- Test LLM success and failure paths.
- Run manual regression script.
- Fix only high-impact defects.
- Rehearse 90-second demo.
- Freeze features 15 minutes before presentation.

**Hard rule:** Do not add real-data ingestion, HealthKit, Health Connect, EHR integrations, or any P2 feature during the five-hour build.

---

# 17. Two-Person Ownership and Integration Contract

## Person A — Product and frontend owner

Owns:
- Visual identity and design system.
- Navigation and layout.
- Overview, Connect, Insights, Recovery, Timeline, Reports.
- Assistant interface.
- Evidence drawer.
- Responsive behavior.
- Final demo narrative.

## Person B — Data and intelligence owner

Owns:
- Domain types and synthetic fixture.
- Validation schemas.
- Date/unit utilities.
- Deterministic analytics.
- Evidence linking.
- Query retrieval and response contract.
- LLM provider adapter.
- Safety fallback.
- Tests and integration support.

## Shared contract

Before parallel development, agree on:
- `HealthEvent` type.
- `HealthSource` type.
- `Insight` type.
- `CalculationResult` type.
- `IntelligenceResponse` type.
- Route names or exported service functions.
- Date-range format.
- Unit conventions.

Do not allow both agents to independently redesign these contracts. Person B owns data contract changes; Person A consumes them and raises issues.

---

# 18. Codex Master Build Prompt

Paste this prompt into Codex after adding this PRD to the repository as `PRD.md`.

> You are the principal engineer building AETHRIVA, a polished, browser-based personal health-data intelligence platform. Read `PRD.md` completely before changing code. Treat it as the product source of truth.
>
> Build the five-hour hackathon MVP only. Do not attempt production medical integrations, clinical decision support, HealthKit, Health Connect, or EHR/FHIR connections. Use the clearly labeled synthetic 30-day dataset. Do not ask users to upload real health information.
>
> The product combines three capabilities: Connect (structured data and provenance), Intelligence (deterministic longitudinal analysis plus grounded explanation), and Recovery (sleep/activity/self-report context without prescriptive scores).
>
> Core user journey: open public site → enter synthetic demo → inspect overview → explore sleep/activity/recovery charts → ask an analytical question → see source-linked evidence → inspect limitations.
>
> Non-negotiable behavior:
> - All health data shown in the hackathon demo is synthetic and visibly labeled as such.
> - All numerical calculations happen in typed, deterministic code, not in the LLM.
> - Every insight links to the underlying records or calculation that supports it.
> - Missing data is never silently changed to zero.
> - Correlation is never presented as causation.
> - Do not produce diagnoses, medication advice, treatment recommendations, medical risk scores, exercise prescriptions, or calorie restriction advice.
> - Do not create a fake “health score” or “readiness score.”
> - The app must remain functional if the AI provider is unavailable by using deterministic fallback responses for the demo questions.
> - The final product must be deployed to a public HTTPS URL and work on a second laptop without localhost.
>
> Implementation approach:
> 1. Inspect the repository and report its current state.
> 2. Define the shared TypeScript domain types and Zod schemas.
> 3. Create one canonical synthetic dataset and make every dashboard, chart, insight, and answer derive from it.
> 4. Build the navigation shell and design system.
> 5. Implement Overview, Connect, Insights, Recovery, Timeline, Reports, and Intelligence.
> 6. Implement deterministic calculations and evidence references.
> 7. Implement the server-side AI provider adapter and grounded query path.
> 8. Add safe deterministic fallback behavior.
> 9. Add unit tests for calculations and evidence validation.
> 10. Deploy early and verify the public build.
>
> Use Next.js, TypeScript strict mode, Tailwind, accessible components, and Recharts unless the repository already has a working equivalent. Keep the architecture simple. Do not install unnecessary libraries. Keep secrets server-side. Use clean, modular code and useful loading, empty, and error states.
>
> Work in small verified increments. After each phase, run type checks and build checks. Fix problems rather than masking them. Do not claim a feature is complete until it has been exercised.
>
> At the end, provide: deployed URL, implemented features, known limitations, required environment variables, commands for local development, and a short acceptance-test report.

---

# 19. Codex Task Prompts for Parallel Execution

Use a single shared repository. Avoid two agents editing the same files. If using separate branches, merge in small increments.

## Prompt A — Frontend

> Read `PRD.md` and implement the AETHRIVA frontend only. Own the application shell, theme, navigation, Overview, Connect, Insights, Recovery, Timeline, Reports, and Intelligence UI. Consume the shared domain types and service contracts; do not invent a second dataset or calculate health statistics inside React components. Make all controls functional. Clearly label the workspace as synthetic demo data. Do not create fake live integrations. Use accessible labels and responsive layouts. Do not implement medical claims or prescriptive features. Keep all API keys out of the client. Run the production build and report any incomplete sections.

## Prompt B — Data and intelligence

> Read `PRD.md` and implement the AETHRIVA data and intelligence layer. Own HealthEvent/HealthSource/Insight/CalculationResult/IntelligenceResponse types, Zod schemas, synthetic fixture, date filtering, deterministic statistics, period comparison, supported association calculation, evidence linking, query retrieval, AI provider adapter, safe fallback, and unit tests. Do not calculate from LLM prose. Do not infer diagnosis or prescribe treatment. All generated findings must cite valid fixture records and disclose limitations. Do not implement real personal health-data ingestion or external health connectors. Keep frontend integration contracts stable and document any required changes.

## Integration instruction

> Integrate the frontend and intelligence branches using the types and API contracts defined in `PRD.md`. Resolve type mismatches at the contract boundary. Do not add a feature unless all P0 acceptance criteria are met. Run build and tests after integration, deploy the public app, and verify the public URL from a second browser session.

---

# 20. Demo Script and Judging Narrative

## 20.1 90-second script

**0–15 seconds — Problem**  
“People generate health information across wearables, apps, and personal check-ins, but those records are fragmented. AETHRIVA gives people one evidence-backed way to explore their history.”

**15–30 seconds — Connect**  
Open the synthetic demo. Show that multiple fictional sources contribute to one canonical timeline. Point out provenance and source labels.

**30–45 seconds — Recovery**  
Open Recovery. Show sleep, activity, and self-reported experience as separate time series. Explain that the product does not collapse everything into an opaque health score.

**45–65 seconds — Intelligence**  
Ask: “What was different on days with lower self-reported energy?” Show the calculated association, sample count, caveat, and evidence cards.

**65–80 seconds — Evidence**  
Open the supporting records. Show timestamps, units, source, and original record values.

**80–90 seconds — Vision**  
“AETHRIVA starts by organizing health information people already have. Over time, it can become the personal intelligence layer that connects authorized health sources and helps people understand their own longitudinal history.”

## 20.2 What makes the demo credible

- The same fixture powers every screen.
- Calculations are reproducible.
- Evidence is clickable.
- Missing data is visible.
- AI explanations are grounded.
- No medical claims are made.

---

# 21. Post-Hackathon Roadmap

## Phase 1 — Reliable personal data workspace

- Real user accounts after security review.
- User-controlled CSV/JSON imports.
- Robust schema mapping and unit normalization.
- Data export and deletion.
- Source-level consent and revoke controls.
- Clear retention policy.

## Phase 2 — Native health data connectors

- iOS companion application with HealthKit integration and granular permission handling.
- Android companion application with Health Connect integration and granular permission handling.
- Sync status, last-sync metadata, source revocation, and deletion propagation.
- Data-quality monitoring for duplicate and conflicting events.

## Phase 3 — Clinical record organization

- FHIR-based import where supported and authorized.
- Clinical-document organization and provenance.
- Appointment-preparation report builder.
- Explicit distinction between patient-entered notes, device data, and clinical records.
- Clinical partner and legal review before any workflow that could influence diagnosis or treatment.

## Phase 4 — Developer platform

- Authorized API access to user-approved normalized data.
- Scoped tokens and consent records.
- Audit logs.
- Rate limits and developer documentation.
- Webhooks for data updates where supported.

## Phase 5 — Validation and governance

- Privacy impact assessment.
- Threat modeling and penetration testing.
- Vendor and infrastructure review.
- Human-factors testing.
- Clinical review if any clinical-purpose functionality is proposed.
- Regulatory analysis of intended use, claims, and functionality.

---

# 22. Metrics for Product Validation

Do not optimize for time spent in the app. The product should help users understand information efficiently.

## Hackathon metrics

- Time to first meaningful insight in Demo Mode.
- Percentage of supported demo questions answered with valid evidence.
- Calculation accuracy against test fixtures.
- Percentage of insight cards with traceable evidence.
- Successful public demo runs without developer intervention.
- Number of critical UI or data errors during rehearsal.

## Early product metrics

- Successful data-source connection rate.
- Data import completion rate.
- Percentage of records with complete source/time/unit provenance.
- Query answer evidence coverage.
- User-reported usefulness of generated summaries.
- Report export completion rate.
- Data deletion request completion time.
- User understanding of limitations and uncertainty.

Avoid engagement metrics that reward anxiety or excessive checking.

---

# 23. Risks, Dependencies, and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope too broad for five hours | Critical | Ship P0 only; defer native connectors and clinical records |
| Health API integrations take too long | High | Use synthetic data and honestly labeled connector cards |
| LLM produces unsupported health claims | Critical | Deterministic calculations, retrieval grounding, safety rules, ID validation |
| AI provider outage | High | Deterministic fallback for demo questions |
| Data inconsistency across screens | High | One canonical fixture and shared calculation functions |
| Incorrect units or dates | High | Zod validation, canonical units, timezone-aware parsing |
| Missing records misrepresented as zero | High | Explicit missing states and tests |
| Public demo collects sensitive data | Critical | Synthetic-only public demo; disable personal uploads |
| Brand name conflict | Medium | Treat AETHRIVA as provisional; conduct legal/domain clearance before launch |
| Regulatory scope creep | Critical | No diagnosis, prediction, treatment, or medical decision support in MVP |

---

# 24. Open Questions for After the Hackathon

These do not block the five-hour build:

1. Should the first real-data product be consumer-only or include clinician-facing workflows?
2. Which data source has the highest user value and lowest integration friction?
3. Should the company prioritize native iOS/Android connectors or user-controlled file imports first?
4. What exact data-retention model should users control?
5. Which markets and age groups will the initial product serve? The hackathon demo should not collect personal health information.
6. What evidence threshold should be required before an insight is shown?
7. What legal and regulatory obligations apply to the final intended-use claims and data flows?

---

# 25. Definition of Done

AETHRIVA is ready for judging only when all of the following are true:

- The public HTTPS URL opens on a second laptop.
- The demo workspace is clearly labeled synthetic.
- All main navigation destinations work.
- Overview numbers reconcile with the dataset.
- Sleep/activity/recovery charts show correct values and units.
- Date filters update the relevant pages consistently.
- The timeline shows source and timestamp.
- At least one supported intelligence query returns a correct answer.
- The answer links to valid evidence records.
- Unsupported questions produce an insufficient-data response.
- Clinical requests do not result in diagnosis or treatment advice.
- The demo still works without the LLM API key.
- No real personal health information is requested or stored.
- No API secrets are present in client code.
- The team can complete the 90-second demo twice without failure.

**Final product statement:** AETHRIVA connects health information, turns it into a coherent longitudinal view, and helps people explore recorded patterns with transparent evidence. It is a personal health-information intelligence platform—not a doctor, diagnostic system, or replacement for professional care.

---

# 26. References and Implementation Notes

The following official references inform integration feasibility and product-scope guardrails. They are not legal advice and do not replace implementation-specific review.

1. **Apple HealthKit documentation** — Apple describes HealthKit as a central repository for health and fitness data on Apple platforms, accessed by apps with user permission. A web-only desktop MVP should not claim direct HealthKit access.  
   https://developer.apple.com/documentation/healthkit

2. **Android Health Connect documentation** — Android documents Health Connect as an Android health-data platform accessed through Android APIs and user permissions. A browser-only desktop MVP should not claim direct Health Connect access.  
   https://developer.android.com/health-and-fitness/health-connect

3. **HL7 FHIR R4 specification** — FHIR is a standard for healthcare data exchange; actual access depends on endpoint availability, authorization, and implementation.  
   https://www.hl7.org/fhir/R4/

4. **FDA General Wellness: Policy for Low Risk Devices, January 2026** — Current FDA guidance on certain low-risk general-wellness products. Intended use and product claims matter; obtain expert review before expanding scope.  
   https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices

5. **FTC Health Breach Notification Rule** — FTC information on breach notification obligations for covered personal health record vendors and related entities. Determine applicability with counsel.  
   https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule

**Name note:** A preliminary exact-name web search did not surface a clear exact-match health-tech brand for AETHRIVA. This is not a trademark search, legal opinion, domain availability check, or clearance to use the name commercially. Complete those checks before launch.

---

**END OF PRD — AETHRIVA v1.0**
