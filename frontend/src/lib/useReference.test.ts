import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAttemptReference } from './useReference'

describe('useAttemptReference', () => {
  it('reuses the reference when the same request is retried', () => {
    const { result } = renderHook(() => useAttemptReference())
    const payload = { currency: 'NGN', amount: '500' }

    expect(result.current.referenceFor(payload)).toBe(result.current.referenceFor({ ...payload }))
  })

  it('issues a new reference when the request changes', () => {
    const { result } = renderHook(() => useAttemptReference())

    const first = result.current.referenceFor({ currency: 'NGN', amount: '500' })
    const second = result.current.referenceFor({ currency: 'NGN', amount: '600' })

    expect(second).not.toBe(first)
  })

  it('issues a new reference after the attempt is settled', () => {
    const { result } = renderHook(() => useAttemptReference())
    const payload = { currency: 'NGN', amount: '500' }

    const first = result.current.referenceFor(payload)
    act(() => result.current.settle())

    expect(result.current.referenceFor(payload)).not.toBe(first)
  })
})
