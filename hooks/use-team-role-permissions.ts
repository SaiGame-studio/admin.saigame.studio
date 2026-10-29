"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRoles } from "@/lib/team-api";
import { collectPermissions, loadRoleWithPermissions } from "@/lib/role-permissions";
import type { RoleWithPermissions } from "@/types/role";
/**
 * Loads every assignable role plus the roles currently held by team members
 * (e.g. owner, which is not assignable) together with their permissions.
 */
export function useTeamRolePermissions(memberRoleIds: string[], enabled = true) {
    const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const roleKey = useMemo(() => Array.from(new Set(memberRoleIds.filter(Boolean))).sort().join(","), [memberRoleIds]);
    const load = useCallback(async (force = false) => {
        try {
            setLoading(true);
            const assignable = await fetchRoles();
            const ids = Array.from(new Set([...(roleKey ? roleKey.split(",") : []), ...assignable.map(role => role.id)]));
            const results = await Promise.allSettled(ids.map(id => loadRoleWithPermissions(id, force)));
            const loaded = results
                .filter((result): result is PromiseFulfilledResult<RoleWithPermissions> => result.status === "fulfilled")
                .map(result => result.value)
                .sort((a, b) => b.permissions.length - a.permissions.length || a.display_name.localeCompare(b.display_name));
            setRoles(loaded);
            setError(loaded.length < ids.length ? "partial" : null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "failed");
        }
        finally {
            setLoading(false);
        }
    }, [roleKey]);
    useEffect(() => {
        if (enabled) {
            load().then();
        }
    }, [enabled, load]);
    const roleMap = useMemo(() => Object.fromEntries(roles.map(role => [role.id, role])) as Record<string, RoleWithPermissions>, [roles]);
    const allPermissions = useMemo(() => collectPermissions(roles), [roles]);
    return { roles, roleMap, allPermissions, loading, error, reload: () => load(true) };
}
