import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { Alert, ApiErrorAlert, Button, Field, PageHeader, Panel } from '@/components/ui'
import { isDefinitiveResponse, moneyFields, refineAmount } from '@/features/wallets/amountSchema'
import { toApiError } from '@/lib/errors'
import { CURRENCIES, formatMoney, toMinorUnits, type Currency } from '@/lib/money'
import { useTransfer, useWallets } from '@/lib/queries'
import { formatAccountNumber } from '@/lib/recipient'
import type { Recipient, Transaction } from '@/lib/types'
import { useAttemptReference } from '@/lib/useReference'
import { RecipientPicker } from './RecipientPicker'

const schema = z
  .object({
    narration: z
      .string()
      .trim()
      .max(140, 'Keep the narration under 140 characters.')
      .transform((v) => v || null),
    ...moneyFields,
  })
  .superRefine(refineAmount)

type Input = z.input<typeof schema>
type Output = z.output<typeof schema>
type Draft = Output & { recipient: Recipient }

function initialCurrency(value: string | null): Currency {
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : 'NGN'
}

export function SendPage() {
  const [params] = useSearchParams()
  const wallets = useWallets()
  const transfer = useTransfer()
  const { referenceFor, settle } = useAttemptReference()

  const [identifier, setIdentifier] = useState('')
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [result, setResult] = useState<Transaction | null>(null)

  const { register, control, handleSubmit, setError, reset, formState } = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: { narration: '', currency: initialCurrency(params.get('currency')), amount: '' },
  })

  const currency = useWatch({ control, name: 'currency' })
  const balance = wallets.data?.find((w) => w.currency === currency)?.balance

  const toReview = handleSubmit((values) => {
    if (!recipient) return
    if (balance !== undefined && toMinorUnits(values.amount, values.currency) > toMinorUnits(balance, values.currency)) {
      setError('amount', { message: `That is more than your ${values.currency} balance of ${formatMoney(balance, values.currency)}.` })
      return
    }
    setDraft({ ...values, recipient })
  })

  const confirm = () => {
    if (!draft) return
    const payload = {
      recipient: draft.recipient.account_number,
      currency: draft.currency,
      amount: draft.amount,
      narration: draft.narration,
    }

    transfer.mutate(
      { ...payload, reference: referenceFor(payload) },
      {
        onSuccess: (tx) => {
          settle()
          setResult(tx)
        },
        onError: (error) => {
          const apiError = toApiError(error)
          if (isDefinitiveResponse(apiError)) settle()
          if (apiError.code === 'insufficient_funds' && apiError.data) setResult(apiError.data as Transaction)
        },
      },
    )
  }

  const startAgain = () => {
    setResult(null)
    setDraft(null)
    setIdentifier('')
    transfer.reset()
    reset({ narration: '', currency: draft?.currency ?? 'NGN', amount: '' })
  }

  if (result) {
    const failed = result.status === 'failed'
    return (
      <div className="mx-auto max-w-lg">
        <Panel className="flex flex-col items-center gap-3 py-10 text-center">
          {failed ? <XCircle className="size-10 text-debit" aria-hidden /> : <CheckCircle2 className="size-10 text-naira" aria-hidden />}
          <h1 className="text-xl font-bold">{failed ? 'Transfer failed' : 'Money sent'}</h1>
          <p className={`tabular text-3xl font-bold tracking-tight ${failed ? 'text-ink-faint line-through' : ''}`}>{formatMoney(result.amount, result.currency)}</p>
          <p className="max-w-sm text-ink-soft">
            {failed
              ? 'You do not have enough funds for this transfer. No money left your wallet.'
              : `${result.counterparty?.name} has received your transfer.`}
          </p>
          {!failed && result.balance_after && (
            <p className="text-sm text-ink-soft">
              New {result.currency} balance: <span className="tabular font-semibold text-ink">{formatMoney(result.balance_after, result.currency)}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {failed ? (
              <Link to={`/add-money?currency=${result.currency}`} className="inline-flex min-h-11 items-center rounded-xl bg-naira px-5 font-semibold text-white hover:bg-naira-deep">
                Add money
              </Link>
            ) : (
              <Link to={`/activity/${result.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-naira px-5 font-semibold text-white hover:bg-naira-deep">
                View receipt
              </Link>
            )}
            <Button variant="secondary" onClick={startAgain}>
              {failed ? 'Start again' : 'Send again'}
            </Button>
          </div>
        </Panel>
      </div>
    )
  }

  if (draft) {
    const apiError = transfer.error ? toApiError(transfer.error) : null
    return (
      <div className="mx-auto max-w-lg">
        <button type="button" onClick={() => setDraft(null)} disabled={transfer.isPending} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-50">
          <ArrowLeft className="size-4" aria-hidden />
          Edit details
        </button>
        <PageHeader title="Check and send" description="Make sure these details are right. Transfers cannot be cancelled once sent." />
        <Panel>
          <dl className="divide-y divide-line-soft">
            <div className="pb-4">
              <dt className="text-sm text-ink-soft">You are sending</dt>
              <dd className="tabular mt-1 text-3xl font-bold tracking-tight">{formatMoney(draft.amount, draft.currency)}</dd>
            </div>
            <div className="py-4">
              <dt className="text-sm text-ink-soft">To</dt>
              <dd className="mt-1 font-semibold">{draft.recipient.name}</dd>
              <dd className="text-sm text-ink-soft">{formatAccountNumber(draft.recipient.account_number)}</dd>
            </div>
            {draft.narration && (
              <div className="py-4">
                <dt className="text-sm text-ink-soft">Narration</dt>
                <dd className="mt-1">{draft.narration}</dd>
              </div>
            )}
          </dl>
          {apiError && apiError.code !== 'insufficient_funds' && (
            <div className="mt-2 flex flex-col gap-3">
              <ApiErrorAlert error={apiError} />
              {!isDefinitiveResponse(apiError) && (
                <Alert tone="info">If the transfer went through before the connection dropped, sending again will not send it twice.</Alert>
              )}
            </div>
          )}
          <Button className="mt-6" block loading={transfer.isPending} onClick={confirm}>
            {transfer.isPending ? 'Sending…' : `Send ${formatMoney(draft.amount, draft.currency)}`}
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <PageHeader title="Send money" description="Send to anyone with a Prnz Wallet account." />

      <Panel>
        <h2 className="mb-4 font-semibold">Who are you sending to?</h2>
        <RecipientPicker value={identifier} onChange={setIdentifier} onResolved={setRecipient} />
      </Panel>

      {recipient ? (
        <Panel>
          <form onSubmit={toReview} noValidate className="flex flex-col gap-6">
            <Controller control={control} name="currency" render={({ field }) => <CurrencyPicker value={field.value} onChange={field.onChange} />} />
            <Field
              label="Amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              className="tabular text-lg"
              error={formState.errors.amount?.message}
              hint={balance !== undefined ? `Available: ${formatMoney(balance, currency)}` : undefined}
              {...register('amount')}
            />
            <Field label="Narration (optional)" maxLength={140} placeholder="What is it for?" error={formState.errors.narration?.message} {...register('narration')} />
            <Button type="submit" block>
              Continue
            </Button>
          </form>
        </Panel>
      ) : (
        <p className="px-1 text-sm text-ink-faint">Confirm who you are sending to, then enter the amount.</p>
      )}
    </div>
  )
}
