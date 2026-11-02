import { CLIENT_ID, CLIENT_ID_HEADER } from './client-id';
import { allowSessionRefresh, hasSharedLoginSession, isSessionRefreshRejected, isSharedSessionCurrent, isSharedSessionSignedOut, rejectSessionRefresh } from './shared-session';
// Token management utilities with expiration support
interface TokenData {
    token: string;
    expiresAt: number; // timestamp in milliseconds
}
const TOKEN_KEY = 'token';
const TOKEN_DATA_KEY = 'tokenData';
const REFRESH_TOKEN_KEY = 'refreshToken';
/**
 * A token (access or refresh) with less than this much time left is treated as expired:
 * it is never sent to the backend, and a new access token is requested instead.
 */
export const TOKEN_MIN_REMAINING_MS = 10 * 60 * 1000;
/**
 * Decode JWT token to get expiration time
 * Note: This only decodes the payload, doesn't verify signature
 */
function decodeJWT(token: string): any {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    }
    catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}
/**
 * Get token expiration time from JWT
 */
function getTokenExpiration(token: string): number | null {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp)
        return null;
    // JWT exp is in seconds, convert to milliseconds
    return decoded.exp * 1000;
}
/**
 * Get token issue time (JWT iat) in milliseconds
 */
function getTokenIssuedAt(token: string): number | null {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.iat)
        return null;
    return decoded.iat * 1000;
}
/**
 * Moment after which a token must no longer be used.
 * Normally TOKEN_MIN_REMAINING_MS before expiry. If the token's whole lifetime is that short
 * or shorter, half of the lifetime is used instead so a freshly issued token is still usable.
 */
function getUsableUntil(token: string, expiresAt: number): number {
    const issuedAt = getTokenIssuedAt(token);
    const lifetime = issuedAt ? expiresAt - issuedAt : Infinity;
    const margin = lifetime > TOKEN_MIN_REMAINING_MS ? TOKEN_MIN_REMAINING_MS : lifetime / 2;
    return expiresAt - margin;
}
/**
 * Save an access token with expiration data.
 */
export function saveToken(token: string): void {
    allowSessionRefresh();
    sessionVersion++;
    // Save the raw token for backward compatibility
    localStorage.setItem(TOKEN_KEY, token);
    // Remove refresh tokens left by older versions; SSO uses the HttpOnly cookie.
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Try to extract expiration from JWT
    const expiresAt = getTokenExpiration(token);
    if (expiresAt) {
        const tokenData: TokenData = {
            token,
            expiresAt
        };
        localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData));
    }
    else {
        // If no expiration in token, set a default expiration (e.g., 24 hours)
        const defaultExpiration = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        const tokenData: TokenData = {
            token,
            expiresAt: defaultExpiration
        };
        localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData));
    }
}
/**
 * Get token if it's still valid
 */
export function getValidToken(): string | null {
    if (!isSharedSessionCurrent()) {
        clearToken();
        return null;
    }
    try {
        // First check if we have token data with expiration
        const tokenDataStr = localStorage.getItem(TOKEN_DATA_KEY);
        if (tokenDataStr) {
            const tokenData: TokenData = JSON.parse(tokenDataStr);
            // Expired or about to expire: never send it, let the caller refresh instead
            if (Date.now() >= getUsableUntil(tokenData.token, tokenData.expiresAt)) {
                return null;
            }
            return tokenData.token;
        }
        // Fallback to old method for backward compatibility
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            // Try to check JWT expiration
            const expiresAt = getTokenExpiration(token);
            if (expiresAt && Date.now() >= getUsableUntil(token, expiresAt)) {
                return null;
            }
            // If we can't determine expiration, migrate to new format
            if (expiresAt) {
                const tokenData: TokenData = { token, expiresAt };
                localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData));
            }
            return token;
        }
        return null;
    }
    catch (error) {
        console.error('Error getting valid token:', error);
        clearToken();
        return null;
    }
}
/**
 * Check if token is expired without removing it
 */
export function isTokenExpired(): boolean {
    try {
        const tokenDataStr = localStorage.getItem(TOKEN_DATA_KEY);
        if (tokenDataStr) {
            const tokenData: TokenData = JSON.parse(tokenDataStr);
            return Date.now() >= getUsableUntil(tokenData.token, tokenData.expiresAt);
        }
        // Fallback to checking JWT directly
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            const expiresAt = getTokenExpiration(token);
            if (expiresAt) {
                return Date.now() >= getUsableUntil(token, expiresAt);
            }
        }
        return false;
    }
    catch (error) {
        console.error('Error checking token expiration:', error);
        return true; // Assume expired if we can't check
    }
}
/**
 * Get time (ms) until the token stops being usable, i.e. TOKEN_MIN_REMAINING_MS before its real expiry
 */
export function getTimeUntilExpiration(): number | null {
    try {
        const tokenDataStr = localStorage.getItem(TOKEN_DATA_KEY);
        if (tokenDataStr) {
            const tokenData: TokenData = JSON.parse(tokenDataStr);
            return Math.max(0, getUsableUntil(tokenData.token, tokenData.expiresAt) - Date.now());
        }
        // Fallback to JWT check
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            const expiresAt = getTokenExpiration(token);
            if (expiresAt) {
                return Math.max(0, getUsableUntil(token, expiresAt) - Date.now());
            }
        }
        return null;
    }
    catch (error) {
        console.error('Error getting time until expiration:', error);
        return null;
    }
}
/**
 * Clear all token data
 */
export function clearToken(): void {
    sessionVersion++;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_DATA_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}
let refreshInFlight: Promise<string | null> | null = null;
let sessionVersion = 0;
/**
 * Restore this app's access token using the shared HttpOnly SSO cookie.
 * Concurrent callers share one request.
 */
export function refreshAccessToken(): Promise<string | null> {
    if (!isSharedSessionCurrent() || isSharedSessionSignedOut()) {
        clearToken();
        return Promise.resolve(null);
    }
    if (!hasSharedLoginSession() || isSessionRefreshRejected()) return Promise.resolve(null);
    if (!refreshInFlight) {
        refreshInFlight = requestNewAccessToken().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
}
/**
 * Access token that is safe to send right now: the stored one if it still has more than
 * TOKEN_MIN_REMAINING_MS left, otherwise a newly refreshed one. Null when the user must log in again.
 */
export async function getFreshAccessToken(): Promise<string | null> {
    return getValidToken() ?? await refreshAccessToken();
}
async function requestNewAccessToken(): Promise<string | null> {
    const version = sessionVersion;
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
            console.error('API URL is not configured');
            return null;
        }
        console.log('Attempting to refresh access token...');
        const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                [CLIENT_ID_HEADER]: CLIENT_ID,
            },
            credentials: 'include',
        });
        if (!isSharedSessionCurrent() || sessionVersion !== version) return null;
        if (!response.ok) {
            console.log('Shared session refresh failed');
            if (response.status === 401 || response.status === 403) {
                rejectSessionRefresh();
                clearToken();
            }
            return null;
        }
        const data = await response.json();
        if (!isSharedSessionCurrent() || sessionVersion !== version) return null;
        if (data.access_token) {
            console.log('Successfully refreshed access token');
            // Save the new tokens
            saveToken(data.access_token);
            return data.access_token;
        }
        return null;
    }
    catch (error) {
        // Network errors (e.g. server offline) should not log the user out —
        // only clear tokens on auth failures (handled above via response.ok check).
        if (error instanceof TypeError) {
            console.warn('Token refresh skipped: network unavailable');
            return null;
        }
        console.error('Error refreshing access token:', error);
        if (isSharedSessionCurrent() && sessionVersion === version) clearToken();
        return null;
    }
}
