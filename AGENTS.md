# AGENTS.md

Tooling and conventions for the Quadrano demo shop. Fixed at specification time (C-009); anything new needs a Charter amendment (QDR-002/QDR-007).

## Stack

- **Runtime**: Node 24 LTS, pinned by `.node-version` (`24.15.0`); `engines` is `>=24 <25`.
- **Package manager**: pnpm 10, pinned by `packageManager` (`pnpm@10.34.7`).
- **Build**: Vite multi-page static site; Vite root `site/`, output `dist/`.
- **TypeScript**: erasable-only syntax, run directly by Node 24 for gate scripts. `tsconfig.json` enforces `erasableSyntaxOnly`, `verbatimModuleSyntax` and `.ts` import extensions.
- **Lint**: ESLint flat config (`eslint.config.js`) with `@eslint/js` recommended and `typescript-eslint` recommended-type-checked, plus the shop rules from research R-08.

Dev dependencies (from `pnpm-lock.yaml`):

| Package | Version |
|---|---|
| `vite` | 8.3.4 |
| `typescript` | 5.9.3 |
| `eslint` | 10.13.0 |
| `@eslint/js` | 10.0.1 |
| `typescript-eslint` | 8.71.2 |
| `@types/node` | 24.19.2 |

There are no runtime dependencies. Anything new needs a Charter amendment (QDR-002/QDR-007). Decisions: `DM-01M5QXTQXTG6ASW9E96GQM6ARX` (supporting dev dependencies) and `DM-01M5QYJ3YM1435E0GJEG301ZF4` (`@types/node` as a type-only dev dependency).

## Commands

| Command | Does | Exit |
|---|---|---|
| `pnpm dev` | starts the Vite dev server | — |
| `pnpm lint` | `eslint .` | non-zero on any error |
| `pnpm build` | `tsc --noEmit && vite build` | non-zero on a type or build error. A missing GTM ID is a warning, not an error |
| `pnpm gates` | lint → build → no-secrets → provenance; stops at the first failure | code of the first failing gate, else 0 |
| `pnpm gates --pre-push` | as above, and the no-secrets/provenance scan also covers the ranges git passes on stdin | same |
| `pnpm gates --ci` | as above, using the GitHub event ranges, plus a full-history no-secrets scan | same |
| `pnpm verify:scenarios` | FR-012 invariants (not a gate) | non-zero on any violation |
| `pnpm preview` | serves `dist/` locally (FR-022) | — |

## Gates

Order: lint → build → no-secrets → provenance, stopping at the first failure (QDR-003). `pnpm install` runs `prepare`, which sets `git config core.hooksPath .githooks`; `.githooks/pre-push` runs `pnpm gates --pre-push` and refuses the push on a non-zero exit. Never skip with `--no-verify`. CI runs in `.github/workflows/gates.yml`.

## Secrets and IDs

The GTM container ID exists only as the Cloudflare Pages build variable `VITE_GTM_CONTAINER_ID`. For local runs, use a gitignored `.env.local`. The only container-ID-shaped string allowed in the repo is the documentation placeholder `GTM-XXXXXXX`.

## Provenance denylist

Location: `QUADRANO_DENYLIST_PATH`, else `~/.quadrano/provenance-denylist.txt`. It is never in the repo, and the provenance gate fails without it. In CI it comes from the `QUADRANO_PROVENANCE_DENYLIST` repository secret.

## Supply chain

`minimumReleaseAge: 10080` (7 days) and `onlyBuiltDependencies: []` in `pnpm-workspace.yaml`. The lockfile is committed and CI installs with `--frozen-lockfile`. GitHub Actions are pinned by SHA. `typescript` is pinned to `^5.9.3` (not 7.x) because `typescript-eslint` 8.71.2 supports TypeScript `<6.1.0`.

## Deploy

Cloudflare Pages Git integration. Production branch `main`, build command `pnpm build`, output directory `dist`. `main` changes only by pull request with the gates check green (decision `DM-01M5QXTNC6EKYRJP56QZ5JXSCJ`). Pages project `quadrano-demo-shop` (`quadrano-demo-shop.pages.dev`), custom domain `demo.quadrano.com`; every other branch gets a preview deploy. The project, its variables and its domain are managed through the Cloudflare API with a `wrangler login` session, not the dashboard. `VITE_GTM_CONTAINER_ID` is a plain-text variable for Production and Preview: the ID is public in every served page. It is kept out of the repo so the no-secrets gate stays strict, not because it is secret.

## Code rules

- Relative imports carry the `.ts` extension; erasable syntax only (no `enum`, no `namespace`, no parameter properties).
- Only `site/src/datalayer/push.ts` touches `dataLayer` (FR-016, enforced by lint).
- No Console output and no verdict wording in `site/` (FR-017, enforced by lint).
- No network requests from shop code beyond the site's own assets and GTM (NFR-004, enforced by lint).
- Terminology Canon: use "Attribute" for a key in a pushed event; never "parameter", "property" or "field" for domain concepts.
