import { execFileSync } from 'node:child_process';
import { chmodSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
rmSync('build', { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc')], { stdio: 'inherit' });
chmodSync('build/index.js', 0o755);
