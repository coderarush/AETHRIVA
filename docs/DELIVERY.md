# Delivery

Public demo: https://aethriva-nighthack.tan9uj.chatgpt.site
Canonical source: https://github.com/coderarush/AETHRIVA

The public app is a buildless static directory in `dist/`. `.openai/hosting.json` binds its Sites project and static directory; it contains no credential. The audience is anonymous public access. All analytical interactions run locally against the synthetic fixture.

Publication uses the Sites source helper to push and package an exact clean source commit. GitHub main is kept at that same commit. Saved version/deployment IDs and final anonymous/live-browser checks are retained in the local ignored delivery record, avoiding a self-referential commit hash in tracked source.

## Reproduce

1. Run `npm test` and `npm run check`.
2. Verify the original private apps remain outside this dedicated checkout.
3. Commit reviewed changes under the actual contributor's GitHub-linked identity.
4. Synchronize GitHub main and the Sites source repository without overwriting history.
5. Package the clean source with the configured static assets and deploy its saved version.
6. Test the anonymous URL, all three core modules, evidence, and two demo runs.

No API key, database, model service, account, personal-data upload, or environment variable is required for this release.
