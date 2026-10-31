# Current release verification

Verified October 30, 2026 (Pacific time).

- `npm test`: 82 passing tests, no failures. Includes daily mappings, real dataset validation, missing versus zero, non-October dates, snapshot evidence, catalog search, protocol decoding, disconnect/cancellation, sensor quality rejection, and local HTTP access boundaries.
- `npm run check`: syntax and explicit asset checks pass for all 22 static runtime files.
- `git diff --check`: passes.
- Independent code review: material findings fixed and rechecked. Invalid/test/demo pulse-oximeter packets cannot become observations; malformed Lyfta labels or RIR cannot discard otherwise valid history. CSV retains sensor status and quality warnings.
- Independent visual review: ship for Connections desktop (1440px) and phone (390px) captures. Keyboard styles and lower sections also source-reviewed.
- Browser: seven real-data views at 320, 390, 768, and 1440 CSS pixels (28 checks), with no page overflow, render-error state, fictional profile, or demo copy.
- Browser: seven empty public views at 390 and 1440 CSS pixels (14 checks), with no page overflow or render failures.
- Browser: EKG aliases return ECG products; selecting a Kardia model displays the manufacturer path and does not fake a connection.
- Browser: real-data summary produces evidence-backed findings; inline evidence uses daily-aggregate precision. Changing the range preserves the saved answer scope. A conflicting measurement filter is cleared when opening Lyfta workouts, whose exercises and sets expand inline.
- Authorized local history validated end-to-end without saving its contents into the repository or public assets. Original application and installed synchronization service are unchanged.
- Static runtime has no synthetic fixture imports. Synthetic regression fixtures live only under `tests/fixtures/`.

## Limits of this verification

No physical Bluetooth monitor was paired. Packet/parser and lifecycle tests use explicitly synthetic test inputs; they do not establish compatibility with a particular model, firmware, or operating system. ECG, proprietary CGM/device protocols, and manufacturer cloud integrations are not implemented. Bluetooth samples stay in page memory (latest 120 by default) and can be downloaded; they are not persisted into the health-history database. The public Site has no personal-data backend or account system. Private history is available through the local workspace. Print styling was retained, but a new printed PDF was not visually reviewed.

The Impeccable detector reported advisory palette/type additions for the Connections component; the visual reviewer found no material issues in the captured views. Previous demo/UI release verification is retained in Git history.
