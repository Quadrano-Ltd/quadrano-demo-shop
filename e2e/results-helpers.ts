import { expect, type ConsoleMessage, type Page } from '@playwright/test';

import { SNIPPET_BEFORE_STEP8, scriptBodyOf } from './snippets.ts';

export const RESULTS_VIEW_KEY = 'demo-shop:results-view';

/** Accessible names of the 7 playground buttons, in DOM order. */
export const PLAYGROUND_LABELS = [
  'add_to_cart',
  'purchase · Correct',
  'purchase · 1 · Missing value',
  'purchase · 2 · Value as text',
  'purchase · 3 · Wrong-case key',
  'purchase · 4 · Lower-case currency',
  'purchase · Spare · Bad transaction ID',
] as const;

const GTM_JS_URL = 'https://www.googletagmanager.com/gtm.js?*';

const CAPTURED_METHODS = [
  'groupCollapsed',
  'group',
  'groupEnd',
  'log',
  'info',
  'warn',
] as const;

/** Answer gtm.js with the snippet's script body, as a Custom HTML tag would run it. */
export async function serveSnippetAsGtm(
  page: Page,
  snippet: string = SNIPPET_BEFORE_STEP8,
): Promise<void> {
  await page.route(GTM_JS_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: scriptBodyOf(snippet),
    }),
  );
}

/** Open `path` with the view on by link and wait for the attribute. */
export async function openWithResults(page: Page, path = '/'): Promise<void> {
  const separator = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${separator}results=on`);
  await expect(page.locator('html')).toHaveAttribute('data-results-view', 'on');
}

/** Resolve once the capture state has seen the runtime's banner line. */
export async function waitForBanner(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__demoShopResults?.bannerSeen === true);
}

/** True when the six wrapped Console methods are the browser's own. */
export async function consoleIsNative(page: Page): Promise<boolean> {
  return page.evaluate(
    (names: readonly string[]) =>
      names.every((name) => {
        const method: unknown = (console as unknown as Record<string, unknown>)[name];
        return (
          typeof method === 'function' &&
          Function.prototype.toString.call(method).includes('[native code]')
        );
      }),
    [...CAPTURED_METHODS],
  );
}

/** Count of `li.results__row`. */
export async function rowCount(page: Page): Promise<number> {
  return page.locator('li.results__row').count();
}

export interface ConsoleCall {
  readonly type: string;
  readonly args: readonly unknown[];
}

/** Console calls made while `action` runs, with each argument's JSON value. */
export async function recordConsole(
  page: Page,
  action: () => Promise<void>,
): Promise<ConsoleCall[]> {
  const pending: Array<{ type: string; args: Promise<unknown[]> }> = [];
  const handler = (message: ConsoleMessage): void => {
    pending.push({
      type: message.type(),
      args: Promise.all(
        message.args().map(async (arg) => {
          try {
            const value: unknown = await arg.jsonValue();
            return value;
          } catch {
            return null;
          }
        }),
      ),
    });
  };

  page.on('console', handler);
  try {
    await action();
  } finally {
    page.off('console', handler);
  }

  const calls: ConsoleCall[] = [];
  for (const entry of pending) {
    calls.push({ type: entry.type, args: await entry.args });
  }
  return calls;
}

/** Text of a call, by the same rule the Console applies (`%c` dropped, `%s` filled). */
export function consoleText(args: readonly unknown[]): string {
  let index = 1;
  return String(args[0]).replace(/%[cs]/g, (token) => {
    const value = args[index];
    index += 1;
    return token === '%c' ? '' : String(value);
  });
}

export interface ExpectedResult {
  readonly header: string;
  readonly lines: readonly string[];
  readonly pushed: string | null;
}

/** One ExpectedResult per startGroupCollapsed … endGroup span in `calls`. */
export function expectedResults(calls: readonly ConsoleCall[]): ExpectedResult[] {
  const results: ExpectedResult[] = [];
  let open: { header: string; lines: string[]; pushed: string | null } | null = null;

  for (const call of calls) {
    if (call.type === 'startGroupCollapsed') {
      open = { header: consoleText(call.args), lines: [], pushed: null };
      continue;
    }
    if (call.type === 'endGroup') {
      if (open !== null) {
        results.push({ header: open.header, lines: [...open.lines], pushed: open.pushed });
        open = null;
      }
      continue;
    }
    if (call.type === 'log' && open !== null) {
      const first = call.args[0];
      const second = call.args[1];
      if (call.args.length === 1 && typeof first === 'string') {
        open.lines.push(first);
      } else if (
        call.args.length === 2 &&
        typeof first === 'string' &&
        second !== null &&
        typeof second === 'object'
      ) {
        open.pushed = String(first) + ' ' + JSON.stringify(second, null, 2);
      }
    }
  }

  return results;
}

/** The row at `index` (0 is the newest) as text, expanding it first if needed. */
export async function readRow(page: Page, index: number): Promise<ExpectedResult> {
  const row = page.locator('li.results__row').nth(index);
  const details = row.locator('details.results__result');
  const summary = row.locator('summary.results__header');

  if ((await details.getAttribute('open')) === null) {
    await summary.click();
    await expect(details).toHaveAttribute('open', '');
  }

  const header = (await summary.textContent()) ?? '';
  const lines = await row.locator('p.results__line').allTextContents();
  const pushedElement = row.locator('pre.results__pushed');
  const pushed =
    (await pushedElement.count()) === 0
      ? null
      : ((await pushedElement.textContent()) ?? '');

  return { header, lines, pushed };
}
