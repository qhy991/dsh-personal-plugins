/** Shared fixed Worker capability policy used by routed and direct Modus Workers. */

export const QUALIFIED_PROFILE_IDS = Object.freeze(['p000', 'p100'])

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
