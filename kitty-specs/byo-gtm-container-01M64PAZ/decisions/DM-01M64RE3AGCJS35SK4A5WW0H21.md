# Decision Moment `01M64RE3AGCJS35SK4A5WW0H21`

- **Mission:** `byo-gtm-container-01M64PAZ`
- **Origin flow:** `specify`
- **Slot key:** `specify.research.preview-spike`
- **Input key:** `preview_spike_sequencing`
- **Status:** `resolved`
- **Created:** `2026-10-29T21:18:11.792600+00:00`
- **Resolved:** `2026-10-29T21:19:13.889127+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

The Preview spike (does GTM Preview connect to a never-published container injected at runtime, across page navigations?) needs a real GTM account and the Tag Assistant UI, so the Product Owner runs it. How should the spec treat it? (A) Write the spec now on the assumption that it works, with a stated fallback (path 2 tells the visitor to publish their container) if it doesn't. The spike becomes a gating step before implementation, recorded under docs/. (B) Pause the spec until the spike result is in, then write it. (C) Spec both paths fully (Preview-only and publish-required) and let the spike pick one.

## Options

- A: assume works, fallback, spike gates implementation
- B: pause spec until spike done
- C: spec both variants
- Other

## Final answer

A: assume works, fallback, spike gates implementation

## Rationale

_(none)_

## Change log

- `2026-10-29T21:18:11.792600+00:00` — opened
- `2026-10-29T21:19:13.889127+00:00` — resolved (final_answer="A: assume works, fallback, spike gates implementation")
