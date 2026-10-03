import { Navigate, Outlet, useLocation } from 'react-router'
import { ErrorState, Skeleton } from '@/components/ui'
import { toApiError } from '@/lib/errors'
import { useMe } from '@/lib/queries'

function FullPageLoader() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4" aria-label="Loading">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export function RequireAuth() {
  const { data: user, isPending, error, refetch } = useMe()
  const location = useLocation()

  if (isPending) return <FullPageLoader />
  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <ErrorState error={toApiError(error)} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}

export function GuestOnly() {
  const { data: user, isPending } = useMe()

  if (isPending) return <FullPageLoader />
  if (user) return <Navigate to="/" replace />

  return <Outlet />
}
