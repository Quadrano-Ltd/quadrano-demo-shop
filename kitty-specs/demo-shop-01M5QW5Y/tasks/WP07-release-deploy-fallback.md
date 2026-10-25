---
work_package_id: WP07
title: Release checks, deploy and local fallback
dependencies:
- WP02
- WP06
requirement_refs:
- C-002
- C-003
- FR-018
- FR-021
- FR-022
- NFR-001
- NFR-004
- NFR-005
planning_base_branch: feat/demo-shop
merge_target_branch: feat/demo-shop
branch_strategy: Planning artifacts for this mission were generated on feat/demo-shop. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/demo-shop unless the human explicitly redirects the landing branch.
subtasks:
- T034
- T035
- T036
- T037
- T038
phase: Phase 4 - Release and rehearsal
history:
- at: '2026-10-24T21:50:34Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: docs/release-checks.md
create_intent:
- docs/release-checks.md
execution_mode: code_change
model: ''
owned_files:
- README.md
- docs/release-checks.md
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP07 – Release checks, deploy and local fallback

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter (or any user-defined profile), and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission demo-shop-01M5QW5Y`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

Turn the merged shop into something that is **live, gated and safe to rehearse** (US4):

- `pnpm gates` exits 0 on the fully merged tree (WP01–WP06), and the GitHub Actions `gates` job is green (FR-018, SC-005).
- `demo.quadrano.com` serves the shop from Cloudflare Pages' Git integration. The GTM container ID comes **only** from the Pages build variable, and the built pages carry the snippet (FR-021, C-002, C-003, US4 scenario 4).
- A local build serves every page and scenario with **no network** (FR-022, US4 scenario 5).
- NFR-001 (LCP ≤ 2 s, Lighthouse mobile, Slow 4G), NFR-004 (no other origins), NFR-005 (keyboard + focus) and FR-017 (no shop Console output) are each checked and the result recorded.
- `README.md` gives the presenter a one-page runbook. `docs/release-checks.md` holds dated evidence for every check above.

## ⚠️ Human-in-the-loop steps

Several steps are **Product Owner actions** in external dashboards (quickstart "Deploy" 1–4). They are outward-facing and need the PO's accounts. **Do not attempt them yourself** and do not ask for credentials. Prepare a precise checklist, hand it to the PO, wait for confirmation, then verify.

| Step | Who | Where |
|---|---|---|
| Create Pages project (repo, production branch `main`, build `pnpm build`, output `dist`) | Product Owner | Cloudflare dashboard |
| Set `VITE_GTM_CONTAINER_ID` (Production, encrypted) | Product Owner | Cloudflare Pages → Settings → Variables |
| Custom domain `demo.quadrano.com` | Product Owner | Cloudflare Pages → Custom domains |
| `PROVENANCE_DENYLIST` repository secret | Product Owner | GitHub → Settings → Secrets → Actions |
| Branch protection on `main` requiring check `gates` | Product Owner | GitHub → Settings → Branches |
| Merge `feat/demo-shop` → `main` by PR | Product Owner (or implementer with explicit PO go-ahead) | GitHub |

Production builds from `main` only, so the first production deploy happens after the mission branch reaches `main` by PR with green gates (decision `…5JXSCJ`). If the PO prefers to verify on a **preview** deploy of `feat/demo-shop` first, that is fine (research R-02 note).

## Context & Constraints

- `quickstart.md`: Deploy, Local fallback, Pre-rehearsal check (setup row).
- `research.md`: R-01, R-02, A2, A7 (esbuild postinstall), supply-chain table (Node 24, do not switch to 26 before the talk).
- `contracts/gates-cli.md`: CI expectations.
- `spec.md`: US4 acceptance 1–5; NFR-001, NFR-004, NFR-005; SC-005, SC-006.
- **Do not write the real container ID anywhere**: not in `docs/release-checks.md`, the README, the Activity Log or commit messages. Refer to it as "the production container ID". When quoting built HTML as evidence, redact the ID (e.g. `GTM-*******`).
- **Out-of-map edits allowed with a one-line rationale** in the Activity Log: if the first Cloudflare build proves `esbuild` needs its postinstall, add it to `onlyBuiltDependencies` in `pnpm-workspace.yaml` and note it in `AGENTS.md` (both owned by WP01). If it needs a Cloudflare-specific pnpm hint, document it in `AGENTS.md`. Keep such edits minimal.
- If a gate fails on the merged tree because of another WP's code, fix it minimally, record the rationale and notify via the Activity Log. If it would take more than a small change, stop and raise it (QDR-006).

## Branch Strategy

- **Strategy**: Planning artifacts were generated on feat/demo-shop; completed changes must merge back into feat/demo-shop.
- **Planning base branch**: feat/demo-shop
- **Merge target branch**: feat/demo-shop
- Execution worktrees are allocated per computed lane from `lanes.json`; start with `spec-kitty agent action implement WP07 --agent claude`.

## Subtasks & Detailed Guidance

### Subtask T034 – Full gate run on the merged tree, CI first green run

- **Steps**:
  1. In the WP07 workspace (which contains WP01–WP06), run `pnpm install --frozen-lockfile`, then `pnpm gates` with a real local denylist (`~/.quadrano/provenance-denylist.txt` or `QUADRANO_DENYLIST_PATH`). Expect `[1/4]` … `[4/4]` and `gates: all 4 passed`.
  2. `pnpm verify:scenarios` → exit 0.
  3. Confirm `git config --get core.hooksPath` is `.githooks`, and that a real push of the mission branch runs the hook. Push only if the PO has agreed that pushes are happening now; otherwise simulate with the synthetic stdin line from WP02/T011.
  4. Once pushed (by the PO or with their go-ahead), check the Actions run for `gates`: green, `fetch-depth: 0` honoured, and the `--ci` history scan ran (look for the no-secrets summary). If the denylist secret isn't set yet, the run **fails at provenance by design**; record that and re-run after the PO adds it.
  5. Record command, date, exit code and a CI run link in `docs/release-checks.md`.
- **Evidence for SC-006**: the `--ci` full-history no-secrets scan passing is the proof that no container ID or secret is anywhere in history.

### Subtask T035 – Production deploy and first-deploy verification

- **Steps**:
  1. Give the PO the checklist above (copy into the WP Activity Log, then wait).
  2. After the first Pages build, read the **build log** and record:
     - Node major is 24 (Cloudflare reads `.node-version`; if not, the PO sets `NODE_VERSION` in Pages variables, and you document it in `AGENTS.md`).
     - pnpm is the pinned 10.x (from `packageManager`; if Cloudflare uses another version, the PO sets `PNPM_VERSION`, and you document it).
     - No "ignored build scripts" / blocked postinstall error for esbuild (A7). If there is one, follow the out-of-map rule above.
     - The build does **not** print the `VITE_GTM_CONTAINER_ID … without GTM` warning in Production. If it does, the variable isn't set for that environment.
  3. Open `https://demo.quadrano.com/` and the other four paths (`/product/?id=SKU-1001`, `/basket/`, `/checkout/`, `/thank-you/`):
     - View source → the inline data layer script comes first, then the GTM snippet with the production ID (redact in evidence).
     - Tag Assistant / GTM Preview connects to the container (US1 acceptance 3: events appear even without the Quadrano tag).
     - An add to basket and an order show `add_to_cart` and `purchase` in GTM Preview.
  4. Record results (redacted) in `docs/release-checks.md`.
- **Notes**: Preview deploys may build before CI completes. That is acceptable (A2), because previews are not production.

### Subtask T036 – Local fallback with no network

- **Steps**:
  1. `pnpm build && pnpm preview` (quickstart "Local fallback"), then disconnect the network (Wi-Fi off, or DevTools "Offline" **after** first load is not enough: test with the OS network off, then reload).
  2. Walk every page and every scenario: listing, product (hero and one other id), add to basket, basket, checkout with each of the six scenarios, Place order, thank-you, Order again. Check `window.dataLayer` holds the expected shop pushes each time (compare with `contracts/datalayer-pushes.md`).
  3. Confirm nothing in the shop errors when GTM can't load: no uncaught exceptions in the Console from shop code (spec edge cases).
  4. Note in the runbook that GTM and Quadrano only load if their origins are reachable, so on-stage verdicts need network or a locally served GTM (US4 scenario 5 wording).
  5. Record date, machine, browser version and result in `docs/release-checks.md`.
- **Parallel?**: Yes, while waiting for the PO's deploy steps.

### Subtask T037 – NFR sweep

- **NFR-001 page speed**: Chrome DevTools → Lighthouse, mode Navigation, device Mobile, default simulated throttling (Slow 4G), against the production URL (or `pnpm preview` if production isn't up yet; note which). Record LCP for each of the five pages. Target LCP ≤ 2 s on every page. Do not substitute the Performance panel or another throttling profile. Also record total JS and CSS transferred per page.
- **NFR-004 no extra network**: DevTools Network panel, "Preserve log" on for this check only, over a full talk-script run (quickstart rows 1–9). Filter by domain. **Allowed**: own origin; `www.googletagmanager.com`, and anything GTM itself loads, which is excluded by the NFR wording. Shop code must make **0** requests to any other origin. Export or screenshot the domain list as evidence.
- **NFR-005 keyboard**: Tab through each page. Every link and control (nav, switcher `<select>`, Add to basket, Remove, Go to checkout, Place order, Order again, Continue shopping) is reachable and operable, with a visible focus ring. Record pass or fail per control as a table.
- **FR-017 no shop output**: with GTM **not** loaded (no ID or blocked), run the whole flow with the Console open and "Verbose" on. **Zero** messages originate from shop code, and page text contains no verdict wording (✓ ✗ ⚠, pass/fail/valid/invalid). SC-002 (no verdicts without the snippet) is re-checked in WP08 with GTM installed.
- **Parallel?**: Yes.
- Record everything in `docs/release-checks.md`.

### Subtask T038 – `README.md` presenter runbook and `docs/release-checks.md`

- **`README.md`** (replace the current two-line file; keep the one-line description at the top):
  1. What it is (two sentences): a fictional static shop whose data layer pushes, correct and deliberately broken, are validated live by Quadrano. The shop pushes data and never judges it.
  2. **Run locally**: prerequisites (Node 24, `corepack enable`, denylist location), `pnpm install`, `pnpm dev`, `pnpm gates`, `pnpm verify:scenarios`. Point to `AGENTS.md` for tooling detail. Don't duplicate the command table; link it.
  3. **Talk bookmarks**: the table from `contracts/scenario-url.md` with full `https://demo.quadrano.com/…` links, plus the six checkout links `…/checkout/?scenario=<id>`.
  4. **Stage loop**: Product → Add to basket → Checkout → Place order → (thank-you) → Order again → pick scenario → Place order … with the expected Console group per scenario. Link `contracts/datalayer-pushes.md` rather than duplicating it.
  5. **Before going on stage**: Chrome, DevTools Console open, **"Preserve log" off** (R-03), Tag Assistant connected, the "Demo Shop" Specification's tag in the container.
  6. **Venue network fails**: `pnpm build && pnpm preview`; what works and what doesn't.
  7. **Deploy**: one paragraph. Cloudflare Pages Git integration from `main`; the container ID is only in Pages variables; `main` changes only by PR with green gates.
  - No container IDs, no secrets, no denylist terms, no prior-venture names (QDR-001).
- **`docs/release-checks.md`**: one dated section per check (T034–T037), each with: what was checked, how, environment (browser and version, URL), result, and evidence (redacted output, link or screenshot filename). Write it so the Product Owner can sign it off.

## Definition of Done

- [ ] `pnpm gates` green on the merged tree; CI `gates` green (with the denylist secret in place).
- [ ] `demo.quadrano.com` serves all five pages with GTM from the production variable; GTM Preview shows both events.
- [ ] First-deploy log checks recorded (Node 24, pnpm 10, no blocked postinstall, no missing-ID warning).
- [ ] Offline local fallback walked for every page and scenario.
- [ ] NFR-001, NFR-004, NFR-005 and FR-017 recorded with results.
- [ ] `README.md` runbook and `docs/release-checks.md` committed; no IDs or secrets in either.
- [ ] Any out-of-map edit (e.g. `onlyBuiltDependencies`) recorded with a one-line rationale.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cloudflare uses a different Node or pnpm | Check the log; `NODE_VERSION` / `PNPM_VERSION` variables set by the PO; documented |
| esbuild postinstall blocked on Cloudflare | Allow `esbuild` explicitly (A7), recorded |
| Denylist secret missing → CI red | Expected fail-closed; the PO adds the secret; re-run |
| Real ID leaks into evidence | Always redact; the no-secrets gate also scans `docs/` |
| Production built from ungated commit | Branch protection requiring `gates` (PO step) |

## Review Guidance

- Open `demo.quadrano.com` and view source on two pages.
- Confirm `docs/release-checks.md` has dated entries for every check, and that IDs are redacted.
- Run `pnpm gates` on the merged tree.
- Confirm the README tells the presenter to turn "Preserve log" **off**.

## Activity Log

> Entries in chronological order (oldest first). Append only. Format: `- YYYY-MM-DDTHH:MM:SSZ – <agent_id> – <action>`.

- 2026-10-24T21:50:34Z – system – Prompt created.
