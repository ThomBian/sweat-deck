/**
 * Lingui's `lingui compile` CLI relies on `import.meta.main` (Node 24.2+).
 * This wrapper invokes the compile command on Node 22 so catalogs are emitted.
 */
import { getConfig } from '@lingui/conf';
import { command } from '../node_modules/@lingui/cli/dist/lingui-compile.js';
import { resolveWorkersOptions } from '../node_modules/@lingui/cli/dist/api/resolveWorkersOptions.js';

const args = process.argv.slice(2);
const opts = { strict: false, verbose: false, typescript: false, config: undefined, workers: '1' };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--strict') opts.strict = true;
  else if (a === '--verbose') opts.verbose = true;
  else if (a === '--typescript') opts.typescript = true;
  else if (a === '--config' && args[i + 1]) {
    opts.config = args[++i];
  } else if (a === '--workers' && args[i + 1]) {
    opts.workers = args[++i];
  }
}

const config = getConfig({ configPath: opts.config });
const ok = await command(config, {
  verbose: opts.verbose,
  allowEmpty: !opts.strict,
  failOnCompileError: opts.strict,
  workersOptions: resolveWorkersOptions({ workers: opts.workers }),
  typescript: opts.typescript || config.compileNamespace === 'ts' || false,
  namespace: undefined,
  outputPrefix: undefined,
});

process.exit(ok ? 0 : 1);
