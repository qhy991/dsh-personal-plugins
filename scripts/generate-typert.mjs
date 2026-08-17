#!/usr/bin/env node

/** Generate one staged Host package's Typert and remote artifacts. */

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'


const [workspaceArgument, packageName] = process.argv.slice(2)
if (!workspaceArgument || !packageName) {
  throw new Error('usage: generate-typert.mjs <workspace-root> <package-name>')
}
const workspace = path.resolve(workspaceArgument)
const generatorUrl = pathToFileURL(
  path.join(workspace, 'packages/typert/generator/lib/types/index.js'),
).href
const { WorkspaceTypertGenerator } = await import(generatorUrl)
const artifacts = new WorkspaceTypertGenerator(workspace).generate(
  [packageName],
  ['host'],
)
if (artifacts.length !== 1 || artifacts[0].face !== 'host') {
  throw new Error(`expected one Host artifact for ${packageName}, found ${artifacts.length}`)
}
const artifact = artifacts[0]
const output = path.join(workspace, artifact.packageRoot, 'lib')
await fs.mkdir(output, { recursive: true })
await fs.writeFile(path.join(output, 'typert.host.js'), artifact.js)
await fs.writeFile(path.join(output, 'typert.host.d.ts'), artifact.dts)
if (artifact.remote === undefined) {
  throw new Error(`${packageName} has no generated Host-for-Client remote`)
}
await fs.writeFile(path.join(output, 'typert.remote-client.js'), artifact.remote.js)
await fs.writeFile(path.join(output, 'typert.remote-client.d.ts'), artifact.remote.dts)
await fs.writeFile(
  path.join(output, 'typert.remote-client.d.ts.map'),
  artifact.remote.dtsMap,
)
