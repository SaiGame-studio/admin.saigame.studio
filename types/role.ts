export interface Role {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    is_system: boolean;
    created_at: number;
    updated_at: number;
}
export interface Permission {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    resource: string;
    action: string;
    created_at: number;
}
export interface RoleWithPermissions extends Role {
    permissions: Permission[];
}
