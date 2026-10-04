export type IdentifierKind = 'account' | 'email' | 'incomplete'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normaliseIdentifier(raw: string): string {
  const value = raw.trim().toLowerCase()
  return /^[\d\s-]+$/.test(value) ? value.replace(/[\s-]/g, '') : value
}

export function identifierKind(value: string): IdentifierKind {
  if (/^[1-9]\d{9}$/.test(value)) return 'account'
  if (EMAIL.test(value)) return 'email'
  return 'incomplete'
}

export function formatAccountNumber(value: string): string {
  return value.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')
}
