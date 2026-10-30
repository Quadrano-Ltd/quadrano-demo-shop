# Contract: Visitor menu and banner

Requirements: FR-005 to FR-010, FR-012, FR-017, FR-020 to FR-022, FR-024; NFR-002, NFR-003, NFR-005.

Mounted once per page by `renderLayout` (`site/src/ui/layout.ts`). A second call must not add a second button or duplicate listeners.

## Structure

```
<div class="visitor-banner" role="region" aria-label="Container">   ← only when data-container-source="visitor"; before <header>
  <p>Using your container GTM-XXXXXXX</p>                          ← the visitor's ID, set with textContent
  <button type="button">Reset to the shop's container</button>
</div>
…page…
<button type="button" class="visitor-menu__toggle"
        aria-expanded="false" aria-controls="visitor-menu">Demo menu</button>   ← fixed, bottom-right
<section id="visitor-menu" class="visitor-menu" hidden aria-labelledby="visitor-menu-title">
  <h2 id="visitor-menu-title" tabindex="-1">Demo menu</h2>
  <button type="button" class="visitor-menu__close">Close</button>
  1. "Show me the output with the pre-built container"   (path 1 button)
  2. "Let me bring my own GTM container"                 (path 2: label, text input, Save button, message area, instructions)
  3. "Event playground"                                  (7 buttons, see playground-pushes.md)
</section>
```

The visible label "Demo menu" may be renamed by the Product Owner. It must stay a visible text label.

## Behaviour

| Interaction | Result |
|---|---|
| Toggle pressed while closed | Panel shown, `aria-expanded="true"`, focus to the heading |
| Toggle pressed while open, the Close button, or Escape anywhere in the panel or on the toggle | Panel hidden, `aria-expanded="false"`, focus to the toggle |
| Path 1 while the source is `visitor` | `clear()`, then reload (same as reset, FR-010) |
| Path 1 while the source is `shop` | Message: "You're using the shop's pre-built container." No reload |
| Path 1 while the source is `none` (a build without the shop's ID) | Message: "This build of the shop has no pre-built container." No reload |
| Path 2 Save with a well-formed ID | `save(id)`, then reload (FR-006) |
| Path 2 Save with a malformed ID | Refusal message in an `aria-live="polite"` area tied to the input with `aria-describedby`; `aria-invalid="true"` on the input; nothing saved (FR-007) |
| Storage unavailable (`data-storage="unavailable"` or `probe()` false) | Path 2 input and Save disabled; note shown (FR-012) |
| Banner reset | `clear()`, then reload |
| `clear()` returns `unavailable` | Message: "This browser wouldn't let the shop remove your container ID. Clear this site's data to reset." |

Input is not trimmed or upper-cased. The ID must be entered exactly as GTM shows it (Edge Cases).

## Copy (no verdict wording: lint FR-017 and FR-022)

Copy must not contain ✓ ✗ ⚠ ✅ ❌ or the words pass(ed/es), fail(ed/s/ure), valid or invalid.

- **Refusal (FR-007)**: "That doesn't look like a container ID. Enter it exactly as GTM shows it, for example GTM-XXXXXXX: `GTM-` and then 4 to 10 capital letters or digits."
- **Storage unavailable (FR-012)**: "Bringing your own container isn't available in this browser, because it blocks site storage. You can still use the pre-built container and the event playground."
- **Path 2 instructions (FR-024)**, default, assuming spike run 2 shows the container runs in Preview:
  1. Create an empty container in your own GTM account.
  2. Enter its ID here and save.
  3. On quadrano.com/local, build a Specification and copy its snippet.
  4. In your container, add a Custom HTML tag with the snippet, triggered on All Pages.
  5. Start Preview on this shop. You don't need to publish.
  6. Open the browser Console and use the event playground.
- **If spike run 2 shows it doesn't run**, step 5 becomes: "Submit and publish your container, then reload this page." Only this copy changes.

## Layout (FR-021, NFR-003)

- The toggle is `position: fixed`, inset from the bottom-right with safe-area padding, and is at least 44 × 44 px.
- The panel is fixed above the toggle: `width: min(24rem, 100vw - 2rem)`, `max-height: calc(100dvh - 6rem)`, `overflow-y: auto`. It never causes horizontal overflow.
- The banner is in normal flow and wraps; long IDs fit (at most 14 characters).
- Visible focus indicator on every control (`:focus-visible`), meeting the existing colour contrast.
