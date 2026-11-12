# Contract: Console capture

The inline head script built from `site/src/results/console-mirror.ts`. Covers FR-003, FR-005, FR-007, FR-008, FR-009, FR-011, C-001, C-002 and C-006.

## Placement

- Emitted by the `quadrano-gtm` plugin in `vite.config.ts` at `<!-- gtm:head -->`, in this order: capture script, offline boot step (offline build only), GTM loader.
- Present in every build and on all 5 pages.
- The source file has no imports and no exports after type-stripping, contains no closing script tag, and uses ES5-safe syntax. The build fails if any of these stops being true.

## When the view is off

The script reads `sessionStorage['demo-shop:results-view']` (guarded) and the `results` parameter of `location.search`, and returns. It then has:

- left every `console` method as the browser's own
- set no attribute on `<html>`
- defined no global
- written nothing to storage

## When the view is on

1. If the link turned it on, write `on` to the key (guarded).
2. Set `<html data-results-view="on">`. If storage threw, also set `data-results-storage="unavailable"`.
3. Define `window.__demoShopResults` (see [data-model.md](../data-model.md)).
4. Wrap `groupCollapsed`, `group`, `groupEnd`, `log`, `info` and `warn`.

Each wrapper:

1. calls the saved original with the same `this` and the same arguments, and keeps its return value
2. runs the copy step inside `try`/`catch`, swallowing any error
3. returns the original's return value

## Shapes recognised

| Call | Condition | Effect |
|---|---|---|
| `info` or `warn` | first argument is a string starting `%cQuadrano%c · ` and containing `Console format v1` | `bannerSeen = true` |
| `info` or `warn` | first argument is a string starting `%cQuadrano%c · `, no group open, not the banner | add a plain line |
| `groupCollapsed` | no group open; 4 arguments; first is `%c` + one character + `%c %s` | open a result |
| `groupCollapsed` or `group` | a result is open | count a foreign group |
| `log` | a result is open, no foreign group; 1 string argument | add a problem line |
| `log` | a result is open, no foreign group; 2 arguments, a string then an object | set the pushed text |
| `groupEnd` | a foreign group is counted | uncount it |
| `groupEnd` | a result is open, no foreign group | close the result and add it |
| anything else | | no effect |

Text is built from the arguments only: each `%c` is removed and its argument skipped, each `%s` is replaced by `String(argument)`.

## What the script never does

- It never reads or writes the container key, and never changes which container loads.
- It never touches `dataLayer` and never makes a push.
- It never makes a request.
- It holds no verdict mark and no verdict wording.
- It never writes a Console line of its own.

## Page interface

`window.__demoShopResults` is the only way the page module reads results. The module calls `listen(fn)` once; `fn` is called after each change and once on registration if entries or the banner arrived earlier.

## Checks

| Check | Proves |
|---|---|
| view off: `console.log` is native code on all 5 pages; view on, same page: it isn't | FR-005 with its control |
| the Console records for the 7 presses are equal with the view on and off | FR-007 |
| a group written by a test script in the page doesn't appear in Results; the runtime's does | FR-008 with its control |
| storage and the request list are the same before and after 7 results are showing | FR-011 with its control |
| 3 links with `results=on` beside a container-shaped parameter leave the container as it was, and turn the view on | C-002, SC-004 with its control |
