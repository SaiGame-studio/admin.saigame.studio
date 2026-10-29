"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RolePermissionGroups } from "@/components/RolePermissionGroups";
import { permissionNameSet } from "@/lib/role-permissions";
import { usePermissionResourceLabel } from "@/hooks/use-permission-resource-label";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import type { Permission, RoleWithPermissions } from "@/types/role";
import type { TeamMember } from "@/types/team";
interface MemberPermissionsPanelProps {
    member: TeamMember;
    role?: RoleWithPermissions;
    allPermissions: Permission[];
    loading: boolean;
}
/** Read-only, collapsible breakdown of the permissions a member receives from their team role. */
export function MemberPermissionsPanel({ member, role, allPermissions, loading }: MemberPermissionsPanelProps) {
    const { t } = useTranslation();
    const resourceLabel = usePermissionResourceLabel();
    const [open, setOpen] = useState(false);
    const granted = useMemo(() => permissionNameSet(role), [role]);
    const grantedCount = allPermissions.filter(p => granted.has(p.name)).length;
    const grantedResources = useMemo(() => Array.from(new Set(role?.permissions.map(p => p.resource) ?? [])).sort(), [role]);
    const panelId = `team-member-permissions-${member.id}`;
    return (<Collapsible id={panelId} open={open} onOpenChange={setOpen} className="col-span-2 rounded-md border bg-muted/30">
      <CollapsibleTrigger asChild>
        <button id={`${panelId}-toggle`} type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left">
          <span id={`${panelId}-title`} className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary"/>
            {t('team.memberPermissions')}
            {!open && role && grantedResources.length > 0 && (<span id={`${panelId}-resources`} className="hidden truncate text-xs font-normal text-muted-foreground sm:inline">
                · {grantedResources.map(resourceLabel).join(", ")}
              </span>)}
          </span>
          <span id={`${panelId}-summary`} className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {loading ? (<Loader2 className="h-3.5 w-3.5 animate-spin"/>) : role ? (<span className="tabular-nums">{t('team.permissionsGrantedCount', { granted: grantedCount, total: allPermissions.length })}</span>) : (<span>{t('team.permissionsUnavailable')}</span>)}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")}/>
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent id={`${panelId}-content`} className="space-y-3 px-3 pb-3">
        {!member.is_active && (<p id={`${panelId}-inactive`} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
            {t('team.inactiveMemberNoPermissions')}
          </p>)}
        <p id={`${panelId}-hint`} className="text-xs text-muted-foreground">{t('team.permissionsReadOnlyHint')}</p>
        {role ? (<RolePermissionGroups idPrefix={panelId} allPermissions={allPermissions} granted={granted}/>) : !loading && (<p id={`${panelId}-empty`} className="text-xs text-muted-foreground">{t('team.noPermissionsData')}</p>)}
      </CollapsibleContent>
    </Collapsible>);
}
