import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The two WP08 snippet fixtures, read the same way the shop reads its other
 * committed fixtures. Their provenance and regeneration command are recorded
 * in `e2e/fixtures/offline-snippets.source.md`.
 */

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');

export const SNIPPET_BEFORE_STEP8 = readFileSync(
  resolve(FIXTURES_DIR, 'offline-snippet-before-step8.txt'),
  'utf8',
);

export const SNIPPET_AFTER_STEP8 = readFileSync(
  resolve(FIXTURES_DIR, 'offline-snippet-after-step8.txt'),
  'utf8',
);

/** The sessionStorage key the paste panel and the head boot step share. */
export const OFFLINE_SNIPPET_KEY = 'quadrano-demo-shop.offline-snippet';

const SNIPPET_BANNER = /\/\*! quadrano [a-z0-9]{12} /;

/**
 * The 12-character spec ID a snippet's banner carries. Throws if the fixture
 * is not a Quadrano snippet, which is the failure we want for a bad fixture.
 */
export function specIdOf(snippet: string): string {
  const match = SNIPPET_BANNER.exec(snippet);
  if (match === null) {
    throw new Error('fixture snippet carries no Quadrano banner');
  }
  return match[0].slice('/*! quadrano '.length, match[0].length - 1);
}

const SNIPPET_SCRIPT = /<script[^>]*>([\s\S]*?)<\/script>/i;

/**
 * The body of a fixture snippet's script element: what a Custom HTML tag
 * would run. Throws if the fixture holds no script element.
 */
export function scriptBodyOf(snippet: string): string {
  const match = SNIPPET_SCRIPT.exec(snippet);
  if (match === null || match[1] === undefined) {
    throw new Error('fixture snippet holds no script element');
  }
  return match[1];
}
