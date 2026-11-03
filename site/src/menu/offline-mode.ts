/**
 * The Offline mode paste panel (FR-021, contract demo-shop-offline-mode.md).
 *
 * Mounted by `ui/layout.ts` only when `import.meta.env.MODE === 'offline'`, a
 * compile-time constant, so a production build tree-shakes this module away.
 * `scripts/verify-offline.ts` proves `dist/` holds no trace of it.
 *
 * The panel stores the presenter's pasted snippet verbatim under
 * `quadrano-demo-shop.offline-snippet` in `sessionStorage`; the head boot step
 * (vite.config.ts) reads that key on every page load and runs the snippet
 * before the first `dataLayer.push`. Validation happens here, at paste time;
 * the boot step re-checks only enough not to throw.
 *
 * Only `site/src/datalayer/push.ts` touches `dataLayer` (FR-016); this module
 * never does.
 */

const SNIPPET_KEY = 'quadrano-demo-shop.offline-snippet';

/**
 * The Quadrano runtime banner, read from the compiled snippet's own header.
 * The compiler writes `/*! quadrano <specId> …` as the bundle's first line
 * (packages/quadrano/compiler/src/snippet.ts, `HEADER_SPEC_ID`). The contract
 * accepts a 12-character `[a-z0-9]` spec ID after the `/*! quadrano ` marker.
 */
const SNIPPET_BANNER = /\/\*! quadrano [a-z0-9]{12} /;

const NONE_STATUS = 'No snippet loaded. The Event playground will log nothing.';
const INVALID_STATUS =
  "That isn't a Quadrano snippet. Copy it again from Get snippet.";

/** A validated paste: the `<script>` body and the spec ID the banner carries. */
interface ParsedSnippet {
  readonly scriptBody: string;
  readonly specId: string;
}

function readRaw(): string | null {
  try {
    return window.sessionStorage.getItem(SNIPPET_KEY);
  } catch {
    return null;
  }
}

function writeRaw(text: string): boolean {
  try {
    window.sessionStorage.setItem(SNIPPET_KEY, text);
    return window.sessionStorage.getItem(SNIPPET_KEY) === text;
  } catch {
    return false;
  }
}

function removeRaw(): void {
  try {
    window.sessionStorage.removeItem(SNIPPET_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

/**
 * Accepts text containing exactly one `<script>…</script>` element whose body
 * carries the Quadrano banner and a 12-character spec ID. Returns null
 * otherwise, so an invalid paste is never stored or run.
 */
function parseSnippet(text: string): ParsedSnippet | null {
  const opens = text.match(/<script\b[^>]*>/gi);
  const closes = text.match(/<\/script>/gi);
  if (opens === null || opens.length !== 1) return null;
  if (closes === null || closes.length !== 1) return null;

  const body = /<script\b[^>]*>([\s\S]*?)<\/script>/i.exec(text);
  if (body === null || body[1] === undefined) return null;

  const banner = SNIPPET_BANNER.exec(body[1]);
  if (banner === null) return null;

  const specId = banner[0].slice('/*! quadrano '.length, banner[0].length - 1);
  return { scriptBody: body[1], specId };
}

function codeElement(text: string): HTMLElement {
  const code = document.createElement('code');
  code.textContent = text;
  return code;
}

/**
 * Renders the panel and returns it. Safe to call twice: the second call
 * returns the already-mounted element.
 */
export function mountOfflinePanel(): HTMLElement {
  const existing = document.getElementById('offline-mode');
  if (existing !== null) {
    return existing;
  }

  const panel = document.createElement('section');
  panel.id = 'offline-mode';
  panel.className = 'offline-mode';
  panel.setAttribute('aria-labelledby', 'offline-mode-title');

  const title = document.createElement('h2');
  title.id = 'offline-mode-title';
  title.className = 'offline-mode__title';
  title.textContent = 'Offline mode';

  const label = document.createElement('label');
  label.htmlFor = 'offline-mode-snippet';
  label.textContent = 'Paste the snippet from Get snippet';

  const textarea = document.createElement('textarea');
  textarea.id = 'offline-mode-snippet';
  textarea.className = 'offline-mode__textarea';
  textarea.rows = 8;
  textarea.spellcheck = false;
  textarea.setAttribute('aria-describedby', 'offline-mode-status');

  const actions = document.createElement('div');
  actions.className = 'offline-mode__actions';

  const useButton = document.createElement('button');
  useButton.type = 'button';
  useButton.className = 'offline-mode__use';
  useButton.textContent = 'Use this snippet';

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'offline-mode__clear';
  clearButton.textContent = 'Clear';

  actions.append(useButton, clearButton);

  const status = document.createElement('p');
  status.id = 'offline-mode-status';
  status.className = 'offline-mode__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  panel.append(title, label, textarea, actions, status);

  const showNone = (): void => {
    status.replaceChildren(document.createTextNode(NONE_STATUS));
  };

  const showInvalid = (): void => {
    status.replaceChildren(document.createTextNode(INVALID_STATUS));
  };

  const showStored = (specId: string): void => {
    status.replaceChildren(
      document.createTextNode('Snippet loaded for Specification '),
      codeElement(specId),
      document.createTextNode('. Reload any page to use it.'),
    );
  };

  useButton.addEventListener('click', () => {
    const parsed = parseSnippet(textarea.value);
    if (parsed === null) {
      showInvalid();
      return;
    }
    // Store verbatim; run nothing now (the contract: "Reload any page to use
    // it"), which keeps "before the first push" true.
    if (!writeRaw(textarea.value)) {
      showNone();
      return;
    }
    showStored(parsed.specId);
  });

  clearButton.addEventListener('click', () => {
    removeRaw();
    textarea.value = '';
    showNone();
  });

  // Reflect what is already stored, so a presenter who saved a snippet on
  // another page sees the stored status rather than the none status.
  const stored = readRaw();
  if (stored !== null) {
    const parsed = parseSnippet(stored);
    if (parsed !== null) {
      showStored(parsed.specId);
    } else {
      showNone();
    }
  } else {
    showNone();
  }

  return panel;
}
