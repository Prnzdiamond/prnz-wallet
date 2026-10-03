import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-ink-soft">The page you are looking for does not exist.</p>
      <Link to="/" className="font-semibold text-naira underline-offset-4 hover:underline">
        Go to your wallet
      </Link>
    </div>
  )
}
