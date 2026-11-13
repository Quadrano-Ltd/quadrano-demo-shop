/**
 * The Results view setting as the menu uses it (FR-004, research R-03).
 * The inline capture script (console-mirror.ts) reads the same key before
 * any module runs; it can't be imported, so the key is repeated here and
 * `pnpm verify:results` keeps the two equal.
 */

export const RESULTS_VIEW_KEY = 'demo-shop:results-view';
export const RESULTS_PARAM = 'results';

/** True when the setting can be read. Reads only; writes nothing. */
export function canReadSetting(): boolean {
  try {
    window.sessionStorage.getItem(RESULTS_VIEW_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Remember the view as on. */
export function rememberOn(): 'saved' | 'unavailable' {
  try {
    const storage = window.sessionStorage;
    storage.setItem(RESULTS_VIEW_KEY, 'on');
    return storage.getItem(RESULTS_VIEW_KEY) === 'on' ? 'saved' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Forget the setting. Never throws. */
export function forget(): void {
  try {
    window.sessionStorage.removeItem(RESULTS_VIEW_KEY);
  } catch {
    // Nothing was stored, so there is nothing to forget.
  }
}

/** The current address with every `results` parameter removed. */
export function addressWithoutResults(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(RESULTS_PARAM);
  return url.pathname + url.search + url.hash;
}
