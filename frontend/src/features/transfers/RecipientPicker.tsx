import { CheckCircle2, Loader2, X } from 'lucide-react'
import { useEffect } from 'react'
import { toApiError } from '@/lib/errors'
import { useMe, useRecentRecipients, useRecipientLookup } from '@/lib/queries'
import { formatAccountNumber, identifierKind, normaliseIdentifier } from '@/lib/recipient'
import type { Recipient } from '@/lib/types'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

function Initial({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-naira-wash font-semibold text-naira-deep">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

interface RecipientPickerProps {
  value: string
  onChange: (value: string) => void
  onResolved: (recipient: Recipient | null) => void
}

export function RecipientPicker({ value, onChange, onResolved }: RecipientPickerProps) {
  const { data: me } = useMe()
  const recent = useRecentRecipients()

  const normalised = normaliseIdentifier(value)
  const kind = identifierKind(normalised)
  const debounced = useDebouncedValue(normalised, kind === 'email' ? 500 : 0)
  const isSelf = normalised !== '' && (normalised === me?.account_number || normalised === me?.email)
  const lookupKey = kind !== 'incomplete' && !isSelf && debounced === normalised ? normalised : null

  const lookup = useRecipientLookup(lookupKey)
  const recipient = lookupKey && lookup.isSuccess ? lookup.data : null

  useEffect(() => {
    onResolved(recipient)
  }, [recipient, onResolved])

  const error = isSelf
    ? 'You cannot send money to yourself.'
    : lookupKey && lookup.isError
      ? (toApiError(lookup.error).fieldErrors.identifier ?? toApiError(lookup.error).message)
      : null

  const hint =
    kind === 'incomplete' && /^\d+$/.test(normalised) && normalised.length < 10
      ? `${10 - normalised.length} more digit${normalised.length === 9 ? '' : 's'}`
      : 'Enter a 10-digit account number or an email address.'

  if (recipient) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-naira-wash px-4 py-3 ring-1 ring-naira/30" role="status">
        <Initial name={recipient.name} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold text-naira-deep">
            <span className="truncate">{recipient.name}</span>
            <CheckCircle2 className="size-4 shrink-0" aria-label="Verified" />
          </p>
          <p className="truncate text-sm text-ink-soft">
            {formatAccountNumber(recipient.account_number)} · {recipient.email_masked}
          </p>
        </div>
        <button type="button" onClick={() => onChange('')} aria-label="Change recipient" className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-white/60">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    )
  }

  const recentList = recent.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="recipient" className="text-sm font-medium">
          Account number or email
        </label>
        <div className="relative">
          <input
            id="recipient"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={255}
            placeholder="812 345 6789 or name@email.com"
            aria-invalid={error ? true : undefined}
            aria-describedby="recipient-help"
            className="min-h-12 w-full rounded-xl bg-surface px-4 pr-11 text-base ring-1 ring-line ring-inset placeholder:text-ink-faint focus:ring-2 focus:ring-naira focus:outline-none aria-invalid:ring-debit"
          />
          {lookupKey && lookup.isFetching && <Loader2 className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-ink-faint" aria-hidden />}
        </div>
        <p id="recipient-help" className={`text-sm ${error ? 'text-debit' : 'text-ink-faint'}`} aria-live="polite">
          {error ?? (lookupKey && lookup.isFetching ? 'Checking account…' : hint)}
        </p>
      </div>

      {recentList.length > 0 && normalised === '' && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Recent</p>
          <ul className="flex flex-col">
            {recentList.map((r) => (
              <li key={r.account_number}>
                <button
                  type="button"
                  onClick={() => onChange(r.account_number)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-line-soft"
                >
                  <Initial name={r.name} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block text-sm text-ink-faint">{formatAccountNumber(r.account_number)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
