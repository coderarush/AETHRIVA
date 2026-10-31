# Functional dashboard and readability pass

The current local read path and 82 regressions pass. Complete the write path and verify it before applying typography changes. The public Site remains a static interface; private hosted access needs an authenticated backend and is an explicit outstanding architecture decision.

1. Add a separate private local SQLite journal for energy check-ins and accepted device readings. Preserve the provider cache as read-only. Validate units, flags, bounds, origin, content type and request size. Demonstration/test/invalid packets must never become observations.
2. Connect writes to the interface and load persisted records on refresh/restart. Canonical energy joins existing analytics; instantaneous clinical readings stay separate. Include device records and workouts in Timeline and Reports. Preserve warning and source context. Fix obsolete source bookmarks broadening to all sources.
3. Verify temporary-database API round trips, deduplication, restart persistence, rejection cases, unavailable-cache behavior and browser flows. Never enter synthetic test observations into the user's real journal.
4. Replace Nunito with officially sourced IBM Plex Sans. Use 400/500/600 weights; page titles30px, sections22px, component titles18px, body/tables16px, controls14px, metadata13px. Keep Carbon and existing metric colors. Use concise route titles and concrete section labels.
5. Check representative populated and empty views at desktop, tablet and phone widths; keyboard, zoom, reports and source/date scope. Obtain independent code and visual review. Publish only static assets; keep private journal/cache out of source and deployment.

Status: implemented and verified within the requested local workspace scope; deployment contains static assets only. Detailed evidence is in docs/VERIFICATION.md.
