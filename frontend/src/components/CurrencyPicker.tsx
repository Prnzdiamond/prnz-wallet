import { CURRENCIES, CURRENCY_NAME, type Currency } from '@/lib/money'

interface CurrencyPickerProps {
  value: Currency
  onChange: (currency: Currency) => void
  label?: string
  disabled?: boolean
}

export function CurrencyPicker({ value, onChange, label = 'Currency', disabled }: CurrencyPickerProps) {
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {CURRENCIES.map((currency) => (
          <label
            key={currency}
            className="flex min-h-12 cursor-pointer flex-col justify-center rounded-xl bg-surface px-3 py-2 ring-1 ring-line ring-inset has-checked:bg-naira-wash has-checked:ring-2 has-checked:ring-naira has-focus-visible:outline-2 has-focus-visible:outline-naira"
          >
            <input
              type="radio"
              name="currency"
              value={currency}
              checked={value === currency}
              onChange={() => onChange(currency)}
              className="sr-only"
            />
            <span className="font-semibold">{currency}</span>
            <span className="text-xs text-ink-soft">{CURRENCY_NAME[currency]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
