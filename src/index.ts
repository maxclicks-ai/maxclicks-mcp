#!/usr/bin/env node
import minimist from 'minimist';
import { startHttp } from './transports/http.js';
import { startStdio } from './transports/stdio.js';

async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2));
  const useHttp = Boolean(argv.http) || process.env.TRANSPORT === 'http';
  const baseUrl =
    (typeof argv['base-url'] === 'string' && argv['base-url']) ||
    process.env.MAXCLICKS_BASE_URL ||
    undefined;

  if (useHttp) {
    const port = Number(argv.port ?? process.env.PORT ?? 7004);
    const host = typeof argv.host === 'string' ? argv.host : (process.env.HOST ?? '0.0.0.0');
    await startHttp({ port, host, baseUrl: baseUrl || undefined });
  } else {
    await startStdio({ baseUrl: baseUrl || undefined });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
