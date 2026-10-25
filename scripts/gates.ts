import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

type Range = readonly string[];

interface Gate {
  name: string;
  command: string;
  args: string[];
  shell: boolean;
}

function isZeroSha(sha: string): boolean {
  return /^0+$/.test(sha);
}

function readPrePushRanges(): Range[] {
  let input: string;
  try {
    input = readFileSync(0, 'utf8');
  } catch {
    return [];
  }
  const ranges: Range[] = [];
  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const fields = trimmed.split(/\s+/);
    const localSha = fields[1];
    const remoteSha = fields[3];
    if (localSha === undefined || remoteSha === undefined) {
      continue;
    }
    if (isZeroSha(localSha)) {
      // Branch deletion: nothing to scan.
      continue;
    }
    if (isZeroSha(remoteSha)) {
      // New branch: scan everything not already known to remotes.
      ranges.push([localSha, '--not', '--remotes']);
    } else {
      ranges.push([`${remoteSha}..${localSha}`]);
    }
  }
  return ranges;
}

function readCiRanges(): Range[] {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath === undefined || eventPath === '') {
    return [];
  }
  let event: unknown;
  try {
    event = JSON.parse(readFileSync(eventPath, 'utf8'));
  } catch {
    return [];
  }
  if (event === null || typeof event !== 'object') {
    return [];
  }
  const record = event as Record<string, unknown>;
  if (eventName === 'push') {
    const before = typeof record.before === 'string' ? record.before : '';
    const after = typeof record.after === 'string' ? record.after : '';
    if (after.length === 0) {
      return [];
    }
    if (isZeroSha(before)) {
      const repository = record.repository as Record<string, unknown> | undefined;
      const defaultBranch = repository?.default_branch;
      if (typeof defaultBranch === 'string' && defaultBranch.length > 0) {
        return [[after, '--not', `origin/${defaultBranch}`]];
      }
      return [[after, '--not', '--remotes']];
    }
    return [[`${before}..${after}`]];
  }
  if (eventName === 'pull_request') {
    const pullRequest = record.pull_request as Record<string, unknown> | undefined;
    const base = pullRequest?.base as Record<string, unknown> | undefined;
    const head = pullRequest?.head as Record<string, unknown> | undefined;
    const baseSha = base?.sha;
    const headSha = head?.sha;
    if (typeof baseSha !== 'string' || typeof headSha !== 'string') {
      return [];
    }
    return [[`${baseSha}..${headSha}`]];
  }
  return [];
}

function main(): void {
  const flags = process.argv.slice(2);
  const prePush = flags.includes('--pre-push');
  const ci = flags.includes('--ci');
  if (prePush && ci) {
    process.stderr.write('gates: --pre-push and --ci are mutually exclusive\n');
    process.exit(2);
  }

  let ranges: Range[] = [];
  if (prePush) {
    ranges = readPrePushRanges();
  } else if (ci) {
    ranges = readCiRanges();
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    QUADRANO_GATE_RANGES: JSON.stringify(ranges),
  };

  const gates: Gate[] = [
    { name: 'lint', command: 'pnpm', args: ['run', 'lint'], shell: process.platform === 'win32' },
    { name: 'build', command: 'pnpm', args: ['run', 'build'], shell: process.platform === 'win32' },
    {
      name: 'no-secrets',
      command: process.execPath,
      args: ['scripts/no-secrets.ts', ...(ci ? ['--history'] : [])],
      shell: false,
    },
    { name: 'provenance', command: process.execPath, args: ['scripts/provenance.ts'], shell: false },
  ];

  let index = 0;
  for (const gate of gates) {
    index++;
    process.stdout.write(`[${index}/4] ${gate.name}\n`);
    const result = spawnSync(gate.command, gate.args, { stdio: 'inherit', env, shell: gate.shell });
    if (result.error !== undefined) {
      process.stdout.write(`gates: failed at ${gate.name}\n`);
      process.exit(1);
    }
    if (result.status !== 0) {
      process.stdout.write(`gates: failed at ${gate.name}\n`);
      process.exit(result.status ?? 1);
    }
  }

  process.stdout.write('gates: all 4 passed\n');
}

main();
