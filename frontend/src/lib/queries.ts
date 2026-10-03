import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api, type FundInput, type RegisterInput, type TransactionFilters, type TransferInput } from './endpoints'

export const keys = {
  me: ['me'] as const,
  wallets: ['wallets'] as const,
  transactions: ['transactions'] as const,
  transactionList: (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
  transaction: (id: string) => ['transactions', 'detail', id] as const,
}

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return await api.me()
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

export function useLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.login,
    onSuccess: (user) => {
      client.clear()
      client.setQueryData(keys.me, user)
    },
  })
}

export function useRegister() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => api.register(input),
    onSuccess: (user) => {
      client.clear()
      client.setQueryData(keys.me, user)
    },
  })
}

export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      client.clear()
      client.setQueryData(keys.me, null)
    },
  })
}

export function useWallets() {
  return useQuery({ queryKey: keys.wallets, queryFn: api.wallets })
}

export function useTransactions(filters: TransactionFilters, perPage = 20) {
  return useInfiniteQuery({
    queryKey: [...keys.transactionList(filters), perPage],
    queryFn: ({ pageParam }) => api.transactions({ ...filters, cursor: pageParam, per_page: perPage }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.meta.next_cursor,
  })
}

export function useTransaction(id: string) {
  return useQuery({ queryKey: keys.transaction(id), queryFn: () => api.transaction(id), retry: false })
}

function useMoneyMutation<TInput>(mutationFn: (input: TInput) => ReturnType<typeof api.fund>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    retry: false,
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.wallets })
      client.invalidateQueries({ queryKey: keys.transactions })
    },
  })
}

export function useFund() {
  return useMoneyMutation((input: FundInput) => api.fund(input))
}

export function useTransfer() {
  return useMoneyMutation((input: TransferInput) => api.transfer(input))
}
