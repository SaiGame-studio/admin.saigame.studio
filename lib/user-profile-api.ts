import type { UserProfilesResponse, UserProfile } from "@/types/user-profile";
/**
 * Fetches all user profiles (developer/player) for the current user
 * @returns Promise with array of UserProfile
 */
export async function fetchPlayerProfiles(): Promise<UserProfile[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.");
    }
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
    }
    const response = await fetch(`${apiUrl}/api/v1/me/profiles`, {
        headers: {
            Authorization: `Bearer ${token}`,
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
