"use client";
import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupPermissionsByResource, permissionIdSegment } from "@/lib/role-permissions";
import { usePermissionResourceLabel } from "@/hooks/use-permission-resource-label";
import type { Permission } from "@/types/role";
interface RolePermissionGroupsProps {
    idPrefix: string;
    allPermissions: Permission[];
    granted: Set<string>;
    showDenied?: boolean;
}
/** Read-only list of permissions grouped by resource, marking which ones are granted. */
export function RolePermissionGroups({ idPrefix, allPermissions, granted, showDenied = true }: RolePermissionGroupsProps) {
    const resourceLabel = usePermissionResourceLabel();
    const groups = useMemo(() => groupPermissionsByResource(allPermissions), [allPermissions]);
    return (<div id={`${idPrefix}-groups`} className="grid gap-3 sm:grid-cols-2">
      {groups.map(group => {
            const grantedCount = group.permissions.filter(p => granted.has(p.name)).length;
            const visible = showDenied ? group.permissions : group.permissions.filter(p => granted.has(p.name));
            if (visible.length === 0) {
                return null;
            }
            const groupId = `${idPrefix}-group-${permissionIdSegment(group.resource)}`;
            return (<div key={group.resource} id={groupId} className={cn("rounded-md border bg-background p-3", grantedCount === 0 && "opacity-70")}>
            <div id={`${groupId}-header`} className="mb-2 flex items-center justify-between gap-2">
              <p id={`${groupId}-title`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {resourceLabel(group.resource)}
              </p>
              <span id={`${groupId}-count`} className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums", grantedCount === group.permissions.length
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : grantedCount === 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
                {grantedCount}/{group.permissions.length}
              </span>
            </div>
            <ul id={`${groupId}-list`} className="space-y-2">
              {visible.map(permission => {
                    const isGranted = granted.has(permission.name);
                    const itemId = `${idPrefix}-perm-${permissionIdSegment(permission.name)}`;
                    return (<li key={permission.name} id={itemId} className="flex items-start gap-2">
                    {isGranted
                            ? (<Check id={`${itemId}-icon`} aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"/>)
                            : (<X id={`${itemId}-icon`} aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60"/>)}
                    <div id={`${itemId}-body`} className={cn("min-w-0", !isGranted && "text-muted-foreground")}>
                      <p id={`${itemId}-name`} className={cn("text-sm leading-tight", !isGranted && "line-through decoration-muted-foreground/40")}>
                        {permission.display_name}
                        <code id={`${itemId}-code`} className="ml-1.5 font-mono text-[11px] text-muted-foreground no-underline">{permission.name}</code>
                      </p>
                      {permission.description && (<p id={`${itemId}-desc`} className="text-xs text-muted-foreground">{permission.description}</p>)}
                    </div>
                  </li>);
                })}
            </ul>
          </div>);
        })}
    </div>);
}
