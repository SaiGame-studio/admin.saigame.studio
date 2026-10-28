import { clearToken, getFreshAccessToken, refreshAccessToken } from './auth-utils';
import { toast } from '@/hooks/use-toast';
import { CLIENT_ID, CLIENT_ID_HEADER } from './client-id';
const API_URL = process.env.NEXT_PUBLIC_API_URL;
export class ApiError extends Error {
    public status: number;
    public data: any;
    constructor(message: string, status: number, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}
function getErrorTitle(status: number): string {
    if (status === 400)
        return 'Bad Request';
    if (status === 403)
        return 'Forbidden';
    if (status === 404)
        return 'Not Found';
    if (status === 409)
        return 'Conflict';
    if (status === 422)
        return 'Validation Error';
    if (status === 429)
        return 'Too Many Requests';
    if (status >= 500)
        return 'Server Error';
    return `Error ${status}`;
}
/**
 * How a request authenticates:
 * - "required": a fresh access token is sent; without one the call fails with ApiError 401.
 * - "optional": a fresh access token is sent when the user is signed in, otherwise none.
 * - "none": no Authorization header.
 */
export type AuthMode = 'required' | 'optional' | 'none';
export interface AuthFetchOptions extends RequestInit {
    auth?: AuthMode;
}
/**
 * THE single place that sends requests to the Sai Server API with a token.
 * Every API call must go through here (directly, or via apiRequest / api.*), never through
 * a raw fetch with a hand-made Authorization header.
 *
 * - Only sends an access token with more than TOKEN_MIN_REMAINING_MS (10 min) left;
 *   otherwise refreshes first (see getFreshAccessToken).
 * - On 401, refreshes once and retries the request with the new token.
 * - Returns the raw Response, so callers can read JSON, text, a Blob or a stream.
 *
 * `endpoint` is a path such as "/api/v1/me" (prefixed with NEXT_PUBLIC_API_URL) or a full URL.
 */
export async function authFetch(endpoint: string, options: AuthFetchOptions = {}): Promise<Response> {
    if (!API_URL) {
        throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.");
    }
    const { auth = 'required', ...init } = options;
    const url = /^https?:\/\//i.test(endpoint) ? endpoint : `${API_URL}${endpoint}`;
    const send = (token: string | null) => {
        const headers = new Headers(init.headers);
        headers.set(CLIENT_ID_HEADER, CLIENT_ID);
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        else
            headers.delete('Authorization');
        return fetch(url, { ...init, headers });
    };
    if (auth === 'none') {
        return send(null);
    }
    const token = await getFreshAccessToken();
    if (!token && auth === 'required') {
        clearToken();
        throw new ApiError("Authentication required", 401);
    }
    const response = await send(token);
    if (response.status !== 401 || !token) {
        return response;
    }
    // Token was rejected (revoked, clock skew...): refresh once and retry.
    const newToken = await refreshAccessToken();
    if (newToken) {
        return send(newToken);
    }
    if (auth === 'required') {
        clearToken();
        throw new ApiError("Authentication required", 401);
    }
    return send(null);
}
interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    requireAuth?: boolean;
    suppressToast?: boolean;
    credentials?: RequestCredentials;
}
/**
 * JSON API call built on authFetch: serialises the body, parses the response
 * and shows an error toast for failed requests.
 */
export async function apiRequest(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const { method = 'GET', headers = {}, body, requireAuth = true, suppressToast = false, credentials, } = options;
    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
    };
    const config: AuthFetchOptions = {
        method,
        headers: requestHeaders,
        credentials,
        // requireAuth: false keeps the old behaviour: no token at all (login, register, public pages...)
        auth: requireAuth ? 'required' : 'none',
    };
    if (body) {
        if (headers['Content-Type'] === 'application/json' || !headers['Content-Type']) {
            config.body = JSON.stringify(body);
        }
        else {
            config.body = body;
        }
    }
    try {
        const response = await authFetch(endpoint, config);
        // Parse response
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }
        else {
            data = await response.text();
        }
        // Handle non-success responses
        if (!response.ok) {
            const errorMessage = data?.message || data?.error || `Request failed: ${response.status}`;
            // Handle 403: inactive/banned user -> clear session; otherwise just throw
            if (response.status === 403) {
                const msg = errorMessage.toLowerCase();
                if (msg.includes('inactive') || msg.includes('banned') || msg.includes('deactivated') || msg.includes('disabled')) {
                    clearToken();
                    if (typeof window !== 'undefined') {
                        window.location.replace('/login');
                    }
                }
                throw new ApiError(errorMessage, 403, data);
            }
            // Show toast for all 4xx/5xx errors except 401 (auth-context handles login redirect)
            if (response.status !== 401 && !suppressToast) {
                toast({
                    variant: 'destructive',
                    title: getErrorTitle(response.status),
                    description: errorMessage,
                });
            }
            throw new ApiError(errorMessage, response.status, data);
        }
        return data;
    }
    catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(error instanceof Error ? error.message : 'Network error', 0, error);
    }
}
/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
    get: (endpoint: string, options?: Omit<RequestOptions, 'method'>) => apiRequest(endpoint, { ...options, method: 'GET' }),
    post: (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => apiRequest(endpoint, { ...options, method: 'POST', body }),
    put: (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
    patch: (endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
    delete: (endpoint: string, options?: Omit<RequestOptions, 'method'>) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};
