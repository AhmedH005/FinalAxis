import { readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const outDir = join(appDir, '.test-dist');
const testsDir = join(appDir, 'tests');

rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.tests.json'], {
    cwd: appDir,
    stdio: 'inherit',
  });

  const testFiles = readdirSync(testsDir)
    .filter((file) => file.endsWith('.test.cjs'))
    .sort()
    .map((file) => join(testsDir, file));

  execFileSync('node', ['--test', ...testFiles], {
    cwd: appDir,
    stdio: 'inherit',
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
