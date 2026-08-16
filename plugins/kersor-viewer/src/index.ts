/**
 * KerSor viewer, node half. Discovers and tails KerSor run directories and
 * forwards folded progress to browser consumers; the browser half ships via
 * exports["./client"], discovered through the package.json dshClient
 * declaration.
 */

export { KersorViewerService, default } from './service.ts'
export type { Config } from './service.ts'
