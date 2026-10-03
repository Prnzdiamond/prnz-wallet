import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiErrorAlert, Button, Field } from '@/components/ui'
import { toApiError } from '@/lib/errors'
import { useRegister } from '@/lib/queries'
import { AuthLayout } from './AuthLayout'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Enter your name.').max(100),
    email: z.email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/\d/, 'Include at least one number.'),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, {
    path: ['password_confirmation'],
    message: 'The passwords do not match.',
  })

type Values = z.infer<typeof schema>

export function RegisterPage() {
  const registerUser = useRegister()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit((values) =>
    registerUser.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (error) => {
        for (const [field, message] of Object.entries(toApiError(error).fieldErrors)) {
          if (field in values) setError(field as keyof Values, { message })
        }
      },
    }),
  )

  const apiError = registerUser.error ? toApiError(registerUser.error) : null

  return (
    <AuthLayout
      title="Create your account"
      subtitle="You get a Naira, US Dollar and USDT wallet straight away."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-naira underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {apiError && Object.keys(apiError.fieldErrors).length === 0 && <ApiErrorAlert error={apiError} />}
        <Field label="Full name" autoComplete="name" error={formState.errors.name?.message} {...register('name')} />
        <Field label="Email" type="email" autoComplete="email" error={formState.errors.email?.message} {...register('email')} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={formState.errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />
        <Button type="submit" block loading={registerUser.isPending}>
          {registerUser.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
