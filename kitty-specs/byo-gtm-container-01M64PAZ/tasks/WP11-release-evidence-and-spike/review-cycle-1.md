---
affected_files: []
cycle_number: 1
mission_slug: byo-gtm-container-01M64PAZ
reproduction_command:
reviewed_at: '2026-10-30T00:04:34Z'
reviewer_agent: copilot
wp_id: WP11
---

**Issue 1 (blocking): `pnpm gates` fails — WP11's own deliverable trips the no-secrets gate.**

`docs/release-checks.md` line 227 contains the literal string `GTM-XXXX` when explaining the historical false positives. The scanner's `gtm-container-id` pattern (`\bGTM-[A-Z0-9]{4,10}\b`) matches it, and it is not the allowlisted `GTM-XXXXXXX`, so the working-tree scan reports:

```
no-secrets: docs/release-checks.md:227 gtm-container-id (GTM-****)
no-secrets: 1 findings
gates: failed at no-secrets
```

I independently re-ran `pnpm gates` in the `byo-gtm-container-01M64PAZ-lane-j` worktree: it exits 1 at `[3/4] no-secrets`. (`pnpm lint` and `pnpm build` each exit 0.) This contradicts the T047 results table's claim of `gates: all 4 passed (exit 0)` and violates the Definition of Done ("No unredacted IDs in docs or images; `pnpm gates` passes") and QDR-004 (no secrets in the repo).

How to fix: rewrite the sentence so the four-X placeholder is never written literally (e.g. describe it as "a four-character `GTM-` placeholder ending in four Xs", or use the masked form `GTM-****` which the pattern does not match). Then re-run `pnpm gates` and update the T047 results table with the observed exit codes — it must show `no-secrets: 0 findings` / `gates: all 4 passed` only if it is actually green.

**Issue 2 (minor, non-blocking): spike run 2 pending has no planned date.**

The DoD for T049 says spike run 2 is "recorded with redacted screenshots, or explicitly pending with the date the Product Owner plans to run it." The spike doc marks run 2 pending but gives no planned date. Restate the C-006 deadline (Thu 19 Nov 2026) or a PO-agreed target date in `docs/spike/preview-spike.md` / `docs/release-checks.md` so the open item has a date anchor.
