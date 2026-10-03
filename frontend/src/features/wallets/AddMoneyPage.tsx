import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { Alert, ApiErrorAlert, Button, Field, PageHeader, Panel } from '@/components/ui'
import { toApiError } from '@/lib/errors'
import { CURRENCIES, formatMoney, type Currency } from '@/lib/money'
import { useFund } from '@/lib/queries'
import type { Transaction } from '@/lib/types'
import { useAttemptReference } from '@/lib/useReference'
import { isDefinitiveResponse, moneyFields, refineAmount } from './amountSchema'

const schema = z.object(moneyFields).superRefine(refineAmount)

type Input = z.input<typeof schema>
type Output = z.output<typeof schema>

function initialCurrency(value: string | null): Currency {
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : 'NGN'
}

export function AddMoneyPage() {
  const [params] = useSearchParams()
  const fund = useFund()
  const { referenceFor, settle } = useAttemptReference()
  const [completed, setCompleted] = useState<Transaction | null>(null)

  const { register, control, handleSubmit, setError, reset, formState } = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: { currency: initialCurrency(params.get('currency')), amount: '' },
  })

  const onSubmit = handleSubmit((values) => {
    const reference = referenceFor(values)
    fund.mutate(
      { ...values, reference },
      {
        onSuccess: (tx) => {
          settle()
          setCompleted(tx)
        },
        onError: (error) => {
          const apiError = toApiError(error)
          if (isDefinitiveResponse(apiError)) settle()
          if (apiError.fieldErrors.amount) setError('amount', { message: apiError.fieldErrors.amount })
        },
      },
    )
  })

  const startAgain = () => {
    setCompleted(null)
    fund.reset()
    reset({ currency: completed?.currency ?? 'NGN', amount: '' })
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-lg">
        <Panel className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-naira" aria-hidden />
          <h1 className="text-xl font-bold">Money added</h1>
          <p className="tabular text-3xl font-bold tracking-tight">{formatMoney(completed.amount, completed.currency)}</p>
          {completed.balance_after && (
            <p className="text-ink-soft">
              New {completed.currency} balance: <span className="tabular font-semibold text-ink">{formatMoney(completed.balance_after, completed.currency)}</span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={startAgain}>
              Add more
            </Button>
            <Link to={`/activity/${completed.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-naira px-5 font-semibold text-white hover:bg-naira-deep">
              View receipt
            </Link>
          </div>
        </Panel>
      </div>
    )
  }

  const apiError = fund.error ? toApiError(fund.error) : null

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Add money" description="This is a simulated top-up. The amount is credited to your wallet straight away." />
      <Panel>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          {apiError && !apiError.fieldErrors.amount && (
            <>
              <ApiErrorAlert error={apiError} />
              {!isDefinitiveResponse(apiError) && (
                <Alert tone="info">If the top-up went through before the connection dropped, trying again will not charge you twice.</Alert>
              )}
            </>
          )}
          <Controller control={control} name="currency" render={({ field }) => <CurrencyPicker value={field.value} onChange={field.onChange} disabled={fund.isPending} />} />
          <Field
            label="Amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="tabular text-lg"
            disabled={fund.isPending}
            error={formState.errors.amount?.message}
            {...register('amount')}
          />
          <Button type="submit" block loading={fund.isPending}>
            {fund.isPending ? 'Adding money…' : 'Add money'}
          </Button>
        </form>
      </Panel>
    </div>
  )
}
