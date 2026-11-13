# WP02 Review Feedback

Verdict: **Changes requested** (1 blocking issue + 1 process gap).

## Issue 1 (blocking): emitted capture script is not ES5-safe, and the build guard does not catch it

`contracts/console-capture.md` states the capture script "uses ES5-safe syntax. The build fails if any of these stops being true."

The emitted first `<script>` in `dist/index.html` and `dist-offline/index.html` contains ES2015 object-property shorthand:

```js
var results = {
    bannerSeen: false,
    entries,      // shorthand property — ES2015, not ES5
    storage: storageOk ? "ok" : "unavailable",
    listen        // shorthand property — ES2015, not ES5
};
```

The source file is written ES5-safe (`entries: entries`, `listen: listen`), but
`transformWithOxc` rewrites the explicit keys to shorthand form during
type-stripping. `buildCaptureScript()` in `vite.config.ts` guards against
`=>`, a backtick, `/\b(?:let|const|class)\s/`, and `...` — none of which match
shorthand properties — so the build passes even though the emitted script is
not ES5-safe. This is precisely the failure mode T011's edge case called out:
"If it rewrites anything to newer syntax, the ES5 guard will say so; fix the
source, not the guard."

### How to fix (choose one)

- Make `transformWithOxc` type-strip without applying the shorthand
  (syntax-sugar) rewrite, so `{ entries: entries, listen: listen }` survives
  into the emitted code; or
- Extend the post-ES5 guard in `buildCaptureScript()` to also detect object
  shorthand (and ideally computed property names and method shorthand) and fail
  the build; then fix the source/transform so the emitted output keeps explicit
  keys.

After the fix, re-read the generated first `<script>` in both `dist/index.html`
and `dist-offline/index.html` end to end to confirm the only post-ES5 tokens
gone are the type annotations, and re-run the guard probes.

## Issue 2 (process): guard/lint probe evidence missing from the Activity Log

The Definition of Done requires the three build-guard probes (import,
`</script>` in a string, arrow function) and the two lint probes (`no-console`
fires in `site/src/menu/playground.ts`; verdict-wording fires in the capture
file) to be recorded in the Activity Log. The Activity Log currently contains
only "Prompt generated via /spec-kitty.tasks". Please record each probe's
outcome before resubmitting.
