export interface Team {
    id: string;
    studio_id: string;
    name: string;
    slug: string;
    description?: string;
    is_active: boolean;
    created_at: number;
    updated_at: number;
}
export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role_id: string;
    role_name: string;
    invited_by?: string;
    invited_at?: number;
    joined_at?: number;
    is_active: boolean;
    created_at: number;
    updated_at: number;
    username?: string;
    email?: string;
    display_name?: string;
}
