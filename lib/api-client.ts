import { getValidToken, clearToken } from './auth-utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL

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

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  requireAuth?: boolean
}

/**
 * Enhanced fetch wrapper with automatic token handling
 */
export async function apiRequest(endpoint: string, options: RequestOptions = {}): Promise<any> {
  if (!API_URL) {
    throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  }

  const {
    method = 'GET',
    headers = {},
    body,
    requireAuth = true
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
      // Token is either missing or expired
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

    // Handle token expiration
    if (response.status === 401) {
      clearToken()
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
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
      throw new ApiError(
        data?.message || `Request failed: ${response.status}`,
        response.status,
        data
      )
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