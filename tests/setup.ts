import os from 'os'
import path from 'path'

process.env.AIS_CONFIG_HOME = path.join(
  os.tmpdir(),
  `ai-rules-sync-vitest-${process.pid}-${process.env.VITEST_POOL_ID ?? 'main'}`,
)
