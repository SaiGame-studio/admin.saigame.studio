import { getValidToken, clearToken, refreshAccessToken } from './auth-utils'
import { toast } from '@/hooks/use-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

export class ApiError extends Error {
  public status: number
  public data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function getErrorTitle(status: number): string {
  if (status === 400) return 'Bad Request'
  if (status === 403) return 'Forbidden'
  if (status === 404) return 'Not Found'
  if (status === 409) return 'Conflict'
  if (status === 422) return 'Validation Error'
  if (status === 429) return 'Too Many Requests'
  if (status >= 500) return 'Server Error'
  return `Error ${status}`
}

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  requireAuth?: boolean
  suppressToast?: boolean
}

/**
 * Enhanced fetch wrapper with automatic token handling and refresh
 */
export async function apiRequest(endpoint: string, options: RequestOptions = {}, retryCount = 0): Promise<any> {
  if (!API_URL) {
    throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  }

  const {
    method = 'GET',
    headers = {},
    body,
    requireAuth = true,
    suppressToast = false,
  } = options

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers
  }

  // Add authentication if required
  if (requireAuth) {
    const token = getValidToken()
    if (!token) {
      // Token is either missing or expired, try to refresh
      if (retryCount === 0) {
        console.log('Token missing or expired, attempting to refresh...')
        const newToken = await getRefreshedToken()
        if (newToken) {
          // Retry the request with the new token
          return apiRequest(endpoint, options, retryCount + 1)
        }
      }
      
      // No token and refresh failed
      clearToken()
      throw new ApiError("Authentication required", 401)
    }
    requestHeaders.Authorization = `Bearer ${token}`
  }

  // Prepare request config
  const config: RequestInit = {
    method,
    headers: requestHeaders
  }

  // Add body if provided
  if (body) {
    if (headers['Content-Type'] === 'application/json' || !headers['Content-Type']) {
      config.body = JSON.stringify(body)
    } else {
      config.body = body
    }
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config)

    // Handle token expiration with automatic refresh
    if (response.status === 401 && requireAuth && retryCount === 0) {
      console.log('Received 401, attempting to refresh token...')
      
      const newToken = await getRefreshedToken()
      if (newToken) {
        // Retry the request with the new token
        return apiRequest(endpoint, options, retryCount + 1)
      }
      
      // Refresh failed, clear tokens but don't redirect (let auth context handle it)
      clearToken()
      throw new ApiError("Authentication required", 401)
    }

    // Parse response
    let data
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    // Handle non-success responses
    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Request failed: ${response.status}`

      // Handle 403: inactive/banned user → clear session; otherwise just throw
      if (response.status === 403) {
        const msg = errorMessage.toLowerCase()
        if (msg.includes('inactive') || msg.includes('banned') || msg.includes('deactivated') || msg.includes('disabled')) {
          clearToken()
          if (typeof window !== 'undefined') {
            window.location.replace('/login')
          }
        }
        throw new ApiError(errorMessage, 403, data)
      }

      // Show toast for all 4xx/5xx errors except 401 (auth-context handles login redirect)
      if (response.status !== 401 && !suppressToast) {
        toast({
          variant: 'destructive',
          title: getErrorTitle(response.status),
          description: errorMessage,
        })
      }

      throw new ApiError(errorMessage, response.status, data)
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    )
  }
}

/**
 * Get refreshed token with deduplication
 */
async function getRefreshedToken(): Promise<string | null> {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  // Start refreshing
  isRefreshing = true
  refreshPromise = refreshAccessToken()

  try {
    const newToken = await refreshPromise
    return newToken
  } finally {
    isRefreshing = false
    refreshPromise = null
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest(endpoint, { ...options, method: 'POST', body }),

  put: (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest(endpoint, { ...options, method: 'PUT', body }),

  patch: (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest(endpoint, { ...options, method: 'PATCH', body }),

  delete: (endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
}
