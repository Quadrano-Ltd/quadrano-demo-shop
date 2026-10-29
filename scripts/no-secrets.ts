import { readFileSync } from 'node:fs';
import * as git from './lib/git.ts';
import { finding, finish } from './lib/report.ts';
import { scanText } from './lib/secret-scan.ts';

function main(): void {
  const history = process.argv.includes('--history');

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
    for (const text of scanText(path, buffer.toString('utf8'))) {
      finding('no-secrets', text);
    }
  }

  for (const range of git.readRangesFromEnv()) {
    for (const entry of git.introducedBlobs(range)) {
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
