# Decision Moment `01M64RAA19WKDR4DQ969WWGG9A`

- **Mission:** `byo-gtm-container-01M64PAZ`
- **Origin flow:** `specify`
- **Slot key:** `specify.governance.qdr002-amendment`
- **Input key:** `qdr002_amendment`
- **Status:** `resolved`
- **Created:** `2026-10-29T21:16:07.593226+00:00`
- **Resolved:** `2026-10-29T21:17:49.111884+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

Charter QDR-002 approves only 'the shop's own GTM container, installed by a script tag'. Loading a visitor-entered container instead needs an amendment. How should it be handled? (A) Minor amendment 1.1.0 shipped inside this mission: the shop loads exactly one container per page, its own or one the visitor types into the menu; no-extra-network (NFR-004) and no-consent-banner (C-011) cover only the shop's own container. (B) Treat it as major (a changed rule) with the same content. (C) Land the amendment in its own PR before this mission's implementation starts.

## Options

- A: minor 1.1.0 in this mission
- B: major 2.0.0
- C: separate PR first
- Other

## Final answer

A: minor 1.1.0 in this mission

## Rationale

_(none)_

## Change log

- `2026-10-29T21:16:07.593226+00:00` — opened
- `2026-10-29T21:17:49.111884+00:00` — resolved (final_answer="A: minor 1.1.0 in this mission")
