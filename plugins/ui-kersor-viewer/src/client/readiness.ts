/** Terminal-aware presentation policy for a Session's historical fit verdict. */

import type { KersorClassicSession } from '@deepseek-ai/dsh-kersor-viewer/types'

/** A terminal veto outranks any fit result produced before the Session stopped. */
export function visibleFitConfidence(
  session: Pick<KersorClassicSession, 'lifecycle' | 'fit_confidence'>,
): string | undefined {
  if (session.lifecycle === 'stalled' || session.lifecycle === 'cancelled') return undefined
  return session.fit_confidence ?? undefined
}
