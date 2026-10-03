import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiErrorAlert, Button, Field } from '@/components/ui'
import { toApiError } from '@/lib/errors'
import { useLogin } from '@/lib/queries'
import { AuthLayout } from './AuthLayout'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type Values = z.infer<typeof schema>

export function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const { register, handleSubmit, setError, formState } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => navigate(from, { replace: true }),
      onError: (error) => {
        const apiError = toApiError(error)
        if (apiError.fieldErrors.email) setError('email', { message: apiError.fieldErrors.email })
      },
    }),
  )

  const apiError = login.error ? toApiError(login.error) : null

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back. Enter your details to open your wallet."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-naira underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {apiError && !apiError.fieldErrors.email && <ApiErrorAlert error={apiError} />}
        <Field label="Email" type="email" autoComplete="email" error={formState.errors.email?.message} {...register('email')} />
        <Field label="Password" type="password" autoComplete="current-password" error={formState.errors.password?.message} {...register('password')} />
        <Button type="submit" block loading={login.isPending}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
