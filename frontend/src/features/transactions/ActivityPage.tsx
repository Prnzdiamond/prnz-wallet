import { ListOrdered } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Button, ErrorState, PageHeader, Panel } from '@/components/ui'
import type { TransactionFilters } from '@/lib/endpoints'
import { toApiError } from '@/lib/errors'
import { CURRENCIES, type Currency } from '@/lib/money'
import { useTransactions } from '@/lib/queries'
import type { TransactionStatus, TransactionType } from '@/lib/types'
import { TransactionListSkeleton, TransactionRow } from './TransactionRow'

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'funding', label: 'Funding' },
  { value: 'transfer', label: 'Transfers' },
]

const STATUSES: { value: TransactionStatus; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

function FilterSelect<T extends string>({ label, value, options, onChange }: { label: string; value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T | undefined) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
        className="min-h-11 rounded-xl bg-surface px-3 font-normal ring-1 ring-line ring-inset focus:ring-2 focus:ring-naira focus:outline-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ActivityPage() {
  const [params, setParams] = useSearchParams()
  const filters: TransactionFilters = {
    type: (params.get('type') as TransactionType) || undefined,
    status: (params.get('status') as TransactionStatus) || undefined,
    currency: (params.get('currency') as Currency) || undefined,
  }

  const setFilter = (key: keyof TransactionFilters, value: string | undefined) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const query = useTransactions(filters)
  const transactions = query.data?.pages.flatMap((p) => p.data) ?? []
  const filtered = Boolean(filters.type || filters.status || filters.currency)

  return (
    <>
      <PageHeader title="Activity" description="Every funding and transfer on your wallets." />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <FilterSelect label="Type" value={filters.type} options={TYPES} onChange={(v) => setFilter('type', v)} />
        <FilterSelect label="Currency" value={filters.currency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} onChange={(v) => setFilter('currency', v)} />
        <FilterSelect label="Status" value={filters.status} options={STATUSES} onChange={(v) => setFilter('status', v)} />
      </div>

      {query.isPending ? (
        <Panel className="px-2 sm:px-3">
          <TransactionListSkeleton rows={6} />
        </Panel>
      ) : query.isError ? (
        <ErrorState error={toApiError(query.error)} onRetry={() => query.refetch()} />
      ) : transactions.length === 0 ? (
        <Panel className="flex flex-col items-start gap-3">
          <ListOrdered className="size-6 text-ink-faint" aria-hidden />
          <p className="font-semibold">{filtered ? 'Nothing matches these filters' : 'No activity yet'}</p>
          <p className="text-sm text-ink-soft">
            {filtered ? 'Try a different type, currency or status.' : 'Add money to your wallet to make your first transaction.'}
          </p>
          {filtered ? (
            <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
              Clear filters
            </Button>
          ) : (
            <Link to="/add-money" className="font-semibold text-naira underline-offset-4 hover:underline">
              Add money
            </Link>
          )}
        </Panel>
      ) : (
        <Panel className="px-2 sm:px-3">
          <ul className="flex flex-col divide-y divide-line-soft">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </ul>
          {query.hasNextPage && (
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                {query.isFetchingNextPage ? 'Loading…' : 'Show more'}
              </Button>
            </div>
          )}
        </Panel>
      )}
    </>
  )
}
