import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { CopyButton } from '@/components/CopyButton'
import { ErrorState, Panel, Skeleton } from '@/components/ui'
import { toApiError } from '@/lib/errors'
import { formatMoney } from '@/lib/money'
import { formatAccountNumber } from '@/lib/recipient'
import { useTransaction } from '@/lib/queries'
import type { Transaction } from '@/lib/types'
import { failureText, formatDateTime, transactionTitle } from './describe'
import { StatusBadge, TransactionIcon } from './TransactionRow'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-medium break-all sm:text-right">{children}</dd>
    </div>
  )
}

export function TransactionReceipt({ tx }: { tx: Transaction }) {
  const failed = tx.status === 'failed'
  const sign = failed ? '' : tx.direction === 'credit' ? '+' : '−'

  return (
    <Panel>
      <div className="flex flex-col items-center gap-3 border-b border-dashed border-line pb-6 text-center">
        <TransactionIcon tx={tx} />
        <p className="text-ink-soft">{transactionTitle(tx)}</p>
        <p className={`tabular text-4xl font-bold tracking-tight ${failed ? 'text-ink-faint line-through' : ''}`}>
          {sign}
          {formatMoney(tx.amount, tx.currency)}
        </p>
        {failed ? (
          <p className="rounded-lg bg-debit-wash px-3 py-1 text-sm font-medium text-debit">Failed: {failureText(tx.failure_reason)}. No money moved.</p>
        ) : (
          <StatusBadge tx={tx} />
        )}
      </div>

      <dl className="divide-y divide-line-soft">
        <Row label="Status">{tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</Row>
        <Row label="Type">{tx.type === 'funding' ? 'Wallet funding' : tx.type === 'transfer' ? 'Transfer' : 'Reversal'}</Row>
        {tx.counterparty && (
          <Row label={tx.direction === 'credit' ? 'From' : 'To'}>
            {tx.counterparty.name}
            <span className="block text-sm font-normal text-ink-soft">{formatAccountNumber(tx.counterparty.account_number)}</span>
          </Row>
        )}
        <Row label="Currency">{tx.currency}</Row>
        {tx.narration && <Row label="Narration">{tx.narration}</Row>}
        {tx.balance_after && <Row label="Balance after">{formatMoney(tx.balance_after, tx.currency)}</Row>}
        <Row label="Date">{formatDateTime(tx.created_at)}</Row>
        <Row label="Reference">
          <span className="tabular text-sm">{tx.reference}</span>
          <CopyButton value={tx.reference} label="Copy reference" className="ml-2 text-ink-soft hover:bg-line-soft" />
        </Row>
        <Row label="Transaction ID">
          <span className="tabular text-sm">{tx.id}</span>
        </Row>
      </dl>
    </Panel>
  )
}

export function TransactionDetailPage() {
  const { id = '' } = useParams()
  const query = useTransaction(id)

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/activity" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Activity
      </Link>

      {query.isPending ? (
        <Panel className="flex flex-col items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="mt-4 h-48 w-full" />
        </Panel>
      ) : query.isError ? (
        toApiError(query.error).status === 404 ? (
          <Panel>
            <p className="font-semibold">Transaction not found</p>
            <p className="mt-1 text-sm text-ink-soft">It may not exist, or it belongs to another account.</p>
          </Panel>
        ) : (
          <ErrorState error={toApiError(query.error)} onRetry={() => query.refetch()} />
        )
      ) : (
        <TransactionReceipt tx={query.data} />
      )}
    </div>
  )
}
