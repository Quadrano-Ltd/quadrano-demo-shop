import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { transformWithOxc } from 'vite';

/**
 * `pnpm verify:results` — the FR-014/FR-016/SC-008 developer check (not a gate).
 *
 * Proves the Console lint exception stays exactly one file wide: `no-console`
 * still fires on a fixture of Console use linted under any other `site/` file,
 * and is off only under the capture file. The verdict-wording, network and
 * dataLayer rules must still fire inside the capture file. The capture file
 * must stay self-contained and its storage key must match the setting module's.
 */

const ROOT = resolve(import.meta.dirname, '..');
const CAPTURE_FILE = 'site/src/results/console-mirror.ts';
const SETTING_FILE = 'site/src/results/results-setting.ts';
const OTHER_FILE = 'site/src/menu/playground.ts';
const RESULTS_KEY = 'demo-shop:results-view';

const eslint = new ESLint({ cwd: ROOT });

async function ruleIdsFor(text: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(text, { filePath: resolve(ROOT, file) });
  const messages = result?.messages ?? [];
  const fatal = messages.find((message) => message.ruleId === null);
  if (fatal !== undefined) {
    throw new Error(`lint of ${file} failed: ${fatal.message}`);
  }
  return messages.map((message) => message.ruleId ?? '(fatal)');
}

/** A rule entry is a severity, or an array whose first item is the severity. */
function isError(setting: unknown): boolean {
  if (typeof setting === 'number') return setting === 2;
  if (typeof setting === 'string') return setting === 'error';
  if (Array.isArray(setting)) return isError(setting[0]);
  return false;
}

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function relativeToRoot(file: string): string {
  return file.slice(ROOT.length + 1).replace(/\\/g, '/');
}

const CONSOLE_FIXTURE = "console.log('hello');\n";

// Built at run time so this script holds no typed verdict literal of its own.
const word = ['pass', 'ed'].join('');
const VERDICT_FIXTURE = `export const label = '${word}';\n`;

let strippedCapture: Promise<string> | undefined;
function stripCapture(): Promise<string> {
  strippedCapture ??= (async () => {
    const source = await readFile(resolve(ROOT, CAPTURE_FILE), 'utf8');
    const { code } = await transformWithOxc(source, resolve(ROOT, CAPTURE_FILE), {
      lang: 'ts',
      sourcemap: false,
    });
    return code;
  })();
  return strippedCapture;
}

const checks: ReadonlyArray<readonly [string, () => Promise<void>]> = [
  [
    'Console rule fires outside the capture file',
    async () => {
      const ids = await ruleIdsFor(CONSOLE_FIXTURE, OTHER_FILE);
      assert.ok(
        ids.includes('no-console'),
        `expected no-console, got ${ids.join(', ') || 'nothing'}`,
      );
    },
  ],
  [
    'Console rule is off for the capture file',
    async () => {
      const ids = await ruleIdsFor(CONSOLE_FIXTURE, CAPTURE_FILE);
      assert.ok(!ids.includes('no-console'), `unexpected no-console for ${CAPTURE_FILE}`);
    },
  ],
  [
    'only the capture file may use the Console',
    async () => {
      const files = walkTsFiles(resolve(ROOT, 'site', 'src'));
      assert.ok(
        files.length >= 20,
        `expected at least 20 site/src .ts files, found ${files.length}`,
      );
      for (const file of files) {
        const relative = relativeToRoot(file);
        const config = (await eslint.calculateConfigForFile(file)) as {
          rules?: Record<string, unknown>;
        };
        const setting = config.rules?.['no-console'];
        if (relative === CAPTURE_FILE) {
          assert.ok(!isError(setting), `${relative} must have no-console off`);
        } else {
          assert.ok(isError(setting), `${relative} must have no-console error`);
        }
      }
    },
  ],
  [
    'verdict wording is still caught in the capture file',
    async () => {
      const ids = await ruleIdsFor(VERDICT_FIXTURE, CAPTURE_FILE);
      assert.ok(
        ids.includes('no-restricted-syntax'),
        `expected no-restricted-syntax, got ${ids.join(', ') || 'nothing'}`,
      );
    },
  ],
  [
    'network use is still caught in the capture file',
    async () => {
      const ids = await ruleIdsFor("void fetch('/x');\n", CAPTURE_FILE);
      assert.ok(
        ids.includes('no-restricted-syntax'),
        `expected no-restricted-syntax, got ${ids.join(', ') || 'nothing'}`,
      );
    },
  ],
  [
    'data layer use is still caught in the capture file',
    async () => {
      const ids = await ruleIdsFor('window.dataLayer = [];\n', CAPTURE_FILE);
      assert.ok(
        ids.includes('no-restricted-properties'),
        `expected no-restricted-properties, got ${ids.join(', ') || 'nothing'}`,
      );
    },
  ],
  [
    'the override block names one file only',
    async () => {
      const configSource = await readFile(resolve(ROOT, 'eslint.config.js'), 'utf8');
      assert.ok(
        configSource.includes('site/src/results/console-mirror.ts'),
        'eslint.config.js must name the capture file',
      );
      const entries = configSource.match(/['"]site\/src\/results\/[^'"]*['"]/g) ?? [];
      assert.ok(entries.length > 0, 'eslint.config.js has no site/src/results/ files entry');
      for (const entry of entries) {
        assert.ok(!entry.includes('*'), `override must name one file, got ${entry}`);
      }
    },
  ],
  [
    'capture file has no import or export',
    async () => {
      const stripped = await stripCapture();
      assert.ok(
        !/^\s*(?:import|export)\b/m.test(stripped) && !/\bimport\s*\(/.test(stripped),
        'capture file must stay self-contained (no import/export after type-stripping)',
      );
    },
  ],
  [
    'capture file has no closing script tag',
    async () => {
      const source = await readFile(resolve(ROOT, CAPTURE_FILE), 'utf8');
      const stripped = await stripCapture();
      assert.ok(
        !/<\/script/i.test(source) && !/<\/script/i.test(stripped),
        'capture file must not contain a closing script tag',
      );
    },
  ],
  [
    'capture file never touches the container or the data layer',
    async () => {
      const stripped = await stripCapture();
      assert.ok(
        !stripped.includes('demo-shop:visitor-container'),
        'capture file must not touch the visitor container',
      );
      assert.ok(!stripped.includes('dataLayer'), 'capture file must not touch dataLayer');
    },
  ],
  [
    'capture file makes no request',
    async () => {
      const stripped = await stripCapture();
      assert.ok(
        !/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(stripped),
        'capture file must make no request',
      );
    },
  ],
  [
    'capture file reads no runtime internals',
    async () => {
      const stripped = await stripCapture();
      assert.ok(!stripped.includes('_quadrano'), 'capture file must not read runtime internals');
    },
  ],
  [
    'the setting key is the same in both files',
    async () => {
      const pairs: ReadonlyArray<readonly [string, string]> = [
        [CAPTURE_FILE, resolve(ROOT, CAPTURE_FILE)],
        [SETTING_FILE, resolve(ROOT, SETTING_FILE)],
      ];
      for (const [relative, path] of pairs) {
        let source: string;
        try {
          source = await readFile(path, 'utf8');
        } catch {
          throw new Error(`${relative} not found`);
        }
        assert.ok(
          source.includes(`'${RESULTS_KEY}'`),
          `${relative} must contain the literal '${RESULTS_KEY}'`,
        );
      }
    },
  ],
];

let failed = false;
for (const [name, run] of checks) {
  try {
    await run();
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
