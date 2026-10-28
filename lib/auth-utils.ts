import { CLIENT_ID, CLIENT_ID_HEADER } from './client-id';
// Token management utilities with expiration support
interface TokenData {
    token: string;
    refreshToken?: string;
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
 * Save token with expiration data and optional refresh token
 */
export function saveToken(token: string, refreshToken?: string): void {
    // A new session exists: allow the shared SSO cookie to be tried again later if needed.
    ssoCookieRefreshFailed = false;
    // Save the raw token for backward compatibility
    localStorage.setItem(TOKEN_KEY, token);
    // Save refresh token if provided
    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    // Try to extract expiration from JWT
    const expiresAt = getTokenExpiration(token);
    if (expiresAt) {
        const tokenData: TokenData = {
            token,
            refreshToken,
            expiresAt
        };
        localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData));
    }
    else {
        // If no expiration in token, set a default expiration (e.g., 24 hours)
        const defaultExpiration = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        const tokenData: TokenData = {
            token,
            refreshToken,
            expiresAt: defaultExpiration
        };
        localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData));
    }
}
/**
 * Get token if it's still valid
 */
export function getValidToken(): string | null {
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_DATA_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}
/**
 * Forget the stored refresh token (both storage locations), keeping the access token data.
 */
function dropRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    const tokenDataStr = localStorage.getItem(TOKEN_DATA_KEY);
    if (!tokenDataStr)
        return;
    const tokenData: TokenData = JSON.parse(tokenDataStr);
    delete tokenData.refreshToken;
    localStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenData));
}
/**
 * Get refresh token, or null when it is missing, expired or has less than
 * TOKEN_MIN_REMAINING_MS left (such a token is removed so it is never sent).
 */
export function getRefreshToken(): string | null {
    try {
        // First try to get from token data, then fall back to direct storage
        const tokenDataStr = localStorage.getItem(TOKEN_DATA_KEY);
        const fromData = tokenDataStr ? (JSON.parse(tokenDataStr) as TokenData).refreshToken : undefined;
        const refreshToken = fromData || localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken)
            return null;
        const expiresAt = getTokenExpiration(refreshToken);
        if (expiresAt && Date.now() >= expiresAt - TOKEN_MIN_REMAINING_MS) {
            console.log('Refresh token expired or about to expire, discarding it');
            dropRefreshToken();
            return null;
        }
        return refreshToken;
    }
    catch (error) {
        console.error('Error getting refresh token:', error);
        return null;
    }
}
let refreshInFlight: Promise<string | null> | null = null;
/**
 * Set when a refresh without a stored refresh token (shared SSO cookie only) was rejected.
 * Such a guest has no session, so the cookie is not tried again until the next page load
 * or a new login (saveToken) — otherwise every polling call (e.g. the support heartbeat
 * every 5s) would send a POST /auth/refresh that always fails with REFRESH_TOKEN_MISSING.
 */
let ssoCookieRefreshFailed = false;
/**
 * Refresh access token using refresh token.
 * Concurrent callers share one request, so a refresh token is never sent twice at once.
 */
export function refreshAccessToken(): Promise<string | null> {
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
    try {
        // Without a stored refresh token, fall back to the shared SSO cookie
        // (set by the API on .saigame.studio, shared with play.saigame.studio).
        const refreshToken = getRefreshToken();
        if (!refreshToken && ssoCookieRefreshFailed)
            return null;
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
            body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : undefined,
        });
        if (!response.ok) {
            console.log('Refresh token failed or expired');
            ssoCookieRefreshFailed = true;
            clearToken();
            return null;
        }
        const data = await response.json();
        if (data.access_token) {
            console.log('Successfully refreshed access token');
            // Save the new tokens
            saveToken(data.access_token, data.refresh_token || refreshToken || undefined);
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
        ssoCookieRefreshFailed = true;
        clearToken();
        return null;
    }
}
