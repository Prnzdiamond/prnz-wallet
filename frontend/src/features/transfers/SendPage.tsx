import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { Alert, ApiErrorAlert, Button, Field, PageHeader, Panel } from '@/components/ui'
import { isDefinitiveResponse, moneyFields, refineAmount } from '@/features/wallets/amountSchema'
import { api } from '@/lib/endpoints'
import { toApiError } from '@/lib/errors'
import { CURRENCIES, formatMoney, toMinorUnits, type Currency } from '@/lib/money'
import { useMe, useTransfer, useWallets } from '@/lib/queries'
import type { Recipient, Transaction } from '@/lib/types'
import { useAttemptReference } from '@/lib/useReference'

const schema = z
  .object({
    recipient_email: z.string().trim().toLowerCase().pipe(z.email('Enter the recipient’s email address.')),
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
  const { data: me } = useMe()
  const wallets = useWallets()
  const transfer = useTransfer()
  const { referenceFor, settle } = useAttemptReference()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [result, setResult] = useState<Transaction | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: { recipient_email: '', narration: '', currency: initialCurrency(params.get('currency')), amount: '' },
  })
  const { register, control, handleSubmit, setError, reset, formState } = form

  const currency = useWatch({ control, name: 'currency' })
  const balance = wallets.data?.find((w) => w.currency === currency)?.balance

  const toReview = handleSubmit(async (values) => {
    setLookupError(null)

    if (values.recipient_email === me?.email) {
      setError('recipient_email', { message: 'You cannot send money to yourself.' })
      return
    }
    if (balance !== undefined && toMinorUnits(values.amount, values.currency) > toMinorUnits(balance, values.currency)) {
      setError('amount', { message: `That is more than your ${values.currency} balance of ${formatMoney(balance, values.currency)}.` })
      return
    }

    setLookingUp(true)
    try {
      const recipient = await api.recipient(values.recipient_email)
      setDraft({ ...values, recipient })
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.status === 404) setError('recipient_email', { message: 'We could not find a user with that email.' })
      else if (apiError.fieldErrors.email) setError('recipient_email', { message: apiError.fieldErrors.email })
      else setLookupError(apiError.message)
    } finally {
      setLookingUp(false)
    }
  })

  const confirm = () => {
    if (!draft) return
    const payload = {
      recipient_email: draft.recipient_email,
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
    transfer.reset()
    reset({ recipient_email: '', narration: '', currency: draft?.currency ?? 'NGN', amount: '' })
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
              <dd className="text-sm text-ink-soft">{draft.recipient.email}</dd>
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
    <div className="mx-auto max-w-lg">
      <PageHeader title="Send money" description="Send to anyone with a Prnz Wallet account using their email." />
      <Panel>
        <form onSubmit={toReview} noValidate className="flex flex-col gap-6">
          {lookupError && <Alert tone="error" title={lookupError} />}
          <Field label="Recipient’s email" type="email" autoComplete="off" inputMode="email" error={formState.errors.recipient_email?.message} {...register('recipient_email')} />
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
          <Button type="submit" block loading={lookingUp}>
            {lookingUp ? 'Checking recipient…' : 'Continue'}
          </Button>
        </form>
      </Panel>
    </div>
  )
}
