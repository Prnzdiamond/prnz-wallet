import { isAxiosError } from 'axios'

export interface ApiError {
  status: number | null
  code: string
  message: string
  fieldErrors: Record<string, string>
  requestId: string | null
  data: unknown
  isNetworkError: boolean
}

interface ApiErrorBody {
  message?: string
  code?: string
  errors?: Record<string, string[]>
  request_id?: string
  data?: unknown
}

export function toApiError(error: unknown): ApiError {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return {
        status: null,
        code: 'network_error',
        message: 'We could not reach the server. Check your connection and try again.',
        fieldErrors: {},
        requestId: null,
        data: null,
        isNetworkError: true,
      }
    }

    const body = error.response.data ?? {}

    return {
      status: error.response.status,
      code: body.code ?? 'http_error',
      message: body.message ?? 'The request could not be completed.',
      fieldErrors: Object.fromEntries(Object.entries(body.errors ?? {}).map(([field, messages]) => [field, messages[0]])),
      requestId: body.request_id ?? error.response.headers['x-request-id'] ?? null,
      data: body.data ?? null,
      isNetworkError: false,
    }
  }

  return {
    status: null,
    code: 'unknown',
    message: 'Something went wrong. Please try again.',
    fieldErrors: {},
    requestId: null,
    data: null,
    isNetworkError: false,
  }
}
