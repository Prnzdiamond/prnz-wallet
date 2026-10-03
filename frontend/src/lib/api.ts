import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  withXSRFToken: true,
  timeout: 20_000,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
})

export function ensureCsrfCookie() {
  return axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean }

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined

  if (error.response?.status === 419 && config && !config._csrfRetried) {
    config._csrfRetried = true
    await ensureCsrfCookie()
    return http(config)
  }

  return Promise.reject(error)
})
