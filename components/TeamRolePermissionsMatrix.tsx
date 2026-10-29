"use client";
import React, { useMemo } from "react";
import { AlertCircle, Check, Lock, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { groupPermissionsByResource, permissionIdSegment } from "@/lib/role-permissions";
import { usePermissionResourceLabel } from "@/hooks/use-permission-resource-label";
import { useTranslation } from "@/lib/i18n/use-translation";
import { RoleHelpButton } from "@/components/RoleHelpButton";
import { cn } from "@/lib/utils";
import type { Permission, RoleWithPermissions } from "@/types/role";
import type { TeamMember } from "@/types/team";
interface TeamRolePermissionsMatrixProps {
    roles: RoleWithPermissions[];
    allPermissions: Permission[];
    members: TeamMember[];
    loading: boolean;
    error: string | null;
    onRoleHelp?: (roleId: string) => void;
}
/** Read-only matrix of every permission (rows) against every role (columns). */
export function TeamRolePermissionsMatrix({ roles, allPermissions, members, loading, error, onRoleHelp }: TeamRolePermissionsMatrixProps) {
    const { t } = useTranslation();
    const resourceLabel = usePermissionResourceLabel();
    const groups = useMemo(() => groupPermissionsByResource(allPermissions), [allPermissions]);
    const grantedByRole = useMemo(() => Object.fromEntries(roles.map(role => [role.id, new Set(role.permissions.map(p => p.name))])) as Record<string, Set<string>>, [roles]);
    const memberCountByRole = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const member of members) {
            counts[member.role_id] = (counts[member.role_id] ?? 0) + 1;
        }
        return counts;
    }, [members]);
    const usedColumn = (roleId: string) => (memberCountByRole[roleId] ?? 0) > 0 && "bg-primary/5";
    return (<Card id="team-role-matrix-card" className="mt-6">
      <CardHeader id="team-role-matrix-header">
        <CardTitle id="team-role-matrix-title">{t('team.roleMatrixTitle')}</CardTitle>
        <CardDescription id="team-role-matrix-desc">{t('team.roleMatrixDesc')}</CardDescription>
        <p id="team-role-matrix-owner-only" className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5"/>
          {t('team.roleChangeOwnerOnly')}
        </p>
      </CardHeader>
      <CardContent id="team-role-matrix-content">
        {error && (<p id="team-role-matrix-error" className="mb-3 flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4"/>
            {t('team.loadRolePermissionsError')}
          </p>)}
        {loading && roles.length === 0 ? (<div id="team-role-matrix-loading" className="space-y-2">
            <Skeleton className="h-8 w-full"/>
            <Skeleton className="h-8 w-full"/>
            <Skeleton className="h-8 w-full"/>
          </div>) : roles.length === 0 ? (<p id="team-role-matrix-empty" className="text-sm text-muted-foreground">{t('team.noPermissionsData')}</p>) : (<Table id="team-role-matrix-table">
            <TableHeader id="team-role-matrix-thead">
              <TableRow id="team-role-matrix-head-row">
                <TableHead id="team-role-matrix-head-permission" className="sticky left-0 z-10 min-w-[220px] bg-background">{t('team.permissionColumn')}</TableHead>
                {roles.map(role => (<TableHead key={role.id} id={`team-role-matrix-head-${role.id}`} className={cn("h-auto min-w-[120px] py-3 text-center align-top", usedColumn(role.id))}>
                    <div id={`team-role-matrix-head-${role.id}-title`} className="flex items-center justify-center gap-1">
                      <p id={`team-role-matrix-head-${role.id}-name`} className="font-semibold text-foreground">{role.display_name}</p>
                      {onRoleHelp && (<RoleHelpButton id={`team-role-matrix-head-${role.id}-help`} roleId={role.id} onOpen={onRoleHelp}/>)}
                    </div>
                    <p id={`team-role-matrix-head-${role.id}-code`} className="font-mono text-[11px] font-normal">{role.name}</p>
                    <p id={`team-role-matrix-head-${role.id}-members`} className="mt-1 text-[11px] font-normal">{t('team.roleMemberCount', { count: memberCountByRole[role.id] ?? 0 })}</p>
                  </TableHead>))}
              </TableRow>
            </TableHeader>
            <TableBody id="team-role-matrix-tbody">
              {groups.map(group => {
                const groupId = `team-role-matrix-group-${permissionIdSegment(group.resource)}`;
                return (<React.Fragment key={group.resource}>
                  <TableRow id={groupId} className="bg-muted/50 hover:bg-muted/50">
                    <TableCell id={`${groupId}-label`} colSpan={roles.length + 1} className="sticky left-0 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {resourceLabel(group.resource)}
                    </TableCell>
                  </TableRow>
                  {group.permissions.map(permission => {
                        const rowId = `team-role-matrix-row-${permissionIdSegment(permission.name)}`;
                        return (<TableRow key={permission.name} id={rowId}>
                        <TableCell id={`${rowId}-permission`} className="sticky left-0 z-10 bg-background py-2">
                          <p id={`${rowId}-name`} className="text-sm font-medium">{permission.display_name}</p>
                          <p id={`${rowId}-code`} className="font-mono text-[11px] text-muted-foreground">{permission.name}</p>
                          {permission.description && (<p id={`${rowId}-desc`} className="text-xs text-muted-foreground">{permission.description}</p>)}
                        </TableCell>
                        {roles.map(role => {
                                const isGranted = grantedByRole[role.id]?.has(permission.name);
                                return (<TableCell key={role.id} id={`${rowId}-${role.id}`} className={cn("py-2 text-center", usedColumn(role.id))}>
                              {isGranted
                                        ? (<Check aria-label={t('team.permissionGranted')} className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400"/>)
                                        : (<Minus aria-label={t('team.permissionNotGranted')} className="mx-auto h-4 w-4 text-muted-foreground/40"/>)}
                            </TableCell>);
                            })}
                      </TableRow>);
                    })}
                </React.Fragment>);
            })}
            </TableBody>
            <TableFooter id="team-role-matrix-tfoot">
              <TableRow id="team-role-matrix-total-row">
                <TableCell id="team-role-matrix-total-label" className="sticky left-0 z-10 bg-muted py-2 text-sm">{t('team.roleTotalRow')}</TableCell>
                {roles.map(role => (<TableCell key={role.id} id={`team-role-matrix-total-${role.id}`} className="py-2 text-center text-sm tabular-nums">
                    {role.permissions.length}/{allPermissions.length}
                  </TableCell>))}
              </TableRow>
            </TableFooter>
          </Table>)}
      </CardContent>
    </Card>);
}
