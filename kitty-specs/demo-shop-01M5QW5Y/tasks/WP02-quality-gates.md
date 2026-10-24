---
work_package_id: WP02
title: Quality gates
dependencies:
- WP01
requirement_refs:
- C-003
- C-005
- FR-018
- FR-019
- FR-020
planning_base_branch: feat/demo-shop
merge_target_branch: feat/demo-shop
branch_strategy: Planning artifacts for this mission were generated on feat/demo-shop. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/demo-shop unless the human explicitly redirects the landing branch.
subtasks:
- T007
- T008
- T009
- T010
- T011
- T012
- T013
phase: Phase 2 - Foundational
history:
- at: '2026-10-24T21:50:34Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: node-norris
authoritative_surface: scripts/
create_intent:
- scripts/gates.ts
- scripts/no-secrets.ts
- scripts/provenance.ts
- scripts/lib/git.ts
- scripts/lib/report.ts
- .githooks/pre-push
- .github/workflows/gates.yml
execution_mode: code_change
model: ''
owned_files:
- scripts/gates.ts
- scripts/no-secrets.ts
- scripts/provenance.ts
- scripts/lib/git.ts
- scripts/lib/report.ts
- .githooks/pre-push
- .github/workflows/gates.yml
- .gitattributes
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP02 – Quality gates

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter (or any user-defined profile), and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
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

Enforce QDR-001, QDR-003 and QDR-004 with **one command** that also runs before every push and in CI (FR-018, FR-019, FR-020; SC-005, SC-006):

- `pnpm gates` runs **lint → build → no-secrets → provenance** in that order, prints `[1/4] lint` … `[4/4] provenance` headers and a final summary line, and exits with the code of the **first** failing gate (later gates do not run), else 0.
- `pnpm gates --pre-push` also scans the commit ranges git passes on stdin; `pnpm gates --ci` uses the GitHub event ranges **and** runs a full-history no-secrets scan.
- No-secrets fails on any GTM container ID (except the exact placeholder `GTM-XXXXXXX`) or secret-like value in tracked files or pushed blobs.
- Provenance fails when the denylist is missing, unreadable or empty. It fails on a term in any tracked file, any blob introduced by the pushed commits or any pushed commit message. **Its output never contains a term or matched text.**
- Each gate is proven able to fail (T013). Nothing used for that proof is committed.

## Context & Constraints

- `kitty-specs/demo-shop-01M5QW5Y/contracts/gates-cli.md`: **the acceptance source** for commands, output formats and the denylist contract.
- `research.md`: R-09 (no-secrets), R-10 (provenance), R-11 (runner, hook, CI), challenges A3/A4/A6.
- `plan.md`: IC-02 risks.
- `AGENTS.md` (from WP01): already records the commands. If behaviour diverges from it, fix the code, not the doc.
- Node 24 runs these `.ts` files directly: **erasable syntax only**, `import type` for types, `.ts` extensions on relative imports, `node:` prefixes for built-ins. No new dependencies; use `node:child_process`, `node:fs`, `node:os`, `node:path` only.
- **Windows is a first-class dev platform** (the Product Owner develops on Windows with Git Bash). Node 24 refuses to `spawn` a `.cmd`/`.bat` file without `shell: true`, and `pnpm` and `eslint` are `.cmd` shims on Windows. See T010.
- **The build gate will fail on this lane** until WP06 adds `vite.config.ts` and pages. Verify gates 3 and 4 individually here. The full green run is WP07/T034. Do not add placeholder pages.
- **Never write a real-looking container ID or secret into a committed file**, including comments and docs. Test fixtures are built at runtime from fragments (`'GTM-' + 'AB12' + 'CD3'`) in scratch files that are deleted afterwards.

## Branch Strategy

- **Strategy**: Planning artifacts were generated on feat/demo-shop; completed changes must merge back into feat/demo-shop.
- **Planning base branch**: feat/demo-shop
- **Merge target branch**: feat/demo-shop
- Execution worktrees are allocated per computed lane from `lanes.json`; start with `spec-kitty agent action implement WP02 --agent claude`.

## Subtasks & Detailed Guidance

### Subtask T007 – `scripts/lib/git.ts` and `scripts/lib/report.ts`

- **Purpose**: Shared, well-tested-by-use helpers so both scanners enumerate content identically.
- **`git.ts` API** (suggested; all synchronous, using `execFileSync('git', args, { encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 })`, since `git` is a real `.exe`, so no shell is needed):
  - `trackedFiles(): string[]`: `git ls-files -z`, split on NUL. Paths are repo-relative. Read contents from the working tree; skip paths that no longer exist on disk (deleted but unstaged).
  - `type Range = readonly string[]`: rev-list arguments, e.g. `['abc123..def456']` or `['def456', '--not', '--remotes']`.
  - `commitsIn(range: Range): string[]`: `git rev-list <range…>`.
  - `introducedBlobs(range: Range): { commit: string; path: string; blob: string }[]`: for each commit, `git diff-tree -r --no-commit-id --root -z --diff-filter=AMRC <sha>`. Parse the `:oldmode newmode oldsha newsha status\0path\0` records (renames and copies carry two paths; take the destination) and keep `newsha`. De-duplicate by blob SHA.
  - `allHistoryBlobs(): { path: string; blob: string }[]`: `git rev-list --all --objects`. Keep only objects whose `git cat-file --batch-check` type is `blob` (one batch call with all SHAs on stdin, not one process per object).
  - `readBlob(sha): Buffer`: `git cat-file blob <sha>`. A `--batch` reader is fine if performance needs it.
  - `commitMessage(sha): string`: `git log -1 --format=%B <sha>`.
  - `isBinary(buf: Buffer): boolean`: true if a NUL byte appears in the first 8000 bytes.
  - `readRangesFromEnv(): Range[]`: parses `QUADRANO_GATE_RANGES` (JSON array of arrays) set by the runner (T010). Returns `[]` if unset.
- **`report.ts` API**:
  - `mask(s: string): string`: first 4 characters kept, the rest replaced by `*` (contract: "keeps the first 4 characters and stars the rest").
  - `finding(gate: 'no-secrets' | 'provenance', text: string): void`: prints to stderr and increments a counter.
  - `finish(gate): never`: prints a one-line summary (`no-secrets: 0 findings` / `provenance: 3 findings`) and exits 1 if any findings, else 0.
- **Files**: `scripts/lib/git.ts`, `scripts/lib/report.ts`.
- **Notes**: Split text with `/\r?\n/` so line numbers are right on CRLF files.

### Subtask T008 – `scripts/no-secrets.ts`

- **Purpose**: FR-019 / QDR-004 / SC-006.
- **Inputs scanned**:
  1. Every tracked file (working tree).
  2. Every blob in `introducedBlobs(range)` for each range in `QUADRANO_GATE_RANGES`.
  3. With `--history`: every blob in `allHistoryBlobs()`. The runner passes this flag in `--ci` mode only.
  Skip binary content. Text is decoded as UTF-8.
- **Patterns** (named; research R-09). Write each regex so its **own source text does not match it** (A4). For example, the GTM pattern's source contains `[`, which `[A-Z0-9]` cannot match. Re-check after writing by running the gate on the repo.
  | Name | Pattern (intent) |
  |---|---|
  | `gtm-container-id` | `\bGTM-[A-Z0-9]{4,10}\b` |
  | `private-key` | a PEM header line: five dashes, `BEGIN`, optional words such as `RSA`/`EC`/`OPENSSH`, `PRIVATE KEY`, five dashes |
  | `aws-access-key-id` | `\b(AKIA|ASIA)[A-Z0-9]{16}\b` |
  | `cloudflare-token-like` | `\b[A-Za-z0-9_-]{40}\b` **only when the same line also matches** `/\b(token|key|secret)s?\b/i` |
  | `generic-assignment` | `(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}['"]`, case-insensitive |
- **Allowlist**: the **exact** match text `GTM-XXXXXXX` (documentation placeholder) is ignored for `gtm-container-id`. No other allowlist, no path-based exclusions.
- **Output**: one line per finding, exactly `no-secrets: <location>:<line> <pattern-name> (<masked>)`, where `<location>` is the path for tracked files and `<sha7>:<path>` for blobs. `<masked>` is `mask(match)`. Then `finish('no-secrets')`.
- **Edge cases**:
  - The same content found as a tracked file and as a blob: report both (different locations); that is fine.
  - `pnpm-lock.yaml` integrity hashes: confirm they do not trip `cloudflare-token-like`. They should not, because the keyword must be a whole word on the same line. If they do, tighten the keyword rule; do not exclude the file.
  - Pinned action SHAs in `gates.yml` are 40 hex characters. Keep `token`/`key`/`secret` off those lines (T012).
- **Validation**: `node scripts/no-secrets.ts` on the current repo prints `no-secrets: 0 findings` and exits 0. The spec and research files contain `GTM-XXXXXXX` four times, all allowlisted.

### Subtask T009 – `scripts/provenance.ts`

- **Purpose**: FR-020 / QDR-001. Prior ventures are never named in commits, code, docs or Spec Kitty artefacts.
- **Denylist** (contract): path from `QUADRANO_DENYLIST_PATH`, else `path.join(os.homedir(), '.quadrano', 'provenance-denylist.txt')`. UTF-8, one term per line, lines starting with `#` (after trim) are comments, blank lines ignored. Terms are trimmed and lower-cased; matching is **case-insensitive substring**.
- **Fail closed** with fixed messages that contain no path content beyond the variable name:
  - missing or unreadable → `provenance: denylist not found or unreadable (set QUADRANO_DENYLIST_PATH)` → exit 1
  - no terms → `provenance: denylist has no terms` → exit 1
- **Inputs scanned**: tracked files; blobs introduced by each range in `QUADRANO_GATE_RANGES`; **messages** of every commit in those ranges. In the no-range case (plain `pnpm gates`), scan tracked files only. Also scan the message of `HEAD`, which is cheap and catches local amends.
- **Output** (contract, exact): `provenance: <path>:<line> matches denylist term #<n>` / `provenance: <sha7>:<path>:<line> matches denylist term #<n>` for blobs / `provenance: commit <sha7> message matches denylist term #<n>`. `<n>` is the 1-based index among **terms** (not file lines). **Never print the term, the line or any excerpt.**
- **Leak-proofing (A3)**:
  - Wrap the whole `main` in `try/catch`. On any unexpected error print only `provenance: internal error` and exit 2. Do not print `err.message` or the stack, which could contain file content.
  - Read blobs yourself with `git.ts`; never shell out to `git grep` (its stderr or stdout could echo content).
  - Do not log the denylist path's contents, the term count per term, or anything derived from a term other than its index.
- **Performance**: for each line, lower-case once and test each term with `includes`. That is fine at this repo's size.
- **Validation**: with a scratch denylist containing a term that appears nowhere (e.g. a random UUID), the gate prints `provenance: 0 findings` and exits 0.

### Subtask T010 – `scripts/gates.ts` runner

- **Purpose**: FR-018: one command, fixed order, stop at first failure.
- **Behaviour**:
  1. Parse flags: `--pre-push`, `--ci` (mutually exclusive; error if both).
  2. Compute ranges:
     - `--pre-push`: read **all of stdin** (git sends lines `<local ref> <local sha> <remote ref> <remote sha>`). For each line: if local sha is all zeros (branch deletion), skip. If remote sha is all zeros (new branch), use `[localSha, '--not', '--remotes']`. Otherwise use `[`${remoteSha}..${localSha}`]`.
     - `--ci`: read `GITHUB_EVENT_NAME` and the JSON at `GITHUB_EVENT_PATH`. On `push`, use `before..after`. If `before` is all zeros (new branch), use `[after, '--not', 'origin/' + repository.default_branch]`; if that yields nothing, the history scan still covers it. On `pull_request`, use `pull_request.base.sha..pull_request.head.sha`. Otherwise use no ranges.
     - Neither flag: no ranges.
     Pass ranges to child gates as `QUADRANO_GATE_RANGES=<JSON>` in the env.
  3. Run in order, printing `[n/4] <name>` before each:
     - `[1/4] lint` → `pnpm run lint`
     - `[2/4] build` → `pnpm run build`
     - `[3/4] no-secrets` → `process.execPath scripts/no-secrets.ts` (+ `--history` when `--ci`)
     - `[4/4] provenance` → `process.execPath scripts/provenance.ts`
     Use `spawnSync(cmd, args, { stdio: 'inherit', env })`. For `pnpm`, pass `shell: process.platform === 'win32'`, since Node 24 throws `EINVAL` when spawning `.cmd` without a shell. Run the two scanners with `process.execPath` directly (no shell, works everywhere).
  4. On the first non-zero status (or a spawn `error`), print `gates: failed at <name>` and exit with that status (use 1 if null). Otherwise print `gates: all 4 passed`.
- **Notes**: Runner output is not shop output, so `no-console` does not apply to `scripts/`. Keep messages factual. Don't re-read stdin in children; the runner passes ranges by env.
- **Files**: `scripts/gates.ts`.

### Subtask T011 – `.githooks/pre-push` and LF attribute

- **Steps**:
  1. Create `.githooks/pre-push`:
     ```sh
     #!/bin/sh
     # Runs the four gates before every push (QDR-003). Do not bypass with --no-verify.
     exec pnpm gates --pre-push
     ```
     stdin is inherited by `exec`, so git's ref lines reach the runner.
  2. Mark executable in the index: `git add .githooks/pre-push && git update-index --chmod=+x .githooks/pre-push`.
  3. **Append** to `.gitattributes` (keep every existing Spec Kitty line untouched):
     ```gitattributes
     # Git hooks must keep LF endings or sh fails on Windows checkouts
     .githooks/* text eol=lf
     ```
  4. Confirm `git config --get core.hooksPath` is `.githooks` (set by WP01's `prepare`; run `pnpm install` if not).
- **Validation**: `git push --dry-run` is not enough because hooks don't run on dry runs. Instead pipe a synthetic line: `echo "refs/heads/x $(git rev-parse HEAD) refs/heads/x 0000000000000000000000000000000000000000" | sh .githooks/pre-push` and confirm the runner starts with ranges. The run fails at build on this lane, which is expected.

### Subtask T012 – `.github/workflows/gates.yml`

- **Steps**: Create the workflow per contract:
  ```yaml
  name: gates
  on:
    push:
    pull_request:
  permissions:
    contents: read
  jobs:
    gates:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@<full-sha> # vX.Y.Z
          with:
            fetch-depth: 0
        - uses: pnpm/action-setup@<full-sha> # vX.Y.Z  (reads packageManager; do NOT also pass `version`)
        - uses: actions/setup-node@<full-sha> # vX.Y.Z
          with:
            node-version-file: .node-version
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - name: Write provenance denylist
          env:
            PROVENANCE_DENYLIST: ${{ secrets.PROVENANCE_DENYLIST }}
          run: |
            printf '%s\n' "$PROVENANCE_DENYLIST" > "$RUNNER_TEMP/denylist.txt"
            echo "QUADRANO_DENYLIST_PATH=$RUNNER_TEMP/denylist.txt" >> "$GITHUB_ENV"
        - run: pnpm gates --ci
  ```
- **Pinning**: look up the **current release** SHA of each action yourself (`git ls-remote https://github.com/actions/checkout refs/tags/v*` or the GitHub releases page) and put the tag in a trailing comment. Never guess a SHA. Name the job `gates`, because branch protection requires that check name (quickstart Deploy step 4).
- **Notes**:
  - If the secret is absent, the denylist file is empty and the provenance gate fails. That is fail-closed by design; the Product Owner adds the secret in WP07.
  - Keep the words `token`, `key` and `secret` off lines that hold a 40-character SHA, so no-secrets' `cloudflare-token-like` rule can't trip. The `secrets.` expression lives on its own line, away from the SHAs.

### Subtask T013 – Prove every gate can fail

- **Purpose**: Charter: "a check that can never fail is removed." Record evidence for review.
- **Procedure** (work on a scratch branch or just the working tree; **commit nothing from this subtask**):
  1. **lint**: add `console.log(1)` to a scratch `site/src/__probe.ts`; `pnpm run lint` fails; delete it.
  2. **build**: put a type error in a scratch `scripts/__probe.ts` (`const n: number = 'x';`); `pnpm run build` fails at `tsc`; delete it. (On this lane build also fails for lack of pages; the type error must show in the output.)
  3. **no-secrets (tracked)**: write a scratch file whose content is generated at runtime, e.g. `node -e "require('fs').writeFileSync('probe.txt', 'id ' + 'GTM-' + 'AB12' + 'CD3')"`, then `git add probe.txt`, and run `node scripts/no-secrets.ts`. Expect `no-secrets: probe.txt:1 gtm-container-id (GTM-*******)` and exit 1. Then `git rm --cached -f probe.txt`. Repeat once with a generic assignment of a 16-character value built the same way.
  4. **no-secrets (range)**: make a throwaway commit on a scratch branch containing the probe, set `QUADRANO_GATE_RANGES='[["HEAD~1..HEAD"]]'`, and confirm the blob finding uses the `<sha7>:<path>:<line>` form. Then delete the scratch branch (`git branch -D`). **Never push it.**
  5. **provenance**: create a temp denylist outside the repo with one comment line and the term `zebrafinch-probe`; stage a scratch file containing `ZebraFinch-Probe`. Run with `QUADRANO_DENYLIST_PATH` set. Expect `… matches denylist term #1`, and check that the output **does not contain** `zebrafinch` in any case (`… 2>&1 | grep -i zebrafinch` must print nothing). Repeat with a missing path and with a file holding only comments, and confirm both fixed failure messages. Test a commit-message hit with a scratch commit on a scratch branch, then delete the branch.
  6. **runner stop-at-first-failure**: with the lint probe present, `pnpm gates` prints `[1/4] lint`, then `gates: failed at lint`, and does **not** print `[2/4]`.
- **Record** each command and its observed exit code and output line, with the probe term redacted, in the Activity Log.

## Definition of Done

- [ ] All files in `owned_files` exist; `.gitattributes` gained only the hook line.
- [ ] `node scripts/no-secrets.ts` and `node scripts/provenance.ts` (with a real denylist) both exit 0 on the repo.
- [ ] T013 evidence recorded for all four gates plus the runner's stop-at-first-failure.
- [ ] Provenance output proven term-free.
- [ ] Workflow actions pinned by full SHA with tag comments; `permissions: contents: read`; `fetch-depth: 0`.
- [ ] `pnpm lint` and `pnpm exec tsc --noEmit` pass (the scripts are type-checked under WP01's tsconfig).
- [ ] No probe files, scratch branches or fixtures remain; `git log` on the lane shows no probe commits.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Term leak via error messages | Catch-all with fixed message; never print `err` |
| Regex matches its own source or docs | Character-class trick; run the gate on the repo after writing |
| `.cmd` spawn `EINVAL` on Windows | `shell: true` only for `pnpm` on win32; `process.execPath` for scanners |
| Hook gets CRLF on Windows checkout | `.gitattributes` `eol=lf` line |
| Pushing a new branch rescans everything already on the remote | `--not --remotes` excludes commits already known remotely |
| History scan slow | Batch `cat-file`; only in `--ci` |

## Review Guidance

- Compare output formats with `contracts/gates-cli.md` exactly.
- Re-run T013 step 5 yourself and grep the output for the term.
- Read `provenance.ts` for any path where `err`, a line or a term could reach stdout or stderr.
- Confirm the `GTM-XXXXXXX` allowlist is an exact-string comparison, not a prefix or regex.
- Charter checklist items 3 and 4.

## Activity Log

> Entries in chronological order (oldest first). Append only. Format: `- YYYY-MM-DDTHH:MM:SSZ – <agent_id> – <action>`.

- 2026-10-24T21:50:34Z – system – Prompt created.
