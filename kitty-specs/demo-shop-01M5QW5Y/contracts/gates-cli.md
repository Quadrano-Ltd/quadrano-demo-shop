# Contract: Gate runner, hook and CI

## Commands (recorded verbatim in `AGENTS.md`, FR-023)

| Command | Does | Exit |
|---|---|---|
| `pnpm lint` | `eslint .` | non-zero on any error |
| `pnpm build` | `tsc --noEmit && vite build` | non-zero on a type or build error. A missing GTM ID is a warning, not an error |
| `pnpm gates` | lint → build → no-secrets → provenance; stops at the first failure | code of the first failing gate, else 0 |
| `pnpm gates --pre-push` | as above, and the no-secrets/provenance scan also covers the ranges git passes on stdin | same |
| `pnpm gates --ci` | as above, using the GitHub event ranges, plus a full-history no-secrets scan | same |
| `pnpm verify:scenarios` | FR-012 invariants (not a gate) | non-zero on any violation |
| `pnpm preview` | serves `dist/` locally (FR-022) | — |

The runner prints one header per gate (`[1/4] lint`, …) and a final summary line.

## Hook

`pnpm install` runs `prepare`, which sets `git config core.hooksPath .githooks`. `.githooks/pre-push` runs `pnpm gates --pre-push` with git's stdin, and a non-zero exit refuses the push. Do not skip it with `--no-verify`.

## CI (`.github/workflows/gates.yml`)

- Triggers: `push` (all branches) and `pull_request`.
- `permissions: contents: read`. Actions are pinned by SHA.
- Checkout uses `fetch-depth: 0`. Node comes from `.node-version`. pnpm is installed with `--frozen-lockfile`.
- `PROVENANCE_DENYLIST` (repository secret) is written to `$RUNNER_TEMP/denylist.txt`, and `QUADRANO_DENYLIST_PATH` is exported.
- `pnpm gates --ci`.
- Branch protection on `main` requires this check.

## Provenance denylist

| Aspect | Contract |
|---|---|
| Location | `QUADRANO_DENYLIST_PATH`, else `~/.quadrano/provenance-denylist.txt`. Never in the repo. |
| Format | UTF-8, one term per line, `#` comments, blank lines ignored, case-insensitive matching |
| Missing / unreadable / no terms | the gate **fails** with a fixed message |
| Output on a match | `provenance: <path>:<line> matches denylist term #<n>` or `provenance: commit <sha7> message matches denylist term #<n>`. Never the term or the matched text |

## No-secrets findings

`no-secrets: <path>:<line> <pattern-name> (<masked>)`, where `<masked>` keeps the first 4 characters and stars the rest. The exact allowlist is `GTM-XXXXXXX`.
