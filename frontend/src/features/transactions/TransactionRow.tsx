import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { formatMoney } from '@/lib/money'
import type { Transaction } from '@/lib/types'
import { failureText, formatShortDate, transactionTitle } from './describe'

export function StatusBadge({ tx }: { tx: Transaction }) {
  const styles = {
    completed: 'bg-naira-wash text-naira-deep',
    failed: 'bg-debit-wash text-debit',
    pending: 'bg-amber-wash text-amber',
    reversed: 'bg-line-soft text-ink-soft',
  }[tx.status]

  const label = {
    completed: 'Successful',
    failed: `Failed: ${failureText(tx.failure_reason).toLowerCase()}`,
    pending: 'Pending',
    reversed: 'Reversed',
  }[tx.status]

  return <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${styles}`}>{label}</span>
}

export function TransactionIcon({ tx }: { tx: Transaction }) {
  const Icon = tx.type === 'funding' ? Plus : tx.direction === 'credit' ? ArrowDownLeft : ArrowUpRight
  const tone = tx.status === 'failed' ? 'bg-line-soft text-ink-faint' : tx.direction === 'credit' ? 'bg-naira-wash text-naira' : 'bg-debit-wash text-debit'

  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
      <Icon className="size-5" aria-hidden />
    </span>
  )
}

export function TransactionRow({ tx }: { tx: Transaction }) {
  const failed = tx.status === 'failed'
  const sign = failed ? '' : tx.direction === 'credit' ? '+' : '−'
  const amountTone = failed ? 'text-ink-faint line-through' : tx.direction === 'credit' ? 'text-naira' : 'text-ink'

  return (
    <li>
      <Link to={`/activity/${tx.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-line-soft sm:px-3">
        <TransactionIcon tx={tx} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{transactionTitle(tx)}</p>
          <p className="truncate text-sm text-ink-faint">
            {formatShortDate(tx.created_at)}
            {tx.narration && <span> · {tx.narration}</span>}
          </p>
          <p className="hidden truncate text-xs text-ink-faint sm:block">Ref {tx.reference}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className={`tabular text-right font-semibold ${amountTone}`}>
            <span className="sr-only">{tx.direction === 'credit' ? 'Credit' : 'Debit'} </span>
            {sign}
            {formatMoney(tx.amount, tx.currency)}
          </p>
          <StatusBadge tx={tx} />
        </div>
      </Link>
    </li>
  )
}

export function TransactionListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul aria-label="Loading transactions" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-2 py-3 sm:px-3">
          <div className="size-10 animate-pulse rounded-full bg-line-soft" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-line-soft" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-line-soft" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded bg-line-soft" />
        </li>
      ))}
    </ul>
  )
}
