import { describe, expect, it } from 'vitest'
import { amountPattern, formatAmount, formatMoney, isPositiveAmount, normaliseAmountInput, toMinorUnits } from './money'

describe('formatMoney', () => {
  it('formats amounts from strings without floating point', () => {
    expect(formatMoney('1500.50', 'NGN')).toBe('₦1,500.50')
    expect(formatMoney('100000.00', 'NGN')).toBe('₦100,000.00')
    expect(formatMoney('0.10', 'USD')).toBe('$0.10')
    expect(formatMoney('9007199254740993.01', 'NGN')).toBe('₦9,007,199,254,740,993.01')
  })

  it('shows USDT with its significant decimals and a code instead of a symbol', () => {
    expect(formatMoney('1.500000', 'USDT')).toBe('1.50 USDT')
    expect(formatMoney('0.000001', 'USDT')).toBe('0.000001 USDT')
    expect(formatMoney('12.000000', 'USDT')).toBe('12.00 USDT')
  })

  it('keeps the sign in front of the symbol', () => {
    expect(formatMoney('-25.00', 'NGN')).toBe('-₦25.00')
    expect(formatAmount('-1234.5', 'USD')).toBe('-1,234.50')
  })
})

describe('amount input', () => {
  it('accepts amounts within the currency scale', () => {
    expect(amountPattern('NGN').test('1500.05')).toBe(true)
    expect(amountPattern('USDT').test('0.000001')).toBe(true)
  })

  it('rejects amounts beyond the scale or malformed', () => {
    expect(amountPattern('NGN').test('1.005')).toBe(false)
    expect(amountPattern('NGN').test('01')).toBe(false)
    expect(amountPattern('NGN').test('1e3')).toBe(false)
    expect(amountPattern('USDT').test('1.0000001')).toBe(false)
  })

  it('strips grouping separators and detects zero', () => {
    expect(normaliseAmountInput('1,000 000.50')).toBe('1000000.50')
    expect(isPositiveAmount('0.00')).toBe(false)
    expect(isPositiveAmount('0.01')).toBe(true)
  })
})

describe('toMinorUnits', () => {
  it('compares amounts exactly beyond float precision', () => {
    expect(toMinorUnits('80000', 'NGN')).toBe(8000000n)
    expect(toMinorUnits('0.000001', 'USDT')).toBe(1n)
    expect(toMinorUnits('9007199254740993.01', 'NGN') > toMinorUnits('9007199254740993.00', 'NGN')).toBe(true)
  })
})
