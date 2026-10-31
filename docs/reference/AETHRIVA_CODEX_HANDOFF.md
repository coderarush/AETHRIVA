# AETHRIVA — Codex Handoff

Use this file with `AETHRIVA_PRD.md`. The PRD is the product source of truth; this file is the execution playbook.

## Product in one sentence

AETHRIVA is a personal health-data intelligence platform that organizes authorized health and wellness records, presents longitudinal sleep/activity/recovery context, and explains descriptive patterns with evidence linked to the underlying records.

## Non-negotiable scope for the five-hour hackathon

Build a public HTTPS web app with a synthetic 30-day demo dataset. Do not collect or request real personal health data. Do not implement HealthKit, Health Connect, EHR, FHIR, clinical decision support, diagnosis, medication advice, treatment recommendations, exercise prescriptions, or a composite health/readiness score.

P0 deliverables:

1. Overview dashboard.
2. Connect/data-source page with honestly labeled synthetic sources.
3. Insights page with deterministic calculations.
4. Recovery page with separate sleep/activity/check-in trends.
5. Timeline with timestamp, value, unit, and provenance.
6. Evidence-linked intelligence assistant.
7. Demo Mode and deterministic fallback if the LLM API fails.
8. Privacy/limitations view.
9. Public HTTPS deployment.

## Architecture constraints

- Next.js + TypeScript strict mode.
- Tailwind and accessible reusable components.
- Recharts for charts.
- Zod for runtime schema validation.
- One canonical synthetic data fixture used by all screens.
- Calculations happen in code, not in the LLM.
- LLM receives retrieved evidence and computed findings; it explains them but cannot invent values.
- Every insight links to valid record IDs and/or a calculation ID.
- Missing data stays missing; never convert it to zero.
- No secrets in client code.

## Shared domain contracts

Implement and share these types before parallel work:

- `HealthEvent`
- `HealthSource`
- `WellnessCheckIn`
- `CalculationResult`
- `Insight`
- `IntelligenceResponse`

Use the field definitions and sample TypeScript contracts in `AETHRIVA_PRD.md` Section 9.

## Team split

### Agent A — Frontend

Own the design system, navigation, Overview, Connect, Insights, Recovery, Timeline, Reports, Intelligence UI, evidence drawer, responsive behavior, loading/empty/error states.

Do not duplicate data or calculate metrics inside components. Consume shared types and service functions.

### Agent B — Data and intelligence

Own the synthetic fixture, types, Zod schemas, date filtering, units, deterministic descriptive analytics, period comparison, supported association analysis, retrieval, evidence linking, LLM adapter, safety guard, deterministic fallback, and tests.

Do not implement real user-health-data ingestion or external health connectors.

## Build sequence

1. Inspect repository and deploy a shell early.
2. Define domain types and one fixture.
3. Build chart/dashboard shell.
4. Implement deterministic calculations and date filters.
5. Build evidence-linked insights.
6. Implement the supported question flow and deterministic fallback.
7. Integrate and deploy.
8. Test public URL from a second laptop.
9. Rehearse the demo twice.

## Supported demo questions

- “Summarize sleep and activity patterns over the last 30 days.”
- “Compare the first and second halves of this month.”
- “What was different on days with lower self-reported energy?”
- “Show the records behind the sleep trend.”
- “Prepare a neutral summary I can discuss with a healthcare professional.”

## Acceptance gates

- All displayed values match the fixture and calculations.
- Charts show correct units and date labels.
- Source, timestamp, and record ID are available in evidence.
- Association language never implies causation.
- At least one headline question returns a correct evidence-backed response.
- Unknown questions return insufficient evidence.
- Clinical requests do not yield a diagnosis or treatment recommendation.
- The application remains usable when the LLM provider is unavailable.
- The public demo requires no local server, account creation, or personal health-data upload.

## Master Codex prompt

You are the principal engineer building AETHRIVA. Read `AETHRIVA_PRD.md` completely and follow it as the source of truth. Implement the five-hour hackathon MVP only. Start by inspecting the repository and reporting its state. Then create the shared domain types, validation schemas, and one synthetic 30-day dataset. Build the public browser application, deterministic analytics, evidence links, Recovery view, and a grounded intelligence assistant. Deploy early to a public HTTPS URL. Do not implement real personal health-data ingestion, Apple Health, Health Connect, EHR/FHIR, diagnosis, treatment, or predictive medical claims. Do not ask judges to upload health records. Use code for all calculations; use the LLM only to explain calculated results and retrieved evidence. Validate all evidence IDs. Keep secrets server-side. Add deterministic fallback responses so the demo works with no AI key. Run type checks, tests, and production build. Test the deployed URL from a second browser session. At completion, report the URL, implemented features, limitations, environment variables, and acceptance-test results.
