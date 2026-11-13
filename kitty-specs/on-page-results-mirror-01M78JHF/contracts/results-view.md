# Contract: Results section, switch and link

The Results section of the Demo menu (`site/src/menu/results.ts`). Covers FR-001, FR-002, FR-004, FR-006, FR-010, FR-012, FR-013, FR-016, NFR-001 and NFR-002.

## Place and structure

- A `section` in the menu panel, directly after the Event playground, with an `h3` reading **Results**.
- Contents, in order: the switch and its note, then (view on only) the empty-state message or the list.
- With the view off, the section holds the heading, the switch and its note, and nothing else.

## Switch

- A checkbox with `role="switch"` and a visible label: **Show Quadrano's output on this page**.
- A note under it, linked by `aria-describedby`: **The page reloads when you change this.**
- Checked when `<html data-results-view="on">`.
- Turning it on writes the setting and reloads the page.
- Turning it off removes the setting and loads the current address without the `results` parameter.
- Storage blocked and view off: the switch is disabled and the note reads **This browser blocks site storage, so this view can't be remembered. Open the shop from the talk's link to see it on one page.**
- Storage blocked and view on by link: the switch works and turns the view off as above.

## Link

- `?results=on` on any shop page turns the view on, as the switch does.
- Any other value, or no value, changes nothing.
- It works beside `?scenario=`; the scenario parameter behaves as before.
- It never sets, changes or clears the container.

## Empty states

| State | Copy |
|---|---|
| banner not seen | **Quadrano hasn't loaded in this browser. On a phone, the likely cause is a content blocker stopping GTM.** |
| banner seen, no rows | **No output yet** |

The first gives way to the second as soon as the banner arrives, without a reload.

## Rows

- A list, newest first, of at most 50 rows.
- A result is a `details` element. Its `summary` is the header text. Inside, in order: each problem line, then the pushed text in a `pre`.
- A plain line is a row with its text and no `details`.
- Every string is set with `textContent`. Nothing from the Console is ever parsed as markup.
- Long text wraps inside the menu (`overflow-wrap: anywhere`; the `pre` uses `white-space: pre-wrap`).
- Each row expands and collapses on its own, by pointer or keyboard.

## Announcing

- A visually hidden `role="status"` region in the menu host, outside the panel.
- Each new entry sets it to that entry's header or line text.
- Focus is never moved by a new result.

## No pushes

Opening or closing the menu, using the switch, opening the link, and expanding or collapsing a row make no push. This module doesn't import `site/src/datalayer/push.ts`.

## Guidance copy changed in `visitor-menu.ts`

| Where | New copy |
|---|---|
| Path 1 hint | **Open the browser Console to see the output. On a phone, turn on Results below.** |
| Path 2, last step | **Open the browser Console, or turn on Results below, and use the event playground.** |

## Checks

| Check | Proves |
|---|---|
| each of the 7 presses adds exactly 1 row at the top whose text equals the Console group's arguments from the same run | SC-001, NFR-003 |
| the same, in the offline build | FR-009, NFR-003 |
| with a visitor's own container saved and serving the snippet, one press adds 1 row equal to the Console group, and the one `gtm.js` request carries the visitor's ID | FR-009 (path 2) |
| both empty states, checked against each other on one page | FR-010 |
| the switch and the link each leave the view on after a reload and on the next page; off returns to native Console methods | FR-004, FR-006 |
| switch, link, menu and rows add 0 entries to the data layer; a playground press adds its 2 | FR-012, SC-003 |
| axe reports 0 violations with the view on, empty and with results; switch and rows work by keyboard | NFR-002 |
| 0 px horizontal overflow at 360 px with 5 results, 2 expanded | NFR-001, SC-005 |
| the status region holds each new header and `document.activeElement` is unchanged, for 7 of 7 presses | FR-013, SC-007 |
| a pushed value containing markup-like text shows as text and adds no element | spec, Edge Cases |
