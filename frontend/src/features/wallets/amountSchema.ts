import { z } from 'zod'
import { amountPattern, CURRENCIES, isPositiveAmount, normaliseAmountInput, SCALE } from '@/lib/money'
import type { ApiError } from '@/lib/errors'

export const moneyFields = {
  currency: z.enum(CURRENCIES),
  amount: z.string().transform(normaliseAmountInput),
}

export function refineAmount(value: { currency: (typeof CURRENCIES)[number]; amount: string }, ctx: z.RefinementCtx) {
  if (!value.amount) {
    ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter an amount.' })
  } else if (!amountPattern(value.currency).test(value.amount)) {
    ctx.addIssue({ code: 'custom', path: ['amount'], message: `Enter a valid amount with at most ${SCALE[value.currency]} decimal places.` })
  } else if (!isPositiveAmount(value.amount)) {
    ctx.addIssue({ code: 'custom', path: ['amount'], message: 'The amount must be greater than zero.' })
  }
}

export function isDefinitiveResponse(error: ApiError): boolean {
  return error.status !== null && error.status < 500
}
