---
schema_version: 1
artifact_type: spec-kitty.analysis-report
command: /spec-kitty.analyze
mission_slug: on-page-results-mirror-01M78JHF
mission_id: 01M78JHF4YQ0YCBB2PY5B6TAHS
generated_at: '2026-11-13T05:54:41.094806+00:00'
analyzer_agent: unknown
input_artifacts:
  spec.md:
    path: kitty-specs\on-page-results-mirror-01M78JHF\spec.md
    sha256: 5b5f605face115870970d25fc8a1978c8f2b2e72661aaf2780893218ea4de1ae
  plan.md:
    path: kitty-specs\on-page-results-mirror-01M78JHF\plan.md
    sha256: e065f3dab98152d4301a95cfdc5c9ba2b882d2bb78cdfb9231998550c6bcf232
  tasks.md:
    path: kitty-specs\on-page-results-mirror-01M78JHF\tasks.md
    sha256: a325e30907527a1c0a73944638e44486d622ff060f9ff963407c7e47709a0573
  charter:
    path: .kittify\charter\charter.yaml
    sha256: 05a45ade07d0cae3ef42b1e6dad8ffb9a1d9c5be787e21bc5b018c8698c846ba
verdict: ready
issue_counts:
  high: 0
  critical: 0
  low: 5
  medium: 4
  info: 0
findings:
- id: C1
  severity: medium
  category: charter-alignment
  summary: Charter 1.1.2 is typed as a patch, but it writes a 'shop never judges' rule and enforcement row into a Charter that holds neither today; QDR-007 types a new rule as minor, and '1.1.2' is hardcoded across WP01, the contract and AGENTS.md copy.
- id: A1
  severity: medium
  category: ambiguity
  summary: FR-003 and SC-001 require 'character for character' equality with the Console group, but the pushed object has no single Console text form; research R-06 settles on indented JSON and the spec doesn't say so.
- id: A2
  severity: medium
  category: ambiguity
  summary: FR-005 and SC-002 require 'the same requests as today', but T032 compares view-off with view-on in one build; no baseline from before the mission is defined.
- id: G1
  severity: medium
  category: coverage
  summary: FR-009 names three paths, but no task checks rows with a visitor's own container (path 2); verbatim rows are proven on the shop's container and offline only.
- id: I1
  severity: low
  category: inconsistency
  summary: Spec FR-004 and Key Entities say the setting is remembered 'in my browser'; the plan and T033 make it this tab only (DM-01M78NYDD).
- id: I2
  severity: low
  category: inconsistency
  summary: Plain-line rows (DM-01M78PK9G) are in the plan, contracts and tasks but not in the spec, whose FR-002 and Result entity describe one row per push only.
- id: I3
  severity: low
  category: inconsistency
  summary: plan.md lists one shop-container spec file; tasks.md adds e2e/results-setting.spec.ts and e2e/results-helpers.ts (recorded as tasking decisions, plan not updated).
- id: I4
  severity: low
  category: inconsistency
  summary: WP04 depends on WP02 only, yet T022 compares the storage key with results-setting.ts from WP03; the check passes without comparing until WP03 lands and relies on WP08 re-running it.
- id: U1
  severity: low
  category: underspecification
  summary: C-004 (no merge to main before the talk without the device record) has no mechanism beyond the WP08 record and the Product Owner's own merge.
---

## Specification Analysis Report

Mission `on-page-results-mirror-01M78JHF`, analysed 2026-11-13 against `spec.md`, `plan.md`, `tasks.md`, the three contracts, the eight WP prompts and Charter 1.1.1.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Charter alignment | MEDIUM | contracts/charter-amendment.md "Why a patch"; spec.md Assumptions (L177); charter.md QDR-007 (L156) | The amendment is typed as a patch because it "clarifies an existing rule". That rule (the shop never judges) lives in demo-shop FR-017 and lint, not in the Charter. The amendment adds the sentence and an enforcement row for it. QDR-007 types a new rule as minor, and the log's precedent agrees (1.1.0 minor added rules; 1.1.1 patch clarified QDR-004). The spec has a fallback (minor 1.2.0, same text), but "1.1.2" is fixed in the WP01 title and file name, T001, the enforcement row, the log row and the AGENTS.md line. | Decide patch or minor before WP01 starts. If minor, change the version string in the contract, plan, tasks.md and WP01/WP04 prompts in one pass. |
| A1 | Ambiguity | MEDIUM | spec.md FR-003 (L131), SC-001 (L188), NFR-003 (L153); research.md R-06 | "Character for character" can't be tested for the pushed object, which the Console shows as a live object. Research R-06 chooses indented JSON taken at call time. The spec doesn't state this, so a reviewer reading only the spec can't tell what the row's object text must equal. The test's expected text for the object is built the same way the shop builds it, so that part can't catch a shop-side formatting fault. | Add one sentence to FR-003 or the Result entity: header and problem lines are verbatim; the pushed object is shown as indented JSON taken when it was logged. |
| A2 | Ambiguity | MEDIUM | spec.md FR-005 (L133), SC-002 (L189), US2 scenario 1; WP06 T032 | "The same requests as today" has no defined baseline. T032 proves view-off and view-on make the same requests in one build, and that every request is same-origin or the one `gtm.js`. That shows the view adds nothing; it doesn't compare with the site before the mission. | Reword to what is tested ("the view adds no request; every request is same-origin or the one `gtm.js`"), or add a request-list comparison against a build of the planning base. |
| G1 | Coverage | MEDIUM | spec.md FR-009 (L137); contracts/results-view.md Checks; WP05, WP06 T035, WP07 T040 | FR-009 covers the shop's container, a visitor's own container and the offline build. The contract's checks prove FR-009 through the offline build only. The one path-2 case (T035, step 4) checks the view is on and the container is unchanged, not that rows appear. Research R-07 says path 2 is where plain lines matter most. | Add one case to WP05 or WP06: with a saved visitor container serving the snippet fixture, one press gives one verbatim row. |
| I1 | Inconsistency | LOW | spec.md FR-004 (L132), Key Entities (L170); plan.md Storage; WP06 T033 step 4 | The spec says the choice is remembered "in my browser"; the plan decision makes it this tab only, and T033 asserts a new tab starts off. | Change the spec wording to "for this tab" and cite the decision. |
| I2 | Inconsistency | LOW | spec.md FR-002 (L130), Result entity (L169); contracts/console-capture.md Shapes; T008, T016, T030 | Plain-line rows aren't in the spec. A plain line written during a press would give two rows where SC-001 expects exactly one. | Add plain lines to the spec's Result entity and say SC-001's "one row" means one result row. |
| I3 | Inconsistency | LOW | plan.md Project Structure; tasks.md Tasking decisions | The plan names `e2e/results.spec.ts` and `results-offline.spec.ts`; tasks add `results-setting.spec.ts` and `results-helpers.ts`. Recorded in tasks.md, so nothing is hidden. | Optional: update the plan's file list. |
| I4 | Inconsistency | LOW | tasks.md WP04 dependencies; WP04 T022; WP08 T045 step 4 | T022's key-match check prints `ok` without comparing when `results-setting.ts` is absent, which it is on WP04's base. The Charter says a check that can never fail is removed. The prompts handle it: the check tightens once WP03 lands and WP08 must stop if the "not present yet" text appears. | Accept as written, or make WP04 depend on WP03 so the check compares from the start (costs the WP03/WP04 parallel lane). |
| U1 | Underspecification | LOW | spec.md C-004 (L163); WP08 T049 | C-004 is held only by a record in `docs/release-checks.md` and by the Product Owner merging the PR to `main`. The mission's merge target is the feature branch, so Spec Kitty's merge doesn't reach `main`. | Accept; the Product Owner is the gate. Optionally add a line to the PR description template in T049. |

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 Results section | Yes | T014–T018, T028 | |
| FR-002 One row per push | Yes | T009, T016, T028 | See I2 |
| FR-003 Verbatim text | Yes | T008, T009, T027, T028, T040 | See A1 |
| FR-004 Off by default, switch | Yes | T005, T013, T014, T033 | See I1 |
| FR-005 Off means unchanged | Yes | T005, T032 | See A2 |
| FR-006 Link turns it on | Yes | T005, T006, T034, T035 | |
| FR-007 Console gets everything | Yes | T007, T031 | |
| FR-008 Recognised by shape | Yes | T008, T009, T030 | |
| FR-009 Works on every path | Yes | T011, T028, T040 | Path 2 rows untested (G1) |
| FR-010 Empty states | Yes | T015, T029 | |
| FR-011 Nothing leaves the page | Yes | T009, T038 | |
| FR-012 The view pushes nothing | Yes | T037 | |
| FR-013 Announced, focus kept | Yes | T017, T042 | |
| FR-014 Still no shop verdicts | Yes | T010, T020, T021 | |
| FR-015 Charter amendment | Yes | T001–T004 | See C1 |
| FR-016 Documents and guidance | Yes | T018, T024, T025 | |
| FR-017 Real-device check | Yes | T047, T048 | Product Owner runs it |
| NFR-001 Phone width | Yes | T019, T043 | |
| NFR-002 Accessibility | Yes | T041, T042 | |
| NFR-003 Verbatim vs real snippet | Yes | T026–T028, T040 | |
| NFR-004 Page speed | Yes | T046 | Manual Lighthouse run |
| C-001 Contract unchanged | Yes | WP02 (T007–T009) | Held by design; NFR-003 catches drift |
| C-002 Address never sets a container | Yes | T035 | |
| C-003 Scope of the reversal | Yes | T003 | Amendment-log row |
| C-004 Date and device checks | Yes | T049 | See U1 |
| C-005 Gates, stack, terms | Yes | T004, T023, T045 | |
| C-006 The shop never judges | Yes | T010, T021 | |

**Charter Alignment Issues:** One, C1. It is an open classification with a fallback already agreed in the spec, not a settled conflict, so it is rated MEDIUM. Everything else in the plan's Charter Check holds: no new dependency (QDR-002), gate set unchanged (QDR-003), no container ID in any artefact (QDR-004), contract untouched (QDR-005), and the lint change ships in the same pull request as the amendment (QDR-007).

**Unmapped Tasks:** None. T012 and T044 are verification steps for their own work packages.

**Issue-matrix heads-up (informational):** `spec.md` cites issue `#10` as the mission's input and `#4` as "see #4". The `#4` citation is context only. The `#10` reference will need an issue-matrix row before its owning work package can be approved.

**Metrics:**

- Total Requirements: 27 (17 FR, 4 NFR, 6 constraints)
- Total Tasks: 49 subtasks in 8 work packages
- Coverage: 100% (27 of 27 with at least one task)
- Ambiguity Count: 2
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions

No CRITICAL or HIGH findings; implementation may proceed.

- C1 is worth settling before WP01, the first work package, since the version string spreads from there.
- A1, A2, I1 and I2 are wording fixes in `spec.md`. G1 is one extra e2e case in a WP05 or WP06 prompt.
- Any edit to the spec, plan, tasks or Charter makes this report stale; re-run `/spec-kitty.analyze` afterwards.
