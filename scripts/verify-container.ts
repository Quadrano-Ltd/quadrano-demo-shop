import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CONTAINER_ID_PATTERN,
  SAVED_ID_LIFETIME_MS,
  VISITOR_CONTAINER_KEY,
  chooseContainer,
  isContainerId,
  parseSavedContainer,
  serialiseSavedContainer,
} from '../site/src/container/active-container.ts';
import { GTM_ALLOWLIST, isGtmPlaceholder, scanText } from './lib/secret-scan.ts';
import { mask } from './lib/report.ts';

/**
 * `pnpm verify:container` — the FR-011/FR-012/FR-019 developer check (not a gate).
 *
 * Prints one line per check with its name and the word `ok`, or `not ok` with a
 * clear message, and exits non-zero on any failure. IDs are built at run time,
 * never typed as literals (the only ID-shaped literal allowed is GTM_ALLOWLIST).
 */

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DIGITS = '0123456789';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';

function suffixFrom(alphabet: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet.charAt(randomInt(alphabet.length));
  }
  return out;
}

function suffix(length: number): string {
  return suffixFrom(ALNUM, length);
}

function digits(length: number): string {
  return suffixFrom(DIGITS, length);
}

function letters(length: number): string {
  return suffixFrom(LETTERS, length);
}

function lowerSuffix(length: number): string {
  return suffixFrom(LOWER, length);
}

function containerId(length = 7): string {
  let id: string;
  do {
    id = ['GTM', suffix(length)].join('-');
  } while (isGtmPlaceholder(id));
  return id;
}

const NOW = 1_700_000_000_000;

const checks: ReadonlyArray<readonly [string, () => void]> = [
  [
    'constants',
    () => {
      assert.strictEqual(VISITOR_CONTAINER_KEY, 'demo-shop:visitor-container');
      assert.strictEqual(SAVED_ID_LIFETIME_MS, 86_400_000);
      assert.strictEqual(CONTAINER_ID_PATTERN.source, '^GTM-[A-Z0-9]{4,10}$');
    },
  ],
  [
    'well-formed IDs accepted',
    () => {
      for (const length of [4, 7, 10]) {
        assert.strictEqual(isContainerId(['GTM', digits(length)].join('-')), true);
        assert.strictEqual(isContainerId(['GTM', letters(length)].join('-')), true);
      }
    },
  ],
  [
    'malformed IDs refused (≥10)',
    () => {
      const malformed: unknown[] = [
        ['GTM', suffix(3)].join('-'), // too short
        ['GTM', suffix(11)].join('-'), // too long
        ['gtm', suffix(6)].join('-'), // lower-case prefix
        ['GTM', lowerSuffix(6)].join('-'), // lower-case suffix
        ['UA', digits(6)].join('-'), // wrong prefix
        ['G', suffix(8)].join('-'), // GA4 shape
        [' ', ['GTM', suffix(6)].join('-')].join(''), // leading space
        [['GTM', suffix(6)].join('-'), ' '].join(''), // trailing space
        ['GTM', [suffix(3), ' ', suffix(3)].join('')].join('-'), // inner space
        ['GTM', [suffix(3), '-', suffix(3)].join('')].join('-'), // hyphen inside suffix
        [['GTM', suffix(6)].join('-'), '!'].join(''), // trailing !
        ['GTM', suffix(6)].join('_'), // underscore separator
        ['GTM', suffix(6)].join(''), // no separator
        '', // empty string
        null,
        undefined,
        123,
        {},
      ];
      for (const value of malformed) {
        assert.strictEqual(isContainerId(value), false, `expected malformed: ${String(value)}`);
      }
      assert.ok(malformed.length >= 10);
    },
  ],
  [
    'parse: valid and boundary',
    () => {
      const id = containerId();
      assert.strictEqual(parseSavedContainer(serialiseSavedContainer(id, NOW), NOW), id);
      assert.strictEqual(
        parseSavedContainer(serialiseSavedContainer(id, NOW - SAVED_ID_LIFETIME_MS + 1), NOW),
        id,
      );
      assert.strictEqual(
        parseSavedContainer(serialiseSavedContainer(id, NOW - SAVED_ID_LIFETIME_MS), NOW),
        null,
      );
      assert.strictEqual(parseSavedContainer(serialiseSavedContainer(id, NOW + 1), NOW), null);
    },
  ],
  [
    'parse: tampered',
    () => {
      const id = containerId();
      const tampered: (string | null)[] = [
        null,
        '',
        'junk',
        'null',
        '[]',
        '42',
        JSON.stringify({ id, savedAt: NOW, extra: true }), // extra key
        JSON.stringify({ id }), // missing key
        JSON.stringify({ id, savedAt: String(NOW) }), // savedAt string
        JSON.stringify({ id, savedAt: 1.5 }), // savedAt 1.5
        `{"id":"${id}","savedAt":null}`, // savedAt not a number
        JSON.stringify({ id: ['gtm', suffix(6)].join('-'), savedAt: NOW }), // lower-case id
      ];
      for (const raw of tampered) {
        assert.strictEqual(parseSavedContainer(raw, NOW), null, `expected null for: ${String(raw)}`);
      }
    },
  ],
  [
    'serialise round-trip',
    () => {
      const id = containerId();
      const raw = serialiseSavedContainer(id, NOW);
      assert.strictEqual(parseSavedContainer(raw, NOW), id);
      const parsed = JSON.parse(raw) as { id: string; savedAt: number };
      assert.deepStrictEqual(Object.keys(parsed), ['id', 'savedAt']);
      assert.strictEqual(parsed.id, id);
      assert.strictEqual(parsed.savedAt, NOW);
    },
  ],
  [
    'choose: matrix',
    () => {
      const visitor = containerId();
      const shop = containerId();
      const validRaw = serialiseSavedContainer(visitor, NOW);
      const malformedShop = ['GTM', suffix(3)].join('-');

      assert.deepStrictEqual(
        chooseContainer({ raw: validRaw, storageOk: true, shopId: shop, now: NOW }),
        { source: 'visitor', id: visitor, removeSaved: false },
      );
      assert.deepStrictEqual(
        chooseContainer({ raw: 'junk', storageOk: true, shopId: shop, now: NOW }),
        { source: 'shop', id: shop, removeSaved: true },
      );
      assert.deepStrictEqual(
        chooseContainer({ raw: 'junk', storageOk: true, shopId: null, now: NOW }),
        { source: 'none', id: null, removeSaved: true },
      );
      assert.deepStrictEqual(
        chooseContainer({ raw: null, storageOk: true, shopId: shop, now: NOW }),
        { source: 'shop', id: shop, removeSaved: false },
      );
      assert.deepStrictEqual(
        chooseContainer({ raw: validRaw, storageOk: false, shopId: shop, now: NOW }),
        { source: 'shop', id: shop, removeSaved: false },
      );
      assert.deepStrictEqual(
        chooseContainer({ raw: 'junk', storageOk: true, shopId: malformedShop, now: NOW }),
        { source: 'none', id: null, removeSaved: true },
      );
    },
  ],
  [
    'scanner still flags a real-looking ID',
    () => {
      const id = containerId();
      const findings = scanText('fixture', `id: ${id}`);
      assert.strictEqual(findings.length, 1);
      const text = findings[0] ?? '';
      assert.ok(text.includes('gtm-container-id'));
      assert.ok(text.includes(mask(id)));
    },
  ],
  [
    'scanner accepts the placeholder',
    () => {
      assert.deepStrictEqual(scanText('fixture', GTM_ALLOWLIST), []);
      // Charter 1.1.1: every all-X form is a placeholder.
      for (let length = 4; length <= 10; length += 1) {
        assert.deepStrictEqual(scanText('fixture', ['GTM', 'X'.repeat(length)].join('-')), []);
      }
      // One non-X character makes it real-looking again.
      const nearPlaceholder = ['GTM', 'X'.repeat(6) + '1'].join('-');
      assert.strictEqual(scanText('fixture', nearPlaceholder).length, 1);
    },
  ],
  [
    'scanner skips only lane_head commit SHAs',
    () => {
      const sha = suffixFrom('0123456789abcdef', 40);
      const token = suffixFrom(ALNUM + LOWER, 40);
      // A commit SHA recorded by Spec Kitty, on a line that also says "token".
      assert.deepStrictEqual(
        scanText('fixture', `{"lane_head": "${sha}", "note": "no token"}`),
        [],
      );
      // The same SHA under any other key is still reported.
      assert.strictEqual(scanText('fixture', `{"head": "${sha}", "note": "token"}`).length, 1);
      // A token-shaped value under lane_head is still reported.
      assert.strictEqual(
        scanText('fixture', `{"lane_head": "${token}", "note": "token"}`).length,
        1,
      );
      // A container ID inside a coordination log line is still reported.
      assert.strictEqual(
        scanText('fixture', `{"delta": {"note": "fixed ${containerId()}"}}`).length,
        1,
      );
    },
  ],
  [
    'no-secrets skips no tracked file by path',
    () => {
      // The gate may skip a file only when it can't be read or is binary
      // (C-002: the gate is never narrowed by path).
      const source = readFileSync(resolve(import.meta.dirname, 'no-secrets.ts'), 'utf8');
      const lines = source.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (line.trim() === 'continue;') {
          const before = lines[index - 1] ?? '';
          assert.ok(
            /isBinary\(|catch\b/.test(before),
            `no-secrets.ts:${index + 1} skips a file for a reason other than unreadable or binary`,
          );
        }
      });
      assert.ok(!source.includes('kitty-specs'), 'no-secrets.ts must not name paths to skip');
    },
  ],
  [
    'rules file is self-contained',
    () => {
      const path = resolve(
        import.meta.dirname,
        '..',
        'site',
        'src',
        'container',
        'active-container.ts',
      );
      const source = readFileSync(path, 'utf8');
      for (const line of source.split(/\r?\n/)) {
        assert.ok(
          !line.trimStart().startsWith('import'),
          'active-container.ts must have no imports',
        );
      }
      assert.ok(!source.includes('location.'));
      assert.ok(!source.includes('referrer'));
      assert.ok(!source.includes('URLSearchParams'));
    },
  ],
];

let failed = false;
for (const [name, run] of checks) {
  try {
    run();
    console.log(`ok ${name}`);
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`not ok ${name}: ${message}`);
  }
}

if (failed) {
  process.exit(1);
}
