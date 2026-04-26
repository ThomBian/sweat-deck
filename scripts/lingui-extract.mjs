/**
 * Same as `lingui extract`: Lingui's CLI entry uses `import.meta.main` (Node 24.2+).
 */
import { getConfig } from '@lingui/conf';
import extractCommand from '../node_modules/@lingui/cli/dist/lingui-extract.js';
import { resolveWorkersOptions } from '../node_modules/@lingui/cli/dist/api/resolveWorkersOptions.js';

const config = getConfig({});

const result = await extractCommand(config, {
  verbose: true,
  clean: false,
  overwrite: false,
  watch: false,
  workersOptions: resolveWorkersOptions({ workers: '1' }),
});
process.exit(result ? 0 : 1);
