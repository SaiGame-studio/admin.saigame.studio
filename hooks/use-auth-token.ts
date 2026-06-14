import { getValidToken } from "@/lib/auth-utils";
/**
 * Custom hook to get authentication token with expiration checking
 * Use this instead of localStorage.getItem("token") to ensure token validity
 */
export function useAuthToken(): string | null {
    return getValidToken();
}
/**
 * Hook to get token for API calls
 * Throws error if no valid token is found
 */
export function useAuthTokenOrThrow(): string {
    const token = getValidToken();
    if (!token) {
        throw new Error("Authentication required");
    }
    return token;
}
