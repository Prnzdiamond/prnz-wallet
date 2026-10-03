import { useCallback, useRef } from 'react'

export function useAttemptReference() {
  const attempt = useRef<{ key: string; reference: string } | null>(null)

  const referenceFor = useCallback((payload: unknown) => {
    const key = JSON.stringify(payload)
    if (attempt.current?.key !== key) {
      attempt.current = { key, reference: crypto.randomUUID() }
    }
    return attempt.current.reference
  }, [])

  const settle = useCallback(() => {
    attempt.current = null
  }, [])

  return { referenceFor, settle }
}
