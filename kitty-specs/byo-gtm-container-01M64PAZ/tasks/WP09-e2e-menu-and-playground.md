---
work_package_id: WP09
title: 'e2e: menu and playground'
dependencies:
- WP06
- WP07
requirement_refs:
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- FR-010
- FR-015
- FR-017
- FR-018
- NFR-005
- SC-003
- SC-005
- SC-006
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T039
- T040
- T041
- T042
phase: Phase 4 - Verification
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: e2e/
create_intent:
- e2e/menu.spec.ts
- e2e/playground.spec.ts
execution_mode: code_change
model: ''
owned_files:
- e2e/menu.spec.ts
- e2e/playground.spec.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP09 – e2e: menu and playground

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission byo-gtm-container-01M64PAZ`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

Prove the menu and playground behave exactly as the contracts say:

- **FR-005 to FR-010 / SC-002**: a well-formed ID typed into the menu is saved, the page reloads, and the banner shows it on every page; path 1 and reset clear it.
- **FR-007 / SC-003**: at least 10 malformed IDs are each refused with the contract message, `aria-invalid="true"`, nothing saved and the container unchanged.
- **FR-015 / SC-005 / NFR-005**: each of the 7 playground buttons adds exactly `[{ ecommerce: null }, <event>]`, deep-equal to the push contract's shape, reachable in 2 interactions.
- **FR-017**: opening and closing the menu, path 1, a refused save, reset and a scenario change add **0** entries.
- **FR-018 / SC-006**: `?scenario=` links still set the header switcher.

**Done when**: `pnpm test:e2e e2e/menu.spec.ts e2e/playground.spec.ts` passes.

## Context & Constraints

- **Read first**: `contracts/visitor-menu.md` (structure, behaviour table, copy), `contracts/playground-pushes.md`, `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md` (**the source of expected shapes**), `quickstart.md` rows for `menu.spec.ts` and `playground.spec.ts`, `data-model.md` "Visitor menu state".
- **Fixtures** from WP07 (`e2e/fixtures.ts`): `test`, `expect`, `SHOP_CONTAINER_ID`, `visitorContainerId`, `STORAGE_KEY`, `PAGES`, `savedValue`, `seedSaved`, `pushedEntries`, `openMenu`. Read the file and use its real names; add missing helpers locally in your spec.
- **Expected shapes must be written as literals in the test, from the contract file**, not imported from `site/src/datalayer/*` (importing the builders would make the check tautological). Copy the JSON shapes from the contract; substitute the pushed `transaction_id` where it's random.
- **Baseline**: always measure `const before = (await pushedEntries(page)).length` before an action and compare after. Don't assume the data layer is empty. Avoid `/thank-you/` as the page for push-count tests: it pushes `purchase` on load when an order exists.
- **Secrets**: every ID built at run time. Several malformed inputs (for example trailing punctuation) would match the no-secrets regex if typed literally, so build them all.
- Locators: prefer roles and accessible names (`getByRole('button', { name: 'Demo menu' })`, `getByLabel('Your container ID')`), which also checks the accessible names. Use the visible copy from the contract.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP09 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T039 – Save, reload, banner on every page

**Steps** (`e2e/menu.spec.ts`):

1. Fresh state, `/`. `openMenu(page)`; fill "Your container ID" with `visitorContainerId('MENU01')`; click "Save".
2. Wait for the reload; expect `data-container-source="visitor"`; `localStorage.getItem(STORAGE_KEY)` parses to `{ id, savedAt }` with `id` equal and `savedAt` within the last minute.
3. For each of the 5 `PAGES`: goto; expect `.visitor-banner` visible with text `Using your container ${id}`, and a "Reset to the shop's container" button.
4. Open the menu on one page: the status line names the visitor's container, and the menu offers its own reset (FR-010 "in the banner **and in the menu**").

### Subtask T040 – Malformed IDs refused (≥10)

**Steps**:

1. Build the list at run time (mirror WP07's `verify:container` list), at least:
   too short (`'GTM-' + 'ABC'`), too long (`'GTM-' + 'A'.repeat(11)`), lower-case prefix (`'gtm-' + 'ABCD12'`), lower-case suffix (`'GTM-' + 'abcd12'`), wrong prefix (`'UA-' + '1234'`), GA4 shape (`'G-' + 'ABCD1234'`), leading space, trailing space, inner space, hyphen inside, trailing `!`, underscore separator, no separator, empty.
2. For each, starting from the **shop** state and then once from the **visitor** state:
   - fill the input, click Save;
   - expect the message to contain "That doesn't look like a container ID" and `GTM-XXXXXXX`;
   - expect `aria-invalid="true"` on the input;
   - expect **no navigation** (for example check `page.url()` and a marker `window.__noReload = true` set before the click is still there);
   - expect storage unchanged (raw string equal to before);
   - expect pushes unchanged (FR-017).
3. Assert `list.length >= 10` (SC-003 floor).
4. After a refusal, typing a character clears `aria-invalid` (contract behaviour).
5. Assert the refusal message contains no verdict symbols or words (`/[✓✗⚠✅❌]|\b(pass(ed|es)?|fail(ed|s|ure)?|valid|invalid)\b/i` must not match). FR-022's paired check.

### Subtask T041 – Path 1, reset, and nothing pushes

**Steps**:

1. Shop state: path 1 → message "You're using the shop's pre-built container."; no reload; storage untouched.
2. Visitor state: path 1 → reload → shop state, key removed (same as reset).
3. **No pushes** (FR-017). On `/product/`, measure the baseline, then do, in sequence: open menu, close (Close button), open, Escape, path 1 (shop state), a refused save, change the header Scenario select to another value. After each step, the count is unchanged.
4. Reset and a successful save reload the page, so for those compare `pushedEntries` on the fresh page against a fresh load of the same page without the action (both should be equal; typically 0 on `/product/`).

### Subtask T042 – `e2e/playground.spec.ts`

**Steps**:

1. Expected shapes (literals, from the push contract), with `hero item` = `{ item_id: 'SKU-1001', item_name: 'Stoneware Mug', price: 12.99, quantity: 1 }`:

   | Button | Expected event (after `{ ecommerce: null }`) |
   |---|---|
   | `add_to_cart` | `{ event: 'add_to_cart', ecommerce: { currency: 'GBP', value: 12.99, items: [hero] } }` |
   | `purchase · Correct` | `{ event: 'purchase', ecommerce: { transaction_id: <T-dddddd>, currency: 'GBP', value: 12.99, items: [hero] } }` |
   | `purchase · 1 · Missing value` | correct minus `value` |
   | `purchase · 2 · Value as text` | correct with `value: '12.99'` (string) |
   | `purchase · 3 · Wrong-case key` | `transaction_ID` instead of `transaction_id` (same value) |
   | `purchase · 4 · Lower-case currency` | `currency: 'gbp'` |
   | `purchase · Spare · Bad transaction ID` | `transaction_id: '12345'` |

   For random ids: read the pushed id, assert it matches `/^T-\d{6}$/`, then substitute it into the expected object and `toEqual` the whole thing. For "Bad transaction ID" the id is the literal `'12345'`.
2. For each button, on `/` and on `/basket/`:
   - `openMenu` (interaction 1), click the button by its accessible name (interaction 2): **NFR-005, 2 interactions**;
   - `after.slice(before.length)` has length exactly **2**; `[0]` deep-equals `{ ecommerce: null }`; `[1]` deep-equals the expected event;
   - the live region (`[role="status"][aria-live="polite"]` from the layout) contains `Pushed ${label}`.
3. Each press leaves the address and the `#scenario-select` value unchanged (R-07).
4. **Button order and count**: the playground has exactly 7 buttons, labels in the table's order.
5. **SC-006 / FR-018**: for each scenario id in the talk script (`correct`, `missing-value`, `value-as-text`, `wrong-case-key`, `lowercase-currency`) plus the spare (`bad-transaction-id`), goto `/?scenario=<id>` and expect `#scenario-select` to have that value, and internal nav links to carry `scenario=<id>`. No push from loading the link.
6. Pressing the same button twice adds exactly 4 entries (no hidden double listener).

---

## Definition of Done

- [ ] Both specs pass in `chromium`.
- [ ] ≥ 10 malformed IDs, each checked in both states.
- [ ] All 7 shapes checked against contract literals.
- [ ] Zero-push assertions for every non-playground menu action.
- [ ] No ID-shaped literal except `GTM-XXXXXXX`; lint and gates pass.
- [ ] `spec-kitty agent tasks mark-status T039 T040 T041 T042 --status done --mission byo-gtm-container-01M64PAZ`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tautological shape checks | Literals from the contract, not imports |
| Thank-you page baseline noise | Use `/`, `/product/`, `/basket/` for push counts |
| Hidden reload missed | Window marker plus URL check |
| A defect found in product code | Report with evidence; don't edit outside `owned_files` |

## Review Guidance

- Cross-check each expected literal against `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`.
- Confirm "exactly 2 entries" is asserted, not "at least".
- Confirm the malformed list is ≥ 10 and built at run time.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
