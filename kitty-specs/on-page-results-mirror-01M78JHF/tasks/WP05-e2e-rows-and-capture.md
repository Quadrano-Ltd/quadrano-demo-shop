---
work_package_id: WP05
title: 'e2e: rows and capture'
dependencies:
- WP03
requirement_refs:
- NFR-003
- SC-001
- FR-002
- FR-003
- FR-007
- FR-008
- FR-009
- FR-010
planning_base_branch: feat/on-page-results-mirror
merge_target_branch: feat/on-page-results-mirror
branch_strategy: Planning artifacts for this mission were generated on feat/on-page-results-mirror. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/on-page-results-mirror unless the human explicitly redirects the landing branch.
subtasks:
- T026
- T027
- T028
- T029
- T030
- T031
phase: Phase 4 - Proof
agent: ''
history:
- at: '2026-11-12T20:26:16Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: e2e/
create_intent:
- e2e/results.spec.ts
- e2e/results-helpers.ts
execution_mode: code_change
model: ''
owned_files:
- e2e/results.spec.ts
- e2e/results-helpers.ts
- e2e/snippets.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP05 – e2e: rows and capture

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission on-page-results-mirror-01M78JHF`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

Prove, on the shop's container path and against the **real** snippet fixture, that the Results view shows the runtime's text and nothing else.

| Check | Proves |
|---|---|
| Each of the 7 playground presses adds exactly 1 row at the top, whose text equals the Console group's arguments from the same run | SC-001, NFR-003, FR-002, FR-003 |
| With a visitor's own container saved (path 2), one press adds 1 row equal to its Console group, and the one `gtm.js` request carries the visitor's ID | FR-009 |
| Both empty states, checked against each other on one page | FR-010 |
| A group written by another script doesn't appear; the runtime's does | FR-008 with its control |
| A plain branded line shows as a plain row | research R-07 |
| Markup-like text in a pushed value shows as text and adds no element | spec, Edge Cases |
| The Console records for the 7 presses are equal with the view on and off | FR-007 |
| At most 50 rows are kept | research R-10 |

This WP also builds the helpers that WP06 and WP07 import.

**Done when**: `pnpm exec playwright test e2e/results.spec.ts --project=chromium` passes 3 times running; the fixture-drift probe in T028 fails as it should; `pnpm gates` passes.

## Context & Constraints

- **Read first**: the "Checks" tables in `contracts/console-capture.md` and `contracts/results-view.md`; plan IC-04 (its Risks line is the rule for this WP); `e2e/offline-mode.spec.ts` (how Console messages are captured today); `e2e/fixtures.ts`.
- **The rule that makes this suite worth having**: expected text must come from the Console arguments captured in the same test run, never from strings typed into the test. A test with typed expectations can't catch a change in the runtime's format (NFR-003).
- **Not a gate**: `pnpm test:e2e` stays outside the gates (QDR-003).
- **Secrets (QDR-004)**: no container-ID-shaped literal other than `GTM-XXXXXXX`. Use `SHOP_CONTAINER_ID` and `visitorContainerId()` from `e2e/fixtures.ts`.
- **Don't edit** `e2e/fixtures.ts`, the snippet fixture files or any existing spec. New helpers go in `e2e/results-helpers.ts`; `e2e/snippets.ts` gains one function.
- **Verdict marks in test code**: `e2e/` isn't under the shop's verdict lint rule, but this suite doesn't need typed marks or wording. Keep them out so the "expected text comes from the run" rule is visible at a glance.

### How Quadrano gets onto the page in this suite

The e2e servers build the shop with a run-time container ID. The auto `gtm` fixture in `e2e/fixtures.ts` answers every `gtm.js` request with an empty body. For Results tests, answer it with the **snippet's script body** instead, so the real runtime runs exactly as a Custom HTML tag would run it:

- The fixture snippet is `<script>…</script>`. Its body sets `window._quadrano` and appends an inline script holding the runtime.
- `page.route(...)` registered in the test takes precedence over the context-level route in the `gtm` fixture.

### Fixed names from WP03

`section.results`, `#results-switch`, `#results-switch-note`, `p.results__empty`, `ul.results__list`, `li.results__row`, `details.results__result`, `summary.results__header`, `p.results__line`, `pre.results__pushed`, `p.results__plain`, `#results-status`.

### Playwright Console message types

`startGroupCollapsed`, `startGroup`, `endGroup`, `log`, `info`, `warning`.

## Branch Strategy

- **Planning base branch**: `feat/on-page-results-mirror`
- **Final merge target**: `feat/on-page-results-mirror`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP05 --agent <name> --mission on-page-results-mirror-01M78JHF
```

---

## Subtasks & Detailed Guidance

### Subtask T026 – Snippet body helper; serve the snippet; turn the view on

**Purpose**: One way to put the real runtime on the page, shared by three work packages.

**Steps**:

1. In `e2e/snippets.ts`, add:

   ```ts
   const SNIPPET_SCRIPT = /<script[^>]*>([\s\S]*?)<\/script>/i;

   /**
    * The body of a fixture snippet's script element: what a Custom HTML tag
    * would run. Throws if the fixture holds no script element.
    */
   export function scriptBodyOf(snippet: string): string {
     const match = SNIPPET_SCRIPT.exec(snippet);
     if (match === null || match[1] === undefined) {
       throw new Error('fixture snippet holds no script element');
     }
     return match[1];
   }
   ```

   The pattern is the one the offline boot step uses in `vite.config.ts`, so both paths run the same text.

2. Create `e2e/results-helpers.ts` with:

   ```ts
   export const RESULTS_VIEW_KEY = 'demo-shop:results-view';

   /** Accessible names of the 7 playground buttons, in DOM order. */
   export const PLAYGROUND_LABELS = [
     'add_to_cart',
     'purchase · Correct',
     'purchase · 1 · Missing value',
     'purchase · 2 · Value as text',
     'purchase · 3 · Wrong-case key',
     'purchase · 4 · Lower-case currency',
     'purchase · Spare · Bad transaction ID',
   ] as const;

   /** Answer gtm.js with the snippet's script body, as a Custom HTML tag would run it. */
   export async function serveSnippetAsGtm(page: Page, snippet = SNIPPET_BEFORE_STEP8): Promise<void>

   /** Open `path` with the view on by link and wait for the attribute. */
   export async function openWithResults(page: Page, path = '/'): Promise<void>

   /** Resolve once the capture state has seen the runtime's banner line. */
   export async function waitForBanner(page: Page): Promise<void>

   /** True when the six wrapped Console methods are the browser's own. */
   export async function consoleIsNative(page: Page): Promise<boolean>

   /** Count of `li.results__row`. */
   export async function rowCount(page: Page): Promise<number>
   ```

   - `serveSnippetAsGtm`: `page.route('https://www.googletagmanager.com/gtm.js?*', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: scriptBodyOf(snippet) }))`.
   - `openWithResults`: `page.goto(withParam(path))`, then `expect(page.locator('html')).toHaveAttribute('data-results-view', 'on')`. Append `results=on` with `?` or `&` as the path needs.
   - `waitForBanner`: `page.waitForFunction(() => window.__demoShopResults?.bannerSeen === true)`.
   - `consoleIsNative`: in the page, check that `Function.prototype.toString.call(console[name])` contains `[native code]` for all six of `groupCollapsed`, `group`, `groupEnd`, `log`, `info`, `warn`.

3. `window.__demoShopResults` is typed by `site/src/globals.d.ts`, which `tsconfig.json` already includes for `e2e/`.

**Files**: `e2e/snippets.ts`, `e2e/results-helpers.ts` (new)

**Validation**:
- [ ] A scratch test that calls `serveSnippetAsGtm`, `openWithResults` and `waitForBanner` passes.
- [ ] The same test without `serveSnippetAsGtm` times out at `waitForBanner` (the control: the empty stub gives no banner). Don't commit this as a timeout test; T029 covers it properly.

**Edge cases**:
- The runtime wraps `dataLayer.push` when it loads. Pushes made before it loads may or may not be replayed; always `waitForBanner` before pressing.
- `document.currentScript` is set while an external classic script runs, so the snippet body behaves under `gtm.js` as it does inline.

### Subtask T027 – Console capture with raw arguments; expected text from them

**Purpose**: The comparison side of "verbatim". The existing `captureConsole` in `offline-mode.spec.ts` turns every argument into a string, which loses the pushed object; this one keeps the values.

**Steps**:

1. In `e2e/results-helpers.ts`:

   ```ts
   export interface ConsoleCall {
     readonly type: string;
     readonly args: readonly unknown[];
   }

   /** Console calls made while `action` runs, with each argument's JSON value. */
   export async function recordConsole(
     page: Page,
     action: () => Promise<void>,
   ): Promise<ConsoleCall[]>
   ```

   Collect `message.type()` and `Promise.all(message.args().map((arg) => arg.jsonValue()))` in the handler, as the existing helper does, and await them after `action`. A failed `jsonValue()` becomes `null`.

2. Text of a call, by the same rule the Console applies (`%c` removed and its argument skipped, `%s` replaced):

   ```ts
   export function consoleText(args: readonly unknown[]): string {
     let index = 1;
     return String(args[0]).replace(/%[cs]/g, (token) => {
       const value = args[index];
       index += 1;
       return token === '%c' ? '' : String(value);
     });
   }
   ```

   This repeats the rule on the test side on purpose. It reads the **arguments the Console received**, so if the runtime's format string or header changes, the expected text changes with it and the comparison still means something.

3. Split a run into groups:

   ```ts
   export interface ExpectedResult {
     readonly header: string;
     readonly lines: readonly string[];
     readonly pushed: string | null;
   }

   /** One ExpectedResult per startGroupCollapsed … endGroup span in `calls`. */
   export function expectedResults(calls: readonly ConsoleCall[]): ExpectedResult[]
   ```

   - `header`: `consoleText(args)` of the `startGroupCollapsed` call.
   - `lines`: each `log` call inside the span with exactly 1 argument, a string.
   - `pushed`: for the `log` call with 2 arguments, `String(args[0]) + ' ' + JSON.stringify(args[1], null, 2)`.

4. Read a row from the page:

   ```ts
   /** The row at `index` (0 is the newest) as text, expanding it first if needed. */
   export async function readRow(page: Page, index: number): Promise<ExpectedResult>
   ```

   Read with `textContent`, not `innerText`, so wrapping and CSS can't change the comparison. `pre.results__pushed` absent means `pushed: null`.

**Files**: `e2e/results-helpers.ts`

**Validation**:
- [ ] For one press, `expectedResults(calls)` has length 1 and a non-empty `header`.
- [ ] `pushed` starts with `Pushed: {`.

**Edge cases**:
- `jsonValue()` keeps key order for plain objects. If a comparison of `pushed` fails only on key order, compare parsed objects as a fallback and say so in the Activity Log; don't weaken the header and line comparisons.
- Calls made by the test harness itself (none expected) would show in the record; filter by span, not by guesswork.

### Subtask T028 – 7 presses: one row each, text equal to the Console group

**Purpose**: SC-001 and NFR-003, the reason this suite exists.

**Steps**:

1. Create `e2e/results.spec.ts`. First test:

   ```ts
   test('each playground press adds one row equal to its Console group', async ({ page }) => {
     await serveSnippetAsGtm(page);
     await openWithResults(page);
     await waitForBanner(page);
     await openMenu(page);

     for (const [index, label] of PLAYGROUND_LABELS.entries()) {
       const calls = await recordConsole(page, async () => {
         await page.getByRole('button', { name: label, exact: true }).click();
         await expect(page.locator('li.results__row')).toHaveCount(index + 1);
       });
       const expected = expectedResults(calls);
       expect(expected).toHaveLength(1);
       expect(await readRow(page, 0)).toEqual(expected[0]);
     }
   });
   ```

   - `exact: true` matters: `purchase · Correct` is a prefix of nothing else, but be safe.
   - The row count rising by exactly 1 per press is the "one row per push" check (FR-002).
   - `readRow(page, 0)` is the newest, so this is also the "newest first" check.

2. Second test, order and independence (User Story 1, scenario 2):
   - Press 3 buttons, recording each expected header.
   - Assert the headers down the list are the three in reverse order of pressing.
   - Expand row 1 and row 2; collapse row 1; assert row 2 is still open and row 0 is still closed. Press a fourth button; assert the row that was open is still open (it is now at index 3).

3. Third test, a push with no problems: after `add_to_cart`, the row has 0 `p.results__line` elements and a `pre.results__pushed` (spec, Edge Cases).

4. Fourth test, a visitor's own container (FR-009, path 2). The offline build is covered in WP07; this is the third path. Name it `a visitor's own container: one press adds one row equal to its Console group`.

   ```ts
   test("a visitor's own container: one press adds one row equal to its Console group", async ({ page, gtm }) => {
     const visitorId = visitorContainerId();
     await seedSaved(page, gtm, savedValue(visitorId, Date.now()));
     await serveSnippetAsGtm(page);

     const gtmIds: string[] = [];
     page.on('request', (request) => {
       const url = request.url();
       if (url.startsWith('https://www.googletagmanager.com/gtm.js?')) {
         gtmIds.push(new URL(url).searchParams.get('id') ?? '');
       }
     });

     await openWithResults(page);
     await waitForBanner(page);
     await openMenu(page);

     const calls = await recordConsole(page, async () => {
       await page.getByRole('button', { name: PLAYGROUND_LABELS[2], exact: true }).click();
       await expect(page.locator('li.results__row')).toHaveCount(1);
     });
     const expected = expectedResults(calls);
     expect(expected).toHaveLength(1);
     expect(await readRow(page, 0)).toEqual(expected[0]);

     expect(gtmIds).toEqual([visitorId]);
   });
   ```

   - Order matters: `seedSaved` first (it opens `/` and saves the container), then `serveSnippetAsGtm`, then the `request` listener, then `openWithResults`. The listener is added after seeding so it sees only the second page load.
   - `expect(gtmIds).toEqual([visitorId])` is the control. It shows the page really loaded the visitor's container and not the shop's. Without it the test would pass on path 1 and prove nothing about path 2.
   - Don't use `gtm.ids` for that assertion. `serveSnippetAsGtm` adds a page route, which answers the request before the `gtm` fixture's context route can record it, so `gtm.ids` stays empty here.
   - `visitorContainerId`, `savedValue` and `seedSaved` come from `e2e/fixtures.ts`. Import them; don't edit that file. Type no container ID (QDR-004).
   - `PLAYGROUND_LABELS[2]` is `purchase · 1 · Missing value`, a press with at least one problem line.

5. **Fixture-drift probe** (scratch, not committed): copy the fixture to a temp file, change one character in the banner or group format string (for example `%c %s` to `%c  %s`), point `serveSnippetAsGtm` at it for one run, and confirm the first test fails or times out. Record the outcome in the Activity Log, then discard the copy. This is the evidence that "the test fails if the runtime's format changes" (NFR-003).

**Files**: `e2e/results.spec.ts` (new)

**Validation**:
- [ ] 7 of 7 presses pass.
- [ ] The visitor's-container test passes, and fails if the saved container is removed (the `gtmIds` assertion then sees the shop's ID). Think it through or try it once; don't commit the probe.
- [ ] The probe fails as described.
- [ ] No expected header, line or pushed text is typed in the file.

### Subtask T029 – The two empty states, checked against each other

**Purpose**: FR-010. "No output yet" and "hasn't loaded" must be told apart by the banner alone.

**Steps**:

1. One test, two pages in the same test so each is the other's control:

   | Setup | Expect `p.results__empty` to read |
   |---|---|
   | No `serveSnippetAsGtm` (the stub's empty `gtm.js`), `openWithResults`, open the menu | `Quadrano hasn't loaded in this browser. On a phone, the likely cause is a content blocker stopping GTM.` |
   | `serveSnippetAsGtm`, `openWithResults`, `waitForBanner`, open the menu | `No output yet` |

   These two strings are the shop's own copy from `contracts/results-view.md`, so typing them is right.

2. Second test, the hand-over without a reload: open with the view on and the empty stub (first state showing). Then inject the snippet body by hand: `page.addScriptTag({ content: scriptBodyOf(SNIPPET_BEFORE_STEP8) })`. Assert the message changes to `No output yet` with no navigation (`page.url()` unchanged).
3. In both states assert `ul.results__list` has 0 rows.

**Files**: `e2e/results.spec.ts`

**Validation**:
- [ ] Both tests pass.
- [ ] Swapping the two expected strings makes the first test fail (think it through; no need to commit a probe).

### Subtask T030 – Other scripts' output stays out; plain lines; markup as text

**Purpose**: FR-008 with its control, research R-07, and the markup edge case.

**Steps**:

1. **Another script's group** (FR-008). With the runtime loaded and the view on:

   ```ts
   await page.evaluate(() => {
     console.groupCollapsed('Another script');
     console.log('inside another group');
     console.groupEnd();
     console.log('a loose line');
     console.info('Quadrano mentioned without its shape');
   });
   ```

   Assert 0 rows. Then press `add_to_cart` and assert 1 row (the control: the runtime's group does appear). Also assert, with `recordConsole` around the `evaluate`, that all five calls reached the Console.

2. **A foreign group nested inside a result.** The runtime's group is synchronous, so drive the shape rules directly with calls in the runtime's shape. Use a neutral marker character such as `?`:

   ```ts
   await page.evaluate(() => {
     console.groupCollapsed('%c?%c %s', '', '', 'outer header');
     console.log('kept one');
     console.group('nested, not ours');
     console.log('dropped');
     console.groupEnd();
     console.log('kept two');
     console.groupEnd();
   });
   ```

   Assert one row: header `? outer header`, lines `['kept one', 'kept two']`, no `pre`. Here the expected text is typed, which is fine: the test wrote the calls itself.

3. **Plain line.** With the runtime loaded, push an event that has no Event Definition:

   ```ts
   const calls = await recordConsole(page, async () => {
     await page.evaluate(() => { window.dataLayer?.push({ event: 'not_in_the_specification' }); });
     await expect(page.locator('li.results__row')).toHaveCount(1);
   });
   ```

   Find the `info` call in `calls`; assert the row holds one `p.results__plain` whose text equals `consoleText(thatCall.args)`, and no `details`. Test code may push to the data layer directly; the lint rule against that covers `site/` only.

4. **Markup shown as text.** Push an `add_to_cart` whose `currency` (or another string Attribute) is `<img src=x onerror="window.__hit = true">`. Assert:
   - the row's text contains that string literally (compare with `expectedResults` from the same run)
   - `page.locator('section.results img')` has count 0
   - `window.__hit` is `undefined`

5. **Banner is not a row.** After `waitForBanner` with no press, 0 rows.

**Files**: `e2e/results.spec.ts`

**Validation**:
- [ ] All five pass.
- [ ] In step 1, removing the control (the press) would still pass; that is why the control is there. Keep it.

**Edge cases**:
- If the runtime's "No Event Definition" line is only written at some log levels, the fixture's `logLevel` is `all`, so it is written. If the line doesn't appear, read the fixture before changing the test.
- A foreign `groupCollapsed` with exactly the runtime's shape **would** be shown; recognition is by shape (FR-008). That is by design and not tested as a failure.

### Subtask T031 – Console records equal with the view on and off; limit of 50

**Purpose**: FR-007, and the limit from research R-10.

**Steps**:

1. **Same Console with the view on and off.** One test:
   - Run A: `serveSnippetAsGtm`, `page.goto('/')` (view off), wait for the runtime by recording the banner `info` call during load, open the menu, record the 7 presses.
   - Run B: a fresh page in the same context after clearing `sessionStorage`, or a second `browser.newContext()`: the same, with `openWithResults`.
   - Assert `consoleIsNative` is `true` in A and `false` in B (the control: the view really was on in B).
   - Compare the two lists of `{ type, args }`, in order.
   - Purchase pushes carry a random transaction ID (`T-` and 6 digits). Normalise before comparing: replace `/T-\d{6}/g` with a fixed token in every string, including inside the pushed object (stringify, replace, parse). The `Bad transaction ID` scenario's `12345` is fixed and needs nothing.
   - Compare type, argument count, and every argument value. Don't compare `location()`; attribution moving to the shop is the accepted cost (spec, Assumptions).

2. **Limit of 50.** With the view on (no runtime needed):

   ```ts
   await page.evaluate(() => {
     for (let n = 1; n <= 51; n += 1) {
       console.groupCollapsed('%c?%c %s', '', '', `entry ${n}`);
       console.groupEnd();
     }
   });
   ```

   Open the menu. Assert 50 rows; the first row's header is `? entry 51`; the last is `? entry 2`. Also assert `window.__demoShopResults.entries.length` is 50.

3. **Hand-over before mount** (research R-10). The limit test doesn't cover it: there the page module has already mounted when the entries arrive. The real case needs an entry written after the capture script runs and before the deferred page module does. A Playwright init script runs before the capture script, so the wrappers aren't there yet and it can't write the entry directly. Try this instead: in an init script, register a `readystatechange` listener that writes one group in the runtime's shape when `document.readyState` becomes `interactive` (module scripts run after that point). Then open the menu and assert the row is there and `#results-status` holds its header. If the ordering can't be made reliable, drop the test and say why in the Activity Log; don't fake it. The offline suite in WP07 covers the same hand-over for the banner.

**Files**: `e2e/results.spec.ts`

**Validation**:
- [ ] The on/off comparison passes 3 times running (it would flake first if the ID normalisation were wrong).
- [ ] The limit test passes.
- [ ] Full file: `pnpm exec playwright test e2e/results.spec.ts --project=chromium --repeat-each=3` passes.

---

## Definition of Done

- [ ] `e2e/results-helpers.ts` exports the helpers named in T026 and T027; `e2e/snippets.ts` exports `scriptBodyOf`.
- [ ] `e2e/results.spec.ts` covers every row of the table in Objectives.
- [ ] No expected runtime text is typed; it comes from the same run's Console arguments.
- [ ] Fixture-drift probe recorded in the Activity Log.
- [ ] `--repeat-each=3` passes; the rest of `pnpm test:e2e` still passes.
- [ ] `pnpm gates` passes (the e2e files are linted and type-checked).
- [ ] `spec-kitty agent tasks mark-status T026 T027 T028 T029 T030 T031 --status done --mission on-page-results-mirror-01M78JHF`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Expected text typed into tests | `expectedResults` from the same run; reviewer searches the file for runtime wording |
| Random transaction IDs break the on/off comparison | Normalise `T-` plus 6 digits on both sides |
| Presses before the runtime loads | `waitForBanner` first, always |
| The page route doesn't override the fixture's context route | Page routes take precedence; T026 validation proves it with the banner |
| Flaky row timing | Wait on the row count inside `recordConsole`'s action, never on a fixed delay |
| Helpers change shape after WP06 and WP07 start | The signatures in this prompt are the contract; add, don't change |

## Review Guidance

- Search `e2e/results.spec.ts` for typed runtime wording. The only typed strings should be the shop's own copy, button names, and text the test itself wrote to the Console.
- Run the file with `--repeat-each=3`.
- Ask for the fixture-drift probe evidence.
- Check each "doesn't appear" test has its control.

## Activity Log

- 2026-11-12T20:26:16Z – system – Prompt generated via /spec-kitty.tasks
