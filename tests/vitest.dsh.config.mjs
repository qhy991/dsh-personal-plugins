/** Standalone Vitest config for checking this preset against a DSH source tree. */

import { accessSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'


const dshRoot = process.env.DSH_SOURCE_ROOT
if (typeof dshRoot !== 'string' || dshRoot.length === 0) {
  throw new Error('DSH_SOURCE_ROOT must name a DeepSeek Harness source checkout')
}
accessSync(join(dshRoot, 'tsconfig.base.json'))
const pathsModule = await import(pathToFileURL(
  join(dshRoot, 'node_modules', 'vite-tsconfig-paths', 'dist', 'index.js'),
).href)
const tsconfigPaths = pathsModule.default

export default {
  root: dshRoot,
  plugins: [tsconfigPaths({ projects: [join(dshRoot, 'tsconfig.base.json')] })],
  resolve: {
    alias: {
      vitest: join(dshRoot, 'node_modules', 'vitest', 'dist', 'index.js'),
      '@deepseek-ai/cordis': join(dshRoot, 'vendor', 'cordis', 'src', 'index.ts'),
      '@deepseek-ai/cordis-plugin-loader': join(
        dshRoot, 'vendor', 'loader', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-scope': join(
        dshRoot, 'packages', 'core', 'scope', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-llm': join(
        dshRoot, 'packages', 'llm', 'llm', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-session': join(
        dshRoot, 'packages', 'core', 'session', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-system-prompt': join(
        dshRoot, 'packages', 'core', 'system-prompt', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-agent': join(
        dshRoot, 'packages', 'core', 'agent', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-agent-loop': join(
        dshRoot, 'packages', 'core', 'agent-loop', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-agent-loop-testkit': join(
        dshRoot, 'packages', 'test-support', 'agent-loop-testkit', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-tools': join(
        dshRoot, 'packages', 'core', 'tools', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-code-runtime': join(
        dshRoot, 'packages', 'code-runtime', 'code-runtime', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-subagent': join(
        dshRoot, 'packages', 'subagent', 'subagent', 'src', 'index.ts',
      ),
      '@deepseek-ai/dsh-subagent-fork-in-process': join(
        dshRoot, 'packages', 'subagent', 'subagent-fork-in-process', 'src', 'index.ts',
      ),
      '@dsh-test/mock-adapter': join(
        dshRoot, 'packages', 'core', 'agent-loop', 'tests', 'mock-adapter.ts',
      ),
    },
  },
  test: {
    include: [fileURLToPath(new URL('./modus-router.dsh.spec.ts', import.meta.url))],
    environment: 'node',
    fileParallelism: false,
  },
}
