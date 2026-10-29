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
import { GTM_ALLOWLIST, scanText } from './lib/secret-scan.ts';
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
  } while (id === GTM_ALLOWLIST);
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
