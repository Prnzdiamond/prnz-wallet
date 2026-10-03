import type { Currency } from './money'

export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Wallet {
  id: string
  currency: Currency
  currency_name: string
  scale: number
  balance: string
  updated_at: string
}

export type TransactionType = 'funding' | 'transfer' | 'reversal'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed'

export interface Transaction {
  id: string
  reference: string
  type: TransactionType
  direction: 'debit' | 'credit'
  status: TransactionStatus
  failure_reason: string | null
  currency: Currency
  amount: string
  narration: string | null
  counterparty: { name: string; email: string } | null
  balance_after: string | null
  created_at: string
  completed_at: string | null
}

export interface Recipient {
  name: string
  email: string
}

export interface CursorPage<T> {
  data: T[]
  meta: { next_cursor: string | null; per_page: number }
}
