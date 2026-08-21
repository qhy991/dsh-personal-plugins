/** Shared fixed Worker capability policy used by routed and direct Modus Workers. */

export const QUALIFIED_PROFILE_IDS = Object.freeze(['p000', 'p100'])

// Fixed-only development treatments. They are deliberately absent from the
// Router action space until an independent manipulation and outcome gate
// qualifies them.
export const EXPERIMENTAL_FIXED_PROFILE_IDS = Object.freeze(['p001', 'p010'])

export const FIXED_PRE_EDIT_GATED_PROFILE_IDS = Object.freeze([
  ...QUALIFIED_PROFILE_IDS,
  'p001',
])

export const PRE_EDIT_INFORMATION_TOOLS = Object.freeze([
  'read',
  'read_image',
  'glob',
  'grep',
  'bash',
])

export const DEFAULT_WORKER_DENIED_TOOLS = Object.freeze([
  'ask_user_question',
  'web_search',
  'modus_delegate',
  'subagent',
  'subagent_fork',
  'send_message',
  'interrupt_agent',
  'list_agents',
  'workflow',
  'ralph',
])
