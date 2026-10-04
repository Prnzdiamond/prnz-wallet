import { useState } from 'react'
import { Link } from 'react-router'
import { CopyButton } from '@/components/CopyButton'
import { ErrorState, Panel } from '@/components/ui'
import { BalanceNote, BalanceNoteSkeleton } from '@/features/wallets/BalanceNote'
import { TransactionListSkeleton, TransactionRow } from '@/features/transactions/TransactionRow'
import { toApiError } from '@/lib/errors'
import type { Currency } from '@/lib/money'
import { useMe, useTransactions, useWallets } from '@/lib/queries'
import { formatAccountNumber } from '@/lib/recipient'

export function DashboardPage() {
  const { data: user } = useMe()
  const wallets = useWallets()
  const recent = useTransactions({}, 5)
  const [currency, setCurrency] = useState<Currency>('NGN')
  const transactions = recent.data?.pages[0]?.data ?? []
  const firstName = user?.name.split(' ')[0]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Hello, {firstName}</h1>
        {user && (
          <div className="flex items-center gap-1 rounded-xl bg-surface py-1 pr-1 pl-3 ring-1 ring-line">
            <span className="text-sm text-ink-soft">Account number</span>
            <span className="tabular ml-1 font-semibold">{formatAccountNumber(user.account_number)}</span>
            <CopyButton value={user.account_number} label="Copy account number" className="text-ink-soft hover:bg-line-soft" />
          </div>
        )}
      </div>

      {wallets.isPending ? (
        <BalanceNoteSkeleton />
      ) : wallets.isError ? (
        <ErrorState error={toApiError(wallets.error)} onRetry={() => wallets.refetch()} />
      ) : (
        <BalanceNote wallets={wallets.data} selected={currency} onSelect={setCurrency} refreshing={wallets.isFetching} />
      )}

      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="recent-heading" className="text-lg font-bold tracking-tight">
            Recent activity
          </h2>
          {transactions.length > 0 && (
            <Link to="/activity" className="text-sm font-semibold text-naira underline-offset-4 hover:underline">
              See all
            </Link>
          )}
        </div>

        {recent.isPending ? (
          <Panel className="px-2 sm:px-3">
            <TransactionListSkeleton rows={3} />
          </Panel>
        ) : recent.isError ? (
          <ErrorState error={toApiError(recent.error)} onRetry={() => recent.refetch()} />
        ) : transactions.length === 0 ? (
          <Panel>
            <p className="font-semibold">No activity yet</p>
            <p className="mt-1 text-sm text-ink-soft">Your wallets are empty. Add money to get started, then send it to anyone with an account.</p>
            <Link to="/add-money" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-naira px-5 font-semibold text-white hover:bg-naira-deep">
              Add money
            </Link>
          </Panel>
        ) : (
          <Panel className="px-2 sm:px-3">
            <ul className="flex flex-col divide-y divide-line-soft">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </ul>
          </Panel>
        )}
      </section>
    </div>
  )
}
