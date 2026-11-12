# Contract: Charter 1.1.2 (patch)

Proposed by the Architect under QDR-007. Implementers apply this text as written and don't change it. Covers FR-015 and FR-014.

## Why a patch

It clarifies an existing rule: the shop never judges a push. It adds no rule and removes none. If review finds it adds a rule, it becomes minor 1.2.0 with the same text.

## Changes to `.kittify/charter/charter.md`

1. **Header**: version `1.1.2`, amended date set to the day the change is committed.

2. **"Verification that proves something"**, new last bullet:

   > The shop never judges a push and writes no verdict of its own, on the page or in the Console. When a visitor turns on the Results view, the shop may repeat the runtime's Console output on the page, word for word; every verdict shown is still the runtime's (1.1.2).

3. **"How the Charter is enforced"**, new row:

   | Rule | Enforced by |
   |---|---|
   | The shop never judges (demo-shop FR-017, 1.1.2) | Lint in `site/**`: no Console use and no verdict wording. The Console rule is off for `site/src/results/console-mirror.ts` only; the verdict-wording rule stays on there. `pnpm verify:results` proves the Console rule still fires elsewhere. |

4. **Amendment log**, new row:

   | Version | Date | Type | Summary |
   |---|---|---|---|
   | 1.1.2 | (commit date) | Patch | The shop may repeat the runtime's Console output on the page, word for word, when a visitor turns on the Results view; it still never judges a push. Supersedes byo-gtm-container C-009 for the on-page panel only. Mechanism: `no-console` is turned off for `site/src/results/console-mirror.ts` and nowhere else; the verdict-wording rule is unchanged; `pnpm verify:results` checks the rule still fires outside that file. Gate set and order unchanged. |

## Changes to `.kittify/charter/charter.yaml`

Keep it in agreement with `charter.md`. The directives QDR-001 to QDR-007 hold no wording about Console output, so their text doesn't change. If the file records the Charter version, set it to `1.1.2`.

## Same pull request

- `eslint.config.js`: the one-file override.
- `scripts/verify-results.ts` and the `verify:results` script.
- `AGENTS.md`, Code rules: replace the line on Console output with:

  > No verdict wording in `site/`, and no Console use except in `site/src/results/console-mirror.ts`, which repeats the runtime's output (FR-017, Charter 1.1.2, enforced by lint).

  Add `pnpm verify:results` to the Commands table.

## Commit message

States the reasoning: attendees on phones have no Console; the shop repeats the runtime's text and adds none of its own; the exception is one file.
