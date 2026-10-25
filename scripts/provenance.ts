import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import * as git from './lib/git.ts';
import { finding, finish } from './lib/report.ts';

function denylistPath(): string {
  const configured = process.env.QUADRANO_DENYLIST_PATH;
  if (configured !== undefined && configured !== '') {
    return configured;
  }
  return join(homedir(), '.quadrano', 'provenance-denylist.txt');
}

function readDenylist(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    process.stderr.write('provenance: denylist not found or unreadable (set QUADRANO_DENYLIST_PATH)\n');
    process.exit(1);
  }
}

function loadTerms(): string[] {
  const raw = readDenylist(denylistPath());
  const terms = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.toLowerCase());
  if (terms.length === 0) {
    process.stderr.write('provenance: denylist has no terms\n');
    process.exit(1);
  }
  return terms;
}

function matchingTerms(lineLower: string, terms: string[]): number[] {
  const matched: number[] = [];
  terms.forEach((term, index) => {
    if (lineLower.includes(term)) {
      matched.push(index + 1);
    }
  });
  return matched;
}

function scanText(location: string, text: string, terms: string[]): void {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    for (const termNumber of matchingTerms(lower, terms)) {
      finding('provenance', `${location}:${index + 1} matches denylist term #${termNumber}`);
    }
  });
}

function scanCommitMessage(sha: string, message: string, terms: string[]): void {
  const short = sha.slice(0, 7);
  for (const line of message.split(/\r?\n/)) {
    const lower = line.toLowerCase();
    for (const termNumber of matchingTerms(lower, terms)) {
      finding('provenance', `commit ${short} message matches denylist term #${termNumber}`);
    }
  }
}

function main(): void {
  const terms = loadTerms();

  for (const path of git.trackedFiles()) {
    let buffer: Buffer;
    try {
      buffer = readFileSync(path);
    } catch {
      continue;
    }
    if (git.isBinary(buffer)) {
      continue;
    }
    scanText(path, buffer.toString('utf8'), terms);
  }

  const ranges = git.readRangesFromEnv();
  for (const range of ranges) {
    for (const entry of git.introducedBlobs(range)) {
      const buffer = git.readBlob(entry.blob);
      if (git.isBinary(buffer)) {
        continue;
      }
      scanText(`${entry.blob.slice(0, 7)}:${entry.path}`, buffer.toString('utf8'), terms);
    }
    for (const sha of git.commitsIn(range)) {
      scanCommitMessage(sha, git.commitMessage(sha), terms);
    }
  }

  try {
    const head = git.headSha();
    scanCommitMessage(head, git.commitMessage('HEAD'), terms);
  } catch {
    // No HEAD (empty repo): there is nothing else to scan.
  }

  finish('provenance');
}

try {
  main();
} catch {
  process.stderr.write('provenance: internal error\n');
  process.exit(2);
}
