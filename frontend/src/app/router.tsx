import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { GuestOnly, RequireAuth } from '@/features/auth/RouteGuards'
import { RouteError } from './RouteError'

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    HydrateFallback: () => null,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', lazy: () => import('@/features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })) },
          { path: '/register', lazy: () => import('@/features/auth/RegisterPage').then((m) => ({ Component: m.RegisterPage })) },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, lazy: () => import('@/pages/DashboardPage').then((m) => ({ Component: m.DashboardPage })) },
              { path: 'add-money', lazy: () => import('@/features/wallets/AddMoneyPage').then((m) => ({ Component: m.AddMoneyPage })) },
              { path: 'send', lazy: () => import('@/features/transfers/SendPage').then((m) => ({ Component: m.SendPage })) },
              { path: 'activity', lazy: () => import('@/features/transactions/ActivityPage').then((m) => ({ Component: m.ActivityPage })) },
              { path: 'profile', lazy: () => import('@/features/profile/ProfilePage').then((m) => ({ Component: m.ProfilePage })) },
              { path: 'activity/:id', lazy: () => import('@/features/transactions/TransactionDetailPage').then((m) => ({ Component: m.TransactionDetailPage })) },
            ],
          },
        ],
      },
      { path: '*', lazy: () => import('@/pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })) },
    ],
  },
])
