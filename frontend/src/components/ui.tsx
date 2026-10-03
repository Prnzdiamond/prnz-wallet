import { AlertCircle, CheckCircle2, Info, Loader2, RotateCw } from 'lucide-react'
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import type { ApiError } from '@/lib/errors'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-naira text-white hover:bg-naira-deep disabled:bg-naira/45',
  secondary: 'bg-surface text-ink ring-1 ring-line ring-inset hover:bg-line-soft disabled:text-ink-faint',
  ghost: 'text-ink-soft hover:bg-line-soft hover:text-ink disabled:text-ink-faint',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  block?: boolean
}

export function Button({ variant = 'primary', loading = false, block = false, disabled, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-[0.95rem] font-semibold transition-colors disabled:cursor-not-allowed ${buttonStyles[variant]} ${block ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

interface FieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  hint?: ReactNode
  trailing?: ReactNode
}

export function Field({ label, error, hint, trailing, id, className = '', ref, ...props }: FieldProps) {
  const inputId = id ?? props.name
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-12 w-full rounded-xl bg-surface px-4 text-base text-ink ring-1 ring-line ring-inset placeholder:text-ink-faint focus:ring-2 focus:ring-naira focus:outline-none aria-invalid:ring-debit disabled:bg-line-soft ${trailing ? 'pr-20' : ''} ${className}`}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-ink-soft">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-debit">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type AlertTone = 'error' | 'success' | 'info'

const alertStyles: Record<AlertTone, { box: string; icon: typeof Info }> = {
  error: { box: 'bg-debit-wash text-debit', icon: AlertCircle },
  success: { box: 'bg-naira-wash text-naira-deep', icon: CheckCircle2 },
  info: { box: 'bg-amber-wash text-amber', icon: Info },
}

export function Alert({ tone, title, children }: { tone: AlertTone; title?: string; children?: ReactNode }) {
  const { box, icon: Icon } = alertStyles[tone]

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl px-4 py-3 text-sm ${box}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink-soft">{children}</div>}
      </div>
    </div>
  )
}

export function ApiErrorAlert({ error }: { error: ApiError }) {
  return (
    <Alert tone="error" title={error.message}>
      {error.requestId && <span className="text-xs">Support code: {error.requestId.slice(0, 8)}</span>}
    </Alert>
  )
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-6 ring-1 ring-line">
      <p className="font-semibold">{error.isNetworkError ? 'You appear to be offline' : 'This could not be loaded'}</p>
      <p className="text-sm text-ink-soft">{error.message}</p>
      <Button variant="secondary" onClick={onRetry}>
        <RotateCw className="size-4" aria-hidden />
        Try again
      </Button>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-line-soft ${className}`} />
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-ink-soft">{description}</p>}
      </div>
      {action}
    </header>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-surface p-5 ring-1 ring-line sm:p-6 ${className}`}>{children}</section>
}
