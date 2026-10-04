import { describe, expect, it } from 'vitest'
import { formatAccountNumber, identifierKind, normaliseIdentifier } from './recipient'

describe('recipient identifiers', () => {
  it('recognises a complete 10-digit account number', () => {
    expect(identifierKind('8123456789')).toBe('account')
    expect(identifierKind('812345678')).toBe('incomplete')
    expect(identifierKind('0123456789')).toBe('incomplete')
  })

  it('recognises an email', () => {
    expect(identifierKind('tunde@demo.test')).toBe('email')
    expect(identifierKind('tunde@demo')).toBe('incomplete')
  })

  it('normalises pasted account numbers and email case', () => {
    expect(normaliseIdentifier(' 812 345-6789 ')).toBe('8123456789')
    expect(normaliseIdentifier(' Tunde@Demo.TEST ')).toBe('tunde@demo.test')
  })

  it('groups account numbers for reading', () => {
    expect(formatAccountNumber('8123456789')).toBe('812 345 6789')
  })
})
