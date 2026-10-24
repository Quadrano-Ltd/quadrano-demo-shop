# Briefing: quadrano-demo-shop

**Repo:** https://github.com/Quadrano-Ltd/quadrano-demo-shop
**Owner:** Barry (Product Owner) · **Date:** 2026-10-24

## 1. Purpose

Build the demo shop for the Quadrano talk: a **static mini-shop** on
Cloudflare Pages at `demo.quadrano.com`, with its **own GTM container**,
that demonstrates the Quadrano runtime validating a real data layer.
Correct pushes log ✅; deliberately broken pushes log ❌ with plain-English
messages. This repo is a *parallel lane* in Horizon 1 — it must be demoable
by **Sun 8 Nov** and run clean in three rehearsals by **Thu 19 Nov**.

## 2. Canonical inputs (read first — these are source of truth)

- `planning/quadrano-build-plan.md` §1.1 (the demo script — *the* definition of done),
  §4.3 (published-artefact contract), §7 (this repo's minimal charter).
- `planning/published-artefact-contract.md` v1.0 — **frozen**. The Console
  output format and runtime guarantees it describes are promises we cannot change.
- Canonical domain terms (never use substitutes): **Event Definition,
  Attribute, Data Layer Specification, Event Catalogue, Event Library, Version.**

## 3. What to build

- A static site (no backend, no accounts, no database) deployed to Cloudflare Pages.
- Its own GTM container installed; a `dataLayer` push on each user action.
- Two events per the demo script: `add_to_cart` and `purchase`, with these
  Attributes:
  - `add_to_cart`: required Attributes, typed.
  - `purchase`: required `value` (number), `transaction_id` (regex), and
    `currency` restricted to GBP, EUR, USD.
- Buttons that push **correct** events, and buttons that push **deliberately
  broken** events covering the exact message categories in §1.1 step 7:
  - missing `value`
  - `value` is the string "12.99" instead of a number
  - `transaction_ID` (wrong case → should suggest `transaction_id`)
  - `currency: "gbp"` (not in GBP/EUR/USD)
- A **scenario switcher** to walk the talk script quickly.

## 4. Scope

- **In:** static shop UI, GTM install, data layer, correct + broken push
  buttons, scenario switcher, production deploy to `demo.quadrano.com`.
- **Out:** real checkout/payments, user accounts, backend APIs, the Quadrano
  builder (that lives at `quadrano.com/local`), and the GTM *template* itself
  (that's `quadrano-gtm-template`). Do not couple this repo to web-app internals.

## 5. Constraints & rules

- **Provenance (QDR-001):** original work or compatible-licensed public material
  only; never name prior ventures in commits, code, docs or artefacts.
- **Minimal gates** for this repo (per build plan §7): lint, build, no secrets,
  provenance. Nothing heavier is required here.
- **No secrets in the repo.** The GTM container ID and any keys go in Cloudflare
  Pages environment/secret values, never in code.
- **Hosting:** Cloudflare Pages (approved stack, QDR-002).
- The shop depends only on the **published-artefact contract**, not on how
  quadrano.com is built — those are separate repos and may change underneath you.

## 6. Acceptance criteria

- `demo.quadrano.com` serves the shop; `lint` + `build` + provenance are green.
- With GTM installed, plausible `add_to_cart`/`purchase` events appear in GTM Preview.
- Correct pushes log ✅; each broken push logs ❌ with the matching
  plain-English message from §1.1 step 7.
- The scenario switcher drives the full talk script.

## 7. Definition of done

- `pnpm gates` (or this repo's minimal gate set) green.
- Deployed and verified live; no secrets committed; provenance clean.

## 8. Escalation

If the Charter or this briefing does not cover something, **stop and ask the
Product Owner**. Do not improvise outside the rules.

---

## Open decision to settle before briefing

The shop's `add_to_cart`/`purchase` Attribute names must match the Event
Definitions later created in Quadrano Local. Those are defined by the frozen
published-artefact contract, not yet by a finished Specification. Treat the
contract as the shape of truth; expect exact Attribute names to be confirmed
at the W2 freeze (Tue 27 Oct).
