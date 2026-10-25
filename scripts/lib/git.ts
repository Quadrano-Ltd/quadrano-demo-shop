import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export type Range = readonly string[];

export interface IntroducedBlob {
  commit: string;
  path: string;
  blob: string;
}

export interface HistoryBlob {
  path: string;
  blob: string;
}

const MAX_BUFFER = 256 * 1024 * 1024;
const ZERO_SHA = '0000000000000000000000000000000000000000';

function runGit(args: readonly string[], input?: string): Buffer {
  return execFileSync('git', args, {
    encoding: 'buffer',
    maxBuffer: MAX_BUFFER,
    input: input === undefined ? undefined : Buffer.from(input, 'utf8'),
  });
}

function runGitText(args: readonly string[], input?: string): string {
  return runGit(args, input).toString('utf8');
}

export function trackedFiles(): string[] {
  const output = runGit(['ls-files', '-z']).toString('utf8');
  return output
    .split('\0')
    .filter((path) => path.length > 0 && existsSync(path));
}

export function commitsIn(range: Range): string[] {
  const output = runGitText(['rev-list', ...range]);
  return output
    .split(/\r?\n/)
    .map((sha) => sha.trim())
    .filter((sha) => sha.length > 0);
}

export function headSha(): string {
  return runGitText(['rev-parse', 'HEAD']).trim();
}

export function introducedBlobs(range: Range): IntroducedBlob[] {
  const result: IntroducedBlob[] = [];
  const seen = new Set<string>();
  for (const commit of commitsIn(range)) {
    const output = runGit([
      'diff-tree',
      '-r',
      '--no-commit-id',
      '--root',
      '-z',
      '--diff-filter=AMRC',
      commit,
    ]).toString('utf8');
    const parts = output.split('\0');
    let i = 0;
    while (i < parts.length) {
      const header = parts[i];
      if (header === undefined || header === '') {
        break;
      }
      if (!header.startsWith(':')) {
        i++;
        continue;
      }
      i++;
      const fields = header.split(' ');
      const newSha = fields[3] ?? '';
      const statusCode = (fields[4] ?? '').charAt(0);
      const firstPath = parts[i] ?? '';
      i++;
      let destination = firstPath;
      if (statusCode === 'R' || statusCode === 'C') {
        destination = parts[i] ?? firstPath;
        i++;
      }
      if (newSha.length > 0 && newSha !== ZERO_SHA && !seen.has(newSha)) {
        seen.add(newSha);
        result.push({ commit, path: destination, blob: newSha });
      }
    }
  }
  return result;
}

export function allHistoryBlobs(): HistoryBlob[] {
  const output = runGitText(['rev-list', '--all', '--objects']);
  const entries: { sha: string; path: string }[] = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const space = trimmed.indexOf(' ');
    if (space === -1) {
      entries.push({ sha: trimmed, path: '' });
    } else {
      entries.push({ sha: trimmed.slice(0, space), path: trimmed.slice(space + 1) });
    }
  }
  if (entries.length === 0) {
    return [];
  }
  const input = entries.map((entry) => entry.sha).join('\n') + '\n';
  const checked = runGitText(['cat-file', '--batch-check'], input);
  const blobShas = new Set<string>();
  for (const line of checked.split(/\r?\n/)) {
    const columns = line.split(' ');
    const sha = columns[0];
    const type = columns[1];
    if (sha !== undefined && type === 'blob') {
      blobShas.add(sha);
    }
  }
  return entries
    .filter((entry) => blobShas.has(entry.sha))
    .map((entry) => ({ path: entry.path, blob: entry.sha }));
}

export function readBlob(sha: string): Buffer {
  return runGit(['cat-file', 'blob', sha]);
}

export function commitMessage(sha: string): string {
  return runGitText(['log', '-1', '--format=%B', sha]);
}

export function isBinary(buffer: Buffer): boolean {
  const limit = Math.min(buffer.length, 8000);
  for (let i = 0; i < limit; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

export function readRangesFromEnv(): Range[] {
  const raw = process.env.QUADRANO_GATE_RANGES;
  if (raw === undefined || raw === '') {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is string[] =>
        Array.isArray(item) && item.every((entry) => typeof entry === 'string'),
    );
  } catch {
    return [];
  }
}
