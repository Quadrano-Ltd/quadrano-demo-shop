# quadrano-demo-shop Charter

**Version 1.0.0** · adopted 2026-10-24 · ratified when merged to `main` · see the [amendment log](#amendment-log)

This Charter is the rulebook for all work in `quadrano-demo-shop`. Where the Charter and anyone's habits disagree, the Charter wins.

It comes in two parts that must always agree:

- **`.kittify/charter/charter.yaml`** is the machine-readable form that Spec Kitty loads into agent context: governance settings plus the numbered project directives `QDR-001` to `QDR-007`.
- **This document** is the narrative form. Spec Kitty reads its *Policy Summary*, *Terminology Canon*, *Code Review Checklist* and *Regression Vigilance* sections verbatim into implement and review prompts, so keep those headings exactly as they are.

## Policy Summary

- Provenance (QDR-001): everything is original or from compatible public sources; nothing from any non-public third-party source; prior ventures are never named in commits, code, docs or Spec Kitty artefacts.
- Use only the approved stack (QDR-002): a static site on Cloudflare Pages with its own GTM container; no backend, accounts or database. Anything new needs a Charter amendment.
- Every push passes the minimal gates (QDR-003): lint, build, no-secrets, provenance, in that order. Nothing heavier is required here.
- No secrets in the repo (QDR-004): the GTM container ID and any keys live in Cloudflare Pages environment/secret values, never in code.
- The shop depends only on the frozen published-artefact contract (QDR-005); changing the contract is a major amendment with Product Owner sign-off.
- If the Charter doesn't cover it, stop and ask the Product Owner (QDR-006); after three failed fix attempts, block the work package with a structured report.

## Roles

| Role | Who | Responsibilities | Never |
|---|---|---|---|
| **Architect** | AI agent | Writes specifications and plans, breaks work into work packages, reviews work and re-runs the gates, proposes Charter amendments | Writes production code |
| **Implementer** | AI agent | Builds one work package at a time in its own worktree, follows the Charter literally, records evidence | Improvises outside the Charter, proposes amendments |
| **Product Owner** | Barry | Approves specifications. Personally approves changes to the published-artefact contract and the provenance rule. Merges to `main`. | — |

Plans and implementation are left to the agents.

## Provenance (QDR-001)

Quadrano is original work. All code, text and assets are original, or come from public sources under licences compatible with commercial use, with attribution where the licence requires it. Nothing may come from any non-public codebase or document belonging to a third party, including former employers and former ventures.

Commits, code, comments, documentation and Spec Kitty artefacts (interview answers, specs, plans, glossary entries, activity logs) never name prior ventures. This includes passing references: describe lessons generically ("experience shows that…").

The provenance gate enforces this. It scans every tracked file, every file version introduced by the commits being pushed, and every commit message against a denylist that is deliberately **held outside the repository** (a local file under the user profile, and a GitHub Actions secret in CI). If the denylist is missing, empty or unreadable, the check fails rather than passing silently. Output never repeats a matched term.

Only the Product Owner may change this rule.

## Approved stack (QDR-002)

| Concern | Approved |
|---|---|
| Site | Static (no backend, no accounts, no database). The framework is fixed at specification time; anything not listed here needs an amendment. |
| Hosting | Cloudflare Pages at `demo.quadrano.com` |
| Analytics / GTM | The shop's own GTM container, installed by a script tag. A `dataLayer` push on each user action. |
| Data layer | `window.dataLayer.push(...)` implementing the published-artefact contract's Event Definitions: `add_to_cart` and `purchase` |
| Scenario switcher | A control that walks the talk script quickly, driving both the correct and the deliberately broken pushes |

This repo is a parallel lane in Horizon 1. It does not import or depend on the quadrano-web codebase, its build system or its internals.

## Minimal quality gates (QDR-003)

Every push must pass these gates, in this order. `pnpm gates` (or this repo's minimal gate set) runs them all and stops at the first failure.

1. `lint`
2. `build`
3. no-secrets (no secret-like value, and no GTM container ID, anywhere in the repo)
4. provenance (the check described in QDR-001)

The exact linter, build tooling and commands are fixed at specification time and recorded in `AGENTS.md`. Nothing heavier is required in this repo.

## No secrets in the repo (QDR-004)

The GTM container ID and any keys go in Cloudflare Pages environment and secret values, never in code, config files or commits. The no-secrets gate fails a push that introduces one.

## Published-artefact contract dependency (QDR-005)

The shop depends only on the frozen published-artefact contract (v1.0) — the Console output format and runtime guarantees it describes are promises we cannot change. The shop does not depend on how `quadrano.com` is built; those are separate repos and may change underneath us.

Changing the contract is a major amendment with Product Owner sign-off. The shop's `add_to_cart`/`purchase` Attribute names must match the Event Definitions later created in Quadrano Local; treat the contract as the shape of truth until exact Attribute names are confirmed at the W2 freeze (Tue 27 Oct).

## Escalation (QDR-006)

If the Charter or the briefing does not cover a situation, the implementer stops and escalates to the Product Owner instead of improvising.

After **three** failed attempts to fix a failing gate, the work package moves to *blocked* with a structured error report giving: what was attempted, the exact failing command and its output, the suspected cause, and what is needed to unblock it.

## Terminology Canon

These terms are used exactly, and with these meanings, in code, the data layer, the UI, specifications and plans. The Spec Kitty glossary holds the same definitions.

| Term | Meaning | In this repo |
|---|---|---|
| **Event Definition** | The rules for one data layer event, identified by its `event` value: its Attributes and what each must satisfy. | `add_to_cart`, `purchase` |
| **Attribute** | One key in a pushed event object, together with its rules (required, type, allowed values, pattern, …) | `value`, `transaction_id`, `currency` |
| **Data Layer Specification** | A named set of Event Definitions for one website or group of websites; the unit of publishing (one spec ID, one script, one GTM tag) | The shop's data layer, per the published contract |
| **Event Catalogue** | Quadrano-curated Event Definitions, read-only; entries are *copied* into an Event Library | referenced, not built here |
| **Event Library** | An Organisation's own Event Definitions, *referenced* by its Specifications | referenced, not built here |
| **Version** | An immutable, numbered snapshot of a Specification taken at publish; what the CDN serves | referenced, not built here |

**Rules:**
- Use "Attribute", not "parameter", "property" or "field", except when quoting a vendor's own documentation.
- Don't introduce synonyms for these concepts: no "schema" for a Specification, no "tracking plan", "rule set", "template" or "spec".
- The canonical set for this repo is exactly the six terms above. A new domain term needs a glossary entry and a Charter patch amendment before it appears in code.
- The shop's buttons push *correct* and *deliberately broken* events. "Broken" is a testing mode, not a domain term.

## Commits and branches

- Commits are atomic and follow Conventional Commits, scoped to the work package, e.g. `feat(WP01): add scenario switcher`. Agent-authored commits end with an `Agent: <name>` trailer.
- Stage only the work package's own deliverables; never use blanket staging.
- No direct commits or pushes to `main`. Every change reaches `main` through a pull request with green gates.
- Spec Kitty creates and names work-package branches (`kitty/mission-*`).

## Verification that proves something

- The whole point of the shop is honest signal: a correct push logs ✅, and each broken push logs ❌ with its matching plain-English message from §1.1 step 7 of the build plan.
- Each deliberately-broken scenario is paired with the exact message it must produce: missing `value`; `value` as the string `"12.99"`; `transaction_ID` (wrong case → suggest `transaction_id`); `currency: "gbp"` (not in GBP/EUR/USD).
- A check that can never fail is removed. The scenario switcher must be able to show every ✅ and ❌ in the talk script.
- Reviewers re-run the gates themselves rather than trusting the implementer's report.

## Code Review Checklist

Implementers check every item before moving a work package to review. Reviewers verify every item independently, re-running commands rather than reading reports.

1. **Gates:** `pnpm gates` passes locally (lint, build, no-secrets, provenance).
2. **Scope:** the diff touches only the work package's own deliverables; nothing outside the shop's scope.
3. **Provenance:** nothing copied from a non-public source, and no prior venture named anywhere in the diff or the commit messages (QDR-001).
4. **No secrets:** no GTM container ID or keys in code, config or commits; they live in Cloudflare Pages (QDR-004).
5. **Contract:** nothing in the published-artefact contract changed; the shop's Attribute names match the contract's Event Definitions (QDR-005).
6. **Broken pushes:** every deliberately-broken button logs ❌ with the matching plain-English message from §1.1 step 7.
7. **Terminology:** the Terminology Canon is used exactly; no new synonyms.
8. **Code hygiene:** no secrets, no commented-out code.
9. **Commits:** Conventional Commits scoped to the work package, with the `Agent:` trailer; atomic; no blanket staging.

## Regression Vigilance

- **Never weaken a gate to pass.** A failing gate means either the change is wrong or a requirement changed. Escalate if it's the latter.
- **Guard the published-artefact contract.** It is frozen; every shop change is checked against its Event Definitions and message format.
- **The scenario switcher is the demo.** If a scenario stops logging its expected ✅ or ❌, that is a regression.
- **Terminology cutovers are bulk edits.** Renaming a canonical term follows Spec Kitty's bulk-edit occurrence classification; a half-renamed term is a regression.
- **Bugs get a check first.** A fixed defect gets a check that failed before the fix; if a class of defect recurs, close it by construction (a lint rule, a guard) rather than patching each case.

## How the Charter is enforced

Written rules alone don't reliably change agent behaviour, so wherever possible each rule is backed by a mechanism. When a rule changes, its mechanism must change in the same pull request.

| Rule | Enforced by |
|---|---|
| Minimal gates (QDR-003), provenance (QDR-001) | The gate runner (`pnpm gates`) and a git pre-push hook / CI, once the tooling is established at specification time. |
| No secrets (QDR-004) | Cloudflare Pages environment/secret values; the no-secrets gate; review checklist item 4. |
| Published-artefact contract (QDR-005) | The frozen contract v1.0; review checklist item 5; Product Owner sign-off for any change. |
| Checklist, verification discipline, escalation | The *Code Review Checklist* and *Regression Vigilance* sections above, which Spec Kitty injects into implement and review prompts. |
| Stack, directives, terminology | `charter.yaml` (project directives QDR-001 to QDR-007), the Policy Summary above, and the Spec Kitty glossary. |

## Changing the Charter (QDR-007)

- Only the Architect proposes amendments; implementers never do.
- Amendments are versioned like software: **patch** for a clarification or correction, **minor** for a new rule, **major** for a rule changed or removed.
- Every amendment:
  - updates the version and date at the top of this document
  - keeps `charter.yaml` and this document in agreement
  - explains its reasoning in the commit message
  - adds a row to the amendment log
  - changes the enforcing mechanism in the same pull request, or states that none applies
- Like every change to `main`, an amendment ships through a pull request with green gates.
- Exceptions to any rule need an amendment; there are no ad hoc deviations.

## Amendment log

| Version | Date | Type | Summary |
|---|---|---|---|
| 1.0.0 | 2026-10-24 | — | Initial Charter: roles, provenance, approved stack, minimal gates, no secrets, published-artefact contract dependency, escalation, Terminology Canon, verification, enforcement mechanisms and amendment process |
