import { ArrowDownToLine, ArrowUpRight, Home, ListOrdered, LogOut, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useLogout, useMe } from '@/lib/queries'
import { Logo } from './Logo'

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/add-money', label: 'Add money', icon: ArrowDownToLine, end: false },
  { to: '/send', label: 'Send', icon: ArrowUpRight, end: false },
  { to: '/activity', label: 'Activity', icon: ListOrdered, end: false },
  { to: '/profile', label: 'Profile', icon: UserRound, end: false },
]

export function AppShell() {
  const { data: user } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  const signOut = () => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:px-4 lg:py-6">
        <Logo className="px-2 text-lg" />
        <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors ${isActive ? 'bg-naira-wash text-naira-deep' : 'text-ink-soft hover:bg-line-soft hover:text-ink'}`
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line-soft pt-4">
          <p className="truncate px-3 text-sm font-semibold">{user?.name}</p>
          <p className="truncate px-3 text-xs text-ink-faint">{user?.email}</p>
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isPending}
            className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-soft hover:bg-line-soft hover:text-ink disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden />
            {logout.isPending ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isPending}
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-ink-soft hover:bg-line-soft"
          >
            <LogOut className="size-4" aria-hidden />
            Log out
          </button>
        </header>

        <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? 'text-naira' : 'text-ink-faint'}`
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
