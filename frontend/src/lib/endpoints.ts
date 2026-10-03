import { ensureCsrfCookie, http } from './api'
import type { Currency } from './money'
import type { CursorPage, Recipient, Transaction, TransactionStatus, TransactionType, User, Wallet } from './types'

export interface RegisterInput {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface FundInput {
  currency: Currency
  amount: string
  reference: string
}

export interface TransferInput extends FundInput {
  recipient_email: string
  narration: string | null
}

export interface TransactionFilters {
  type?: TransactionType
  status?: TransactionStatus
  currency?: Currency
}

export const api = {
  async me() {
    return (await http.get<{ data: User }>('/auth/me')).data.data
  },
  async login(input: { email: string; password: string }) {
    await ensureCsrfCookie()
    return (await http.post<{ data: User }>('/auth/login', input)).data.data
  },
  async register(input: RegisterInput) {
    await ensureCsrfCookie()
    return (await http.post<{ data: User }>('/auth/register', input)).data.data
  },
  async logout() {
    await http.post('/auth/logout')
  },
  async wallets() {
    return (await http.get<{ data: Wallet[] }>('/wallets')).data.data
  },
  async fund(input: FundInput) {
    return (await http.post<{ data: Transaction }>('/wallets/fund', input)).data.data
  },
  async transfer(input: TransferInput) {
    return (await http.post<{ data: Transaction }>('/transfers', input)).data.data
  },
  async recipient(email: string) {
    return (await http.get<{ data: Recipient }>('/recipients', { params: { email } })).data.data
  },
  async transactions(filters: TransactionFilters & { cursor?: string | null; per_page?: number }) {
    return (await http.get<CursorPage<Transaction>>('/transactions', { params: filters })).data
  },
  async transaction(id: string) {
    return (await http.get<{ data: Transaction }>(`/transactions/${encodeURIComponent(id)}`)).data.data
  },
}
