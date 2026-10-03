export type Currency = 'NGN' | 'USD' | 'USDT'

export const CURRENCIES: Currency[] = ['NGN', 'USD', 'USDT']

export const SCALE: Record<Currency, number> = { NGN: 2, USD: 2, USDT: 6 }

export const CURRENCY_NAME: Record<Currency, string> = {
  NGN: 'Naira',
  USD: 'US Dollar',
  USDT: 'Tether',
}

const SYMBOL: Partial<Record<Currency, string>> = { NGN: '₦', USD: '$' }

export function amountPattern(currency: Currency): RegExp {
  return new RegExp(`^(0|[1-9]\\d{0,11})(\\.\\d{1,${SCALE[currency]}})?$`)
}

export function normaliseAmountInput(raw: string): string {
  return raw.replace(/[,\s]/g, '')
}

export function isPositiveAmount(amount: string): boolean {
  return /[1-9]/.test(amount)
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatAmount(amount: string, currency: Currency): string {
  const negative = amount.startsWith('-')
  const [whole, fraction = ''] = (negative ? amount.slice(1) : amount).split('.')
  const minDecimals = currency === 'USDT' ? 2 : SCALE[currency]
  const trimmed = fraction.replace(/0+$/, '').padEnd(minDecimals, '0')
  const body = groupThousands(whole) + (trimmed ? `.${trimmed}` : '')

  return `${negative ? '-' : ''}${body}`
}

export function formatMoney(amount: string, currency: Currency): string {
  const symbol = SYMBOL[currency]
  const value = formatAmount(amount.replace(/^-/, ''), currency)
  const sign = amount.startsWith('-') ? '-' : ''

  return symbol ? `${sign}${symbol}${value}` : `${sign}${value} ${currency}`
}

export function toMinorUnits(amount: string, currency: Currency): bigint {
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole + fraction.padEnd(SCALE[currency], '0'))
}
