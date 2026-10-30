import { readFileSync } from 'node:fs';
import * as git from './lib/git.ts';
import { finding, finish } from './lib/report.ts';
import { scanText } from './lib/secret-scan.ts';

// Spec Kitty's generated coordination status files are machine-written audit
// metadata (git SHAs, review notes). They are marked linguist-generated in
// .gitattributes and are not where secrets live, so the no-secrets gate skips
// them rather than false-positive on lane_head SHAs and gate names.
const COORDINATION_STATUS_FILE = /^kitty-specs\/[^/]+\/status\.(?:json|events\.jsonl)$/;

function isCoordinationStatusFile(path: string): boolean {
  return COORDINATION_STATUS_FILE.test(path);
}

function main(): void {
  const history = process.argv.includes('--history');

  for (const path of git.trackedFiles()) {
    if (isCoordinationStatusFile(path)) {
      continue;
    }
    let buffer: Buffer;
    try {
      buffer = readFileSync(path);
    } catch {
      continue;
    }
    if (git.isBinary(buffer)) {
      continue;
    }
    for (const text of scanText(path, buffer.toString('utf8'))) {
      finding('no-secrets', text);
    }
  }

  for (const range of git.readRangesFromEnv()) {
    for (const entry of git.introducedBlobs(range)) {
      if (isCoordinationStatusFile(entry.path)) {
        continue;
      }
      const buffer = git.readBlob(entry.blob);
      if (git.isBinary(buffer)) {
        continue;
      }
      const location = `${entry.blob.slice(0, 7)}:${entry.path}`;
      for (const text of scanText(location, buffer.toString('utf8'))) {
        finding('no-secrets', text);
      }
    }
  }

  if (history) {
    for (const entry of git.allHistoryBlobs()) {
      if (isCoordinationStatusFile(entry.path)) {
        continue;
      }
      const buffer = git.readBlob(entry.blob);
      if (git.isBinary(buffer)) {
        continue;
      }
      const location = `${entry.blob.slice(0, 7)}:${entry.path}`;
      for (const text of scanText(location, buffer.toString('utf8'))) {
        finding('no-secrets', text);
      }
    }
  }

  finish('no-secrets');
}

main();
