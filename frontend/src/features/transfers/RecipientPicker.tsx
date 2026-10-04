import { CheckCircle2, Loader2, X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
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
  selected: Recipient | null
  onSelect: (recipient: Recipient | null) => void
}

export function RecipientPicker({ value, onChange, selected, onSelect }: RecipientPickerProps) {
  const listId = useId()
  const { data: me } = useMe()
  const recent = useRecentRecipients()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const normalised = normaliseIdentifier(value)
  const kind = identifierKind(normalised)
  const debounced = useDebouncedValue(normalised, kind === 'email' ? 400 : 0)
  const isSelf = normalised !== '' && (normalised === me?.account_number || normalised === me?.email)
  const lookupKey = kind !== 'incomplete' && !isSelf && debounced === normalised ? normalised : null
  const lookup = useRecipientLookup(lookupKey)

  const query = value.trim().toLowerCase()
  const digits = query.replace(/[\s-]/g, '')
  const recentMatches = (recent.data ?? []).filter(
    (r) => query === '' || r.name.toLowerCase().includes(query) || (/^\d+$/.test(digits) && r.account_number.startsWith(digits)),
  )
  const exact = lookupKey && lookup.isSuccess ? lookup.data : null
  const options = exact ? [exact, ...recentMatches.filter((r) => r.account_number !== exact.account_number)] : recentMatches

  const status = isSelf
    ? { tone: 'error', text: 'You cannot send money to yourself.' }
    : lookupKey && lookup.isFetching
      ? { tone: 'muted', text: 'Checking account…' }
      : lookupKey && lookup.isError
        ? { tone: 'error', text: toApiError(lookup.error).fieldErrors.identifier ?? toApiError(lookup.error).message }
        : /^\d+$/.test(digits) && digits.length < 10
          ? { tone: 'muted', text: `${10 - digits.length} more digit${digits.length === 9 ? '' : 's'}` }
          : kind === 'incomplete' && query !== '' && options.length === 0
            ? { tone: 'muted', text: 'Type the full email address or 10-digit account number.' }
            : null

  const showList = open && (options.length > 0 || status !== null)
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0))

  const pick = (recipient: Recipient) => {
    onSelect(recipient)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (options.length) setActive((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (event.key === 'Enter' && open && options[activeIndex]) {
      event.preventDefault()
      pick(options[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-naira-wash px-4 py-3 ring-1 ring-naira/30" role="status">
        <Initial name={selected.name} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold text-naira-deep">
            <span className="truncate">{selected.name}</span>
            <CheckCircle2 className="size-4 shrink-0" aria-label="Verified" />
          </p>
          <p className="truncate text-sm text-ink-soft">
            {formatAccountNumber(selected.account_number)} · {selected.email_masked}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null)
            onChange('')
          }}
          aria-label="Change recipient"
          className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-white/60"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="recipient" className="text-sm font-medium">
        Account number or email
      </label>
      <div className="relative">
        <input
          id="recipient"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          maxLength={255}
          placeholder="812 345 6789 or name@email.com"
          className="min-h-12 w-full rounded-xl bg-surface px-4 pr-11 text-base ring-1 ring-line ring-inset placeholder:text-ink-faint focus:ring-2 focus:ring-naira focus:outline-none"
        />
        {lookupKey && lookup.isFetching && <Loader2 className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-ink-faint" aria-hidden />}

        {showList && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl bg-surface shadow-lg ring-1 ring-line">
            {options.length > 0 && (
              <ul id={listId} role="listbox" aria-label="Matching accounts" className="max-h-72 overflow-y-auto py-1">
                {options.map((r, index) => (
                  <li
                    key={r.account_number}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(r)}
                    onMouseEnter={() => setActive(index)}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${index === activeIndex ? 'bg-line-soft' : ''}`}
                  >
                    <Initial name={r.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block truncate text-sm text-ink-faint">
                        {formatAccountNumber(r.account_number)} · {r.email_masked}
                      </span>
                    </span>
                    {r === exact ? (
                      <span className="shrink-0 rounded-md bg-naira-wash px-1.5 py-0.5 text-xs font-medium text-naira-deep">Match</span>
                    ) : (
                      <span className="shrink-0 text-xs text-ink-faint">Recent</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {status && (
              <p className={`border-t border-line-soft px-4 py-3 text-sm first:border-t-0 ${status.tone === 'error' ? 'text-debit' : 'text-ink-faint'}`} aria-live="polite">
                {status.text}
              </p>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-ink-faint">Pick the right person from the list to continue.</p>
    </div>
  )
}
