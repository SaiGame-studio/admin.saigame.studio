export interface UserProfile {
    id: string;
    profile_type: string;
    user_id: string;
    custom_data: {
        studio_count?: number;
        games_joined_count?: number;
    };
    updated_at: number;
    created_at: number;
}
export interface UserProfilesResponse {
    count: number;
    profiles: UserProfile[];
    user_id: string;
}
