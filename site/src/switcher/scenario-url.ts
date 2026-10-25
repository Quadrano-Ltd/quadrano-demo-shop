import { DEFAULT_SCENARIO_ID, isScenarioId, type ScenarioId } from '../datalayer/scenarios.ts';

/**
 * Helpers for the `scenario` query parameter (contracts/scenario-url.md, R-04).
 * The scenario lives only in the URL: no storage, no pushes.
 */

export const SCENARIO_PARAM = 'scenario';

// Dummy absolute base for resolving internal path-absolute hrefs. The host is
// never kept: `withScenario` returns pathname + search + hash.
const LOCAL_BASE = 'http://local.test';

export function parseScenario(
  raw: string | null | undefined,
): { id: ScenarioId; recognised: boolean } {
  if (raw === null || raw === undefined) {
    return { id: DEFAULT_SCENARIO_ID, recognised: false };
  }
  return isScenarioId(raw)
    ? { id: raw, recognised: true }
    : { id: DEFAULT_SCENARIO_ID, recognised: false };
}

export function scenarioFromSearch(
  search: string,
): { id: ScenarioId; recognised: boolean } {
  const url = new URL(search, LOCAL_BASE);
  return parseScenario(url.searchParams.get(SCENARIO_PARAM));
}

/** True for hrefs that carry a URL scheme, which we leave untouched. */
function hasScheme(href: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href);
}

export function withScenario(href: string, id: ScenarioId): string {
  if (hasScheme(href)) {
    return href;
  }
  const url = new URL(href, LOCAL_BASE);
  url.searchParams.set(SCENARIO_PARAM, id);
  return url.pathname + url.search + url.hash;
}

export function currentScenario(): ScenarioId {
  return scenarioFromSearch(window.location.search).id;
}

export function normaliseAddress(): ScenarioId {
  const { id, recognised } = scenarioFromSearch(window.location.search);
  if (!recognised) {
    const url = new URL(window.location.href);
    url.searchParams.set(SCENARIO_PARAM, DEFAULT_SCENARIO_ID);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  return id;
}
