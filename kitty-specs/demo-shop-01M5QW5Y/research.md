# Research: Demo Shop

Phase 0 output for `demo-shop-01M5QW5Y`. Each entry gives the decision, the rationale and the alternatives considered. No `[NEEDS CLARIFICATION]` remains.

## R-01 — GTM container ID injection (DM `01M5QXTJSS08GV3TDMWA59QCGY`)

- **Decision**: A Vite plugin in `vite.config.ts` reads `VITE_GTM_CONTAINER_ID` through `loadEnv` and uses `transformIndexHtml` to inject the standard GTM head script and `<noscript>` iframe after the inline data layer script. The value must match `^GTM-[A-Z0-9]{4,10}$`. If it is missing or invalid, the build still succeeds, prints a warning naming the variable (never a value), and emits pages with no GTM tag.
- **Rationale**: The shop stays purely static, and the ID only ever exists in the Cloudflare Pages build environment and the built `dist/` (which is gitignored). The ID is public in served HTML anyway; QDR-004 is about keeping it out of the repo.
- **Alternatives**: A per-request Pages Function was rejected because it adds server code, which sits poorly with "no backend". A `.env` file in the repo was rejected because it breaks QDR-004. A `.env.local` file for local runs is allowed, but `.gitignore` must cover `.env*`.

## R-02 — Deploy pipeline (DM `01M5QXTNC6EKYRJP56QZ5JXSCJ`)

- **Decision**: Cloudflare Pages Git integration on the repo. The production branch is `main`, the build command is `pnpm build`, and the output is `dist`. `VITE_GTM_CONTAINER_ID` is set for Production, and set or left empty for Preview as the Product Owner prefers. GitHub Actions runs `pnpm gates` on every push and pull request. `main` changes only by PR with green gates, under branch protection with "Require status checks".
- **Rationale**: There is no Cloudflare API token in GitHub and no wrangler dependency. Branch protection on `main` stops production from being built from an ungated commit.
- **Alternatives**: Actions plus wrangler direct upload was rejected because it needs a token secret and an extra dependency. Running gates in Cloudflare's build was rejected because the provenance denylist must not be given to Cloudflare.
- **Note**: Feature-branch preview deploys may build before CI finishes. They are not production, which is acceptable.

## R-03 — When `purchase` is pushed

- **Decision**: "Place order" on checkout saves an Order (items, total, `transaction_id`, scenario, `pushed: false`) to sessionStorage and goes to `/thank-you/?scenario=…`. The thank-you page pushes `{ecommerce:null}` then `purchase` once, and sets `pushed: true`. A reload, or back then forward, does not push again. The thank-you page with no unpushed order shows a neutral "no recent order" state with no push.
- **Rationale**: Chrome clears the Console on navigation unless "Preserve log" is on. If the click pushed and then navigated, the verdict would flash and disappear on stage. Pushing on the confirmation page is also normal GA4 practice and looks plausible in Tag Assistant. Quadrano replays pushes made before GTM loads (contract G-10).
- **Alternatives**: Push on click and then navigate was rejected because the Console would be lost. Showing the thank-you state on the checkout page was rejected because the spec wants a thank-you page.

## R-04 — Scenario state

- **Decision**: The scenario is held in the query parameter `scenario` and nowhere else. The control writes it with `history.pushState` and listens to `popstate`. Every internal link is rewritten to carry the current scenario. An unknown or missing value resolves to `correct`, and the address is normalised with `replaceState`. The scenario that applies to a purchase is the one active when "Place order" is pressed, and it is stored on the Order.
- **Rationale**: Bookmarkable (FR-013), visible in the address bar (FR-014), and no storage to drift. Back and forward follow the address (edge case).
- **Alternatives**: sessionStorage for the scenario was rejected because bookmarks and the address could then disagree.

## R-05 — Making scenario 2 match the expected text

- **Decision**: Scenario 2 sets `ecommerce.value` to the literal string `"12.99"`. The catalogue's hero product, which the talk uses, costs £12.99, and the talk basket is one unit of it. The value is then the same amount as the correct push, with only its type changed (FR-012).
- **Rationale**: The expected Console line quotes `"12.99"` exactly (spec US2 row 2).
- **Alternatives**: `String(total)` was rejected because the line would not match for other baskets.

## R-06 — `transaction_id`

- **Decision**: Correct: `T-` followed by 6 digits from `crypto.getRandomValues`, generated at "Place order". Scenario 5: the literal `"12345"`. The pattern is a single constant (`TRANSACTION_ID_PATTERN = /^T-[0-9]{6}$/`), so that FR-024 changes one line.
- **Rationale**: This matches the spec's working pattern, and the expected scenario 5 message fills in `{pattern}` and `{value}` from the pushed value.

## R-07 — Basket and order storage

- **Decision**: `shop/storage.ts` wraps sessionStorage (`demo-shop:basket`, `demo-shop:order`) in try/catch and falls back to a module-level in-memory value. Prices are held in pence internally and converted to a two-decimal number for pushes, so float drift never makes `value` read as `12.990000001`. The thank-you page offers "Order again". It restores the last order's items to the basket (no push) and links to checkout, so that the presenter can stage the next broken scenario without re-adding the product (SC-003).
- **Alternatives**: localStorage was rejected because the basket should not survive across talk runs. Cookies were rejected under C-011.

## R-08 — Lint rules that close defects by construction

- `no-console: error` in `site/` (FR-017: the shop never writes to the Console).
- `no-restricted-syntax` on string and template literals matching `/[✓✗⚠✅❌]|\b(pass(ed|es)?|fail(ed|s|ure)?|valid|invalid)\b/i` in `site/` (FR-017, the page wording).
- `no-restricted-properties` / `no-restricted-globals` forbid `dataLayer` access outside `site/src/datalayer/push.ts` (FR-016).
- `no-restricted-syntax` forbids `fetch`, `XMLHttpRequest`, `navigator.sendBeacon` and `WebSocket` in `site/` (NFR-004).
- Standard `@eslint/js` recommended and `typescript-eslint` recommended-type-checked.

## R-09 — No-secrets gate

- **Decision**: Scan (a) every tracked file (`git ls-files`), (b) every blob introduced by the commits being pushed (pre-push: the ranges from stdin; CI: `before..after` on push, `base..head` on PR), and (c) with `--history`, every blob in `git rev-list --all` (in CI only, for SC-006). Patterns: GTM container IDs `\bGTM-[A-Z0-9]{4,10}\b`; private key headers; AWS access key IDs; Cloudflare API token-like `\b[A-Za-z0-9_-]{40}\b` only when it is next to `token|key|secret`; and generic `(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}['"]`. Exact allowlist: `GTM-XXXXXXX` (a documentation placeholder). Output shows file:line and the pattern name. Matches are partly masked.
- **Rationale**: A small, original scanner, with no gitleaks or other new dependency (DM `…6ARX`).
- **Self-match**: The regex sources are written so they do not match themselves (for example `GTM-[A-Z0-9]` contains `[`). `verify` fixtures that hold sample secrets are generated at runtime, never committed.

## R-10 — Provenance gate

- **Decision**: The denylist path comes from `QUADRANO_DENYLIST_PATH`, defaulting to `~/.quadrano/provenance-denylist.txt`. It has one term per line, and `#` starts a comment. In CI, the workflow writes the `PROVENANCE_DENYLIST` secret to a temp file and sets the variable. The gate fails if the file is missing, unreadable or has no terms after trimming. It scans tracked files, blobs introduced by pushed commits and the messages of pushed commits, with case-insensitive substring matching. Output gives only the location (`path:line` or commit SHA) and the term's index (`term #3`), never the term or the matched text. GitHub also masks the secret's value in logs.
- **Alternatives**: Committing a hashed denylist was rejected because the Charter says to hold it outside the repo.

## R-11 — Gate runner, hook and CI

- **Decision**: `pnpm gates` runs `node scripts/gates.ts`, which spawns each gate in turn and exits with the first non-zero code. Flags: `--pre-push` reads git's stdin ranges, `--ci` reads the GitHub event ranges and runs the history scan. `prepare` runs `git config core.hooksPath .githooks`, and `.githooks/pre-push` is a short POSIX script that pipes stdin to the runner. Workflow: `actions/checkout` (pinned by SHA, `fetch-depth: 0`), `pnpm/action-setup`, `actions/setup-node` (`node-version-file: .node-version`, pnpm cache), `pnpm install --frozen-lockfile`, `pnpm gates --ci`.
- **Rationale**: This avoids husky and tsx (DM `…6ARX`). Node 24 runs `.ts` files directly through its native type stripping.

## R-12 — Visuals and copy

- **Decision**: A fictional brand with an original name and wordmark, chosen by the implementer and checked by the Product Owner for real-brand clashes (C-010). Products are drawn as inline SVG made from simple shapes. A system font stack with no web fonts (NFR-004). UI copy avoids verdict wording (R-08).

## Supply-chain security (directive 051, tactic supply-chain-install-safety)

| Check | Plan position |
|---|---|
| Registry authenticity | Default npm registry only, with no extra registries in `.npmrc`. Packages are installed by exact name (watch for typosquats: `typescript-eslint`, not `typescript-eslint-*` lookalikes). |
| Package freshness | `minimumReleaseAge: 10080` (7 days) in `pnpm-workspace.yaml`. Versions are chosen at install time, not prescribed here. The lockfile is committed and CI uses `--frozen-lockfile`. |
| Lifecycle scripts | pnpm 10 blocks dependency lifecycle scripts by default. Keep `onlyBuiltDependencies: []`, adding `esbuild` only if Vite needs its postinstall. Today's esbuild ships platform binaries as optional dependencies, so it is expected to need none. Any addition is recorded in `AGENTS.md`. |
| Node LTS | Node 24 LTS, pinned in `.node-version`. Node 26 is due to become Active LTS around now. Do not switch before the 19 Nov talk; revisit afterwards. |
| CI actions | Third-party actions are pinned by full commit SHA, with `permissions: contents: read`. |

## Adversarial challenge pass

The dependency set is small and dev-only, so a full multi-agent squad was **deferred_with_rationale**: there is no runtime dependency, the stack is fixed by C-009, and the confirmed decision (DM `…6ARX`) holds the dependency surface to five packages. The Architect ran a single-reviewer challenge pass instead. A squad can be run at `/spec-kitty.tasks` or pre-merge if the Product Owner wants one.

| # | Challenge | Disposition |
|---|---|---|
| A1 | "The GTM ID baked into `dist/` is a secret leak." | **accepted, no change**: the ID is public in served HTML by design. QDR-004 covers the repo, and `dist/` is gitignored and scanned by no-secrets if it is ever tracked. |
| A2 | "Preview deploys can ship before gates run." | **deferred_with_rationale**: previews are not production, and `main` is protected by required checks. |
| A3 | "The provenance gate could leak terms through `git grep` stderr or exceptions." | **changed**: the scanner reads blobs itself, catches all errors, and prints only fixed messages. It never prints the matched text, and no error message includes a term. |
| A4 | "The no-secrets regex could flag its own source or docs." | **changed**: the patterns are written so they don't match their own source, and `GTM-XXXXXXX` is allowlisted exactly (R-09). |
| A5 | "Pushing `purchase` on thank-you load could double-push on reload." | **changed**: the `order.pushed` guard (R-03). |
| A6 | "Unpinned GitHub Actions are a supply-chain vector." | **changed**: pinned by SHA, with read-only permissions. |
| A7 | "esbuild postinstall blocked → build breaks on Cloudflare." | **accepted**: verify on the first deploy, and if it is needed, allow `esbuild` explicitly and record it in `AGENTS.md`. |
