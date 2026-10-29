"use client";
import { useMemo } from "react";
import { Info, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { RolePermissionGroups } from "@/components/RolePermissionGroups";
import { permissionNameSet } from "@/lib/role-permissions";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import type { Permission, RoleWithPermissions } from "@/types/role";
import type { TeamMember } from "@/types/team";
interface RoleGuideSheetProps {
    roleId: string | null;
    roles: RoleWithPermissions[];
    allPermissions: Permission[];
    members: TeamMember[];
    onRoleChange: (roleId: string | null) => void;
}
const MAX_GUIDE_ITEMS = 10;
/** Right-side panel explaining what a role is for and when a user should receive it. */
export function RoleGuideSheet({ roleId, roles, allPermissions, members, onRoleChange }: RoleGuideSheetProps) {
    const { t } = useTranslation();
    const role = roles.find(item => item.id === roleId);
    const granted = useMemo(() => permissionNameSet(role), [role]);
    // Guide copy is keyed by the system role name; custom roles fall back to their DB description.
    const guideKey = role ? `team.roleGuide.roles.${role.name}` : "";
    const translated = (key: string) => {
        const value = t(key);
        return value === key ? null : value;
    };
    const summary = role ? translated(`${guideKey}.summary`) ?? role.description ?? null : null;
    const assignWhen = role ? Array.from({ length: MAX_GUIDE_ITEMS }, (_, i) => translated(`${guideKey}.assign${i + 1}`)).filter((v): v is string => !!v) : [];
    const avoidWhen = role ? Array.from({ length: MAX_GUIDE_ITEMS }, (_, i) => translated(`${guideKey}.avoid${i + 1}`)).filter((v): v is string => !!v) : [];
    const note = role ? translated(`${guideKey}.note`) : null;
    const hasGuide = assignWhen.length > 0;
    const holders = role ? members.filter(member => member.role_id === role.id) : [];
    return (<Sheet open={!!roleId} onOpenChange={open => !open && onRoleChange(null)}>
      <SheetContent id="team-role-guide-sheet" side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader id="team-role-guide-header" className="text-left">
          <SheetTitle id="team-role-guide-title">{t('team.roleGuide.title')}</SheetTitle>
          <SheetDescription id="team-role-guide-desc">{t('team.roleGuide.desc')}</SheetDescription>
        </SheetHeader>

        <div id="team-role-guide-switcher" className="mt-4 flex flex-wrap gap-1.5">
          {roles.map(item => (<button key={item.id} id={`team-role-guide-switch-${item.id}`} type="button" onClick={() => onRoleChange(item.id)} className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors", item.id === roleId ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {item.display_name}
            </button>))}
        </div>

        {role && (<div id={`team-role-guide-body-${role.id}`} className="mt-6 space-y-6">
            <section id="team-role-guide-overview" className="space-y-2">
              <div id="team-role-guide-role-heading" className="flex flex-wrap items-center gap-2">
                <h3 id="team-role-guide-role-name" className="text-lg font-semibold">{role.display_name}</h3>
                <code id="team-role-guide-role-code" className="font-mono text-xs text-muted-foreground">{role.name}</code>
                <Badge id="team-role-guide-role-type" variant="secondary">{role.is_system ? t('team.roleGuide.systemRole') : t('team.roleGuide.customRole')}</Badge>
              </div>
              {summary && (<p id="team-role-guide-summary" className="text-sm leading-relaxed">{summary}</p>)}
              {!hasGuide && (<p id="team-role-guide-custom-hint" className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
                  {t('team.roleGuide.customRoleHint')}
                </p>)}
            </section>

            {assignWhen.length > 0 && (<section id="team-role-guide-assign" className="space-y-2">
                <h4 id="team-role-guide-assign-title" className="flex items-center gap-1.5 text-sm font-semibold">
                  <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400"/>
                  {t('team.roleGuide.assignWhen')}
                </h4>
                <ul id="team-role-guide-assign-list" className="list-disc space-y-1 pl-5 text-sm">
                  {assignWhen.map((item, index) => (<li key={index} id={`team-role-guide-assign-${index + 1}`}>{item}</li>))}
                </ul>
              </section>)}

            {avoidWhen.length > 0 && (<section id="team-role-guide-avoid" className="space-y-2">
                <h4 id="team-role-guide-avoid-title" className="flex items-center gap-1.5 text-sm font-semibold">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400"/>
                  {t('team.roleGuide.avoidWhen')}
                </h4>
                <ul id="team-role-guide-avoid-list" className="list-disc space-y-1 pl-5 text-sm">
                  {avoidWhen.map((item, index) => (<li key={index} id={`team-role-guide-avoid-${index + 1}`}>{item}</li>))}
                </ul>
              </section>)}

            {note && (<p id="team-role-guide-note" className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed">{note}</p>)}

            <section id="team-role-guide-holders" className="space-y-2">
              <h4 id="team-role-guide-holders-title" className="text-sm font-semibold">{t('team.roleMemberCount', { count: holders.length })}</h4>
              {holders.length > 0 && (<div id="team-role-guide-holders-list" className="flex flex-wrap gap-1.5">
                  {holders.map(member => (<Badge key={member.id} id={`team-role-guide-holder-${member.id}`} variant="outline">
                      {member.display_name || member.username || member.email || member.user_id}
                    </Badge>))}
                </div>)}
            </section>

            <section id="team-role-guide-permissions" className="space-y-2">
              <h4 id="team-role-guide-permissions-title" className="flex items-center gap-1.5 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary"/>
                {t('team.roleGuide.permissionsTitle')}
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  {t('team.permissionsGrantedCount', { granted: role.permissions.length, total: allPermissions.length })}
                </span>
              </h4>
              <RolePermissionGroups idPrefix="team-role-guide" allPermissions={allPermissions} granted={granted}/>
            </section>

            <p id="team-role-guide-owner-only" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5"/>
              {t('team.roleChangeOwnerOnly')}
            </p>
          </div>)}
      </SheetContent>
    </Sheet>);
}
