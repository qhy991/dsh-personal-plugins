/** Read-only KerSor status tool with a replay-safe DSH presentation card. */

import { execFile } from 'node:child_process'
import { realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'


export const name = 'kersor-status'
export const inject = ['tools']

const execFileAsync = promisify(execFile)
const BRIDGE = fileURLToPath(new URL('../bin/kersor_bridge.py', import.meta.url))

const nullable = schema => ({ oneOf: [schema, { type: 'null' }] })

const STATUS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    found: { type: 'boolean' },
    project_path: { type: 'string' },
    session_dir: nullable({ type: 'string' }),
    storage_kind: nullable({ type: 'string' }),
    phase: nullable({ type: 'string' }),
    current_round: nullable({ type: 'integer' }),
    max_workflows: nullable({ type: 'integer' }),
    target_speedup: nullable({ type: 'number' }),
    target_met: nullable({ type: 'boolean' }),
    mode: nullable({ type: 'string' }),
    backend: nullable({ type: 'string' }),
    kernel_language: nullable({ type: 'string' }),
    kernel_path: nullable({ type: 'string' }),
    workflow: nullable({ type: 'string' }),
    fit_confidence: nullable({ type: 'string' }),
    best_speedup: nullable({ type: 'number' }),
    rounds: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          round: { type: 'integer' },
          workflow: nullable({ type: 'string' }),
          speedup: nullable({ type: 'number' }),
          decision: nullable({ type: 'string' }),
        },
        required: ['round', 'workflow', 'speedup', 'decision'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'found', 'project_path', 'session_dir', 'storage_kind', 'phase',
    'current_round', 'max_workflows', 'target_speedup', 'target_met', 'mode',
    'backend', 'kernel_language', 'kernel_path', 'workflow', 'fit_confidence',
    'best_speedup', 'rounds', 'warnings',
  ],
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function display(value, suffix = '') {
  return value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`
}

function progress(current, maximum) {
  if (!Number.isInteger(current) || !Number.isInteger(maximum) || maximum < 1) return null
  const ratio = Math.max(0, Math.min(1, current / maximum))
  const filled = Math.round(ratio * 10)
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${Math.round(ratio * 100)}%`
}

function decisionKind(decision) {
  if (typeof decision !== 'string') return '—'
  return decision.split(':', 1)[0]
}

export function renderStatus(value) {
  if (!value.found) {
    const warnings = value.warnings.length > 0
      ? `\n\nWarnings:\n${value.warnings.map(item => `- ${item}`).join('\n')}`
      : ''
    return `No KerSor session found under \`${value.project_path}\`.${warnings}`
  }

  const lines = [`**KerSor** · ${display(value.phase)} · round ${display(value.current_round)}/${display(value.max_workflows)}`]
  const bar = progress(value.current_round, value.max_workflows)
  if (bar !== null) lines.push(`\`${bar}\``)
  lines.push(
    '',
    '| Current workflow | Best | Target | Fit | Mode / Backend |',
    '| --- | ---: | ---: | --- | --- |',
    `| ${display(value.workflow)} | ${display(value.best_speedup, 'x')} | ${display(value.target_speedup, 'x')} | ${display(value.fit_confidence)} | ${display(value.mode)} / ${display(value.backend)} |`,
  )

  const recent = value.rounds.slice(-5)
  if (recent.length > 0) {
    lines.push(
      '',
      'Recent measured rounds:',
      '',
      '| Round | Workflow | Speedup | Decision |',
      '| ---: | --- | ---: | --- |',
      ...recent.map(row => `| ${row.round} | ${display(row.workflow)} | ${display(row.speedup, 'x')} | ${decisionKind(row.decision)} |`),
    )
  }
  if (value.warnings.length > 0) {
    lines.push('', 'Warnings:', ...value.warnings.map(item => `- ${item}`))
  }
  lines.push('', `Session: \`${value.session_dir}\``)
  return lines.join('\n')
}

export function statusTitle(meta) {
  if (!isRecord(meta) || meta.found !== true) return 'KerSor · No session'
  const round = Number.isInteger(meta.current_round) && Number.isInteger(meta.max_workflows)
    ? ` · r${meta.current_round}/${meta.max_workflows}`
    : ''
  const best = typeof meta.best_speedup === 'number' ? ` · ${meta.best_speedup}x` : ''
  return `KerSor · ${display(meta.phase)}${round}${best}`
}

async function workspaceTarget(args, exec) {
  const workspace = exec.agent?.session.header.cwd
  if (typeof workspace !== 'string' || workspace.length === 0) {
    throw new Error('kersor_status requires a DSH session workspace')
  }
  const workspaceRoot = await realpath(workspace)
  const requested = args.path === undefined ? workspaceRoot : args.path
  if (typeof requested !== 'string' || requested.trim().length === 0) {
    throw new Error('path must be a non-empty string when provided')
  }
  const target = await realpath(resolve(workspaceRoot, requested))
  const relation = relative(workspaceRoot, target)
  if (relation === '..' || relation.startsWith(`..${sep}`) || isAbsolute(relation)) {
    throw new Error(`path is outside the DSH session workspace: ${requested}`)
  }
  return target
}

export function createTool() {
  return {
    name: 'kersor_status',
    description: 'Read the current KerSor session phase, workflow, progress, measured speedups, target, fit, and recent round decisions in this DSH workspace.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        path: {
          type: 'string',
          description: 'Workspace-relative project or KerSor session path. Defaults to the DSH session workspace.',
        },
      },
    },
    output: {
      schema: STATUS_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: renderStatus(value) }],
      presentationMeta: (_args, value) => ({
        found: value.found,
        phase: value.phase,
        current_round: value.current_round,
        max_workflows: value.max_workflows,
        best_speedup: value.best_speedup,
        target_speedup: value.target_speedup,
        target_met: value.target_met,
        workflow: value.workflow,
        session_dir: value.session_dir,
      }),
    },
    async execute(args, exec) {
      const target = await workspaceTarget(args, exec)
      const { stdout } = await execFileAsync(
        'python3',
        [BRIDGE, 'status', '--path', target],
        { encoding: 'utf8', maxBuffer: 1024 * 1024, signal: exec.signal },
      )
      const value = JSON.parse(stdout)
      if (!isRecord(value)) throw new Error('KerSor status bridge returned a non-object')
      return value
    },
    presentCall(args) {
      return {
        card: 'generic',
        title: 'Read KerSor status',
        kind: 'read',
        ...(args.path === undefined ? {} : { rawInput: args.path }),
      }
    },
    presentResult(_args, result) {
      if (result.isError) return { card: 'generic', title: 'KerSor status failed' }
      return {
        card: 'generic',
        title: statusTitle(result.meta),
        content: result.content,
      }
    },
  }
}

export function apply(ctx) {
  ctx.tools.register(createTool())
}
