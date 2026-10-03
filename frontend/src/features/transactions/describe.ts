import type { Transaction } from '@/lib/types'

export function transactionTitle(tx: Transaction): string {
  if (tx.type === 'funding') return 'Wallet funding'
  if (tx.type === 'reversal') return 'Reversal'

  const name = tx.counterparty?.name ?? 'another user'
  if (tx.direction === 'credit') return `Received from ${name}`

  return tx.status === 'failed' ? `Transfer to ${name}` : `Sent to ${name}`
}

const FAILURE_TEXT: Record<string, string> = {
  insufficient_funds: 'Not enough funds',
}

export function failureText(reason: string | null): string {
  return (reason && FAILURE_TEXT[reason]) ?? 'Could not be completed'
}

const dateTime = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
const dayOnly = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' })
const timeOnly = new Intl.DateTimeFormat('en-NG', { timeStyle: 'short' })

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  return date.toDateString() === today.toDateString() ? `Today, ${timeOnly.format(date)}` : dayOnly.format(date)
}
