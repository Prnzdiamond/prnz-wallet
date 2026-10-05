import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { CopyButton } from '@/components/CopyButton'
import { Alert, ApiErrorAlert, Button, Field, PageHeader, Panel } from '@/components/ui'
import { api } from '@/lib/endpoints'
import { toApiError } from '@/lib/errors'
import { useMe } from '@/lib/queries'
import { formatAccountNumber } from '@/lib/recipient'

const schema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one number.'),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ['password_confirmation'], message: 'The passwords do not match.' })
  .refine((v) => v.password !== v.current_password, { path: ['password'], message: 'Choose a password different from your current one.' })

type Values = z.infer<typeof schema>

const memberSince = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' })

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="flex items-center font-medium break-all">{children}</dd>
    </div>
  )
}

export function ProfilePage() {
  const { data: user } = useMe()
  const change = useMutation({ mutationFn: api.changePassword })
  const { register, handleSubmit, setError, reset, formState } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit((values) =>
    change.mutate(values, {
      onSuccess: () => reset({ current_password: '', password: '', password_confirmation: '' }),
      onError: (error) => {
        for (const [field, message] of Object.entries(toApiError(error).fieldErrors)) {
          if (field in values) setError(field as keyof Values, { message })
        }
      },
    }),
  )

  const apiError = change.error ? toApiError(change.error) : null

  if (!user) return null

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title="Profile" description="Your account details and password." />

      <Panel>
        <h2 className="font-semibold">Account details</h2>
        <dl className="mt-2 divide-y divide-line-soft">
          <Detail label="Name">{user.name}</Detail>
          <Detail label="Email">{user.email}</Detail>
          <Detail label="Account number">
            <span className="tabular">{formatAccountNumber(user.account_number)}</span>
            <CopyButton value={user.account_number} label="Copy account number" className="ml-1 text-ink-soft hover:bg-line-soft" />
          </Detail>
          <Detail label="Member since">{memberSince.format(new Date(user.created_at))}</Detail>
        </dl>
      </Panel>

      <Panel>
        <h2 className="font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-ink-soft">Other devices signed in to your account will be signed out.</p>
        <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
          {change.isSuccess && <Alert tone="success" title="Password changed">Other devices have been signed out.</Alert>}
          {apiError && Object.keys(apiError.fieldErrors).length === 0 && <ApiErrorAlert error={apiError} />}
          <Field label="Current password" type="password" autoComplete="current-password" error={formState.errors.current_password?.message} {...register('current_password')} />
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            error={formState.errors.password?.message}
            {...register('password')}
          />
          <Field label="Confirm new password" type="password" autoComplete="new-password" error={formState.errors.password_confirmation?.message} {...register('password_confirmation')} />
          <Button type="submit" block loading={change.isPending}>
            {change.isPending ? 'Changing password…' : 'Change password'}
          </Button>
        </form>
      </Panel>
    </div>
  )
}
