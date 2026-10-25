import {
  SCENARIOS,
  isScenarioId,
  type ScenarioId,
} from '../datalayer/scenarios.ts';
import {
  currentScenario,
  normaliseAddress,
  withScenario,
} from './scenario-url.ts';

/**
 * The on-page scenario control (FR-014). WP06 mounts it once per page, after
 * the header exists.
 *
 * Public API for WP06:
 * - `mountScenarioSwitcher(container)` renders a native `<select>` labelled
 *   "Scenario" and wires URL sync.
 * - `syncScenarioLinks(root)` rewrites every internal link under `root` to
 *   carry the current scenario; pages call it after rendering dynamic content.
 * - `SCENARIO_CHANGE_EVENT` is the DOM event dispatched on `document` after
 *   the scenario changes (by the control or by back/forward); its `detail` is
 *   `{ id: ScenarioId }`.
 *
 * Switching updates the address with `history.pushState` and never pushes to
 * the data layer (FR-015): this module does not import `push.ts` and never
 * references `dataLayer`.
 */

export const SCENARIO_CHANGE_EVENT = 'scenariochange';

/** Guards the single `popstate` listener if mount is ever called twice. */
let popstateBound = false;

function dispatchScenarioChange(id: ScenarioId): void {
  document.dispatchEvent(
    new CustomEvent<{ id: ScenarioId }>(SCENARIO_CHANGE_EVENT, {
      detail: { id },
    }),
  );
}

/** True for path-absolute hrefs that point inside the shop. */
function isInternalHref(href: string): boolean {
  // Fragments (#), mailto:, and full URLs never start with "/"; protocol-
  // relative (//) starts with "/" but points outside the shop.
  return href.startsWith('/') && !href.startsWith('//');
}

/** Rewrites every internal link under `root` to carry the current scenario. */
export function syncScenarioLinks(root: ParentNode = document): void {
  const id = currentScenario();
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const raw = link.getAttribute('href');
    if (raw === null || !isInternalHref(raw)) {
      continue;
    }
    link.setAttribute('href', withScenario(raw, id));
  }
}

/** Renders the Scenario control into `container` and wires URL sync. */
export function mountScenarioSwitcher(container: HTMLElement): void {
  const initialId = normaliseAddress();

  const select = document.createElement('select');
  select.id = 'scenario-select';
  select.name = 'scenario';

  for (const scenario of SCENARIOS) {
    const option = document.createElement('option');
    option.value = scenario.id;
    option.textContent = scenario.label;
    select.append(option);
  }
  select.value = initialId;

  select.addEventListener('change', () => {
    const value = select.value;
    if (!isScenarioId(value)) {
      return;
    }
    const next = withScenario(
      window.location.pathname + window.location.search + window.location.hash,
      value,
    );
    window.history.pushState({ scenario: value }, '', next);
    syncScenarioLinks(document);
    dispatchScenarioChange(value);
  });

  if (!popstateBound) {
    popstateBound = true;
    window.addEventListener('popstate', () => {
      const id = normaliseAddress();
      select.value = id;
      syncScenarioLinks(document);
      dispatchScenarioChange(id);
    });
  }

  const label = document.createElement('label');
  label.className = 'scenario-switcher';

  const caption = document.createElement('span');
  caption.className = 'scenario-switcher__label';
  caption.textContent = 'Scenario';

  label.append(caption, select);
  container.append(label);
}
