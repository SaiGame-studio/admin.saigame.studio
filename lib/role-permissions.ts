import type { Permission, RoleWithPermissions } from "@/types/role";
import { fetchRoleWithPermissions } from "@/lib/team-api";
export interface PermissionGroup {
    resource: string;
    permissions: Permission[];
}
// Session-level cache so every member card, the matrix and the role dialog share one request per role.
const roleCache = new Map<string, Promise<RoleWithPermissions>>();
export function loadRoleWithPermissions(roleId: string, force = false): Promise<RoleWithPermissions> {
    const cached = roleCache.get(roleId);
    if (cached && !force) {
        return cached;
    }
    const request = fetchRoleWithPermissions(roleId).then(role => ({
        ...role,
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
    }));
    request.catch(() => roleCache.delete(roleId));
    roleCache.set(roleId, request);
    return request;
}
function comparePermissions(a: Permission, b: Permission): number {
    return a.resource.localeCompare(b.resource) || a.action.localeCompare(b.action);
}
/** Union of every permission granted by the given roles, sorted by resource then action. */
export function collectPermissions(roles: RoleWithPermissions[]): Permission[] {
    const byName = new Map<string, Permission>();
    for (const role of roles) {
        for (const permission of role.permissions) {
            if (!byName.has(permission.name)) {
                byName.set(permission.name, permission);
            }
        }
    }
    return Array.from(byName.values()).sort(comparePermissions);
}
export function groupPermissionsByResource(permissions: Permission[]): PermissionGroup[] {
    const groups = new Map<string, Permission[]>();
    for (const permission of [...permissions].sort(comparePermissions)) {
        const list = groups.get(permission.resource) ?? [];
        list.push(permission);
        groups.set(permission.resource, list);
    }
    return Array.from(groups.entries()).map(([resource, items]) => ({ resource, permissions: items }));
}
export function permissionNameSet(role?: RoleWithPermissions): Set<string> {
    return new Set(role?.permissions.map(permission => permission.name) ?? []);
}
/** Turns a permission name such as "member:update" into an id-safe segment. */
export function permissionIdSegment(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
