import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

export function RouteError() {
  const error = useRouteError()
  const chunkFailed = error instanceof TypeError && /dynamically imported module|Importing a module script failed/i.test(error.message)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-bold">{isRouteErrorResponse(error) && error.status === 404 ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="text-ink-soft">
        {chunkFailed ? 'A new version of the app is available, or your connection dropped. Reload to continue.' : 'This page could not be shown. Reload to try again.'}
      </p>
      <div className="flex gap-4">
        <button type="button" onClick={() => window.location.reload()} className="font-semibold text-naira underline-offset-4 hover:underline">
          Reload
        </button>
        <Link to="/" className="font-semibold text-ink-soft underline-offset-4 hover:underline">
          Go to your wallet
        </Link>
      </div>
    </div>
  )
}
