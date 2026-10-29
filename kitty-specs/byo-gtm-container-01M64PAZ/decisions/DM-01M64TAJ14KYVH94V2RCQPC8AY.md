# Decision Moment `01M64TAJ14KYVH94V2RCQPC8AY`

- **Mission:** `byo-gtm-container-01M64PAZ`
- **Origin flow:** `plan`
- **Slot key:** `plan.testing.automation-tooling`
- **Input key:** `testing_automation_tooling`
- **Status:** `resolved`
- **Created:** `2026-10-29T21:51:12.932399+00:00`
- **Resolved:** `2026-10-29T21:51:51.450268+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

NFR-001 (one container, 10/10 runs across 5 pages, both states), NFR-002 (automated accessibility checks, menu open and closed) and NFR-003 (0 px overflow at 360 px) imply browser automation. QDR-002 says any new build or dev dependency needs a Charter amendment, and the demo-shop mission added no test framework. How should these be verified? (A) Add Playwright and @axe-core/playwright as dev dependencies, with a non-gate pnpm test:e2e script; folded into the 1.1.0 amendment that FR-025 already requires. (B) No new dependencies: node:assert checks for the pure container logic, plus a manual quickstart checklist using Chrome DevTools (Network panel, Lighthouse accessibility audit, 360 px device mode), run 10 times. (C) Add Playwright only; accessibility checked manually with Lighthouse.

## Options

- A: Playwright + axe in the 1.1.0 amendment
- B: no new deps, scripted + manual checklist
- C: Playwright only, manual a11y
- Other

## Final answer

A: Playwright + axe in the 1.1.0 amendment

## Rationale

_(none)_

## Change log

- `2026-10-29T21:51:12.932399+00:00` — opened
- `2026-10-29T21:51:51.450268+00:00` — resolved (final_answer="A: Playwright + axe in the 1.1.0 amendment")
