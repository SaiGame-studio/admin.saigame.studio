import type { UserProfilesResponse, UserProfile } from "@/types/user-profile";
import { authFetch } from "@/lib/api-client";
/**
 * Fetches all user profiles (developer/player) for the current user
 * @returns Promise with array of UserProfile
 */
export async function fetchPlayerProfiles(): Promise<UserProfile[]> {
    const response = await authFetch(`/api/v1/me/profiles`, {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch user profiles: ${response.status}`);
    }
    const data: UserProfilesResponse = await response.json();
    // API trả về { count, profiles, user_id }
    return data.profiles || [];
}
