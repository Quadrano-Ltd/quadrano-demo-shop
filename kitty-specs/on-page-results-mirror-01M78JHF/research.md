# Research: On-page results mirror

Phase 0 of [plan.md](plan.md). Each entry records a decision, why, and what else was considered. There are no open clarifications.

## R-01 Where the capture runs

- **Decision**: An inline script in `<head>`, emitted by the existing `quadrano-gtm` Vite plugin at the `<!-- gtm:head -->` marker, before the offline boot step and the GTM loader. Its source is one self-contained file, `site/src/results/console-mirror.ts`, type-stripped at build time the same way `active-container.ts` is.
- **Rationale**: The shop knows Quadrano has loaded only by seeing the banner line. In the offline build the snippet runs synchronously in the head, before any module script, so a wrapper installed by a page module would always miss the banner there. On the GTM paths the tag usually runs later, but nothing guarantees it.
- **Alternatives considered**: Installing the wrappers from the menu module (misses the offline banner; rejected). Reading `window._quadrano` to detect the runtime (depends on runtime internals outside Console output format v1; rejected under QDR-005).

## R-02 What "off" means in the head

- **Decision**: The script reads the setting and the link parameter, and returns before touching `console` when both say off. It sets no attribute and defines no global in that case.
- **Rationale**: FR-005 requires the browser's own Console methods and the same requests as today. An inline script adds bytes to the document and no request. The Results code in the page module is a static import, so it joins the existing shared chunk and adds no request.
- **Alternatives considered**: Loading the capture as a separate file only when on (adds a request and a race with GTM; rejected).

## R-03 Setting, storage and the link (`DM-01M78NYDDTDCEGEP0S4BDQDNKM`)

- **Decision**: `sessionStorage` key `demo-shop:results-view`, value `on`. The link parameter is `results`, and only the value `on` is recognised. Seeing `?results=on` writes the setting, so the view stays on across pages in that tab. The parameter is left in the address; internal links are built from path-only hrefs, so it drops off on the next navigation and the stored setting carries on.
- **Rationale**: The Product Owner chose "this tab only" to keep the stage path safe: a new tab is always off. Any other value of `results` leaves the view as it was (spec, Edge Cases).
- **Turning off**: The switch removes the key, then loads the current address without the `results` parameter. A plain reload would re-read `?results=on` and turn the view back on.
- **Storage blocked**: The link still turns the view on for the page it opens. The switch is disabled when the view is off and a note says the view can't be remembered. When the view is on by link, the switch still turns it off, by loading the address without the parameter.
- **Alternatives considered**: `localStorage` with 24-hour expiry or with none (both rejected by the Product Owner for stage risk). Rewriting the address to drop the parameter on arrival (an extra history change for no gain; rejected).

## R-04 Console calls reach the Console first

- **Decision**: Six methods are wrapped: `groupCollapsed`, `group`, `groupEnd`, `log`, `info`, `warn`. Each wrapper calls the saved original with `apply(console, arguments)` and only then runs the copy step inside `try`/`catch`. No other method is touched.
- **Rationale**: FR-007 needs the same call, arguments and order. Calling the original first means a fault in the copy step can't delay or drop a Console line. `group` is wrapped only so that another script's nested group is counted and its `groupEnd` isn't mistaken for the runtime's.
- **Accepted cost**: Developer tools name the shop as the source of each line while the view is on (spec, Assumptions).

## R-05 Recognising the runtime's lines by shape

The snippet fixture (`e2e/fixtures/offline-snippet-before-step8.txt`) shows the calls Console output format v1 makes:

| Runtime call | Shape the shop matches |
|---|---|
| `info('%cQuadrano%c · Specification %s · … · Console format v1 · watching %s', style, '', …)` | banner: a branded line whose format string contains `Console format v1` |
| `info(…)` / `warn(…)` starting `%cQuadrano%c · ` | plain line: a branded line that isn't the banner |
| `groupCollapsed('%c' + marker + '%c %s', style, '', header)` | group start: 4 arguments, format string is `%c`, one character, `%c %s` |
| `log(line)` inside the group | problem line: 1 string argument |
| `log('Pushed:', object)` inside the group | pushed object: 2 arguments, a string then an object |
| `groupEnd()` | group end, when no foreign nested group is open |

- **Decision**: Match on these shapes only. The marker is "any one character", so the shop holds no verdict mark; the existing verdict-wording lint rule stays on for the capture file and would fail a typed mark. The text shown is the format string with each `%c` removed (and its argument skipped) and each `%s` replaced by its argument.
- **Rationale**: FR-008 and FR-014. The branded prefix `%cQuadrano%c · ` is a product name, not verdict wording. Lines from other scripts don't match and are never shown.
- **Alternatives considered**: Matching on the marks ✓ ✗ ⚠ (puts verdict marks in shop code; rejected). Showing every Console group (shows other scripts' output; rejected by FR-008).

## R-06 Showing the pushed object

- **Decision**: The row shows the first argument, a space, then `JSON.stringify(object, null, 2)`, taken when the call is made. If that throws, `String(object)` is used. The e2e check compares it with the JSON of the same argument the Console received.
- **Rationale**: The Console shows a live, expandable object, so "character for character" has no single text form. Indented JSON is the closest stable text, and taking it at call time means a later change to the object can't alter the row. Confirmed in the engineering alignment.
- **Alternatives considered**: A hand-built expandable tree (more code and more to test before a talk; rejected). Keeping a reference to the object and rendering it later (the text could drift from what was pushed; rejected).

## R-07 Plain lines (`DM-01M78PK9GGHZSS6RFEYXKK4PXS`)

- **Decision**: Branded single lines outside a group, other than the banner, appear as plain rows that can't be expanded, in the same newest-first list and under the same limit. The banner itself isn't a row; it only sets "Quadrano has loaded".
- **Rationale**: The Product Owner chose to show them. On path 2 they are often the only thing the runtime says about a push, for example when an event has no Event Definition.
- **Alternatives considered**: Showing the banner text as a caption above the list (useful, but not asked for; left out to keep the change small before the freeze).

## R-08 Lint exception and its proof

- **Decision**: One override in `eslint.config.js`: `no-console` off for `site/src/results/console-mirror.ts`. The verdict-wording, network and `dataLayer` rules stay on for that file. A new non-gate script, `scripts/verify-results.ts`, uses ESLint's Node API to lint a line of Console use as text under the path of an existing file in `site/` and requires a `no-console` error; it lints the same text under the capture file's path and requires none. It also checks the capture file has no import, export or closing script tag after type-stripping.
- **Rationale**: FR-014 and SC-008 need a failing fixture, but a file on disk under `site/` that breaks the rule would fail `pnpm lint` itself. Linting text in memory gives the paired control without weakening the gate.
- **Risk**: Type-aware linting of in-memory text relies on the project service accepting an existing file's path with replaced text. If it doesn't, the fallback is a fixture file in a directory `eslint.config.js` already ignores, linted with ignoring switched off. Either way the check must fail if the override is widened.

## R-09 Announcing results

- **Decision**: Results has its own visually hidden `role="status"` region, placed in the menu host outside the panel. Each new result sets it to that result's header text. Focus is never moved.
- **Rationale**: The playground already writes "Pushed …" to the layout's live region on the same press; sharing that region would let one message overwrite the other. A region inside the hidden panel isn't announced, and results from shop actions arrive while the menu is closed.
- **Alternatives considered**: Making the list itself a live region (announces the whole expanded row, including the pushed object; too noisy).

## R-10 Limits, timing and empty states

- **Decision**: At most 50 rows are kept per page; the oldest is dropped when a 51st arrives. Results kept before the menu module mounts are handed over when it starts listening. The "hasn't loaded" message shows whenever the banner hasn't been seen, and gives way to "No output yet" as soon as it is.
- **Rationale**: 50 is well beyond a talk walk-through and keeps the menu's DOM small on a phone. On a slow connection an attendee may briefly see "hasn't loaded" before GTM arrives; the section updates itself, which matches acceptance scenario 4 of User Story 1.

## Supply chain

The plan adds, upgrades and removes no dependency in any ecosystem. DIRECTIVE_051's controls and the adversarial pass therefore don't apply; this is recorded so the absence is a stated result, not silence.
