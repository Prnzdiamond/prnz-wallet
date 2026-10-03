import { ArrowDownToLine, ArrowUpRight } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { CURRENCY_NAME, formatAmount, type Currency } from '@/lib/money'
import type { Wallet } from '@/lib/types'

const SYMBOL: Record<Currency, string> = { NGN: '₦', USD: '$', USDT: '₮' }

interface BalanceNoteProps {
  wallets: Wallet[]
  selected: Currency
  onSelect: (currency: Currency) => void
  refreshing?: boolean
}

export function BalanceNote({ wallets, selected, onSelect, refreshing }: BalanceNoteProps) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const wallet = wallets.find((w) => w.currency === selected) ?? wallets[0]
  const [whole, fraction] = formatAmount(wallet.balance, wallet.currency).split('.')

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + wallets.length) % wallets.length
    onSelect(wallets[next].currency)
    tabs.current[next]?.focus()
  }

  return (
    <section aria-label="Wallet balances" className="guilloche relative overflow-hidden rounded-note bg-naira-deep text-white">
      <div role="tablist" aria-label="Currency" className="flex border-b border-white/15">
        {wallets.map((w, index) => {
          const active = w.currency === wallet.currency
          return (
            <button
              key={w.currency}
              ref={(el) => {
                tabs.current[index] = el
              }}
              role="tab"
              id={`tab-${w.currency}`}
              aria-selected={active}
              aria-controls="balance-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(w.currency)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`relative min-h-12 flex-1 px-3 text-sm font-semibold transition-colors focus-visible:outline-white sm:flex-none sm:px-6 ${active ? 'text-white' : 'text-white/55 hover:text-white/85'}`}
            >
              {w.currency}
              {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-white sm:inset-x-6" aria-hidden />}
            </button>
          )
        })}
      </div>

      <div id="balance-panel" role="tabpanel" aria-labelledby={`tab-${wallet.currency}`} className="relative px-6 pt-6 pb-6 sm:px-8 sm:pt-8">
        <span aria-hidden className="pointer-events-none absolute -top-6 right-2 text-[9rem] leading-none font-extrabold text-white/[0.06] select-none sm:right-6 sm:text-[12rem]">
          {SYMBOL[wallet.currency]}
        </span>

        <p className="text-sm text-white/70">{CURRENCY_NAME[wallet.currency]} balance</p>
        <p className={`tabular mt-2 flex items-baseline gap-1 font-bold tracking-tight transition-opacity ${refreshing ? 'opacity-70' : ''}`} aria-live="polite">
          <span className="text-2xl text-white/80 sm:text-3xl">{wallet.currency === 'USDT' ? '' : SYMBOL[wallet.currency]}</span>
          <span className="text-[2.6rem] leading-none sm:text-6xl">{whole}</span>
          <span className="text-xl text-white/75 sm:text-2xl">.{fraction}</span>
          {wallet.currency === 'USDT' && <span className="ml-1 text-lg text-white/75">USDT</span>}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:flex">
          <Link
            to={`/add-money?currency=${wallet.currency}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-naira-deep hover:bg-naira-wash"
          >
            <ArrowDownToLine className="size-4" aria-hidden />
            Add money
          </Link>
          <Link
            to={`/send?currency=${wallet.currency}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white ring-1 ring-white/40 ring-inset hover:bg-white/10"
          >
            <ArrowUpRight className="size-4" aria-hidden />
            Send
          </Link>
        </div>
      </div>
    </section>
  )
}

export function BalanceNoteSkeleton() {
  return (
    <div aria-label="Loading balances" className="guilloche h-[17.5rem] animate-pulse rounded-note bg-naira-deep/80" />
  )
}
