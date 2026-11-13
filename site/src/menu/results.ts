import {
  addressWithoutResults,
  canReadSetting,
  forget,
  rememberOn,
} from '../results/results-setting.ts';

/**
 * The Results section of the Demo menu (FR-001): repeats, on the page,
 * exactly what the Quadrano runtime wrote to the Console for each push.
 *
 * The shop never judges: every string here is set with `textContent`, so
 * nothing from the Console is ever parsed as markup (FR-014). This module
 * makes no push and never touches `dataLayer` (FR-012), never uses the
 * Console, and never moves focus (FR-013).
 */

const NORMAL_NOTE = 'The page reloads when you change this.';
const BLOCKED_NOTE =
  "This browser blocks site storage, so this view can't be remembered. Open the shop from the talk's link to see it on one page.";
const BANNER_NOT_SEEN =
  "Quadrano hasn't loaded in this browser. On a phone, the likely cause is a content blocker stopping GTM.";
const NO_OUTPUT_YET = 'No output yet';

/**
 * Renders the Results section into `section` (the caller adds the heading)
 * and its status region into `statusHost` (the menu host). Safe to call
 * twice: the second call does nothing.
 */
export function mountResults(section: HTMLElement, statusHost: HTMLElement): void {
  if (section.dataset.resultsMounted === 'true') {
    return;
  }
  section.dataset.resultsMounted = 'true';

  const root = document.documentElement;
  const viewOn = root.getAttribute('data-results-view') === 'on';
  const storageBlocked = viewOn
    ? root.getAttribute('data-results-storage') === 'unavailable'
    : !canReadSetting();

  const wrapper = document.createElement('div');
  wrapper.className = 'results__switch';

  const toggle = document.createElement('input');
  toggle.id = 'results-switch';
  toggle.type = 'checkbox';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-describedby', 'results-switch-note');
  toggle.checked = viewOn;
  toggle.disabled = !viewOn && storageBlocked;

  const label = document.createElement('label');
  label.htmlFor = 'results-switch';
  label.textContent = "Show Quadrano's output on this page";

  const note = document.createElement('p');
  note.id = 'results-switch-note';
  note.className = 'results__note';
  note.textContent = !viewOn && storageBlocked ? BLOCKED_NOTE : NORMAL_NOTE;

  wrapper.append(toggle, label, note);
  section.append(wrapper);

  function showBlocked(): void {
    toggle.checked = false;
    toggle.disabled = true;
    note.textContent = BLOCKED_NOTE;
  }

  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      if (rememberOn() === 'saved') {
        window.location.reload();
        return;
      }
      showBlocked();
      return;
    }
    forget();
    const next = addressWithoutResults();
    const current =
      window.location.pathname + window.location.search + window.location.hash;
    if (next === current) {
      window.location.reload();
    } else {
      window.location.replace(next);
    }
  });

  // With the view off the section holds the heading, the switch and the note,
  // and nothing else (FR-004).
  if (!viewOn) {
    return;
  }

  const state = window.__demoShopResults;

  const empty = document.createElement('p');
  empty.className = 'results__empty';

  const list = document.createElement('ul');
  list.className = 'results__list';

  if (state === undefined) {
    // The attribute says on but the capture script never ran (shouldn't
    // happen). Treat it as "banner not seen, no entries" and don't throw.
    empty.textContent = BANNER_NOT_SEEN;
    section.append(empty);
    return;
  }
  const resultsState = state;

  section.append(empty, list);

  // Results has its own live region, in the menu host outside the panel, so
  // the playground's "Pushed …" announcement is never overwritten (R-09).
  const status = document.createElement('p');
  status.id = 'results-status';
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  statusHost.append(status);

  let lastShown: DemoShopResultEntry | null = null;

  function rowFor(entry: DemoShopResultEntry): HTMLLIElement {
    const row = document.createElement('li');
    row.className = 'results__row';

    if (entry.kind === 'line') {
      const plain = document.createElement('p');
      plain.className = 'results__plain';
      plain.textContent = entry.text;
      row.append(plain);
      return row;
    }

    const details = document.createElement('details');
    details.className = 'results__result';

    const header = document.createElement('summary');
    header.className = 'results__header';
    header.textContent = entry.header;
    details.append(header);

    for (const line of entry.lines) {
      const problem = document.createElement('p');
      problem.className = 'results__line';
      problem.textContent = line;
      details.append(problem);
    }

    if (entry.pushed !== null) {
      const pushed = document.createElement('pre');
      pushed.className = 'results__pushed';
      pushed.textContent = entry.pushed;
      details.append(pushed);
    }

    row.append(details);
    return row;
  }

  function render(): void {
    if (resultsState.entries.length === 0) {
      empty.textContent = resultsState.bannerSeen ? NO_OUTPUT_YET : BANNER_NOT_SEEN;
      if (empty.parentElement === null) {
        section.append(empty);
      }
      return;
    }
    empty.remove();
  }

  function sync(): void {
    const entries = resultsState.entries;
    let from = lastShown === null ? 0 : entries.indexOf(lastShown) + 1;
    if (lastShown !== null && entries.indexOf(lastShown) === -1) {
      // `lastShown` was dropped (more than 50 entries arrived between syncs).
      // Start again from an empty list so rows aren't repeated.
      list.replaceChildren();
      lastShown = null;
      from = 0;
    }

    let lastAdded: DemoShopResultEntry | null = null;
    for (let index = from; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        list.prepend(rowFor(entry));
        lastShown = entry;
        lastAdded = entry;
      }
    }

    while (list.children.length > 50) {
      list.lastElementChild?.remove();
    }

    if (lastAdded !== null) {
      const text = lastAdded.kind === 'group' ? lastAdded.header : lastAdded.text;
      status.textContent = '';
      status.textContent = text;
    }

    render();
  }

  state.listen(sync);
  render();
}
