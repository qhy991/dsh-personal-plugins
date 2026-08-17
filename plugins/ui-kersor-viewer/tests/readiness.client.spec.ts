import { describe, expect, it } from 'vitest'
import { visibleFitConfidence } from '../src/client/readiness.ts'

describe('classic Session readiness', () => {
  it('shows a fit verdict while the Session remains dispatchable', () => {
    expect(visibleFitConfidence({ lifecycle: 'active', fit_confidence: 'high' })).toBe('high')
    expect(visibleFitConfidence({ lifecycle: 'completed', fit_confidence: 'low' })).toBe('low')
  })

  it.each(['stalled', 'cancelled'] as const)(
    'lets a %s terminal decision veto historical fit readiness',
    (lifecycle) => {
      expect(visibleFitConfidence({ lifecycle, fit_confidence: 'high' })).toBeUndefined()
    },
  )
})
