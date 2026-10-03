import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { keys } from './lib/queries'
import './index.css'

function onUnauthenticated(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 401) {
    queryClient.setQueryData(keys.me, null)
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onUnauthenticated }),
  mutationCache: new MutationCache({ onError: onUnauthenticated }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
