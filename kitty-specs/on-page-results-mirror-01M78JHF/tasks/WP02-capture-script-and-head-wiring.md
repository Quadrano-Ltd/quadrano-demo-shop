---
work_package_id: WP02
title: Capture script and head wiring
dependencies:
- WP01
requirement_refs:
- FR-003
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- FR-011
- FR-014
- C-001
- C-002
- C-006
planning_base_branch: feat/on-page-results-mirror
merge_target_branch: feat/on-page-results-mirror
branch_strategy: Planning artifacts for this mission were generated on feat/on-page-results-mirror. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/on-page-results-mirror unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-on-page-results-mirror-01M78JHF
base_commit: 1702f31119a13e28bf9379aea791052f981f88f7
created_at: '2026-11-13T07:11:15.150195+00:00'
subtasks:
- T005
- T006
- T007
- T008
- T009
- T010
- T011
- T012
phase: Phase 2 - Capture
agent: ''
history:
- at: '2026-11-12T20:26:16Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/results/
create_intent:
- site/src/results/console-mirror.ts
execution_mode: code_change
model: ''
owned_files:
- site/src/results/console-mirror.ts
- site/src/globals.d.ts
- vite.config.ts
- eslint.config.js
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP02 – Capture script and head wiring

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission on-page-results-mirror-01M78JHF`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

Build the inline head script that makes the Results view possible, and wire it into every page.

- **Off (the default)**: the script reads the setting and the link parameter and returns. Every `console` method stays the browser's own. No attribute is set, no global is defined, nothing is written to storage (FR-005).
- **On**: the script wraps six Console methods. Each wrapper calls the browser's method first with the same arguments (FR-007), then keeps a copy of any call that has the shape of Console output format v1 (FR-008). Copies live in page memory only (FR-011).
- **Placement**: first at `<!-- gtm:head -->`, before the offline boot step and the GTM loader, on all 5 pages in every build (FR-009).

**Done when**:

- `pnpm build` and `pnpm exec vite build --mode offline` both succeed; each built page has the capture script before any other injected script.
- The build fails if the capture file gains an import, an export, a closing script tag or post-ES5 syntax (each guard probed once and reverted).
- The checks in T012 pass by hand.
- `pnpm gates` passes with the one-file lint override in place.

## Context & Constraints

- **Read first**: `contracts/console-capture.md` (the spec for this WP), `data-model.md`, `research.md` R-01, R-02, R-04, R-05, R-06, R-07, R-10, and the plan's sequence diagram.
- **Precedent to follow**: `site/src/container/active-container.ts` and `buildRulesScript()` in `vite.config.ts`. The capture file is inlined the same way: read, type-strip with `transformWithOxc`, guard, emit.
- **The shop never judges (C-006, FR-014)**: this file holds no verdict mark and no verdict wording. The group marker is matched as "any one character". The lint rule against verdict wording stays on for this file and will fail a typed mark.
- **Contract untouched (C-001, QDR-005)**: don't read `window._quadrano` or anything else the runtime exposes. The only thing the shop relies on is the shape of the runtime's Console calls.
- **The address never sets a container (C-002)**: this file reads `location.search` for one thing only, `results=on`. It never reads or writes `demo-shop:visitor-container`, and shares no code with `site/src/container/**`.
- **It never pushes**: no reference to `dataLayer`. No request. No Console line of its own.
- **Charter 1.2.0** (WP01) is what allows Console use in this one file. Don't use the Console anywhere else.

### What the runtime writes (from `e2e/fixtures/offline-snippet-before-step8.txt`)

| Runtime call | Meaning |
|---|---|
| `console.info('%cQuadrano%c · Specification %s · Version %s · Console format v1 · watching %s', style, '', specId, version, name)` | banner, once at load |
| `console.info('%cQuadrano%c · No Event Definition for "%s".', style, '', name)` | plain line |
| `console.warn('%cQuadrano%c · Two Specifications loaded: …', style, '', a, b)` | plain line |
| `console.groupCollapsed('%c' + marker + '%c %s', style, '', header)` | group start; `marker` is one character |
| `console.log(line)` | problem line, inside the group |
| `console.log('Pushed:', object)` | pushed object, inside the group |
| `console.groupEnd()` | group end |

The separator after `Quadrano%c ` is a middle dot, U+00B7, with a space on each side.

## Branch Strategy

- **Planning base branch**: `feat/on-page-results-mirror`
- **Final merge target**: `feat/on-page-results-mirror`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP02 --agent <name> --mission on-page-results-mirror-01M78JHF
```

---

## Subtasks & Detailed Guidance

### Subtask T005 – The on/off decision; off leaves the page untouched

**Purpose**: FR-005. With the view off, the page must be exactly as it is today.

**Steps**:

1. Create `site/src/results/console-mirror.ts`. The whole file is one immediately invoked function, so nothing leaks into the global scope and the plugin can emit the stripped source as it stands:

   ```ts
   /**
    * Results view capture (FR-003, FR-005, FR-007, FR-008, FR-011).
    * Self-contained and ES5-safe: the quadrano-gtm Vite plugin inlines this
    * file first in <head>, before the offline boot step and the GTM loader.
    * No import, no export, no closing script tag.
    */
   (function () {
     var KEY = 'demo-shop:results-view';
     var stored = null;
     var storageOk = true;
     try {
       stored = window.sessionStorage.getItem(KEY);
     } catch (e) {
       storageOk = false;
     }
     var byLink = /[?&]results=on(?:&|$)/.test(window.location.search);
     if (stored !== 'on' && !byLink) {
       return;
     }
     // … on path: T006 onwards
   })();
   ```

2. Only the stored value `on` and the parameter value `on` count. Any other stored value, `?results=off`, `?results=`, `?results=ON` and `?results` all leave the view as it was (data-model.md; spec, Edge Cases).
3. Before the `return`, the script has done nothing except read. Check there is no assignment to `console`, `document`, `window` or storage above it.

**Files**: `site/src/results/console-mirror.ts` (new)

**Validation**:
- [ ] Off: `Function.prototype.toString.call(console.log)` contains `[native code]`.
- [ ] Off: `document.documentElement.hasAttribute('data-results-view')` is `false`.
- [ ] Off: `'__demoShopResults' in window` is `false`.
- [ ] Off: `sessionStorage.getItem('demo-shop:results-view')` is `null`.

**Edge cases**:
- Reading `window.sessionStorage` itself can throw in locked-down browsers; the `try` covers the property read and the call.
- `?scenario=correct&results=on` and `?results=on&scenario=correct` both turn the view on; the regex allows `?` or `&` before and `&` or the end after.
- `?xresults=on` must not match. The `[?&]` before `results` guarantees that.

### Subtask T006 – On path: setting, attributes, state object and its type

**Purpose**: Make the view's state readable by the page module (WP03) through one global and two attributes.

**Steps**:

1. If the link turned the view on and storage was readable, remember it (guarded). If the write throws, treat storage as unavailable:

   ```ts
   if (byLink && storageOk && stored !== 'on') {
     try {
       window.sessionStorage.setItem(KEY, 'on');
     } catch (e) {
       storageOk = false;
     }
   }
   ```

2. Set the attributes:

   ```ts
   var root = document.documentElement;
   root.setAttribute('data-results-view', 'on');
   if (!storageOk) {
     root.setAttribute('data-results-storage', 'unavailable');
   }
   ```

3. Define the state object exactly as `data-model.md` describes it:

   | Field | Type | Meaning |
   |---|---|---|
   | `bannerSeen` | boolean | the banner line has reached the Console on this page |
   | `entries` | list | results and plain lines, oldest first, at most 50 |
   | `listen(fn)` | function | registers the one listener |
   | `storage` | `'ok'` or `'unavailable'` | whether the setting could be read and written |

   `listen(fn)` stores `fn`, and calls it once straight away if `bannerSeen` is true or `entries` is non-empty. A second call replaces the first listener. A throw from `fn` is swallowed.

4. Add the types to `site/src/globals.d.ts` (a global script file, so the names are global):

   ```ts
   /** One runtime Console group for one push, as text (data-model.md). */
   interface DemoShopResult {
     readonly kind: 'group';
     readonly header: string;
     readonly lines: readonly string[];
     readonly pushed: string | null;
   }

   /** A branded single line written outside a group, other than the banner. */
   interface DemoShopPlainLine {
     readonly kind: 'line';
     readonly text: string;
   }

   type DemoShopResultEntry = DemoShopResult | DemoShopPlainLine;

   /** Defined by the inline capture script only when the Results view is on. */
   interface DemoShopResults {
     readonly bannerSeen: boolean;
     readonly entries: readonly DemoShopResultEntry[];
     readonly storage: 'ok' | 'unavailable';
     listen(fn: () => void): void;
   }

   interface Window {
     dataLayer?: unknown[];
     __demoShopResults?: DemoShopResults;
   }
   ```

   Keep the existing comment about `dataLayer`. Inside the capture file the object is mutable; the `readonly` markers are for readers. Build it as a local variable with a mutable local type, then assign it to `window.__demoShopResults`.

**Files**: `site/src/results/console-mirror.ts`, `site/src/globals.d.ts`

**Validation**:
- [ ] `/?results=on`: `<html data-results-view="on">`, and `sessionStorage` holds `on` under the key.
- [ ] `window.__demoShopResults.storage` is `'ok'` normally.
- [ ] `tsc --noEmit` passes (part of `pnpm build`).

**Edge cases**:
- Storage blocked and `?results=on`: the view is on for this page, `data-results-storage="unavailable"`, `storage` is `'unavailable'`, and nothing throws.
- Entry objects must keep their identity once added. WP03 finds new entries by object identity, so never copy or rebuild an entry already in the list.

### Subtask T007 – Wrap six Console methods

**Purpose**: FR-007. The Console receives every call first, unchanged; a fault in the copy step can never delay or drop a line (research R-04).

**Steps**:

1. Wrap exactly these six, and no others: `groupCollapsed`, `group`, `groupEnd`, `log`, `info`, `warn`.
2. Use one helper so the order is the same for all six:

   ```ts
   function wrap(name, copy) {
     var original = console[name];
     if (typeof original !== 'function') {
       return;
     }
     console[name] = function () {
       var result = original.apply(console, arguments);
       try {
         copy(arguments);
       } catch (e) {
         // The copy step must never reach the caller.
       }
       return result;
     };
   }
   ```

   The sketch is untyped; give `name` a union of the six names and `copy` the type `(args: IArguments) => void`. Typed indexing of `console` is covered in T010.

3. Order inside each wrapper, without exception: call the original, then copy, then return the original's return value.
4. `this` for the original is `console`, the same object the caller used.

**Files**: `site/src/results/console-mirror.ts`

**Validation**:
- [ ] `console.log('a', 1, {b: 2})` with the view on prints the same line as with the view off.
- [ ] Temporarily make a copy step throw: the Console line still appears and the caller sees no error. Remove the throw.
- [ ] `console.error`, `console.debug`, `console.table` and the rest are still native.

**Edge cases**:
- A script that saved a reference to `console.log` before the capture ran can't exist: the capture is the first script on the page after the `dataLayer` initialiser.
- A script that replaces `console.log` later wraps the shop's wrapper. That is fine; the shop's wrapper still runs.

### Subtask T008 – Shape rules and text building

**Purpose**: FR-008. Recognise the runtime's lines by their shape, never by verdict wording.

**Steps**:

1. Constants (all product or format names, none a verdict):

   ```ts
   var BRAND = '%cQuadrano%c · ';
   var BANNER_MARK = 'Console format v1';
   var GROUP_SHAPE = /^%c[\s\S]%c %s$/;
   ```

2. Text builder. The text is the format string with each `%c` removed (and its argument skipped) and each `%s` replaced by `String(argument)`:

   ```ts
   function textOf(args) {
     var index = 1;
     return String(args[0]).replace(/%[cs]/g, function (token) {
       var value = args[index];
       index += 1;
       return token === '%c' ? '' : String(value);
     });
   }
   ```

   For a group start this gives `marker + ' ' + header`. For the banner it gives `Quadrano · Specification … · watching dataLayer`.

3. Apply the rules in this table (it is the contract's, in evaluation order):

   | Call | Condition | Effect |
   |---|---|---|
   | `info` or `warn` | first argument is a string starting with `BRAND` and containing `BANNER_MARK` | `bannerSeen = true`; notify |
   | `info` or `warn` | first argument is a string starting with `BRAND`, no result open, not the banner | add `{ kind: 'line', text: textOf(args) }`; notify |
   | `groupCollapsed` | no result open; exactly 4 arguments; first is a string matching `GROUP_SHAPE` | open a result with `header = textOf(args)` |
   | `groupCollapsed` or `group` | a result is open | count one foreign group |
   | anything else here | | no effect |

   `log` and `groupEnd` are T009.

4. "Starts with" is `value.indexOf(BRAND) === 0`; "contains" is `value.indexOf(BANNER_MARK) !== -1`. Don't use `startsWith` or `includes`.

**Files**: `site/src/results/console-mirror.ts`

**Validation**:
- [ ] `console.info('%cQuadrano%c · x · Console format v1 · y', '', '')` sets `bannerSeen`.
- [ ] `console.info('%cQuadrano%c · No Event Definition for "%s".', '', '', 'view_item')` adds a plain line with text `Quadrano · No Event Definition for "view_item".`
- [ ] `console.info('Quadrano said hello')` adds nothing.
- [ ] `console.groupCollapsed('My group')` adds nothing and opens nothing.
- [ ] The file contains none of the runtime's marks and no verdict wording.

**Edge cases**:
- The banner arriving twice (a second Specification) leaves `bannerSeen` true and adds no entry.
- A branded line written while a result is open is ignored (contract: "no group open").
- `group('%c?%c %s', …)` with no result open does nothing: the runtime uses `groupCollapsed`.
- A first argument that isn't a string never matches.

### Subtask T009 – Result lifecycle, pushed text, limit and listener

**Purpose**: Turn the calls between the runtime's `groupCollapsed` and its `groupEnd` into one result (FR-002, FR-003).

**Steps**:

1. State kept inside the IIFE: `open` (the result being filled, or `null`) and `foreignDepth` (a number).
2. Rules, continuing T008's table:

   | Call | Condition | Effect |
   |---|---|---|
   | `log` | a result is open, `foreignDepth === 0`, exactly 1 argument, a string | push it onto `open.lines` |
   | `log` | a result is open, `foreignDepth === 0`, exactly 2 arguments, a string then a non-null object | set `open.pushed` (step 3) |
   | `groupEnd` | `foreignDepth > 0` | `foreignDepth -= 1` |
   | `groupEnd` | a result is open, `foreignDepth === 0` | add `open` to `entries`; `open = null`; notify |
   | anything else | | no effect |

3. Pushed text, taken when the call is made (research R-06):

   ```ts
   var text;
   try {
     text = JSON.stringify(args[1], null, 2);
   } catch (e) {
     text = undefined;
   }
   if (typeof text !== 'string') {
     text = String(args[1]);
   }
   open.pushed = String(args[0]) + ' ' + text;
   ```

   `JSON.stringify` returns `undefined` for some values and throws on cycles; both fall back to `String(object)`.

4. Adding an entry (results and plain lines share this):

   ```ts
   entries.push(entry);
   if (entries.length > 50) {
     entries.shift();
   }
   notify();
   ```

5. `notify()` calls the registered listener, if any, inside `try`/`catch`.
6. Invariants to check against `data-model.md`: the Console call is made before the state changes; an entry is added only when its shape matched; `entries` never exceeds 50; nothing here touches storage or makes a request.

**Files**: `site/src/results/console-mirror.ts`

**Validation** (in the Console of a page opened with `?results=on`; `?` stands in for the marker):

```js
console.groupCollapsed('%c?%c %s', '', '', 'header one');
console.log('line a');
console.group('someone else');
console.log('ignored');
console.groupEnd();
console.log('line b');
console.log('Pushed:', { event: 'x', n: 1 });
console.groupEnd();
window.__demoShopResults.entries;
```

- [ ] One entry: `header` is `? header one`, `lines` is `['line a', 'line b']`, `pushed` is `Pushed: ` followed by 2-space-indented JSON.
- [ ] A group with no `log` calls gives `lines: []` and `pushed: null`.
- [ ] 51 groups leave 50 entries; the first is gone.
- [ ] A stray `groupEnd()` with nothing open changes nothing.
- [ ] `listen(fn)` after entries exist calls `fn` once at once; each later entry calls it once.

**Edge cases**:
- A second two-argument `log` in one group replaces `pushed`. The runtime writes one.
- A `log` with 3 or more arguments, or a non-string first argument, is ignored.
- If the page unloads while a result is open, it is simply lost; nothing is stored.

### Subtask T010 – Lint: one-file override; the file lint-clean and ES5-safe

**Purpose**: FR-014. Relax the Console rule for this file only. Every other rule stays on.

**Steps**:

1. In `eslint.config.js`, add one override **after** the `site/**/*.ts` block (later blocks win) and before the `scripts/**/*.ts` block:

   ```js
   {
     // Charter 1.2.0: the Results view repeats the runtime's Console output.
     // This is the only file in site/ that may use the Console. The
     // verdict-wording, network and dataLayer rules stay on here.
     files: ['site/src/results/console-mirror.ts'],
     rules: {
       'no-console': 'off',
     },
   },
   ```

   The `files` entry is one literal path. No glob. No other rule in this block. WP04's `verify:results` fails if either stops being true.

2. ES5-safe syntax means: `var`, `function` expressions and declarations, `arguments`, string concatenation, named `catch (e)` bindings. No arrow functions, `let`, `const`, classes, template literals, spread or rest, destructuring, default parameters, `for…of`, optional chaining or `??`. Type annotations are fine; they are stripped.
3. The shared lint config flags some of that style. Handle it **inside the file**, never by widening the override:
   - `no-var` and `prefer-rest-params`: one file-level comment with its reason, for example `/* eslint-disable no-var, prefer-rest-params -- ES5-safe by contract (contracts/console-capture.md) */`.
   - `@typescript-eslint/unbound-method` on `var original = console[name]`: a single `eslint-disable-next-line` with a reason (the method is always called with `console` as `this`).
   - `no-unsafe-*` on `any` arguments: type the copy functions over `IArguments` and narrow with `typeof` before use; treat values as `unknown`.
   - Unused `catch (e)` bindings: check whether the config reports them. If it does, a one-line disable with a reason is acceptable; an optional catch binding is not (it isn't ES5).
4. Don't disable `no-restricted-syntax` (verdict wording, network), `no-restricted-globals` or `no-restricted-properties` anywhere in the file.
5. Run `pnpm lint`. It must pass with no warning from this file.

**Files**: `eslint.config.js`, `site/src/results/console-mirror.ts`

**Validation**:
- [ ] `pnpm lint` passes.
- [ ] Scratch probe: add `console.log('x')` to `site/src/menu/playground.ts`; `pnpm lint` fails with `no-console`. Revert.
- [ ] Scratch probe: add a string holding one of the runtime's marks to the capture file; `pnpm lint` fails with the verdict-wording message. Revert.
- [ ] `git diff eslint.config.js` shows one new block and nothing else.

### Subtask T011 – `vite.config.ts`: inline the capture script first, with guards

**Purpose**: FR-009 and research R-01. The script must run before the offline boot step and the GTM loader, or the banner can be missed.

**Steps**:

1. Add a constant beside `RULES_FILE`:

   ```ts
   const CAPTURE_FILE = resolve(import.meta.dirname, 'site/src/results/console-mirror.ts');
   ```

2. Add `buildCaptureScript()`, modelled on `buildRulesScript()`:

   ```ts
   async function buildCaptureScript(): Promise<string> {
     const source = await readFile(CAPTURE_FILE, 'utf8');
     const { code } = await transformWithOxc(source, CAPTURE_FILE, { lang: 'ts', sourcemap: false });
     // guards (step 3), then:
     return code;
   }
   ```

3. Guards. Each throws a clear `Error`, which fails the build:

   | Check | Suggested test | Message |
   |---|---|---|
   | Module syntax left | `/^\s*(?:import\|export)\b/m` or `/\bimport\s*\(/` | `console-mirror.ts must stay self-contained (no import/export after inlining)` |
   | Closing script tag | `/<\/script/i` | `console-mirror.ts must not contain a closing script tag` |
   | Post-ES5 syntax | `=>`, a backtick, `/\b(?:let\|const\|class)\s/`, `...` | `console-mirror.ts must stay ES5-safe` |
   | Expected names present | `demo-shop:results-view` and `__demoShopResults` | `console-mirror.ts no longer declares <name>` |
   | Never touches the container or the data layer | `demo-shop:visitor-container`, `dataLayer` | `console-mirror.ts must never touch the container or the data layer (C-002)` |

   Run the syntax guard on the code with comments removed, or keep the file's comments free of those tokens. Look at the oxc output once to see whether comments survive, and note it in the Activity Log. If a guard trips on a comment, reword the comment; don't weaken the guard.

4. Memoise it as `rules` is memoised (`cacheRules` decides; the dev server re-reads on each request).
5. Emit it first. In the `transformIndexHtml` handler the head replacement becomes:

   ```ts
   const captureScript = `<script>${captureCode}</script>`;
   const prefix = offline ? OFFLINE_BOOT_SCRIPT : '';
   const withHead = replaceMarker(html, HEAD_MARKER, captureScript + prefix + headScript, ctx.filename);
   ```

   Order at the marker: capture script, offline boot step (offline build only), GTM loader. The capture file is its own IIFE, so don't wrap it again.

6. Update the file's header comment and the comment above the prefix to mention the capture script and why it goes first (research R-01).
7. Don't change the HTML files, the body marker, `buildRulesScript()` or the loader glue.

**Files**: `vite.config.ts`

**Validation**:
- [ ] `dist/index.html` after `pnpm build`: the `dataLayer` initialiser, then the capture `<script>`, then the loader `<script>`.
- [ ] `dist-offline/index.html` after `pnpm exec vite build --mode offline`: capture, then the offline boot step (its marker comment `quadrano-demo-shop:offline-mode`), then the loader.
- [ ] All 5 pages carry it, in both builds.
- [ ] Each guard probed once: add an `import`, a `</script>` in a string, and an arrow function to the capture file in turn; the build fails with your message each time; revert. Record the three outcomes in the Activity Log.
- [ ] `pnpm verify:offline` still passes: the capture script holds neither the offline marker nor the offline snippet key.

**Edge cases**:
- `transformWithOxc` may add nothing and keep `var` as written. If it rewrites anything to newer syntax, the ES5 guard will say so; fix the source, not the guard.
- The capture script adds bytes to each document and no request (research R-02). Check its size and note it; the plan expects about 1 KB.

### Subtask T012 – Manual build check

**Purpose**: Evidence before WP05 to WP07 automate it. Record each outcome in the Activity Log. Never paste a real container ID; `GTM-XXXXXXX` is the only ID-shaped literal you may type.

**Steps**:

1. `pnpm build && pnpm preview`. Open `/`:
   - `console.log` shows as native code.
   - `<html>` has no `data-results-view`.
   - `window.__demoShopResults` is `undefined`.
2. Open `/?results=on`:
   - `<html data-results-view="on">`.
   - `console.log` no longer shows as native code; `console.error` still does.
   - Run the snippet from T009's validation; one entry appears.
   - Go to `/basket/` by the header link: the view is still on (the setting is in `sessionStorage`), and `entries` is empty.
3. Open `/?results=off` and `/?results=` in a new tab each: the view is off.
4. `pnpm exec vite build --mode offline && pnpm exec vite preview --mode offline`. Paste `e2e/fixtures/offline-snippet-before-step8.txt` into the Offline mode panel, press **Use this snippet**, then open `/?results=on`:
   - `window.__demoShopResults.bannerSeen` is `true` straight after load. This is the proof that the capture runs before the offline boot step.
   - Open the Demo menu and press `add_to_cart`: one entry, whose `header` is the Console group's line.
5. `pnpm dev`: the served HTML carries the capture script, and editing the capture file shows up on the next request.
6. `pnpm gates` passes.

---

## Definition of Done

- [ ] Off leaves the page untouched (T005 validation).
- [ ] On: attributes, state object and six wrappers as the contract says.
- [ ] Shape rules match `contracts/console-capture.md`; no verdict mark or wording in the file.
- [ ] One-file lint override; `pnpm lint` passes; both lint probes recorded.
- [ ] Capture script is first at the head marker in both builds; three guard probes recorded.
- [ ] T012 outcomes recorded in the Activity Log.
- [ ] `pnpm gates` passes; `dist/` and `dist-offline/` not committed.
- [ ] `spec-kitty agent tasks mark-status T005 T006 T007 T008 T009 T010 T011 T012 --status done --mission on-page-results-mirror-01M78JHF`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Capture script emitted after the offline boot step | T011 step 5 order; T012 step 4 checks `bannerSeen` in the offline build |
| A throw in the copy step reaches the caller | Original called first; copy in `try`/`catch`; T007 probe |
| Override widened to a directory or more rules | One literal path, one rule; WP04 checks it |
| A verdict mark typed into the file | Marker matched as any one character; verdict-wording rule stays on; T010 probe |
| Off path leaves a trace | Early `return` before any write; T005 validation |
| Entry identity lost (breaks WP03's diff) | Entries are pushed once and never rebuilt |
| Shape too loose (another script's group shown) | Exactly 4 arguments and the exact format pattern; WP05 tests a foreign group |

## Review Guidance

- Read the generated first `<script>` in `dist/index.html` and `dist-offline/index.html` end to end.
- Confirm the order at the head marker in both builds.
- Confirm the file never mentions `dataLayer`, the container key or `_quadrano`, and makes no request.
- Confirm `eslint.config.js` gained one block with one literal path and one rule.
- Ask for the guard and lint probe evidence in the Activity Log, and re-run `pnpm gates` yourself.

## Activity Log

- 2026-11-12T20:26:16Z – system – Prompt generated via /spec-kitty.tasks
